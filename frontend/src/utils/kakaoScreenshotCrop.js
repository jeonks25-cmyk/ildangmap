/**
 * 카카오톡 스크린샷 — 말풍선(메시지) 영역만 추출
 * 상단 상태바·채팅방 제목·하단 입력창·키보드 제외
 */

import { sanitizeOcrGarbage } from "./ocr/ocrTextPostprocessor";

const KAKAO_ASPECT_MIN = 0.38;
const KAKAO_ASPECT_MAX = 0.72;

/** @returns {Promise<{ source: CanvasImageSource, width: number, height: number, cropped: boolean, reason: string }>} */
export async function cropKakaoMessageRegion(image) {
  const { source, width, height, bitmap } = await loadSource(image);
  const aspect = width / Math.max(height, 1);
  const likelyKakao = aspect >= KAKAO_ASPECT_MIN && aspect <= KAKAO_ASPECT_MAX && height >= 600;

  if (!likelyKakao) {
    bitmap?.close?.();
    return { source, width, height, cropped: false, reason: "not_kakao_layout" };
  }

  const bandAnalysis = analyzeContentBands(source, width, height);
  const crop = bandAnalysis || defaultKakaoCrop(width, height);

  const canvas = document.createElement("canvas");
  canvas.width = crop.w;
  canvas.height = crop.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap?.close?.();
    return { source, width, height, cropped: false, reason: "canvas_failed" };
  }

  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  bitmap?.close?.();

  return {
    source: canvas,
    width: crop.w,
    height: crop.h,
    cropped: true,
    reason: bandAnalysis ? "content_bands" : "default_margins",
    cropBox: crop,
  };
}

function defaultKakaoCrop(width, height) {
  const top = Math.round(height * 0.14);
  const bottom = Math.round(height * 0.28);
  const side = Math.round(width * 0.04);
  return {
    x: side,
    y: top,
    w: width - side * 2,
    h: height - top - bottom,
  };
}

function isKakaoBubblePixel(r, g, b, bgGray) {
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  const isDarkBg = bgGray < 100;

  const isYellow = r > 180 && g > 150 && b < 150 && r - b > 50 && g > b + 15;
  const isWhiteBubble = !isDarkBg && r > 230 && g > 230 && b > 225;
  const isGrayBubble =
    isDarkBg &&
    gray > bgGray + 10 &&
    gray < bgGray + 75 &&
    Math.abs(r - g) < 20 &&
    Math.abs(g - b) < 20 &&
    !isYellow;

  return isYellow || isWhiteBubble || isGrayBubble;
}

function estimateBackgroundGray(data, width, height) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
  ];
  let sum = 0;
  let count = 0;
  for (const [x, y] of points) {
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = (y * width + x) * 4;
    sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    count += 1;
  }
  return count ? sum / count : 128;
}

/**
 * 노란/회색 말풍선 bbox — 상태바·입력창 제외
 * @param {HTMLCanvasElement} canvas
 */
export function detectKakaoBubbleBox(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bgGray = estimateBackgroundGray(data, width, height);
  const step = Math.max(2, Math.round(Math.min(width, height) / 400));

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  let yellowCount = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!isKakaoBubblePixel(r, g, b, bgGray)) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
      if (r > 180 && g > 150 && b < 150) yellowCount += 1;
    }
  }

  const minPixels = Math.max(40, Math.round((width * height) / (step * step * 800)));
  if (count < minPixels) return null;

  const pad = Math.max(8, Math.round(Math.min(width, height) * 0.015));
  const box = {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: Math.min(width - Math.max(0, minX - pad), maxX - minX + pad * 2),
    h: Math.min(height - Math.max(0, minY - pad), maxY - minY + pad * 2),
    pixelCount: count,
    yellowRatio: count ? yellowCount / count : 0,
    bgGray,
  };

  if (box.w < width * 0.08 || box.h < height * 0.04) return null;
  if (box.w > width * 0.98 && box.h > height * 0.95) return null;

  return box;
}

/**
 * 말풍선 영역만 잘라 OCR 노이즈(상태바·UI) 제거
 * @param {HTMLCanvasElement} canvas
 */
export function cropKakaoBubbleFromCanvas(canvas) {
  const box = detectKakaoBubbleBox(canvas);
  if (!box) return { canvas, cropped: false, reason: "no_bubble" };

  const out = document.createElement("canvas");
  out.width = box.w;
  out.height = box.h;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { canvas, cropped: false, reason: "canvas_failed" };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, box.w, box.h);
  ctx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

  return {
    canvas: out,
    cropped: true,
    reason: box.yellowRatio > 0.3 ? "yellow_bubble" : "gray_bubble",
    cropBox: box,
  };
}

/**
 * 가로 스트립별 텍스트 밀도로 UI chrome vs 메시지 영역 구분
 */
function analyzeContentBands(source, width, height) {
  const sampleW = Math.min(240, width);
  const sampleH = Math.min(480, height);
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  const rowScores = new Array(sampleH).fill(0);

  for (let y = 0; y < sampleH; y++) {
    let score = 0;
    for (let x = 0; x < sampleW; x++) {
      const i = (y * sampleW + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      const isBubble =
        (r > 210 && g > 190 && b < 120) ||
        (r > 235 && g > 235 && b > 235 && gray < 250) ||
        (gray < 55);
      const isUiChrome = gray > 245 || (r > 248 && g > 248 && b > 248);
      if (isBubble && !isUiChrome) score += 1;
      else if (gray < 180 && !isUiChrome) score += 0.35;
    }
    rowScores[y] = score / sampleW;
  }

  const threshold = 0.08;
  let start = 0;
  let end = sampleH - 1;
  for (let y = 0; y < sampleH; y++) {
    if (rowScores[y] >= threshold) {
      start = y;
      break;
    }
  }
  for (let y = sampleH - 1; y >= 0; y--) {
    if (rowScores[y] >= threshold) {
      end = y;
      break;
    }
  }

  const contentRatio = (end - start) / sampleH;
  if (contentRatio < 0.15 || contentRatio > 0.92) return null;

  const padY = Math.round(sampleH * 0.02);
  const y0 = Math.max(0, Math.round((start - padY) * (height / sampleH)));
  const y1 = Math.min(height, Math.round((end + padY) * (height / sampleH)));
  const side = Math.round(width * 0.04);

  if (y1 - y0 < height * 0.12) return null;

  return {
    x: side,
    y: y0,
    w: width - side * 2,
    h: y1 - y0,
  };
}

async function loadSource(image) {
  if (typeof image === "string") {
    const img = new Image();
    img.decoding = "async";
    img.src = image;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, bitmap: null };
  }
  if (image instanceof HTMLCanvasElement) {
    return { source: image, width: image.width, height: image.height, bitmap: null };
  }
  const bitmap = await createImageBitmap(image);
  return { source: bitmap, width: bitmap.width, height: bitmap.height, bitmap };
}

function isKakaoNoiseLine(line) {
  const s = String(line || "").trim();
  if (!s) return true;
  if (/^(KT|SKT|LG\s*U\+|5G|LTE|Wi-Fi|WiFi)$/i.test(s)) return true;
  if (/^(KT|SKT|LG\s*U\+).*\d{1,2}:\d{2}/i.test(s)) return true;
  if (/^KT\d/i.test(s) && !/\d{3,4}\s*동/u.test(s)) return true;
  if (/Md&@p|»/.test(s) && !/[가-힣]{2,}/u.test(s)) return true;
  if (/^\d{1,2}:\d{2}$/.test(s)) return true;
  if (/^(오전|오후)\s*\d{1,2}:\d{2}$/.test(s)) return true;
  if (/^\d{1,3}\s*%$/.test(s)) return true;
  if (/^(메시지\s*입력|메시지를\s*입력|전송|검색|\+|#|카메라|갤러리)$/u.test(s)) return true;
  if (/^(채팅|대화|참여\s*\d+\s*명|초대)$/u.test(s)) return true;
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/u.test(s)) return true;
  if (/^(q|w|e|r|t|y|u|i|o|p|a|s|d|f|g|h|j|k|l|z|x|c|v|b|n|m)$/i.test(s)) return true;
  if (/^[\d\s:APM오전후]+$/.test(s) && s.length <= 8) return true;
  if (/^[@&\d:A-Za-z]{4,}$/.test(s) && !/[가-힣]{2,}/u.test(s)) return true;
  return false;
}

export function filterKakaoOcrLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .flatMap((line) => String(line || "").split(/[&]+/))
    .map((line) => sanitizeOcrGarbage(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isKakaoNoiseLine(line))
    .join("\n");
}
