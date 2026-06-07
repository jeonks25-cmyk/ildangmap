import { useMemo } from "react";
import { formatPreferenceSummary } from "../context/UserMapPreferencesContext";
import { CRAFT_LABEL, getCurrentWorkingCount, getLiveHelpSummary, getTodayAttendanceCount, isLiveHelpJob } from "../utils/jobModel";
import { normalizeMapSearchText } from "../utils/mapPageSearchNormalize";

/**
 * Map tab chrome: copy, composer options, sheet strings, and non-marker consumer summaries.
 *
 * ## Shared inputs from `useMapViewportData` (see that file for ownership)
 *
 * - **`mapCenterOption`**: Kakao map live center + prefs label + default `siteKind` from the first
 *   composer row. **Used by:** job post composer (default pin) and list sheet (`MapJobListSection`).
 *   **Ownership:** UI-facing object; depends on viewport-derived `composerAddressOptions[0]` only
 *   for a non-text default (`siteKind`).
 *
 * - **`composerAddressOptions`**: Address rows for the post composer, built from
 *   `jobsInBounds` → `jobsForMap` → raw `jobs`. **Ownership:** UI list data; geometry comes from
 *   viewport job lists, labels are chrome.
 */

function buildBriefingSearchText(item) {
  const parts = [
    item?.title,
    item?.summary,
    item?.region,
    item?.category,
    item?.averagePay,
    item?.trend,
    item?.flow,
    CRAFT_LABEL[item?.craft] || "",
  ];
  return normalizeMapSearchText(parts.join(" "));
}

function getBriefingSearchScore(item, normalizedQuery) {
  if (!normalizedQuery) return 0;
  const haystack = buildBriefingSearchText(item);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => {
    if (!haystack.includes(token)) return -999;
    if (normalizeMapSearchText(item?.title).includes(token)) return score + 5;
    if (normalizeMapSearchText(item?.region).includes(token)) return score + 4;
    return score + 2;
  }, 0);
}

export default function useMapChromeData({
  jobs,
  briefingData,
  prefs,
  jobBoardFilter,
  searchQuery,
  searchCraftFilter,
  searchTradeFilter,
  searchWorkFilter,
  searchDistanceKm,
  map,
  mapOption,
  detailJobId,
  /** From `useMapViewportData` */
  filteredJobs,
  jobsForMap,
  jobsInBounds,
  estimatesForMap,
}) {
  const prefSummary = useMemo(() => formatPreferenceSummary(prefs), [prefs]);
  const normalizedSearchQuery = useMemo(() => normalizeMapSearchText(searchQuery), [searchQuery]);
  const hasSearchQuery = Boolean(normalizedSearchQuery);
  const hasSearchFilters = Boolean(searchCraftFilter || searchTradeFilter || searchWorkFilter || searchDistanceKm);
  const hasActiveSearchMode = hasSearchQuery || hasSearchFilters;
  const activeSearchFilterCount = [searchCraftFilter, searchTradeFilter, searchWorkFilter, searchDistanceKm].filter(Boolean)
    .length;

  const matchedBriefings = useMemo(() => {
    if (!hasSearchQuery) return [];
    let list = Array.isArray(briefingData) ? briefingData : [];
    if (searchCraftFilter) {
      list = list.filter((item) => item.craft === searchCraftFilter);
    }
    return list
      .map((item) => ({ item, score: getBriefingSearchScore(item, normalizedSearchQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.item);
  }, [briefingData, hasSearchQuery, normalizedSearchQuery, searchCraftFilter]);

  const composerAddressOptions = useMemo(() => {
    const source = jobsInBounds.length > 0 ? jobsInBounds : jobsForMap.length > 0 ? jobsForMap : jobs;
    const seen = new Set();
    return source
      .filter(Boolean)
      .map((job, index) => {
        const lat = Number(job?.lat);
        const lng = Number(job?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const shortRegion = job?.shortRegion || job?.shortAddress || job?.address || prefs.regionLabel;
        const fullAddress = job?.fullAddress || job?.address || shortRegion;
        const key = `${fullAddress}__${shortRegion}`;
        if (seen.has(key)) return null;
        seen.add(key);
        const siteKind = String(job?.siteKind || "").trim() || "상가";
        return {
          id: `addr-${job.id ?? index}`,
          label: [shortRegion, siteKind].filter(Boolean).join(" · "),
          shortRegion,
          fullAddress,
          lat,
          lng,
          distanceKm: Number.isFinite(Number(job?.distanceKm)) ? Number(job.distanceKm) : null,
          siteKind,
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  }, [jobs, jobsForMap, jobsInBounds, prefs.regionLabel]);

  const mapCenterOption = useMemo(() => {
    let lat = mapOption.center.lat;
    let lng = mapOption.center.lng;
    try {
      const center = map?.getCenter?.();
      if (center) {
        lat = center.getLat();
        lng = center.getLng();
      }
    } catch (_) {
      /* noop */
    }
    return {
      id: "map-center",
      isMapCenter: true,
      label: "지금 지도 중심으로 등록",
      shortRegion: prefs.regionLabel,
      fullAddress: `${prefs.regionLabel} 지도 중심`,
      lat,
      lng,
      distanceKm: 0.1,
      siteKind: composerAddressOptions[0]?.siteKind || "상가",
    };
  }, [composerAddressOptions, map, mapOption, prefs.regionLabel]);

  const sheetMainTitle = useMemo(
    () =>
      hasSearchQuery
        ? `"${searchQuery.trim()}" 검색 ${jobsForMap.length}건`
        : hasSearchFilters
          ? `조건 현장 ${jobsForMap.length}건`
          : jobBoardFilter === "help"
            ? `긴급헬프 ${jobsInBounds.length}건`
            : jobBoardFilter === "all"
              ? `지도 현장 ${jobsInBounds.length}건`
              : `일반 현장 ${jobsInBounds.length}개`,
    [hasSearchFilters, hasSearchQuery, jobBoardFilter, jobsForMap.length, jobsInBounds.length, searchQuery]
  );

  const todayLiveSummary = useMemo(() => {
    const source = (jobsInBounds.length > 0 ? jobsInBounds : jobsForMap).filter(Boolean);
    return source.reduce(
      (acc, job) => {
        acc.attendance += getTodayAttendanceCount(job);
        acc.working += getCurrentWorkingCount(job);
        return acc;
      },
      { attendance: 0, working: 0 }
    );
  }, [jobsForMap, jobsInBounds]);

  const sheetHelpJobs = useMemo(() => {
    if (jobBoardFilter === "help") return [];
    const source = jobsInBounds.length ? jobsInBounds : jobsForMap;
    return source
      .filter((job) => job && isLiveHelpJob(job))
      .slice(0, 3)
      .map((job) => ({ job, summary: getLiveHelpSummary(job) }))
      .filter((item) => item.summary);
  }, [jobBoardFilter, jobsInBounds, jobsForMap]);

  const searchResultDescription = useMemo(() => {
    if (hasSearchQuery) {
      return `${jobsForMap.length}개 현장 · 거리순 정렬`;
    }
    if (hasSearchFilters) {
      return `${activeSearchFilterCount}개 필터 적용 · ${jobsForMap.length}개 현장`;
    }
    if (jobBoardFilter === "all") {
      return `일반·긴급 동시 표시 · 핀으로 구분 · ${jobsForMap.length}건`;
    }
    if (jobBoardFilter === "help") {
      return `근처 긴급헬프 · 거리·마감 임박 순 ${jobsForMap.length}건`;
    }
    return `현재 위치 기준 · ${jobsForMap.length}개 현장`;
  }, [activeSearchFilterCount, hasSearchFilters, hasSearchQuery, jobBoardFilter, jobsForMap.length]);

  const nearbyConsumerRequests = useMemo(
    () =>
      estimatesForMap.filter((item) => item)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3),
    [estimatesForMap]
  );

  const detailListIndex = useMemo(() => {
    if (detailJobId == null) return -1;
    let i = jobsInBounds.findIndex((job) => job && job.id === detailJobId);
    if (i >= 0) return i;
    i = jobsForMap.findIndex((job) => job && job.id === detailJobId);
    if (i >= 0) return i;
    return filteredJobs.findIndex((job) => job && job.id === detailJobId);
  }, [detailJobId, filteredJobs, jobsForMap, jobsInBounds]);

  return {
    prefSummary,
    hasSearchQuery,
    hasSearchFilters,
    hasActiveSearchMode,
    activeSearchFilterCount,
    matchedBriefings,
    composerAddressOptions,
    mapCenterOption,
    sheetMainTitle,
    todayLiveSummary,
    sheetHelpJobs,
    searchResultDescription,
    nearbyConsumerRequests,
    detailIndexForModal: detailListIndex >= 0 ? detailListIndex : 0,
  };
}
