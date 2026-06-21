import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";
import { PLACE_REPORT_REASONS } from "../constants/placeModeration";
import { usePlaceModerationStore } from "../store/usePlaceModerationStore";
import { getMapItemKey } from "./mapItemModel";
import { isPlaceOverlayEligible } from "./placeDistance";
import { buildReportFeedbackMessage } from "./placeModeration";

export { PLACE_REPORT_REASONS as PLACE_INFO_REPORT_REASONS };
export { needsPlaceReview, getPlaceReportCount } from "./placeModeration";

export const PLACE_INFO_REVIEW_THRESHOLD = 3;

const HISTORY_STORAGE_KEY = "ildangmap_place_history_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* noop */
  }
}

/** 정보 카드(⋯ 메뉴) vs 행동 카드(직접 버튼) */
export function isPlaceInfoCard(item) {
  if (!item || !isPlaceOverlayEligible(item)) return false;
  const layer = item.layer || item.type;
  const PLACE_INFO_ACTION_LAYERS = new Set([
    MAP_ITEM_TYPE.ESTIMATE,
    MAP_ITEM_TYPE.ESTIMATE_REQUEST,
    MAP_ITEM_TYPE.HELPER_REQUEST,
    MAP_ITEM_TYPE.SOS,
  ]);
  if (PLACE_INFO_ACTION_LAYERS.has(layer)) return false;
  if (layer === MAP_ITEM_TYPE.FIELD && item?.source?.status != null) return false;
  return true;
}

export function getPlaceInfoKey(place) {
  return getMapItemKey(place);
}

export async function submitPlaceReport(placeKey, reason, meta = {}) {
  const result = await usePlaceModerationStore.getState().submitReport(placeKey, reason, meta);
  appendChangeHistory(placeKey, {
    at: new Date().toISOString(),
    by: "신고",
    action: "report",
    detail: reason,
  });
  return result;
}

export { buildReportFeedbackMessage };

function readAllHistory() {
  return readJson(HISTORY_STORAGE_KEY, {});
}

export function getPlaceChangeHistory(placeKey) {
  if (!placeKey) return [];
  const stored = readAllHistory()[placeKey];
  return Array.isArray(stored) ? stored : [];
}

export function appendChangeHistory(placeKey, entry) {
  if (!placeKey || !entry) return;
  const all = readAllHistory();
  const prev = Array.isArray(all[placeKey]) ? all[placeKey] : [];
  all[placeKey] = [{ id: `hist-${Date.now()}`, ...entry }, ...prev].slice(0, 40);
  writeJson(HISTORY_STORAGE_KEY, all);
}

export function buildPlaceChangeHistory(place) {
  const key = getPlaceInfoKey(place);
  const stored = getPlaceChangeHistory(key);
  if (stored.length) return stored;

  const seed = [];
  const meta = place?.sourceMeta || place?.source?.sourceMeta || {};
  const editHistory = Array.isArray(meta.editHistory) ? meta.editHistory : [];
  editHistory.forEach((row, index) => {
    seed.push({
      id: `seed-${index}`,
      at: row.at || meta.updatedAt || "",
      by: meta.createdBy || "일당맵",
      action: row.action || "updated",
      detail: row.detail || "",
    });
  });
  if (meta.updatedAt) {
    seed.push({
      id: "seed-updated",
      at: meta.updatedAt,
      by: meta.createdBy || "일당맵",
      action: "updated",
      detail: "정보가 등록·갱신되었습니다.",
    });
  }
  if (!seed.length) {
    seed.push({
      id: "seed-created",
      at: new Date().toISOString(),
      by: "일당맵",
      action: "created",
      detail: "장소 정보가 등록되었습니다.",
    });
  }
  return seed;
}

export function formatChangeHistoryAction(action) {
  const map = {
    created: "등록",
    updated: "수정",
    edit_opened: "수정 열림",
    report: "신고",
    created_from_search: "검색 등록",
  };
  return map[action] || action || "변경";
}

export function formatChangeHistoryWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return iso;
  }
}

export async function sharePlaceInfo({ title, address }) {
  const label = String(title || "일당맵 장소").trim();
  const addr = String(address || "").trim();
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = [label, addr].filter(Boolean).join("\n");

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: label, text, url });
      return { ok: true, method: "share" };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  const payload = [text, url].filter(Boolean).join("\n");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return { ok: true, method: "clipboard" };
  }
  return { ok: false };
}

export async function copyPlaceAddress(address) {
  const value = String(address || "").trim();
  if (!value) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  return false;
}
