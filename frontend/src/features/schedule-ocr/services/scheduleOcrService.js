import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../../utils/schedulePasteParser";
import { extractTextFromScheduleImage, SCHEDULE_OCR_MODE } from "../../../utils/scheduleOcr";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../../constants/scheduleDefaults";
import { SCHEDULE_OCR_ERROR, SCHEDULE_OCR_STAGE } from "../errors/scheduleOcrErrors";
import { createScheduleOcrDraft } from "../generator/scheduleDraftModel";
import { generatePersonalDraftsFromTable, parseScheduleTable } from "../parser/tableParser";
import { resolveFailureStage } from "../../site-import/parser/siteImportDiag";
import { applyScheduleImportTitleToForm } from "../utils/scheduleFormApplyTitle";
import { extractSiteLineCandidates } from "../parser/siteLineCandidateExtractor";
import { isAiVisionOcrEnabled } from "../../site-import/utils/visionOcrPrefs";
import { fetchVisionSiteData } from "./visionOcrService";
import { buildVisionOcrDiagFromTesseract } from "../../site-import/utils/visionOcrDiagModel";
import { OCR_SOURCE, reportOcrAttemptFromChatResult } from "../../site-import/utils/ocrAnalyticsReporter";

const DIAG_PREFIX = "[SCHEDULE-OCR]";

function withTesseractVisionDiag(payload, chatResult, visionAttempted) {
  if (chatResult) {
    reportOcrAttemptFromChatResult(chatResult, {
      ocrSource: OCR_SOURCE.TESSERACT,
    });
  }
  if (!chatResult) return payload;
  return {
    ...payload,
    visionOcrDiag: buildVisionOcrDiagFromTesseract(chatResult, { visionAttempted }),
  };
}

function chatResultToDraft(result, defaults = {}) {
  const title = applyScheduleImportTitleToForm(result, { log: false });
  if (!title && !result?.dateKey) return null;
  return createScheduleOcrDraft({
    dateKey: result.dateKey,
    title: title || "현장 작업",
    startTime: result.startTime || defaults.startTime || SCHEDULE_DEFAULT_START_TIME,
    endTime: result.endTime || defaults.endTime || SCHEDULE_DEFAULT_END_TIME,
    memo: result.memo || defaults.memo || "",
    color: defaults.color || "blue",
  });
}

function logOcrEngineResult(ocrResult, label = "primary") {
  console.groupCollapsed(`${DIAG_PREFIX} OCR 엔진 결과 (${label})`);
  console.log("rawText (원문 전체):", ocrResult?.rawText ?? "—");
  console.log("confidence:", ocrResult?.confidence);
  console.log("정규화/후처리:", ocrResult?.ocrPostprocessText ?? ocrResult?.postprocessed?.text ?? "—");
  console.log("text (필터 후):", ocrResult?.text ?? "—");
  console.log("voting:", ocrResult?.voting ?? "—");
  console.log("variantAttempts:", ocrResult?.variantAttempts?.map((a) => ({
    variant: a.variant,
    confidence: a.confidence,
    charCount: a.charCount,
  })));
  console.log("lineCount:", ocrResult?.lineCount);
  console.log("charCount:", ocrResult?.charCount);
  console.log("mode:", ocrResult?.mode);
  console.groupEnd();
}

function logFinalTitle(chatResult, label = "primary") {
  console.log(`${DIAG_PREFIX} 최종 제목 (${label}):`, chatResult?.title ?? "—", {
    structureOk: chatResult?.structureOk,
    siteName: chatResult?.structureTrace?.siteName,
    building: chatResult?.structureTrace?.building,
    unit: chatResult?.structureTrace?.unit,
  });
}

function logParseOutcome(ocrResult, chatResult, label = "primary") {
  const failure = resolveFailureStage({
    ocrText: ocrResult?.text,
    fieldParse: chatResult?.structureTrace,
    title: chatResult?.title,
    titleDiag: chatResult?.titleDiag,
  });
  console.warn(`${DIAG_PREFIX} parse outcome (${label}):`, {
    failureStage: failure.stage,
    failureLabel: failure.label,
    structureOk: chatResult?.structureOk,
    title: chatResult?.title,
    titlePath: chatResult?.titleDiag?.path,
    garbageRejected: chatResult?.parseDiagnostics?.garbageRejected,
    rejectedTitle: chatResult?.parseDiagnostics?.rejectedTitle,
  });
}

/**
 * 공정표/캡처 OCR → 개인 일정 draft 배열
 */
export async function runScheduleOcrImport(file, options = {}) {
  const referenceDate = options.referenceDate || new Date();
  const forceTable = options.mode === SCHEDULE_OCR_MODE.TABLE || options.tableMode;
  const visionEnabled = options.useVisionOcr !== false && isAiVisionOcrEnabled() && !forceTable;
  const visionAttempted = visionEnabled;

  if (visionEnabled) {
    console.log("[VISION-OCR] attempting gemini vision", {
      fileName: file?.name,
      tableMode: forceTable,
      aiVisionOcr: isAiVisionOcrEnabled(),
    });
    try {
      const { visionData, visionOcrDiag } = await fetchVisionSiteData(file);
      return {
        stage: SCHEDULE_OCR_STAGE.VISION_REVIEW,
        visionData,
        visionOcrDiag,
        ocrResult: { source: "gemini-vision", visionData },
      };
    } catch (error) {
      console.warn(`${DIAG_PREFIX} Vision OCR 실패`, error?.message || error);
      return {
        errorCode: SCHEDULE_OCR_ERROR.VISION_FAILED,
        message: error?.message,
        visionOcrDiag: buildVisionOcrDiagFromTesseract(null, { visionAttempted: true }),
      };
    }
  }

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
    console.warn(`${DIAG_PREFIX} OCR 엔진 실패`, error);
    return {
      stage: SCHEDULE_OCR_ERROR.ENGINE_FAILED,
      errorCode: SCHEDULE_OCR_ERROR.ENGINE_FAILED,
      error,
      ocrResult: null,
    };
  }

  logOcrEngineResult(ocrResult, "kakao_crop");

  if (!ocrResult?.text?.trim()) {
    console.warn(`${DIAG_PREFIX} OCR 실패 — 필터 후 텍스트 없음`, {
      rawText: ocrResult?.rawText,
    });
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
    {
      source: SCHEDULE_IMPORT_SOURCE.OCR,
      text: ocrResult.text,
      ocrRawText: ocrResult.rawText,
    },
    { referenceDate }
  );

  logParseOutcome(ocrResult, chatResult, "kakao_crop");
  logFinalTitle(chatResult, "kakao_crop");

  let finalOcrResult = ocrResult;
  let finalChatResult = chatResult;

  if (!forceTable && !finalChatResult.structureOk) {
    console.warn(`${DIAG_PREFIX} 구조화 실패 — 크롭 없이 OCR 재시도`);
    try {
      const retryOcr = await runOcr(false);
      logOcrEngineResult(retryOcr, "no_crop_retry");
      if (retryOcr?.text?.trim()) {
        const retryChat = parseScheduleImport(
          {
            source: SCHEDULE_IMPORT_SOURCE.OCR,
            text: retryOcr.text,
            ocrRawText: retryOcr.rawText,
          },
          { referenceDate }
        );
        logParseOutcome(retryOcr, retryChat, "no_crop_retry");
        logFinalTitle(retryChat, "no_crop_retry");
        const retryScore = retryChat.structureTrace?.matchCount || 0;
        const firstScore = finalChatResult.structureTrace?.matchCount || 0;
        if (
          retryChat.structureOk ||
          (retryScore > firstScore && retryChat.title && !/^-?\d{1,3}$/.test(retryChat.title))
        ) {
          console.log(`${DIAG_PREFIX} 재시도 결과 채택`, {
            retryStructureOk: retryChat.structureOk,
            retryTitle: retryChat.title,
            retryScore,
            firstScore,
          });
          finalOcrResult = retryOcr;
          finalChatResult = retryChat;
        } else {
          console.warn(`${DIAG_PREFIX} 재시도 결과 미채택 — 1차 결과 유지`);
        }
      }
    } catch (retryError) {
      console.warn(`${DIAG_PREFIX} 크롭 없이 재시도 실패`, retryError);
    }
  }

  ocrResult = finalOcrResult;
  let resolvedChatResult = finalChatResult;

  if (!forceTable) {
    const sitePick = extractSiteLineCandidates(ocrResult.text);
    if (sitePick.candidates.length > 0) {
      return withTesseractVisionDiag(
        {
          stage: SCHEDULE_OCR_STAGE.SITE_CANDIDATES,
          needsSiteCandidatePick: true,
          siteLineCandidates: sitePick.candidates,
          selectedSiteLineId: sitePick.selectedId,
          ocrResult,
          chatResult: resolvedChatResult,
          useComposer: true,
        },
        resolvedChatResult,
        visionAttempted
      );
    }
  }

  const formApplyTitle = applyScheduleImportTitleToForm(resolvedChatResult);
  if (formApplyTitle && formApplyTitle !== resolvedChatResult.title) {
    resolvedChatResult = {
      ...resolvedChatResult,
      title: formApplyTitle,
      finalTitle: formApplyTitle,
    };
  }

  if (resolvedChatResult.ok || resolvedChatResult.filledFields?.length) {
    const draft = chatResultToDraft(resolvedChatResult, options.defaults);
    if (draft) {
      return withTesseractVisionDiag(
        {
          stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
          drafts: [draft],
          ocrResult,
          chatResult: resolvedChatResult,
          useComposer: true,
        },
        resolvedChatResult,
        visionAttempted
      );
    }
    console.warn(`${DIAG_PREFIX} draft 생성 실패`, {
      title: resolvedChatResult.title,
      dateKey: resolvedChatResult.dateKey,
    });
  }

  if (forceTable || ocrResult.profile?.likelyTable) {
    return withTesseractVisionDiag(
      {
        stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
        errorCode: tableResult.items.length
          ? SCHEDULE_OCR_ERROR.GENERATE_FAILED
          : SCHEDULE_OCR_ERROR.TABLE_PARSE_FAILED,
        ocrResult,
        tableResult,
        chatResult: resolvedChatResult,
      },
      resolvedChatResult,
      visionAttempted
    );
  }

  return withTesseractVisionDiag(
    {
      stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
      errorCode: SCHEDULE_OCR_ERROR.UNSUPPORTED_FORMAT,
      ocrResult,
      tableResult,
      chatResult: resolvedChatResult,
    },
    resolvedChatResult,
    visionAttempted
  );
}
