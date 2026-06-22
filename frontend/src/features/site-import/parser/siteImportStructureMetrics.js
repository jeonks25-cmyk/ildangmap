/**
 * OCR 구조화 성공률 — 현장명·동·호 추출 + 수정 없이 저장
 */

const METRICS_KEY = "ildangmap_site_structure_metrics_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : { sessions: [] };
  } catch (_) {
    return { sessions: [] };
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(data));
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {{ rawText?: string, parsed?: object, source?: string }} input
 */
export function recordStructureAttempt(input = {}) {
  const parsed = input.parsed || {};
  const session = {
    id: `struct-${Date.now()}`,
    at: new Date().toISOString(),
    source: input.source || "unknown",
    rawTextPreview: String(input.rawText || "").slice(0, 200),
    extracted: {
      siteName: Boolean(parsed.siteName || parsed.apartmentName),
      building: Boolean(parsed.building),
      unit: Boolean(parsed.unit),
    },
    structureOk: Boolean(parsed.building && parsed.unit),
    savedWithoutEdit: null,
  };

  const all = readAll();
  all.sessions = [session, ...(all.sessions || [])].slice(0, 100);
  writeAll(all);
  return session;
}

export function markStructureSaved(sessionId, { savedWithoutEdit = false, finalTitle = "" } = {}) {
  const all = readAll();
  all.sessions = (all.sessions || []).map((s) =>
    s.id === sessionId
      ? { ...s, savedWithoutEdit, finalTitle, savedAt: new Date().toISOString() }
      : s
  );
  writeAll(all);
}

export function getStructureMetricsSummary() {
  const sessions = readAll().sessions || [];
  const withSave = sessions.filter((s) => s.savedWithoutEdit !== null);
  const structureOk = sessions.filter((s) => s.structureOk);
  const savedClean = withSave.filter((s) => s.savedWithoutEdit === true);

  return {
    attempts: sessions.length,
    structureOkCount: structureOk.length,
    structureOkRate: sessions.length ? structureOk.length / sessions.length : 0,
    savedCount: withSave.length,
    savedWithoutEditCount: savedClean.length,
    savedWithoutEditRate: withSave.length ? savedClean.length / withSave.length : 0,
    recent: sessions.slice(0, 10),
  };
}

export function isStructureDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.search.includes("ocrDebug=1")) return true;
    return localStorage.getItem("ildangmap_ocr_debug") === "1";
  } catch (_) {
    return false;
  }
}
