import {
  parseSchedulePasteText,
  SCHEDULE_IMPORT_SOURCE,
} from "../../../utils/schedulePasteParser";
import { structureSiteInfo } from "../../site-import/structure/siteInfoStructurer";
import { buildScheduleTitle, extractSiteInfo } from "../../site-import/extractor/siteInfoExtractor";
import { extractPasteMeta } from "../../site-import/parser/pasteMetaExtractor";
import {
  IMPORT_SOURCE,
  reportTextPasteAttempt,
} from "../../site-import/utils/ocrAnalyticsReporter";

function mergePasswordMemo(memo, siteInfo) {
  const parts = String(memo || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const blob = parts.join("\n");

  if (siteInfo?.commonPassword && !blob.includes(siteInfo.commonPassword)) {
    parts.push(`공동비밀번호: ${siteInfo.commonPassword}`);
  }
  if (siteInfo?.housePassword && !blob.includes(siteInfo.housePassword)) {
    parts.push(`세대비밀번호: ${siteInfo.housePassword}`);
  }
  return parts.join("\n");
}

function enrichFromSiteInfo(result, siteInfo, meta) {
  const building = result.structureTrace?.building || siteInfo.building || "";
  const unit = result.structureTrace?.unit || siteInfo.unit || "";
  const apartmentName = result.structureTrace?.siteName || siteInfo.apartmentName || "";
  const structureOk = Boolean(building && unit);
  const title =
    result.title ||
    buildScheduleTitle({ apartmentName, building, unit }) ||
    apartmentName ||
    "";

  const structureTrace = {
    ...(result.structureTrace || {}),
    siteName: apartmentName,
    building,
    unit,
    structureOk,
    commonPassword: siteInfo.commonPassword || "",
    housePassword: siteInfo.housePassword || "",
    workItems: siteInfo.workItems || [],
    oyajiName: meta.oyajiName || "",
    clientName: meta.clientName || "",
    craft: meta.craft || siteInfo.craft || "",
  };

  const memo = mergePasswordMemo(result.memo, siteInfo);
  const filledFields = [...(result.filledFields || [])];
  if (title && !filledFields.includes("title")) filledFields.push("title");
  if (structureOk && !filledFields.includes("structureOk")) filledFields.push("structureOk");
  if (memo && !filledFields.includes("memo")) filledFields.push("memo");

  return {
    ...result,
    ok: Boolean(title && result.dateKey),
    title: title || null,
    finalTitle: title || null,
    memo,
    structureOk,
    structureTrace,
    structureMetrics: { siteName: apartmentName, building, unit },
    pasteMeta: meta,
    importSource: IMPORT_SOURCE.TEXT_PASTE,
    filledFields,
    warnings: title ? result.warnings : [...(result.warnings || []), "제목을 직접 입력해 주세요."],
  };
}

/**
 * 카톡 붙여넣기 파이프라인
 * 규칙 파서 → Memory/Global(실패 시) → AI(실패 시)
 */
export async function parseSchedulePastePipeline(text, options = {}) {
  const rawText = String(text || "").trim();
  let result = parseSchedulePasteText(rawText, {
    ...options,
    source: SCHEDULE_IMPORT_SOURCE.PASTE,
  });

  const siteInfo = extractSiteInfo(rawText);
  const meta = extractPasteMeta(rawText);
  result = enrichFromSiteInfo(result, siteInfo, meta);

  if (!result.structureOk && options.enrichOnFailure !== false) {
    const structured = await structureSiteInfo(rawText, {
      useGpt: options.useGpt !== false,
      ocrSource: IMPORT_SOURCE.TEXT_PASTE,
      userId: options.userId || "me",
      schedules: options.schedules,
      referenceDate: options.referenceDate,
      selectedDateKey: options.selectedDateKey,
      activityRegions: options.activityRegions,
      recentAddresses: options.recentAddresses,
      kakao: options.kakao,
    });

    if (structured.building && structured.unit) {
      const apartmentName = structured.apartmentName || result.structureTrace?.siteName || "";
      const title = structured.title || buildScheduleTitle(structured);
      result = {
        ...result,
        ok: Boolean(title && result.dateKey),
        title,
        finalTitle: title,
        structureOk: true,
        memo: mergePasswordMemo(
          [result.memo, (structured.workItems || []).join(" · ")].filter(Boolean).join("\n"),
          { commonPassword: structured.commonPassword, housePassword: structured.housePassword }
        ),
        structureTrace: {
          ...result.structureTrace,
          siteName: apartmentName,
          building: structured.building,
          unit: structured.unit,
          structureOk: true,
          commonPassword: structured.commonPassword || "",
          housePassword: structured.housePassword || "",
          craft: structured.craft || meta.craft || "",
        },
        filledFields: [...new Set([...(result.filledFields || []), "title", "structureOk"])],
        warnings: result.warnings?.filter((w) => !w.includes("제목")) || [],
      };
    }
  } else {
    reportTextPasteAttempt(result);
  }

  result.importSource = IMPORT_SOURCE.TEXT_PASTE;
  return result;
}
