import { useCallback } from "react";

/**
 * 지도 탭 검색 패널·필터 시트 관련 액션 (시트 상태는 sheetDispatch로만 변경).
 */
export default function useMapSearchActions({
  rememberRecentSearch,
  searchQuery,
  setSearchQuery,
  setRecentSearches,
  setSearchCraftFilter,
  setSearchTradeFilter,
  setSearchWorkFilter,
  setSearchDistanceKm,
  sheetDispatch,
}) {
  const handleSubmitSearch = useCallback(() => {
    rememberRecentSearch(searchQuery);
    sheetDispatch({ type: "SHEET_CLOSE_SEARCH_PANEL" });
  }, [rememberRecentSearch, searchQuery, sheetDispatch]);

  const handlePickSuggestedSearch = useCallback(
    (term) => {
      setSearchQuery(term);
      rememberRecentSearch(term);
      sheetDispatch({ type: "SHEET_CLOSE_SEARCH_PANEL" });
    },
    [rememberRecentSearch, setSearchQuery, sheetDispatch]
  );

  const handleOpenSearchPanel = useCallback(() => {
    sheetDispatch({ type: "SHEET_OPEN_SEARCH_PANEL" });
  }, [sheetDispatch]);

  const handleOpenFilterSheet = useCallback(() => {
    sheetDispatch({ type: "SHEET_OPEN_FILTER_PANEL" });
  }, [sheetDispatch]);

  const handleCloseSearchPanel = useCallback(() => {
    rememberRecentSearch(searchQuery);
    sheetDispatch({ type: "SHEET_CLOSE_SEARCH_PANEL" });
  }, [rememberRecentSearch, searchQuery, sheetDispatch]);

  const handleResetSearchFilters = useCallback(() => {
    setSearchCraftFilter(null);
    setSearchTradeFilter(null);
    setSearchWorkFilter(null);
    setSearchDistanceKm(null);
  }, [setSearchCraftFilter, setSearchDistanceKm, setSearchTradeFilter, setSearchWorkFilter]);

  const handleClearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  return {
    handleSubmitSearch,
    handlePickSuggestedSearch,
    handleOpenSearchPanel,
    handleOpenFilterSheet,
    handleCloseSearchPanel,
    handleResetSearchFilters,
    handleClearRecentSearches,
  };
}
