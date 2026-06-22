import { extractTextFromScheduleImage, SCHEDULE_OCR_MODE } from "../../../utils/scheduleOcr";
import { filterKakaoOcrLines } from "../../../utils/kakaoScreenshotCrop";
import { structuredInfoToFormPatch, structureSiteInfo } from "../structure/siteInfoStructurer";

export const SITE_IMPORT_OCR_STAGE = {
  SUCCESS: "success",
  NO_SITE_INFO: "no_site_info",
  ENGINE_FAILED: "engine_failed",
  EMPTY_TEXT: "empty_text",
};

/**
 * 카톡 캡처 OCR → 구조화 → 폼 패치
 * @param {File} file
 * @param {{ selectedDateKey?: string, onProgress?: Function, useGpt?: boolean }} [options]
 */
export async function runSiteImportOcr(file, options = {}) {
  let ocrResult;
  try {
    ocrResult = await extractTextFromScheduleImage(file, {
      mode: SCHEDULE_OCR_MODE.CHAT,
      kakaoCrop: true,
      onProgress: options.onProgress,
    });
  } catch (error) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.ENGINE_FAILED,
      message: error?.message || "OCR 처리에 실패했습니다.",
      error,
    };
  }

  const filtered = filterKakaoOcrLines(ocrResult.text);
  const text = filtered.trim() || ocrResult.text?.trim() || "";

  if (!text) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.EMPTY_TEXT,
      message: "현장 정보를 찾지 못했습니다",
      ocrResult,
    };
  }

  const structured = await structureSiteInfo(text, {
    useGpt: options.useGpt !== false,
    referenceDate: options.referenceDate,
  });

  const { patch, applied } = structuredInfoToFormPatch(structured, text, options.selectedDateKey);

  if (!applied) {
    return {
      stage: SITE_IMPORT_OCR_STAGE.NO_SITE_INFO,
      message: structured.message || "현장 정보를 찾지 못했습니다",
      ocrResult: { ...ocrResult, text, filteredText: filtered },
      structured,
    };
  }

  return {
    stage: SITE_IMPORT_OCR_STAGE.SUCCESS,
    ocrResult: { ...ocrResult, text, filteredText: filtered },
    structured,
    patch,
  };
}
