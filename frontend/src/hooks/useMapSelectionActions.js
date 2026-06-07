import { useCallback } from "react";

/**
 * 지도 현장 선택 — 하이라이트만 (지도 이동·상세 모달 없음)
 */
export default function useMapSelectionActions({
  isReady,
  kakao,
  map,
  markerClickAtRef,
  setSelectedJobId,
  sheetDispatch,
  rememberRecentSearch,
  searchQuery,
}) {
  const panMapToJob = useCallback(
    (job) => {
      if (!isReady || !kakao || !map || !job) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try {
        const lv = map.getLevel();
        if (Number.isFinite(lv) && lv > 6) map.setLevel(6);
      } catch (_) {
        /* noop */
      }
      map.panTo(new kakao.maps.LatLng(lat, lng));
    },
    [isReady, kakao, map]
  );

  const selectJobOnly = useCallback(
    (job) => {
      if (!job || job.id == null) return;
      markerClickAtRef.current = Date.now();
      sheetDispatch({ type: "SHEET_CLOSE_JOB_DETAIL" });
      setSelectedJobId((prev) => (prev === job.id ? null : job.id));
    },
    [markerClickAtRef, setSelectedJobId, sheetDispatch]
  );

  const activateJobFromList = useCallback(
    (job) => {
      if (!job) return;
      rememberRecentSearch(searchQuery);
      selectJobOnly(job);
    },
    [rememberRecentSearch, searchQuery, selectJobOnly]
  );

  const handleMarkerClick = useCallback(
    (job) => {
      selectJobOnly(job);
    },
    [selectJobOnly]
  );

  return {
    panMapToJob,
    activateJobFromList,
    handleMarkerClick,
  };
}
