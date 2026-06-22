import { cropKakaoMessageRegion, filterKakaoOcrLines } from "./kakaoScreenshotCrop";
import {
  applyOcrPreprocessVariant,
  CHAT_OCR_VARIANTS,
  cloneCanvas,
  detectDarkModeImage,
  OCR_PREPROCESS_VARIANT,
} from "./ocr/ocrImagePreprocessor";
import {
  pickBestOcrResult,
  postprocessOcrText,
} from "./ocr/ocrTextPostprocessor";
import { buildSiteTitle, parseSiteFields } from "../features/site-import/parser/siteFieldParser";

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
const OCR_LANG = "kor+eng";

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

    const reason = nameHint ? "filename" : likelyTable ? "layout" : "chat";

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

async function prepareBaseCanvas(image, mode, options = {}) {
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
  } else {
    const scaleUp = Math.max(1, 1400 / Math.max(width, 1));
    if (scaleUp > 1.05) {
      targetW = Math.min(Math.round(width * scaleUp), maxDim);
      targetH = Math.min(Math.round(height * (targetW / width)), maxDim);
    } else if (Math.max(width, height) > maxDim) {
      const scaleDown = maxDim / Math.max(width, height);
      targetW = Math.round(width * scaleDown);
      targetH = Math.round(height * scaleDown);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap?.close?.();
    return { canvas: null, isDarkMode: false };
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, targetW, targetH);
  bitmap?.close?.();

  const probe = ctx.getImageData(0, 0, targetW, targetH);
  const isDarkMode = detectDarkModeImage(probe);

  return { canvas, isDarkMode };
}

async function getOcrWorker(onProgress) {
  if (ocrWorker) return ocrWorker;
  const { createWorker } = await import("tesseract.js");
  ocrWorker = await createWorker(OCR_LANG, 1, {
    logger: (message) => {
      if (!onProgress) return;
      if (message.status === "recognizing text" || message.status === "loading language traineddata") {
        onProgress(message.progress ?? 0, message.status);
      }
    },
  });
  return ocrWorker;
}

async function recognizeCanvas(worker, canvas, psmMode) {
  await worker.setParameters({
    tessedit_pageseg_mode: psmMode,
  });
  const { data } = await worker.recognize(canvas);
  return data;
}

function buildOcrAttemptFromData(data, variant, preprocess) {
  const rawText = String(data.text || "");
  const text = normalizeOcrText(rawText);
  return {
    variant,
    preprocess,
    text,
    rawText,
    confidence: Number(data.confidence) || 0,
    charCount: text.length,
    lineCount: text ? text.split("\n").length : 0,
    words: Array.isArray(data.words)
      ? data.words.map((w) => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox,
        }))
      : [],
  };
}

function logOcrConfidenceReport({
  variantAttempts,
  winner,
  postprocessed,
  voting,
}) {
  console.group(`${OCR_DIAG_PREFIX} OCR confidence report`);
  console.log("언어:", OCR_LANG);
  console.log("voting:", voting);
  variantAttempts.forEach((attempt) => {
    console.log(`[${attempt.variant}] confidence=${attempt.confidence} chars=${attempt.charCount}`, {
      preview: attempt.rawText.slice(0, 300),
    });
  });
  console.log("선택 variant:", winner?.variant);
  console.log("원문 (winner raw):", winner?.rawText ?? "—");
  console.log("confidence:", winner?.confidence ?? 0);
  console.log("정규화 결과:", postprocessed?.text ?? "—");
  console.log("후처리 corrections:", postprocessed?.corrections ?? []);
  const fieldParse = parseSiteFields(postprocessed?.text || "");
  const finalTitle = fieldParse.structureOk ? fieldParse.final.title : buildSiteTitle(fieldParse);
  console.log("최종 제목 (파서):", finalTitle || "—");
  console.log("structureOk:", fieldParse.structureOk, {
    siteName: fieldParse.siteName,
    building: fieldParse.building,
    unit: fieldParse.unit,
  });
  console.groupEnd();
}

async function runChatOcrMultiPass(image, onProgress, options = {}) {
  const { canvas, isDarkMode } = await prepareBaseCanvas(image, SCHEDULE_OCR_MODE.CHAT, options);
  if (!canvas) throw new Error("canvas_failed");

  const worker = await getOcrWorker(onProgress);
  const { PSM } = await import("tesseract.js");
  const variantAttempts = [];

  logScheduleOcrDiag("multi_pass_start", {
    variants: CHAT_OCR_VARIANTS,
    isDarkMode,
    width: canvas.width,
    height: canvas.height,
  });

  for (const variant of CHAT_OCR_VARIANTS) {
    const variantCanvas = cloneCanvas(canvas);
    applyOcrPreprocessVariant(variantCanvas, variant, { isDarkMode });
    const data = await recognizeCanvas(worker, variantCanvas, PSM.AUTO);
    const attempt = buildOcrAttemptFromData(data, variant, `chat_${variant}`);
    variantAttempts.push(attempt);
    logScheduleOcrDiag("variant_result", {
      variant,
      confidence: attempt.confidence,
      charCount: attempt.charCount,
      preview: attempt.rawText.slice(0, 200),
    });
  }

  const winner = pickBestOcrResult(variantAttempts);
  if (!winner) {
    return {
      text: "",
      rawText: "",
      confidence: 0,
      charCount: 0,
      lineCount: 0,
      words: [],
      mode: SCHEDULE_OCR_MODE.CHAT,
      preprocess: "chat_multi_pass",
      variantAttempts,
      voting: { strategy: "longest_weighted", winner: null },
      postprocessed: null,
    };
  }

  const postprocessed = postprocessOcrText(winner.rawText);
  let text = normalizeOcrText(postprocessed.text);
  if (options.kakaoCrop !== false) {
    text = filterKakaoOcrLines(text);
  }

  const voting = {
    strategy: "longest_weighted",
    winner: winner.variant,
    candidates: variantAttempts.map((a) => ({
      variant: a.variant,
      confidence: a.confidence,
      charCount: a.charCount,
    })),
  };

  logOcrConfidenceReport({ variantAttempts, winner, postprocessed, voting });

  return {
    text,
    rawText: winner.rawText,
    confidence: winner.confidence,
    charCount: text.length,
    lineCount: text ? text.split("\n").length : 0,
    words: winner.words,
    mode: SCHEDULE_OCR_MODE.CHAT,
    preprocess: "chat_multi_pass",
    variantAttempts,
    voting,
    postprocessed,
    ocrPostprocessText: postprocessed.text,
  };
}

async function runTableOcrAttempt(image, onProgress, options = {}) {
  const { canvas, isDarkMode } = await prepareBaseCanvas(image, SCHEDULE_OCR_MODE.TABLE, options);
  if (!canvas) throw new Error("canvas_failed");

  const worker = await getOcrWorker(onProgress);
  const { PSM } = await import("tesseract.js");

  applyOcrPreprocessVariant(canvas, OCR_PREPROCESS_VARIANT.HIGH_CONTRAST, { isDarkMode });
  const data = await recognizeCanvas(worker, canvas, PSM.SPARSE_TEXT);
  const attempt = buildOcrAttemptFromData(data, "table", "table_upscale_contrast");
  const postprocessed = postprocessOcrText(attempt.rawText);
  let text = normalizeOcrText(postprocessed.text);

  logOcrConfidenceReport({
    variantAttempts: [attempt],
    winner: attempt,
    postprocessed,
    voting: { strategy: "single_table", winner: "table" },
  });

  return {
    text,
    rawText: attempt.rawText,
    confidence: attempt.confidence,
    charCount: text.length,
    lineCount: text ? text.split("\n").length : 0,
    words: attempt.words,
    mode: SCHEDULE_OCR_MODE.TABLE,
    preprocess: attempt.preprocess,
    postprocessed,
    ocrPostprocessText: postprocessed.text,
  };
}

async function runOcrAttempt(image, mode, onProgress, options = {}) {
  if (mode === SCHEDULE_OCR_MODE.CHAT) {
    return runChatOcrMultiPass(image, onProgress, options);
  }
  return runTableOcrAttempt(image, onProgress, options);
}

function resolveModes(requestedMode, profile) {
  if (requestedMode === SCHEDULE_OCR_MODE.CHAT) return [SCHEDULE_OCR_MODE.CHAT];
  if (requestedMode === SCHEDULE_OCR_MODE.TABLE) return [SCHEDULE_OCR_MODE.TABLE];
  if (profile?.likelyTable) return [SCHEDULE_OCR_MODE.TABLE, SCHEDULE_OCR_MODE.CHAT];
  return [SCHEDULE_OCR_MODE.CHAT, SCHEDULE_OCR_MODE.TABLE];
}

export async function extractTextFromScheduleImage(image, options = {}) {
  const profile = await inspectScheduleImage(image);
  const modes = resolveModes(options.mode || SCHEDULE_OCR_MODE.AUTO, profile);

  logScheduleOcrDiag("start", {
    modes,
    profile,
    lang: OCR_LANG,
    fileName: image?.name || "(blob)",
    fileSize: image?.size || null,
  });

  const attempts = [];
  let lastError = null;

  for (const mode of modes) {
    try {
      const result = await runOcrAttempt(image, mode, options.onProgress, options);
      attempts.push({
        mode,
        ok: true,
        charCount: result.charCount,
        confidence: result.confidence,
        voting: result.voting,
      });

      logScheduleOcrDiag("response", {
        mode,
        charCount: result.charCount,
        lineCount: result.lineCount,
        confidence: result.confidence,
        preprocess: result.preprocess,
        textPreview: result.text.slice(0, 500),
        rawPreview: result.rawText.slice(0, 500),
        postprocessPreview: result.ocrPostprocessText?.slice(0, 500),
        voting: result.voting,
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
