import { useMemo } from "react";
import { CRAFT_LABEL } from "../utils/jobModel";
import { useUserStore } from "../store/useUserStore";

export const REGION_OPTIONS = ["대전 서구", "대전 유성구", "대전 동구", "대전 중구", "세종", "청주", "전국"];

export const PREF_TRADE_OPTIONS = ["전체", "조공", "준기공", "기공", "오야지"];

export const PREF_CRAFT_OPTIONS = [
  { value: null, label: "전체 공정" },
  { value: "film", label: "🪟 필름" },
  { value: "tile", label: "🧱 타일" },
  { value: "wallpaper", label: "🎨 도배" },
  { value: "paint", label: "🖌️ 페인트" },
  { value: "electric", label: "⚡ 전기" },
  { value: "facility", label: "🔧 설비" },
];

const DEFAULT_PREFS = {
  regionLabel: "대전 서구",
  trade: "전체",
  craft: null,
};

function normalizePrefs(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const regionLabel =
    typeof raw.regionLabel === "string" && REGION_OPTIONS.includes(raw.regionLabel)
      ? raw.regionLabel
      : DEFAULT_PREFS.regionLabel;
  const trade =
    typeof raw.trade === "string" && PREF_TRADE_OPTIONS.includes(raw.trade) ? raw.trade : DEFAULT_PREFS.trade;
  const craftRaw = raw.craft;
  const craft =
    craftRaw === null || ["film", "tile", "wallpaper", "paint", "electric", "facility"].includes(craftRaw)
      ? craftRaw ?? null
      : DEFAULT_PREFS.craft;
  return { regionLabel, trade, craft };
}

export function formatPreferenceSummary(prefs) {
  if (!prefs) return "전체 공정 · 전체";
  const craftPart = prefs.craft == null ? "전체 공정" : CRAFT_LABEL[prefs.craft] || "공정";
  const tradePart = prefs.trade === "전체" ? "전체" : prefs.trade;
  return `${craftPart} · ${tradePart}`;
}

export function UserMapPreferencesProvider({ children }) {
  return children;
}

export function useUserMapPreferences() {
  const rawPrefs = useUserStore((state) => state.prefs);
  const setPrefs = useUserStore((state) => state.setPrefs);
  const prefs = useMemo(() => normalizePrefs(rawPrefs), [rawPrefs]);

  return { prefs, setPrefs };
}

export function jobMatchesRegionPref(job, regionLabel) {
  if (!job || !regionLabel || regionLabel === "전국") return true;
  const blob = `${job.shortRegion || ""} ${job.shortAddress || ""} ${job.address || ""}`;
  return blob.includes(regionLabel);
}
