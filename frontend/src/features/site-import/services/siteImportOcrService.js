import { extractTextFromScheduleImage, SCHEDULE_OCR_MODE } from "../../../utils/scheduleOcr";
import { filterKakaoOcrLines } from "../../../utils/kakaoScreenshotCrop";
import {
  multiScheduleRowToFormPatch,
  structuredInfoToFormPatch,
  structureSiteInfo,
} from "../structure/siteInfoStructurer";

export const SITE_IMPORT_OCR_STAGE = {
  SUCCESS: "success",
  MULTI: "multi",
  NO_SITE_INFO: "no_site_info",
  ENGINE_FAILED: "engine_failed",
  EMPTY_TEXT: "empty_text",
};

async function ocrSingleFile(file, onProgress) {
  return extractTextFromScheduleImage(file, {
    mode: SCHEDULE_OCR_MODE.CHAT,
    kakaoCrop: true,
    onProgress,
  });
}

/**
 * @param {File|File[]} fileOrFiles
 */
export async function runSiteImportOcr(fileOrFiles, options = {}) {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles].filter(Boolean);
  if (!files.length) {
    return { stage: SITE_IMPORT_OCR_STAGE.EMPTY_TEXT, message: "현장 정보를 찾지 못했습니다" };
  }

  const textParts = [];
  let lastOcrResult = null;

  try {
    for (const file of files) {
      const ocrResult = await ocrSingleFile(file, options.onProgress);
      lastOcrResult = ocrResult;
      const filtered = filterKakaoOcrLines(ocrResult.text);
      const chunk = filtered.trim() || ocrResult.text?.trim() || "";
      if (chunk) textParts.push(chunk);
    }
  } catch (error) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.ENGINE_FAILED,
      message: error?.message || "OCR 처리에 실패했습니다.",
      error,
    };
  }

  const text = textParts.join("\n\n").trim();
  if (!text) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.EMPTY_TEXT,
      message: "현장 정보를 찾지 못했습니다",
      ocrResult: lastOcrResult,
    };
  }

  const structured = await structureSiteInfo(text, {
    useGpt: options.useGpt !== false,
    referenceDate: options.referenceDate,
    selectedDateKey: options.selectedDateKey,
    activityRegions: options.activityRegions,
    recentAddresses: options.recentAddresses,
    kakao: options.kakao,
  });

  const ocrResult = { ...lastOcrResult, text, filteredText: text, fileCount: files.length };

  if (structured.multiSchedules?.length >= 2) {
    const { patch } = structuredInfoToFormPatch(structured, text, options.selectedDateKey);
    return {
      stage: SITE_IMPORT_OCR_STAGE.MULTI,
      ocrResult,
      structured,
      patch,
      multiSchedules: structured.multiSchedules,
    };
  }

  const { patch, applied } = structuredInfoToFormPatch(structured, text, options.selectedDateKey);

  if (!applied) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.NO_SITE_INFO,
      message: structured.message || "현장 정보를 찾지 못했습니다",
      ocrResult,
      structured,
    };
  }

  return {
    stage: SITE_IMPORT_OCR_STAGE.SUCCESS,
    ocrResult,
    structured,
    patch,
  };
}

export { multiScheduleRowToFormPatch, structuredInfoToFormPatch, structureSiteInfo };
