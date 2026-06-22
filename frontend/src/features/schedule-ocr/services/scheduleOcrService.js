import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../../utils/schedulePasteParser";
import { extractTextFromScheduleImage, SCHEDULE_OCR_MODE } from "../../../utils/scheduleOcr";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../../constants/scheduleDefaults";
import { SCHEDULE_OCR_ERROR, SCHEDULE_OCR_STAGE } from "../errors/scheduleOcrErrors";
import { createScheduleOcrDraft } from "../generator/scheduleDraftModel";
import { generatePersonalDraftsFromTable, parseScheduleTable } from "../parser/tableParser";

function chatResultToDraft(result, defaults = {}) {
  if (!result?.title && !result?.dateKey) return null;
  return createScheduleOcrDraft({
    dateKey: result.dateKey,
    title: result.title || "현장 작업",
    startTime: result.startTime || defaults.startTime || SCHEDULE_DEFAULT_START_TIME,
    endTime: result.endTime || defaults.endTime || SCHEDULE_DEFAULT_END_TIME,
    memo: result.memo || defaults.memo || "",
    color: defaults.color || "blue",
  });
}

/**
 * 공정표/캡처 OCR → 개인 일정 draft 배열
 * @returns {Promise<{ stage: string, drafts?: import('../generator/scheduleDraftModel').ScheduleOcrDraft[], errorCode?: string, ocrResult?: object, tableResult?: object, chatResult?: object }>}
 */
export async function runScheduleOcrImport(file, options = {}) {
  const referenceDate = options.referenceDate || new Date();
  const forceTable = options.mode === SCHEDULE_OCR_MODE.TABLE || options.tableMode;

  async function runOcr(kakaoCrop) {
    return extractTextFromScheduleImage(file, {
      mode: forceTable ? SCHEDULE_OCR_MODE.TABLE : options.mode || SCHEDULE_OCR_MODE.AUTO,
      kakaoCrop,
      onProgress: options.onProgress,
    });
  }

  let ocrResult;
  try {
    ocrResult = await runOcr(true);
  } catch (error) {
    return {
      stage: SCHEDULE_OCR_ERROR.ENGINE_FAILED,
      errorCode: SCHEDULE_OCR_ERROR.ENGINE_FAILED,
      error,
      ocrResult: null,
    };
  }

  if (!ocrResult?.text?.trim()) {
    return {
      stage: SCHEDULE_OCR_ERROR.EMPTY_TEXT,
      errorCode: SCHEDULE_OCR_ERROR.EMPTY_TEXT,
      ocrResult,
    };
  }

  const tableResult = parseScheduleTable(
    { text: ocrResult.text, words: ocrResult.words },
    { referenceDate }
  );

  if (tableResult.items.length >= 2 || (forceTable && tableResult.items.length >= 1)) {
    const drafts = generatePersonalDraftsFromTable(tableResult.items, options.defaults);
    if (drafts.length) {
      return {
        stage: SCHEDULE_OCR_STAGE.TABLE_PARSED,
        drafts,
        ocrResult,
        tableResult,
      };
    }
    return {
      stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
      errorCode: SCHEDULE_OCR_ERROR.GENERATE_FAILED,
      ocrResult,
      tableResult,
    };
  }

  const chatResult = parseScheduleImport(
    { source: SCHEDULE_IMPORT_SOURCE.OCR, text: ocrResult.text },
    { referenceDate }
  );

  let finalOcrResult = ocrResult;
  let finalChatResult = chatResult;

  if (!forceTable && !finalChatResult.structureOk) {
    try {
      const retryOcr = await runOcr(false);
      if (retryOcr?.text?.trim()) {
        const retryChat = parseScheduleImport(
          { source: SCHEDULE_IMPORT_SOURCE.OCR, text: retryOcr.text },
          { referenceDate }
        );
        const retryScore = retryChat.structureTrace?.matchCount || 0;
        const firstScore = finalChatResult.structureTrace?.matchCount || 0;
        if (
          retryChat.structureOk ||
          (retryScore > firstScore && retryChat.title && !/^-?\d{1,3}$/.test(retryChat.title))
        ) {
          finalOcrResult = retryOcr;
          finalChatResult = retryChat;
        }
      }
    } catch (_) {
      /* crop 없이 재시도 실패 시 원본 유지 */
    }
  }

  ocrResult = finalOcrResult;
  const resolvedChatResult = finalChatResult;

  if (!resolvedChatResult.structureOk && resolvedChatResult.structureTrace) {
    console.warn("[schedule-ocr] structure parse failed", {
      textPreview: ocrResult.text?.slice(0, 400),
      trace: resolvedChatResult.structureTrace?.debug,
    });
  }

  if (resolvedChatResult.ok || resolvedChatResult.filledFields?.length) {
    const draft = chatResultToDraft(resolvedChatResult, options.defaults);
    if (draft) {
      return {
        stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
        drafts: [draft],
        ocrResult,
        chatResult: resolvedChatResult,
        useComposer: true,
      };
    }
  }

  if (forceTable || ocrResult.profile?.likelyTable) {
    return {
      stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
      errorCode: tableResult.items.length
        ? SCHEDULE_OCR_ERROR.GENERATE_FAILED
        : SCHEDULE_OCR_ERROR.TABLE_PARSE_FAILED,
      ocrResult,
      tableResult,
      chatResult: resolvedChatResult,
    };
  }

  return {
    stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
    errorCode: SCHEDULE_OCR_ERROR.UNSUPPORTED_FORMAT,
    ocrResult,
    tableResult,
    chatResult: resolvedChatResult,
  };
}
