/**
 * 지도 탭 — 바텀시트/모달과 동기되는 로컬 시트 UI 상태 (MapPage 전용).
 * useUiStore와의 동기는 useMapSheetController의 effect에서 처리.
 */

export const initialMapSheetState = {
  detailJobId: null,
  applicantsSheetJobId: null,
  postComposerMode: null,
  consumerComposerOpen: false,
  searchPanelOpen: false,
  filterSheetOpen: false,
};

/** @typedef {typeof initialMapSheetState} MapSheetState */

/**
 * @param {MapSheetState} state
 * @param {object} action
 * @returns {MapSheetState}
 */
export function mapSheetReducer(state, action) {
  switch (action.type) {
    case "SHEET_OPEN_JOB_DETAIL": {
      if (state.detailJobId === action.jobId) return state;
      return { ...state, detailJobId: action.jobId };
    }
    case "SHEET_CLOSE_JOB_DETAIL": {
      if (state.detailJobId == null) return state;
      return { ...state, detailJobId: null };
    }
    case "SHEET_OPEN_APPLICANTS": {
      if (state.applicantsSheetJobId === action.jobId) return state;
      return { ...state, applicantsSheetJobId: action.jobId };
    }
    case "SHEET_CLOSE_APPLICANTS": {
      if (state.applicantsSheetJobId == null) return state;
      return { ...state, applicantsSheetJobId: null };
    }
    case "SHEET_SET_POST_COMPOSER": {
      const mode = action.mode ?? null;
      if (state.postComposerMode === mode) return state;
      return { ...state, postComposerMode: mode };
    }
    case "SHEET_SET_CONSUMER_COMPOSER": {
      if (state.consumerComposerOpen === action.open) return state;
      return { ...state, consumerComposerOpen: action.open };
    }
    case "SHEET_OPEN_SEARCH_PANEL": {
      if (state.searchPanelOpen && !state.filterSheetOpen) return state;
      return { ...state, searchPanelOpen: true, filterSheetOpen: false };
    }
    case "SHEET_CLOSE_SEARCH_PANEL": {
      if (!state.searchPanelOpen) return state;
      return { ...state, searchPanelOpen: false };
    }
    case "SHEET_OPEN_FILTER_PANEL": {
      if (state.filterSheetOpen && !state.searchPanelOpen) return state;
      return { ...state, filterSheetOpen: true, searchPanelOpen: false };
    }
    case "SHEET_CLOSE_FILTER_PANEL": {
      if (!state.filterSheetOpen) return state;
      return { ...state, filterSheetOpen: false };
    }
    case "SHEET_FAB_OPEN_POST": {
      const next = {
        ...state,
        detailJobId: null,
        applicantsSheetJobId: null,
        postComposerMode: action.mode,
        consumerComposerOpen: false,
      };
      if (
        state.detailJobId === next.detailJobId &&
        state.applicantsSheetJobId === next.applicantsSheetJobId &&
        state.postComposerMode === next.postComposerMode &&
        state.consumerComposerOpen === next.consumerComposerOpen
      ) {
        return state;
      }
      return next;
    }
    case "SHEET_FAB_OPEN_CONSUMER": {
      const next = {
        ...state,
        detailJobId: null,
        applicantsSheetJobId: null,
        consumerComposerOpen: true,
        postComposerMode: null,
      };
      if (
        state.detailJobId === next.detailJobId &&
        state.applicantsSheetJobId === next.applicantsSheetJobId &&
        state.consumerComposerOpen === next.consumerComposerOpen &&
        state.postComposerMode === next.postComposerMode
      ) {
        return state;
      }
      return next;
    }
    case "SHEET_FAB_OPEN_FILTER": {
      if (state.filterSheetOpen && !state.searchPanelOpen) return state;
      return { ...state, filterSheetOpen: true, searchPanelOpen: false };
    }
    case "SHEET_CLEAR_DETAIL_AND_APPLICANTS": {
      if (state.detailJobId == null && state.applicantsSheetJobId == null) return state;
      return { ...state, detailJobId: null, applicantsSheetJobId: null };
    }
    default:
      return state;
  }
}
