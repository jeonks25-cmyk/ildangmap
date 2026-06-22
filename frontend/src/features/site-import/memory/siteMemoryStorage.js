import { writeJsonStorage } from "../../../store/storeUtils";
import {
  detectPersonalTerms,
  guessVendorType,
  normalizeSiteMemoryKey,
  parseSiteTitleParts,
} from "./siteMemoryModel";
import { getScheduleParticipants } from "../../../utils/scheduleFieldOpsStorage";
import { resolveFieldScheduleColor } from "../../../constants/scheduleColors";

const STORAGE_KEY = "ildangmap_site_memory_v2";

function emptyUserMemory() {
  return {
    sites: {},
    personalDict: {},
    vendors: {},
    oyajiStyles: {},
    updatedAt: null,
  };
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAll(all) {
  writeJsonStorage(STORAGE_KEY, all);
}

export function loadSiteMemory(userId = "me") {
  const key = String(userId || "me");
  const all = readAll();
  const row = all[key];
  if (!row || typeof row !== "object") return emptyUserMemory();
  return {
    sites: row.sites && typeof row.sites === "object" ? row.sites : {},
    personalDict: row.personalDict && typeof row.personalDict === "object" ? row.personalDict : {},
    vendors: row.vendors && typeof row.vendors === "object" ? row.vendors : {},
    oyajiStyles: row.oyajiStyles && typeof row.oyajiStyles === "object" ? row.oyajiStyles : {},
    updatedAt: row.updatedAt || null,
  };
}

function saveUserMemory(userId, memory) {
  const key = String(userId || "me");
  const all = { ...readAll() };
  all[key] = { ...memory, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[key];
}

function bumpDictEntry(dict, term, patch = {}) {
  const name = String(term || "").trim();
  if (!name) return dict;
  const prev = dict[name] || { term: name, count: 0 };
  dict[name] = {
    ...prev,
    ...patch,
    term: name,
    count: (prev.count || 0) + 1,
    lastSeenAt: new Date().toISOString(),
  };
  return dict;
}

function learnOyajiStyle(styles, oyajiName, ocrText) {
  const name = String(oyajiName || "").trim();
  if (!name) return styles;
  const blob = String(ocrText || "");
  const prev = styles[name] || { commonAliases: [], houseAliases: [] };
  const next = { ...prev };

  if (/공비/u.test(blob) && !next.commonAliases.includes("공비")) {
    next.commonAliases = [...next.commonAliases, "공비"].slice(0, 6);
  }
  if (/세비/u.test(blob) && !next.houseAliases.includes("세비")) {
    next.houseAliases = [...next.houseAliases, "세비"].slice(0, 6);
  }

  styles[name] = next;
  return styles;
}

function recordSiteVisit(sites, { siteName, building, unit, craft: craftHint, schedule, job, draft }) {
  const key = normalizeSiteMemoryKey(siteName);
  if (!key) return sites;

  const prev = sites[key] || {
    siteName: stripDisplayName(siteName),
    buildings: {},
    craftCounts: {},
    participantNames: {},
    registrationCount: 0,
  };

  const buildings = { ...(prev.buildings || {}) };
  if (building) buildings[building] = (buildings[building] || 0) + 1;

  const craftCounts = { ...(prev.craftCounts || {}) };
  const craft = String(schedule?.craft || job?.craft || draft?.craft || craftHint || "").trim();
  if (craft) craftCounts[craft] = (craftCounts[craft] || 0) + 1;

  const participantNames = { ...(prev.participantNames || {}) };
  const participants = getScheduleParticipants(schedule || job || {});
  participants.forEach((p) => {
    const n = String(p?.name || "").trim();
    if (!n || n === "현장 소장" || n === "참여 기술자") return;
    participantNames[n] = (participantNames[n] || 0) + 1;
  });

  sites[key] = {
    ...prev,
    siteName: stripDisplayName(siteName) || prev.siteName,
    buildings,
    craftCounts,
    participantNames,
    recentCraft: craft || prev.recentCraft || "",
    registrationCount: (prev.registrationCount || 0) + 1,
    lastBuilding: building || prev.lastBuilding || "",
    lastUnit: unit || prev.lastUnit || "",
    lastTitle: schedule?.title || job?.title || draft?.title || prev.lastTitle || "",
    lastAccessPassword:
      draft?.details?.accessPassword ||
      schedule?.accessPassword ||
      job?.privateFields?.accessPassword ||
      prev.lastAccessPassword ||
      "",
    lastHousePassword: draft?.details?.housePassword || prev.lastHousePassword || "",
    fullAddress:
      schedule?.fullAddress ||
      job?.fullAddress ||
      draft?.location?.fullAddress ||
      prev.fullAddress ||
      "",
    shortRegion:
      schedule?.shortRegion ||
      job?.shortRegion ||
      draft?.location?.shortRegion ||
      prev.shortRegion ||
      "",
    calendarColor: schedule?.calendarColor || prev.calendarColor || resolveFieldScheduleColor(schedule || job || {}),
    updatedAt: new Date().toISOString(),
  };

  return sites;
}

function stripDisplayName(name) {
  return String(name || "")
    .replace(/(아파트|APT|apt)$/iu, "")
    .trim();
}

/** 기존 일정 목록 → 기억 DB 초기 동기화 (비어 있을 때만) */
export function syncSiteMemoryFromSchedules(userId, schedules = []) {
  const memory = loadSiteMemory(userId);
  if (Object.keys(memory.sites || {}).length > 0) return memory;

  (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
    const parts = parseSiteTitleParts(schedule?.title);
    if (!parts.siteName) return;
    memory.sites = recordSiteVisit(memory.sites, {
      siteName: parts.siteName,
      building: parts.building,
      unit: parts.unit,
      craft: schedule?.craft,
      schedule,
    });
  });

  return saveUserMemory(userId, memory);
}

/** 현장 등록 시 기억 학습 */
export function recordSiteMemoryFromRegistration({
  userId = "me",
  draft = null,
  schedule = null,
  job = null,
  ocrText = "",
}) {
  const source = schedule || job || draft;
  if (!source) return loadSiteMemory(userId);

  const memory = loadSiteMemory(userId);
  const title = source.title || draft?.title || "";
  const parts = parseSiteTitleParts(title);

  if (parts.siteName) {
    memory.sites = recordSiteVisit(memory.sites, {
      siteName: parts.siteName,
      building: parts.building,
      unit: parts.unit,
      craft: source.craft || draft?.craft,
      schedule,
      job,
      draft,
    });
  }

  detectPersonalTerms(ocrText || title).forEach(({ term, type }) => {
    const resolvedType = type || guessVendorType(term);
    memory.personalDict = bumpDictEntry(memory.personalDict, term, { type: resolvedType });
    if (resolvedType === "vendor") {
      memory.vendors = bumpDictEntry(memory.vendors, term, {
        craft: source.craft || draft?.craft || memory.vendors[term]?.craft || "",
        region:
          draft?.location?.shortRegion ||
          schedule?.shortRegion ||
          job?.shortRegion ||
          memory.vendors[term]?.region ||
          "",
        phone: draft?.details?.contactPhone || memory.vendors[term]?.phone || "",
      });
    } else {
      memory.oyajiStyles = learnOyajiStyle(memory.oyajiStyles, term, ocrText);
    }
  });

  if (parts.siteName) {
    memory.personalDict = bumpDictEntry(memory.personalDict, parts.siteName, { type: "site" });
  }

  return saveUserMemory(userId, memory);
}

export function getSiteMemoryRecord(memory, siteName) {
  const key = normalizeSiteMemoryKey(siteName);
  if (!key || !memory?.sites) return null;
  return memory.sites[key] || null;
}

export function listSiteMemorySites(memory) {
  return Object.values(memory?.sites || {}).sort(
    (a, b) => (b.registrationCount || 0) - (a.registrationCount || 0)
  );
}
