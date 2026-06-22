/**
 * 카카오톡 다크모드·채팅 캡처 OCR 전처리
 */

export const OCR_PREPROCESS_VARIANT = {
  ORIGINAL: "original",
  HIGH_CONTRAST: "high_contrast",
  ADAPTIVE_BW: "adaptive_bw",
};

export const CHAT_OCR_VARIANTS = [
  OCR_PREPROCESS_VARIANT.ORIGINAL,
  OCR_PREPROCESS_VARIANT.HIGH_CONTRAST,
  OCR_PREPROCESS_VARIANT.ADAPTIVE_BW,
];

function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function toGrayscale(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

export function detectDarkModeImage(imageData) {
  const { data } = imageData;
  if (!data?.length) return false;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += toGrayscale(data[i], data[i + 1], data[i + 2]);
    count += 1;
  }
  return count ? sum / count < 118 : false;
}

function copyImageData(imageData) {
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function applyInvert(imageData) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return imageData;
}

function applyGrayscale(imageData) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = toGrayscale(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  return imageData;
}

function applyContrast(imageData, factor = 2.5) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = toGrayscale(data[i], data[i + 1], data[i + 2]);
    const boosted = clamp((gray - 128) * factor + 128);
    data[i] = data[i + 1] = data[i + 2] = boosted;
  }
  return imageData;
}

function applySharpen(imageData) {
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const idx = (x, y) => (y * width + x) * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = idx(x, y);
      const center = src[i];
      const neighbors =
        src[idx(x - 1, y)] +
        src[idx(x + 1, y)] +
        src[idx(x, y - 1)] +
        src[idx(x, y + 1)];
      const sharp = clamp(center * 5 - neighbors);
      data[i] = data[i + 1] = data[i + 2] = sharp;
    }
  }
  return imageData;
}

function applyAdaptiveThreshold(imageData, blockSize = 15, c = 8) {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = toGrayscale(data[i], data[i + 1], data[i + 2]);
  }

  const radius = Math.max(2, Math.floor(blockSize / 2));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          sum += gray[ny * width + nx];
          count += 1;
        }
      }
      const mean = count ? sum / count : gray[y * width + x];
      const value = gray[y * width + x] > mean - c ? 255 : 0;
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
  }
  return imageData;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} variant
 * @param {{ isDarkMode?: boolean }} [options]
 */
export function applyOcrPreprocessVariant(canvas, variant, options = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const isDark = options.isDarkMode ?? detectDarkModeImage(imageData);
  let working = copyImageData(imageData);

  if (isDark || variant !== OCR_PREPROCESS_VARIANT.ORIGINAL) {
    working = applyInvert(working);
  }

  if (variant === OCR_PREPROCESS_VARIANT.ORIGINAL) {
    if (isDark) working = applyContrast(working, 1.6);
    ctx.putImageData(working, 0, 0);
    return canvas;
  }

  working = applyGrayscale(working);

  if (variant === OCR_PREPROCESS_VARIANT.HIGH_CONTRAST) {
    working = applyContrast(working, isDark ? 3.0 : 2.6);
    working = applySharpen(working);
    ctx.putImageData(working, 0, 0);
    return canvas;
  }

  if (variant === OCR_PREPROCESS_VARIANT.ADAPTIVE_BW) {
    working = applyContrast(working, isDark ? 2.8 : 2.2);
    working = applySharpen(working);
    working = applyAdaptiveThreshold(working, isDark ? 19 : 17, isDark ? 10 : 8);
    ctx.putImageData(working, 0, 0);
    return canvas;
  }

  ctx.putImageData(working, 0, 0);
  return canvas;
}

export function cloneCanvas(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return canvas;
}
