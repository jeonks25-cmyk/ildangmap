import { useCallback, useEffect, useRef, useState } from "react";
import { guardMemberAction } from "./useRequireAuth";
import { useUserStore } from "../store/useUserStore";

export function useMapPageOverlayFlowState() {
  const [sheetExpandSignal, setSheetExpandSignal] = useState(0);
  const [applyCompleteState, setApplyCompleteState] = useState(null);

  const triggerSheetExpand = useCallback(() => {
    setSheetExpandSignal((value) => value + 1);
  }, []);

  return {
    sheetExpandSignal,
    triggerSheetExpand,
    applyCompleteState,
    setApplyCompleteState,
  };
}

/** 30초 자동 틱 제거. 목록/마커는 jobs 스토어·파생 데이터 변경으로 갱신됩니다. */
export function useMapPageListRefreshSignal() {
  const refreshListTime = useCallback(() => {}, []);

  return {
    refreshListTime,
  };
}

export function useMapPageLocationToast() {
  const [locationToast, setLocationToast] = useState("");
  const locationToastTimerRef = useRef(null);

  const showLocationToast = useCallback((message) => {
    setLocationToast(message);
    if (locationToastTimerRef.current) clearTimeout(locationToastTimerRef.current);
    locationToastTimerRef.current = setTimeout(() => setLocationToast(""), 2200);
  }, []);

  return {
    locationToast,
    showLocationToast,
    locationToastTimerRef,
  };
}

export function useMapPageFabRouteStateFlow({
  location,
  navigate,
  triggerSheetExpand,
  sheetDispatch,
  openJobListPanel,
}) {
  const authReady = useUserStore((s) => s.authReady);

  useEffect(() => {
    const key = location.state?.fabMenu;
    if (key == null) return;

    const needsAuth = key === "post" || key === "help" || key === "urgent" || key === "consumer";
    if (needsAuth) {
      if (!authReady) return;
      const reason = key === "consumer" ? "consumer" : "post";
      if (!guardMemberAction(reason)) {
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
        return;
      }
    }

    if (key === "sheet") {
      if (openJobListPanel) openJobListPanel();
      else triggerSheetExpand();
    }
    if (key === "post" || key === "help" || key === "urgent") {
      sheetDispatch({ type: "SHEET_FAB_OPEN_POST", mode: key });
    }
    if (key === "consumer") {
      sheetDispatch({ type: "SHEET_FAB_OPEN_CONSUMER" });
    }
    if (key === "filter") {
      sheetDispatch({ type: "SHEET_FAB_OPEN_FILTER" });
    }
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [
    authReady,
    location.state,
    location.pathname,
    location.search,
    navigate,
    openJobListPanel,
    sheetDispatch,
    triggerSheetExpand,
  ]);
}

