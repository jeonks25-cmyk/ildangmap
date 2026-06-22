/**
 * 현장/일정 OCR 구조화 파이프라인 진단 로그
 */

import { isStructureDebugEnabled } from "./siteImportStructureMetrics";

const PREFIX = "[SCHEDULE-OCR]";

export function isScheduleOcrDiagEnabled() {
  if (typeof window === "undefined") return true;
  try {
    if (window.location.search.includes("ocrDebug=1")) return true;
    if (localStorage.getItem("ildangmap_ocr_debug") === "1") return true;
  } catch (_) {
    /* ignore */
  }
  return true;
}

function shouldLog(source) {
  return source === "ocr" || isScheduleOcrDiagEnabled() || isStructureDebugEnabled();
}

/**
 * @param {'ocr_empty'|'ocr_ok'} ocr
 * @param {'structure_ok'|'structure_partial'|'structure_failed'} structure
 * @param {'title_ok'|'title_failed'|'title_garbage_rejected'|'title_skipped'} title
 */
export function resolveFailureStage({ ocrText, fieldParse, title, titleDiag }) {
  const hasOcrText = Boolean(String(ocrText || "").trim());
  if (!hasOcrText) {
    return { stage: "ocr_failed", label: "OCR 실패 — 텍스트 없음" };
  }

  const structureOk = Boolean(fieldParse?.structureOk);
  const hasBuilding = Boolean(fieldParse?.building);
  const hasUnit = Boolean(fieldParse?.unit);
  const hasPartial = hasBuilding && hasUnit;
  const titleStr = String(title || "").trim();

  const stageContext = {
    structureOk,
    hasBuilding,
    hasUnit,
    hasPartial,
    apartmentName: fieldParse?.siteName || "",
    building: fieldParse?.building || "",
    unit: fieldParse?.unit || "",
    title: titleStr || null,
    structureOkDiag: fieldParse?.structureOkDiag || null,
  };

  if (!structureOk && !hasPartial) {
    console.log("[SCHEDULE-OCR] resolveFailureStage → structure_failed (동·호 없음)", stageContext);
    if (titleStr) {
      return {
        stage: "structure_failed_with_fallback_title",
        label: "구조화 실패 — legacy fallback 제목 사용",
      };
    }
    if (titleDiag?.garbageRejected) {
      return { stage: "title_garbage_rejected", label: "제목 생성 실패 — 쓰레기 제목 폐기" };
    }
    return { stage: "structure_failed", label: "구조화 실패 — 현장명·동·호 미추출" };
  }

  if (!structureOk && hasPartial) {
    console.warn("[BUG] building/unit 추출 성공했는데 structure_failed 처리됨", stageContext);
    console.log("[SCHEDULE-OCR] resolveFailureStage → structure_partial (MVP: 동·호만 추출)", stageContext);
    return { stage: "structure_partial", label: "구조화 부분 성공 — 동·호만 추출" };
  }

  if (!titleStr) {
    if (titleDiag?.garbageRejected) {
      return { stage: "title_garbage_rejected", label: "제목 생성 실패 — 쓰레기 제목 폐기" };
    }
    return { stage: "title_failed", label: "제목 생성 실패" };
  }

  return { stage: "ok", label: "구조화·제목 성공" };
}

/**
 * @param {object} payload
 */
export function logScheduleStructurePipeline(payload = {}) {
  const { source = "paste" } = payload;
  if (!shouldLog(source)) return;

  const failure = resolveFailureStage({
    ocrText: payload.ocrFilteredText || payload.structureInput || payload.ocrRawText,
    fieldParse: payload.fieldParse,
    title: payload.finalTitle,
    titleDiag: payload.titleDiag,
  });

  const header = `${PREFIX} 구조화 파이프라인 — ${failure.label}`;

  if (failure.stage === "ok") {
    console.groupCollapsed(header);
  } else {
    console.warn(header);
  }

  console.log("1) 실패 구분:", {
    failureStage: failure.stage,
    failureLabel: failure.label,
    ocr: payload.ocrRawText?.trim() ? "ocr_ok" : "ocr_empty",
    structure: payload.fieldParse?.structureOk
      ? "structure_ok"
      : payload.fieldParse?.building && payload.fieldParse?.unit
        ? "structure_partial"
        : "structure_failed",
    title: payload.finalTitle
      ? "title_ok"
      : payload.titleDiag?.garbageRejected
        ? "title_garbage_rejected"
        : "title_failed",
  });

  console.log("2) OCR 원문 전체 (rawText):", payload.ocrRawText ?? payload.structureInput ?? "—");
  console.log("3) OCR 필터 후 (구조화 입력):", payload.ocrFilteredText ?? payload.structureInput ?? "—");
  console.log("4) 구조화 함수 입력 (rawText):", payload.structureInput ?? "—");

  console.log("5) 구조화 함수 반환 (siteFieldParser):", {
    siteName: payload.fieldParse?.siteName,
    building: payload.fieldParse?.building,
    unit: payload.fieldParse?.unit,
    structureOk: payload.fieldParse?.structureOk,
    structureOkDiag: payload.fieldParse?.structureOkDiag,
    siteNameCandidates: payload.fieldParse?.siteNameCandidates,
    buildingCandidates: payload.fieldParse?.buildingCandidates,
    unitCandidates: payload.fieldParse?.unitCandidates,
    matchCount: payload.fieldParse?.matchCount,
    matches: payload.fieldParse?.debug?.matches,
  });

  console.log("5a) structureOk 판정 조건:", {
    apartmentName: payload.preTitle?.apartmentName ?? payload.fieldParse?.siteName ?? "",
    building: payload.preTitle?.building ?? payload.fieldParse?.building ?? "",
    unit: payload.preTitle?.unit ?? payload.fieldParse?.unit ?? "",
    commonPassword: payload.preTitle?.commonPassword ?? payload.siteInfo?.commonPassword ?? "",
    housePassword: payload.preTitle?.housePassword ?? payload.siteInfo?.housePassword ?? "",
    structureOk: payload.fieldParse?.structureOk,
    formula: payload.fieldParse?.structureOkDiag?.formula ?? "Boolean(building && unit)",
    structureOkDiag: payload.fieldParse?.structureOkDiag,
  });

  if (
    !payload.fieldParse?.structureOk &&
    payload.fieldParse?.building &&
    payload.fieldParse?.unit
  ) {
    console.warn("[BUG] building/unit 추출 성공했는데 structure_failed 처리됨", {
      apartmentName: payload.fieldParse?.siteName,
      building: payload.fieldParse?.building,
      unit: payload.fieldParse?.unit,
      structureOkDiag: payload.fieldParse?.structureOkDiag,
      failureStage: failure.stage,
    });
  }

  if (payload.siteInfo) {
    console.log("5b) extractSiteInfo 스냅샷:", {
      apartmentName: payload.siteInfo.apartmentName,
      building: payload.siteInfo.building,
      unit: payload.siteInfo.unit,
      commonPassword: payload.siteInfo.commonPassword,
      housePassword: payload.siteInfo.housePassword,
      confidence: payload.siteInfo.confidence,
      hasUnit: payload.siteInfo.hasUnit,
    });
  }

  console.log("6) 제목 생성 직전:", {
    apartmentName: payload.preTitle?.apartmentName ?? payload.fieldParse?.siteName,
    building: payload.preTitle?.building ?? payload.fieldParse?.building,
    unit: payload.preTitle?.unit ?? payload.fieldParse?.unit,
    commonPassword: payload.preTitle?.commonPassword ?? "",
    housePassword: payload.preTitle?.housePassword ?? "",
    confidence: payload.preTitle?.confidence ?? null,
    titlePath: payload.titleDiag?.path,
    titleSourceLine: payload.titleDiag?.titleSourceLine,
    titleSourceText: payload.titleDiag?.titleSourceText,
  });

  console.log("7) 제목 fallback 경로:", payload.titleDiag ?? "—");

  if (payload.titleDiag?.garbageRejected) {
    console.warn("7b) 쓰레기 제목 폐기 (-6 등):", {
      rejectedTitle: payload.titleDiag.rejectedTitle,
      reason: payload.titleDiag.garbageReason,
      sourceLine: payload.titleDiag.titleSourceLine,
      sourceText: payload.titleDiag.titleSourceText,
      hint: "legacy_fallback에서 stripDateAndTimeFromLine → extractSiteTitleFromLine 결과",
    });
  }

  console.log("8) 최종 결과:", {
    title: payload.finalTitle,
    dateKey: payload.dateKey,
    timeExtracted: payload.timeExtracted,
    startTime: payload.startTime,
    endTime: payload.endTime,
    structureOk: payload.fieldParse?.structureOk,
    ok: payload.ok,
    warnings: payload.warnings,
  });

  if (failure.stage === "ok") {
    console.groupEnd();
  }
}

export function explainGarbageTitle(title, titleSourceLine, titleSourceText) {
  const t = String(title || "").trim();
  if (/^-?\d{1,3}$/.test(t)) {
    return `숫자만 있는 제목 (${t}) — 날짜 파싱 잔여 또는 OCR 노이즈 줄`;
  }
  if (t.length <= 2 && !/\d{3,}/.test(t) && !/[가-힣]{2,}/u.test(t)) {
    return "1~2글자 짧은 토큰";
  }
  if (/^[\W\d\s:]{1,8}$/.test(t)) {
    return "기호·숫자·콜론만 있는 줄 (상태바/시간 잔여 가능)";
  }
  return `기타 — sourceLine: ${JSON.stringify(titleSourceLine)}, sourceText: ${JSON.stringify(titleSourceText)}`;
}
