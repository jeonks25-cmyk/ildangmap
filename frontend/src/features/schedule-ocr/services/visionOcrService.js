import { parseVisionSiteImage } from "../../../api/visionParseApi";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../../../constants/scheduleDefaults";
import { SCHEDULE_OCR_STAGE } from "../errors/scheduleOcrErrors";
import { createScheduleOcrDraft } from "../generator/scheduleDraftModel";
import { applyScheduleImportTitleToForm } from "../utils/scheduleFormApplyTitle";
import { visionResponseToScheduleImport } from "../../site-import/utils/visionImportMapper";
import { buildVisionOcrDiagFromVision } from "../../site-import/utils/visionOcrDiagModel";
import { reportOcrAttemptFromVisionDiag } from "../../site-import/utils/ocrAnalyticsReporter";

/**
 * Gemini Vision 우선 경로 — 실패 시 null (Tesseract fallback)
 */
export async function tryVisionScheduleImport(file, options = {}) {
  const referenceDate = options.referenceDate || new Date();
  const defaults = options.defaults || {};

  try {
    const visionData = await parseVisionSiteImage(file);
    let chatResult = visionResponseToScheduleImport(visionData, { referenceDate });

    if (!chatResult.structureOk && !chatResult.title) {
      return null;
    }

    const formTitle = applyScheduleImportTitleToForm(chatResult, { log: false });
    if (formTitle) {
      chatResult = { ...chatResult, title: formTitle, finalTitle: formTitle };
    }

    const draft = createScheduleOcrDraft({
      dateKey: chatResult.dateKey,
      title: chatResult.title || "현장 작업",
      startTime: chatResult.startTime || defaults.startTime || SCHEDULE_DEFAULT_START_TIME,
      endTime: chatResult.endTime || defaults.endTime || SCHEDULE_DEFAULT_END_TIME,
      memo: chatResult.memo || defaults.memo || "",
      color: defaults.color || "blue",
    });

    if (!draft) return null;

    const visionOcrDiag = buildVisionOcrDiagFromVision(visionData, chatResult);
    reportOcrAttemptFromVisionDiag(visionOcrDiag);

    return {
      stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
      drafts: [draft],
      ocrResult: {
        source: "gemini-vision",
        text: "",
        visionData,
      },
      chatResult,
      useComposer: true,
      visionSource: true,
      visionOcrDiag,
    };
  } catch (error) {
    console.warn("[VISION-OCR] schedule import failed — fallback", error?.message || error);
    return null;
  }
}
