/**
 * 카카오톡 스크린샷 — 말풍선(메시지) 영역만 추출
 * 상단 상태바·채팅방 제목·하단 입력창·키보드 제외
 */

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

export function filterKakaoOcrLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (/^(KT|SKT|LG\s*U\+|5G|LTE|Wi-Fi|WiFi)$/i.test(line)) return false;
      if (/^(KT|SKT|LG\s*U\+).*\d{1,2}:\d{2}/i.test(line)) return false;
      if (/Md&@p|»/.test(line) && !/[가-힣]{2,}/u.test(line)) return false;
      if (/^\d{1,2}:\d{2}$/.test(line)) return false;
      if (/^(오전|오후)\s*\d{1,2}:\d{2}$/.test(line)) return false;
      if (/^\d{1,3}\s*%$/.test(line)) return false;
      if (/^(메시지\s*입력|메시지를\s*입력|전송|검색|\+|#|카메라|갤러리)$/u.test(line)) return false;
      if (/^(채팅|대화|참여\s*\d+\s*명|초대)$/u.test(line)) return false;
      if (/^[ㄱ-ㅎㅏ-ㅣ]+$/u.test(line)) return false;
      if (/^(q|w|e|r|t|y|u|i|o|p|a|s|d|f|g|h|j|k|l|z|x|c|v|b|n|m)$/i.test(line)) return false;
      if (/^[\d\s:APM오전후]+$/.test(line) && line.length <= 8) return false;
      return true;
    })
    .join("\n");
}
