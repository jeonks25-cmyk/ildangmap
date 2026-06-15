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

  let ocrResult;
  try {
    ocrResult = await extractTextFromScheduleImage(file, {
      mode: forceTable ? SCHEDULE_OCR_MODE.TABLE : options.mode || SCHEDULE_OCR_MODE.AUTO,
      onProgress: options.onProgress,
    });
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

  if (chatResult.ok || chatResult.filledFields?.length) {
    const draft = chatResultToDraft(chatResult, options.defaults);
    if (draft) {
      return {
        stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
        drafts: [draft],
        ocrResult,
        chatResult,
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
      chatResult,
    };
  }

  return {
    stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
    errorCode: SCHEDULE_OCR_ERROR.UNSUPPORTED_FORMAT,
    ocrResult,
    tableResult,
    chatResult,
  };
}
