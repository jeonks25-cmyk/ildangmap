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
export function detectKakaoBubbleBoxes(canvas, maxBoxes = 4) {
  const clusters = findBubbleClusters(canvas);
  return clusters
    .filter((c) => c.w >= canvas.width * 0.12 && c.h >= Math.max(12, canvas.height * 0.015))
    .sort((a, b) => b.pixelCount - a.pixelCount)
    .slice(0, maxBoxes);
}

function findBubbleClusters(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bgGray = estimateBackgroundGray(data, width, height);
  const scale = 4;
  const sw = Math.ceil(width / scale);
  const sh = Math.ceil(height / scale);
  const visited = new Uint8Array(sw * sh);
  const clusters = [];

  const isBubbleAt = (sx, sy) => {
    const x = Math.min(width - 1, sx * scale + Math.floor(scale / 2));
    const y = Math.min(height - 1, sy * scale + Math.floor(scale / 2));
    const i = (y * width + x) * 4;
    return isKakaoBubblePixel(data[i], data[i + 1], data[i + 2], bgGray);
  };

  for (let sy = 0; sy < sh; sy++) {
    for (let sx = 0; sx < sw; sx++) {
      const start = sy * sw + sx;
      if (visited[start] || !isBubbleAt(sx, sy)) continue;

      let minSx = sx;
      let maxSx = sx;
      let minSy = sy;
      let maxSy = sy;
      let size = 0;
      const stack = [[sx, sy]];
      visited[start] = 1;

      while (stack.length) {
        const [cx, cy] = stack.pop();
        size += 1;
        minSx = Math.min(minSx, cx);
        maxSx = Math.max(maxSx, cx);
        minSy = Math.min(minSy, cy);
        maxSy = Math.max(maxSy, cy);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
          const ni = ny * sw + nx;
          if (visited[ni] || !isBubbleAt(nx, ny)) continue;
          visited[ni] = 1;
          stack.push([nx, ny]);
        }
      }

      if (size < 12) continue;

      const pad = Math.max(6, Math.round(scale * 1.5));
      const x = Math.max(0, minSx * scale - pad);
      const y = Math.max(0, minSy * scale - pad);
      const w = Math.min(width - x, (maxSx - minSx + 1) * scale + pad * 2);
      const h = Math.min(height - y, (maxSy - minSy + 1) * scale + pad * 2);

      clusters.push({ x, y, w, h, pixelCount: size });
    }
  }

  return clusters;
}

export function canvasFromBubbleBox(canvas, box) {
  const out = document.createElement("canvas");
  out.width = box.w;
  out.height = box.h;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, box.w, box.h);
  ctx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return out;
}

/** @deprecated 단일 bbox — 다중 말풍선 시 첫 번째만 */
export function detectKakaoBubbleBox(canvas) {
  const boxes = detectKakaoBubbleBoxes(canvas, 1);
  return boxes[0] || null;
}

/**
 * 말풍선별 분리 크롭 — 다중 말풍선 OCR용
 */
export function cropKakaoBubblesFromCanvas(canvas) {
  const boxes = detectKakaoBubbleBoxes(canvas);
  if (!boxes.length) return { canvases: [canvas], cropped: false, reason: "no_bubble", boxes: [] };

  const canvases = boxes.map((box) => canvasFromBubbleBox(canvas, box));
  return {
    canvases,
    cropped: true,
    reason: boxes.length > 1 ? "multi_bubble" : "single_bubble",
    boxes,
  };
}

/**
 * 말풍선 영역만 잘라 OCR 노이즈(상태바·UI) 제거
 * @param {HTMLCanvasElement} canvas
 */
export function cropKakaoBubbleFromCanvas(canvas) {
  const multi = cropKakaoBubblesFromCanvas(canvas);
  if (!multi.cropped) return { canvas, cropped: false, reason: multi.reason };

  return {
    canvas: multi.canvases[0],
    cropped: true,
    reason: multi.reason,
    cropBox: multi.boxes[0],
    allBoxes: multi.boxes,
    allCanvases: multi.canvases,
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
