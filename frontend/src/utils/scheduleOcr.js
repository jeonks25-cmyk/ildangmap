import { cropKakaoMessageRegion, filterKakaoOcrLines } from "./kakaoScreenshotCrop";

let ocrWorker = null;

export const SCHEDULE_OCR_MODE = {
  AUTO: "auto",
  CHAT: "chat",
  TABLE: "table",
};

export const SCHEDULE_OCR_STAGE = {
  SUCCESS: "success",
  ENGINE_FAILED: "engine_failed",
  EMPTY_TEXT: "empty_text",
};

const OCR_DIAG_PREFIX = "[SCHEDULE-OCR]";

function logScheduleOcrDiag(step, detail) {
  if (detail !== undefined) {
    console.log(`${OCR_DIAG_PREFIX} ${step}`, detail);
  } else {
    console.log(`${OCR_DIAG_PREFIX} ${step}`);
  }
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function formatOcrError(error) {
  const message = String(error?.message || error || "알 수 없는 오류");
  if (/network|fetch|failed to fetch/i.test(message)) {
    return "OCR 엔진 로드에 실패했습니다. 네트워크 연결을 확인해 주세요.";
  }
  if (/memory|allocation|canvas/i.test(message)) {
    return "이미지가 너무 커서 처리하지 못했습니다. 해상도를 낮춰 다시 시도해 주세요.";
  }
  if (/not supported|invalid/i.test(message)) {
    return "지원하지 않는 이미지 형식입니다.";
  }
  return message;
}

/**
 * 공정표/캘린더 이미지 휴리스틱 (가로형·고해상도·파일명)
 * @returns {{ likelyTable: boolean, width: number, height: number, reason: string }}
 */
export async function inspectScheduleImage(file) {
  const name = String(file?.name || "").toLowerCase();
  const nameHint = /공정|일정|캘린더|calendar|schedule|표/.test(name);

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();

    const aspect = width / Math.max(height, 1);
    const pixels = width * height;
    const likelyTable =
      nameHint ||
      (width >= 700 && height >= 900 && aspect < 1.4) ||
      (pixels >= 1_500_000 && height > width);

    const reason = nameHint
      ? "filename"
      : likelyTable
        ? "layout"
        : "chat";

    return { likelyTable, width, height, reason };
  } catch (error) {
    return { likelyTable: nameHint, width: 0, height: 0, reason: "inspect_failed", error: error?.message };
  }
}

async function loadImageSource(image) {
  if (typeof image === "string") {
    const img = new Image();
    img.decoding = "async";
    img.src = image;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  }

  const bitmap = await createImageBitmap(image);
  return { source: bitmap, width: bitmap.width, height: bitmap.height, bitmap };
}

/**
 * 공정표 모드: 소형 글자 인식을 위해 확대 + 대비 강화
 */
async function preprocessImageForOcr(image, mode, options = {}) {
  const useKakaoCrop = options.kakaoCrop !== false && mode === SCHEDULE_OCR_MODE.CHAT;
  let workingImage = image;

  if (useKakaoCrop) {
    try {
      const cropped = await cropKakaoMessageRegion(image);
      if (cropped.cropped) {
        workingImage = cropped.source;
        logScheduleOcrDiag("kakao_crop", {
          reason: cropped.reason,
          width: cropped.width,
          height: cropped.height,
        });
      }
    } catch (error) {
      logScheduleOcrDiag("kakao_crop_failed", error?.message || String(error));
    }
  }

  const { source, width, height, bitmap } = await loadImageSource(workingImage);
  const isTable = mode === SCHEDULE_OCR_MODE.TABLE;

  const maxDim = 3200;
  const minTableWidth = 1800;
  let targetW = width;
  let targetH = height;

  if (isTable) {
    const scaleUp = Math.max(1, minTableWidth / width, 1.6);
    targetW = Math.min(Math.round(width * scaleUp), maxDim);
    targetH = Math.min(Math.round(height * (targetW / width)), maxDim);
  } else if (Math.max(width, height) > maxDim) {
    const scaleDown = maxDim / Math.max(width, height);
    targetW = Math.round(width * scaleDown);
    targetH = Math.round(height * scaleDown);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: isTable });
  if (!ctx) {
    bitmap?.close?.();
    return image;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = !isTable;
  ctx.drawImage(source, 0, 0, targetW, targetH);
  bitmap?.close?.();

  if (isTable) {
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const boosted = gray < 140 ? Math.max(0, gray - 25) : Math.min(255, gray + 20);
      const v = boosted > 165 ? 255 : boosted < 95 ? 0 : boosted;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

async function getOcrWorker(onProgress) {
  if (ocrWorker) return ocrWorker;
  const { createWorker } = await import("tesseract.js");
  ocrWorker = await createWorker("kor+eng", 1, {
    logger: (message) => {
      if (!onProgress) return;
      if (message.status === "recognizing text" || message.status === "loading language traineddata") {
        onProgress(message.progress ?? 0, message.status);
      }
    },
  });
  return ocrWorker;
}

async function runOcrAttempt(image, mode, onProgress, options = {}) {
  const worker = await getOcrWorker(onProgress);
  const isTable = mode === SCHEDULE_OCR_MODE.TABLE;
  const input = await preprocessImageForOcr(image, mode, options);

  const { PSM } = await import("tesseract.js");
  await worker.setParameters({
    tessedit_pageseg_mode: isTable ? PSM.SPARSE_TEXT : PSM.AUTO,
  });

  const { data } = await worker.recognize(input);
  let text = normalizeOcrText(data.text);
  if (mode === SCHEDULE_OCR_MODE.CHAT && options.kakaoCrop !== false) {
    text = filterKakaoOcrLines(text);
  }
  const words = Array.isArray(data.words)
    ? data.words.map((w) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      }))
    : [];

  return {
    text,
    confidence: Number(data.confidence) || 0,
    rawText: String(data.text || ""),
    words,
    mode,
    preprocess: isTable ? "table_upscale_contrast" : "default",
    lineCount: text ? text.split("\n").length : 0,
    charCount: text.length,
  };
}

function resolveModes(requestedMode, profile) {
  if (requestedMode === SCHEDULE_OCR_MODE.CHAT) return [SCHEDULE_OCR_MODE.CHAT];
  if (requestedMode === SCHEDULE_OCR_MODE.TABLE) return [SCHEDULE_OCR_MODE.TABLE];
  if (profile?.likelyTable) return [SCHEDULE_OCR_MODE.TABLE, SCHEDULE_OCR_MODE.CHAT];
  return [SCHEDULE_OCR_MODE.CHAT, SCHEDULE_OCR_MODE.TABLE];
}

/**
 * @param {File|Blob|string} image
 * @param {{ onProgress?: (progress: number, status?: string) => void, mode?: string }} [options]
 * @returns {Promise<{ text: string, confidence: number, stage: string, mode: string, attempts: object[], rawText?: string, charCount: number, lineCount: number }>}
 */
export async function extractTextFromScheduleImage(image, options = {}) {
  const profile = await inspectScheduleImage(image);
  const modes = resolveModes(options.mode || SCHEDULE_OCR_MODE.AUTO, profile);

  logScheduleOcrDiag("start", {
    modes,
    profile,
    fileName: image?.name || "(blob)",
    fileSize: image?.size || null,
  });

  const attempts = [];
  let lastError = null;

  for (const mode of modes) {
    try {
      const result = await runOcrAttempt(image, mode, options.onProgress, options);
      attempts.push({ mode, ok: true, charCount: result.charCount, confidence: result.confidence });

      logScheduleOcrDiag("response", {
        mode,
        charCount: result.charCount,
        lineCount: result.lineCount,
        confidence: result.confidence,
        preprocess: result.preprocess,
        textPreview: result.text.slice(0, 500),
        rawPreview: result.rawText.slice(0, 500),
        wordsSample: result.words?.slice(0, 12),
      });

      if (!result.text.trim()) {
        logScheduleOcrDiag("empty_text", { mode, confidence: result.confidence });
        continue;
      }

      return {
        ...result,
        stage: SCHEDULE_OCR_STAGE.SUCCESS,
        attempts,
        profile,
      };
    } catch (error) {
      lastError = error;
      const formatted = formatOcrError(error);
      attempts.push({ mode, ok: false, error: formatted });
      logScheduleOcrDiag("attempt_failed", { mode, error: formatted, raw: error?.message || String(error) });
    }
  }

  if (lastError) {
    const err = new Error(formatOcrError(lastError));
    err.stage = SCHEDULE_OCR_STAGE.ENGINE_FAILED;
    err.attempts = attempts;
    err.profile = profile;
    throw err;
  }

  return {
    text: "",
    confidence: 0,
    rawText: "",
    stage: SCHEDULE_OCR_STAGE.EMPTY_TEXT,
    mode: modes[modes.length - 1],
    attempts,
    profile,
    charCount: 0,
    lineCount: 0,
  };
}

export { formatOcrError, logScheduleOcrDiag, filterKakaoOcrLines };

export async function releaseScheduleOcrWorker() {
  if (!ocrWorker) return;
  try {
    await ocrWorker.terminate();
  } finally {
    ocrWorker = null;
  }
}
