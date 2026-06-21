import { useMemo } from "react";
import { jobMatchesRegionPref } from "../context/UserMapPreferencesContext";
import { normalizeJobTrade } from "../utils/jobTrade";
import {
  buildFieldJobTitle,
  compareHelpTabJobsForMvp,
  compareJobsForMapList,
  CRAFT_LABEL,
  getJobCraft,
  getJobWorkDateKey,
  isLiveHelpJob,
  isUrgentJob,
  migrateJob,
} from "../utils/jobModel";
import { initialJobs } from "../utils/jobsStorage";
import { isDemoMode } from "../utils/demoMode";
import { filterEstimatesInMapBounds, getEstimateRequests } from "../utils/estimateRequestModel";
import { normalizeMapSearchText as normalizeMapSearchTextUtil } from "../utils/mapPageSearchNormalize";
import { toDateKey } from "../utils/fieldScheduleModel";
import { scheduleCoversDate } from "../utils/scheduleModel";
import { isExpiredJob } from "../utils/jobTimeUtils";
import { MAP_OPS_FILTER } from "../constants/mapOpsFilter";
import { isAfternoonJoinJob, isOyajiShortageJob, isOyajiUrgentJob } from "../utils/oyajiSiteModel";
import { buildLifeMapItems } from "../utils/mapItemModel";

/**
 * Map viewport / canvas pipeline (jobs + bounds + estimate markers).
 *
 * ## Shared with UI (`useMapChromeData` / MapPage)
 *
 * - **`activeJobs`**: Non-expired jobs (`isExpiredJob`) before date/search filters.
 * - **`jobsForMap`**: Filtered/sorted job list used for (1) viewport clipping → `jobsInBounds`
 *   (markers/clusterer), (2) sheet list scroll sync (`useSelectedJobSheetSync`), and (3) chrome
 *   copy counts. **Ownership:** derived from the same job-store filters everywhere; this hook is
 *   the single source for the numeric/list shape; chrome reads it for strings only.
 *
 * - **`filteredJobs`**: Strict selected-date match for jobs. **Ownership:** viewport
 * - **`filteredEstimateJobs`**: Map-visible quotes (open/visiting), date-independent.
 *   pipeline stage; chrome needs it only for `detailIndexForModal` fallback indexing.
 *
 * `mapCenterOption` / `composerAddressOptions` are computed in chrome (they include UI strings and
 * composer labels) but depend on `jobsInBounds` / `jobsForMap` from here — see `useMapChromeData`.
 */

/** 현재 지도 뷰포트(화면) 안에 있는 위치 기반 항목만 */
export function filterJobsInMapBounds(jobs, mapBounds) {
  if (!mapBounds) return [];
  const { minLat, maxLat, minLng, maxLng } = mapBounds;
  return (Array.isArray(jobs) ? jobs : []).filter((job) => {
    const lat = Number(job?.lat);
    const lng = Number(job?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

function matchesSelectedDate(job, selectedDateKey) {
  if (!job || !selectedDateKey) return true;
  const jobDateKey = getJobWorkDateKey(job);
  if (!jobDateKey) return false;
  return scheduleCoversDate(job, selectedDateKey) || jobDateKey === selectedDateKey;
}

/** @public Shared search normalize for map filters and briefing match. */
export function normalizeMapSearchText(value) {
  return normalizeMapSearchTextUtil(value);
}

function isNightJob(job) {
  const blob = `${job?.workTime || ""} ${job?.description || ""} ${job?.memo || ""}`;
  return /야간|20:|21:|22:|23:|00:|01:|02:|03:|04:/.test(blob);
}

function isHalfDayJob(job) {
  const blob = `${job?.workTime || ""} ${job?.description || ""} ${job?.memo || ""}`;
  return (
    job?.workType === "shortHelp" ||
    job?.workType === "morning" ||
    job?.workType === "afternoon" ||
    /반일|오전|오후/.test(blob)
  );
}

function buildJobSearchText(job) {
  const craft = getJobCraft(job);
  const parts = [
    buildFieldJobTitle(job),
    job?.title,
    job?.shortRegion,
    job?.shortAddress,
    job?.fullAddress,
    job?.address,
    job?.description,
    job?.memo,
    job?.siteKind,
    normalizeJobTrade(job),
    CRAFT_LABEL[craft] || "",
    job?.payTerms,
    job?.workTime,
    isLiveHelpJob(job) ? "긴급헬프 헬프" : "",
    isUrgentJob(job) ? "긴급 급구" : "",
    isNightJob(job) ? "야간 야간작업" : "",
    isHalfDayJob(job) ? "반일" : "",
    job?.longTerm ? "장기" : "",
    matchesSelectedDate(job, toDateKey(new Date())) ? "오늘 출근 가능" : "",
  ];
  return normalizeMapSearchText(parts.join(" "));
}

function getJobSearchScore(job, normalizedQuery) {
  if (!normalizedQuery) return 0;
  const title = normalizeMapSearchText(buildFieldJobTitle(job));
  const region = normalizeMapSearchText(job?.shortRegion || job?.shortAddress || job?.address || "");
  const haystack = buildJobSearchText(job);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => {
    if (!haystack.includes(token)) return -999;
    if (title.includes(token)) return score + 5;
    if (region.includes(token)) return score + 4;
    return score + 2;
  }, 0);
}

function matchesWorkFilter(job, filterKey) {
  if (!filterKey) return true;
  if (filterKey === "night") return isNightJob(job);
  if (filterKey === "urgent") return isUrgentJob(job) || isLiveHelpJob(job);
  if (filterKey === "long") return Boolean(job?.longTerm);
  if (filterKey === "half") return isHalfDayJob(job);
  return true;
}

function getSortableDistance(job) {
  const value = Number(job?.distanceKm);
  return Number.isFinite(value) && value >= 0 ? value : 999;
}

function matchesMapOpsFilter(job, mapOpsFilter) {
  if (!mapOpsFilter) return true;
  if (mapOpsFilter === MAP_OPS_FILTER.URGENT) return isOyajiUrgentJob(job);
  if (mapOpsFilter === MAP_OPS_FILTER.AFTERNOON) return isAfternoonJoinJob(job);
  if (mapOpsFilter === MAP_OPS_FILTER.SHORTAGE) return isOyajiShortageJob(job);
  return true;
}

export default function useMapViewportData({
  jobs,
  prefs,
  selectedDateKey,
  jobBoardFilter,
  searchQuery,
  searchCraftFilter,
  searchTradeFilter,
  searchWorkFilter,
  searchDistanceKm,
  mapBounds,
  requests,
  mapOpsFilter = null,
}) {
  const normalizedSearchQuery = useMemo(() => normalizeMapSearchTextUtil(searchQuery), [searchQuery]);
  const hasSearchQuery = Boolean(normalizedSearchQuery);
  const hasSearchFilters = Boolean(searchCraftFilter || searchTradeFilter || searchWorkFilter || searchDistanceKm);
  const hasActiveSearchMode = hasSearchQuery || hasSearchFilters;
  const searchLooksForHelp = useMemo(
    () => /(헬프|help|긴급헬프)/.test(normalizedSearchQuery),
    [normalizedSearchQuery]
  );

  const activeJobs = useMemo(
    () => (Array.isArray(jobs) ? jobs : []).filter((job) => job && !isExpiredJob(job)),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const list = activeJobs;
    if (!selectedDateKey) return list;
    return list.filter((job) => job && matchesSelectedDate(job, selectedDateKey));
  }, [activeJobs, selectedDateKey]);

  const jobsForMap = useMemo(() => {
    const demo = isDemoMode();
    let list = filteredJobs.filter(Boolean);
    if (!hasSearchQuery && !demo) {
      list = list.filter((job) => jobMatchesRegionPref(job, prefs.regionLabel));
    }
    const craftFilter = searchCraftFilter || (!hasActiveSearchMode ? prefs.craft : null);
    const tradeFilter = searchTradeFilter || (!hasActiveSearchMode && prefs.trade !== "전체" ? prefs.trade : null);
    if (tradeFilter) {
      list = list.filter((job) => normalizeJobTrade(job) === tradeFilter);
    }
    if (craftFilter) {
      list = list.filter((job) => getJobCraft(job) === craftFilter);
    }
    if (jobBoardFilter === "help" || (jobBoardFilter === "general" && searchLooksForHelp)) {
      list = list.filter((job) => isLiveHelpJob(job));
    }
    if (jobBoardFilter === "general" && !searchLooksForHelp) {
      list = list.filter((job) => !isLiveHelpJob(job));
    }
    if (searchWorkFilter) {
      list = list.filter((job) => matchesWorkFilter(job, searchWorkFilter));
    }
    if (searchDistanceKm) {
      list = list.filter((job) => getSortableDistance(job) <= Number(searchDistanceKm));
    }
    if (mapOpsFilter) {
      list = list.filter((job) => matchesMapOpsFilter(job, mapOpsFilter));
    }
    if (hasSearchQuery) {
      return list
        .map((job) => ({ job, score: getJobSearchScore(job, normalizedSearchQuery) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return compareJobsForMapList(a.job, b.job, getSortableDistance);
        })
        .map((item) => item.job);
    }
    const sortFn =
      jobBoardFilter === "help" && !hasSearchQuery
        ? compareHelpTabJobsForMvp
        : jobBoardFilter === "all" && !hasSearchQuery
          ? (a, b, d) => {
              const ah = isLiveHelpJob(a) ? 0 : 1;
              const bh = isLiveHelpJob(b) ? 0 : 1;
              if (ah !== bh) return ah - bh;
              return compareJobsForMapList(a, b, d);
            }
          : compareJobsForMapList;
    let out = list.slice().sort((a, b) => sortFn(a, b, getSortableDistance));

    if (
      demo &&
      (jobBoardFilter === "help" || jobBoardFilter === "all" || (jobBoardFilter === "general" && searchLooksForHelp)) &&
      !hasSearchQuery
    ) {
      const live = out.filter((j) => j && isLiveHelpJob(j));
      if (live.length < 3) {
        const pickIds = new Set([9, 11, 14]);
        const pool = initialJobs
          .map(migrateJob)
          .filter(
            (j) =>
              j &&
              pickIds.has(Number(j.id)) &&
              isLiveHelpJob(j) &&
              matchesSelectedDate(j, selectedDateKey)
          );
        const seen = new Set(out.map((j) => Number(j?.id)));
        for (const j of pool) {
          if (!seen.has(Number(j.id))) {
            out.push(j);
            seen.add(Number(j.id));
          }
        }
        out = out.slice().sort((a, b) => sortFn(a, b, getSortableDistance));
      }
    }

    return out;
  }, [
    filteredJobs,
    prefs.regionLabel,
    prefs.trade,
    prefs.craft,
    jobBoardFilter,
    searchCraftFilter,
    searchTradeFilter,
    searchWorkFilter,
    searchDistanceKm,
    hasSearchQuery,
    hasActiveSearchMode,
    normalizedSearchQuery,
    searchLooksForHelp,
    selectedDateKey,
    mapOpsFilter,
  ]);

  const jobsInBounds = useMemo(
    () => filterJobsInMapBounds(jobsForMap, mapBounds),
    [jobsForMap, mapBounds]
  );

  const filteredEstimateJobs = useMemo(
    () => getEstimateRequests(requests),
    [requests]
  );

  const estimatesForMap = filteredEstimateJobs;

  const estimatesInBounds = useMemo(
    () => filterEstimatesInMapBounds(filteredEstimateJobs, mapBounds),
    [filteredEstimateJobs, mapBounds]
  );

  const lifeItemsInBounds = useMemo(() => [], []);

  const mapItemsInBounds = useMemo(
    () =>
      buildLifeMapItems({
        jobs: jobsInBounds,
        estimates: estimatesInBounds,
        lifeItems: lifeItemsInBounds,
      }),
    [jobsInBounds, estimatesInBounds, lifeItemsInBounds]
  );

  const jobsForMapViewportKey = useMemo(() => {
    const list = Array.isArray(jobsForMap) ? jobsForMap : [];
    const ids = list
      .map((j) => j?.id)
      .filter((id) => id != null)
      .sort((a, b) => String(a).localeCompare(String(b)));
    return `${list.length}:${ids.join(",")}`;
  }, [jobsForMap]);

  return {
    filteredJobs,
    filteredEstimateJobs,
    jobsForMap,
    jobsInBounds,
    estimatesForMap,
    estimatesInBounds,
    lifeItemsInBounds,
    mapItemsInBounds,
    jobsForMapViewportKey,
  };
}
