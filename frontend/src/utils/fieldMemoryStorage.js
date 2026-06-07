import { writeJsonStorage } from "../store/storeUtils";

const STORAGE_KEY = "ildangmap_field_memory_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : {};
  } catch (_) {
    return {};
  }
}

export function fieldMemorySiteKeyFromJobId(jobId) {
  const n = Number(jobId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `job:${n}`;
}

export function fieldMemorySiteKeyFromBriefingId(briefingId) {
  const id = String(briefingId || "").trim();
  if (!id) return null;
  return `bf:${id}`;
}

export function loadFieldMemoryLines(siteKey) {
  const key = String(siteKey || "").trim();
  if (!key) return [];
  const all = readAll();
  const row = all[key];
  if (!row || !Array.isArray(row.lines)) return [];
  return row.lines.map((x) => String(x || "").trim()).filter(Boolean);
}

export function loadFieldMemoryRecord(siteKey) {
  const key = String(siteKey || "").trim();
  if (!key) return null;
  const all = readAll();
  const row = all[key];
  return row && typeof row === "object" ? row : null;
}

export function saveFieldMemoryLines(siteKey, lines) {
  const key = String(siteKey || "").trim();
  if (!key) return;
  const all = { ...readAll() };
  const clean = (Array.isArray(lines) ? lines : []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, 20);
  all[key] = { lines: clean, updatedAt: new Date().toISOString() };
  writeJsonStorage(STORAGE_KEY, all);
}

export function saveFieldVisitMemory(siteKey, visit) {
  const key = String(siteKey || "").trim();
  if (!key || !visit) return null;
  const all = { ...readAll() };
  const prev = all[key] || {};
  const visits = Array.isArray(prev.visits) ? prev.visits : [];
  const memoryVisit = {
    id: visit.id || `visit:${Date.now()}`,
    date: visit.date || visit.workDate || "",
    title: visit.title || "",
    teamName: visit.teamName || "",
    craft: visit.craft || "",
    durationDays: visit.durationDays || 1,
    requiredItems: visit.requiredItems || "",
    materialNote: visit.materialNote || "",
    parkingNote: visit.parkingNote || "",
    mealNote: visit.mealNote || "",
    savedAt: new Date().toISOString(),
  };
  all[key] = {
    ...prev,
    visits: [memoryVisit, ...visits.filter((x) => x && x.id !== memoryVisit.id)].slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
  writeJsonStorage(STORAGE_KEY, all);
  return memoryVisit;
}

export function saveFieldTimelineEvent(siteKey, event) {
  const key = String(siteKey || "").trim();
  if (!key || !event) return null;
  const all = { ...readAll() };
  const prev = all[key] || {};
  const timeline = Array.isArray(prev.timeline) ? prev.timeline : [];
  const nextEvent = {
    id: event.id || `timeline:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
    type: event.type || "note",
    tone: event.tone || "normal",
    icon: event.icon || "•",
    text: event.text || "",
    detail: event.detail || "",
    teamName: event.teamName || "",
    occurredAt: event.occurredAt || new Date().toISOString(),
    source: event.source || "operation",
  };
  all[key] = {
    ...prev,
    timeline: [nextEvent, ...timeline.filter((x) => x && x.id !== nextEvent.id)].slice(0, 80),
    updatedAt: new Date().toISOString(),
  };
  writeJsonStorage(STORAGE_KEY, all);
  return nextEvent;
}

export function fieldMemorySiteKeyFromAddress(address) {
  const key = String(address || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return key ? `addr:${key}` : null;
}

export function loadFieldMemoryItems(siteKey) {
  const key = String(siteKey || "").trim();
  if (!key) return [];
  const all = readAll();
  const row = all[key];
  return Array.isArray(row?.items) ? row.items.filter(Boolean) : [];
}

export function saveFieldMemoryItem(siteKey, item) {
  const key = String(siteKey || "").trim();
  if (!key || !item) return null;
  const all = { ...readAll() };
  const prev = all[key] || {};
  const items = Array.isArray(prev.items) ? prev.items : [];
  const memoryItem = {
    id: item.id || `${item.type || "item"}:${Date.now()}`,
    type: item.type,
    title: item.title,
    address: item.address || "",
    roadAddress: item.roadAddress || "",
    jibunAddress: item.jibunAddress || "",
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    meta: item.meta || {},
    comments: Array.isArray(item.comments) ? item.comments : [],
    visibility: item.visibility,
    contactPolicy: item.contactPolicy,
    savedAt: new Date().toISOString(),
  };
  all[key] = {
    ...prev,
    items: [memoryItem, ...items.filter((x) => x && x.id !== memoryItem.id)].slice(0, 30),
    updatedAt: new Date().toISOString(),
  };
  writeJsonStorage(STORAGE_KEY, all);
  return memoryItem;
}
