import { useCallback, useEffect, useReducer } from "react";
import { useJobStore } from "../store/useJobStore";
import { useUiStore } from "../store/useUiStore";
import { initialMapSheetState, mapSheetReducer } from "./mapSheetReducer";

/**
 * 지도 탭 시트 UI 상태(reducer) + useUiStore 바텀시트 동기화 + 시트 높이 CSS 변수.
 */
export default function useMapSheetController() {
  const [sheetState, sheetDispatch] = useReducer(mapSheetReducer, initialMapSheetState);

  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const setSelectedCardId = useUiStore((s) => s.setSelectedCardId);
  const sheetVh = useUiStore((s) => s.bottomSheetVh);
  const setSheetVh = useUiStore((s) => s.setBottomSheetVh);
  const openBottomSheet = useUiStore((s) => s.openBottomSheet);
  const closeBottomSheet = useUiStore((s) => s.closeBottomSheet);

  useEffect(() => {
    setSelectedCardId(sheetState.detailJobId || selectedJobId || "");
  }, [selectedJobId, setSelectedCardId, sheetState.detailJobId]);

  useEffect(() => {
    const {
      postComposerMode,
      consumerComposerOpen,
      applicantsSheetJobId,
      detailJobId,
      searchPanelOpen,
      filterSheetOpen,
    } = sheetState;

    let nextKey = "";
    let nextPayload = null;
    if (postComposerMode) {
      nextKey = "jobComposer";
      nextPayload = { mode: postComposerMode };
    } else if (consumerComposerOpen) {
      nextKey = "consumerComposer";
      nextPayload = null;
    } else if (applicantsSheetJobId != null) {
      nextKey = "applicants";
      nextPayload = { jobId: applicantsSheetJobId };
    } else if (detailJobId != null) {
      nextKey = "jobDetail";
      nextPayload = { jobId: detailJobId };
    } else if (searchPanelOpen) {
      nextKey = "searchPanel";
      nextPayload = null;
    } else if (filterSheetOpen) {
      nextKey = "filterSheet";
      nextPayload = null;
    }

    const ui = useUiStore.getState();
    if (!nextKey) {
      if (ui.activeBottomSheet) closeBottomSheet();
      return;
    }
    const sameKey = ui.activeBottomSheet === nextKey;
    const samePayload = JSON.stringify(ui.bottomSheetPayload ?? null) === JSON.stringify(nextPayload ?? null);
    if (sameKey && samePayload) return;
    openBottomSheet(nextKey, nextPayload);
  }, [closeBottomSheet, openBottomSheet, sheetState]);

  useEffect(() => {
    document.documentElement.style.setProperty("--map-sheet-vh", String(sheetVh));
    return () => {
      document.documentElement.style.removeProperty("--map-sheet-vh");
    };
  }, [sheetVh]);

  const onSheetVhChange = useCallback(
    (vh) => {
      setSheetVh(vh);
    },
    [setSheetVh]
  );

  const setDetailJobId = useCallback((id) => {
    sheetDispatch(id == null ? { type: "SHEET_CLOSE_JOB_DETAIL" } : { type: "SHEET_OPEN_JOB_DETAIL", jobId: id });
  }, []);

  const setApplicantsSheetJobId = useCallback((id) => {
    sheetDispatch(id == null ? { type: "SHEET_CLOSE_APPLICANTS" } : { type: "SHEET_OPEN_APPLICANTS", jobId: id });
  }, []);

  const setPostComposerMode = useCallback((mode) => {
    sheetDispatch({ type: "SHEET_SET_POST_COMPOSER", mode: mode ?? null });
  }, []);

  const setConsumerComposerOpen = useCallback((open) => {
    sheetDispatch({ type: "SHEET_SET_CONSUMER_COMPOSER", open: Boolean(open) });
  }, []);

  const setSearchPanelOpen = useCallback((open) => {
    sheetDispatch(open ? { type: "SHEET_OPEN_SEARCH_PANEL" } : { type: "SHEET_CLOSE_SEARCH_PANEL" });
  }, []);

  const setFilterSheetOpen = useCallback((open) => {
    sheetDispatch(open ? { type: "SHEET_OPEN_FILTER_PANEL" } : { type: "SHEET_CLOSE_FILTER_PANEL" });
  }, []);

  return {
    sheetState,
    sheetDispatch,
    detailJobId: sheetState.detailJobId,
    applicantsSheetJobId: sheetState.applicantsSheetJobId,
    postComposerMode: sheetState.postComposerMode,
    consumerComposerOpen: sheetState.consumerComposerOpen,
    searchPanelOpen: sheetState.searchPanelOpen,
    filterSheetOpen: sheetState.filterSheetOpen,
    setDetailJobId,
    setApplicantsSheetJobId,
    setPostComposerMode,
    setConsumerComposerOpen,
    setSearchPanelOpen,
    setFilterSheetOpen,
    onSheetVhChange,
  };
}
