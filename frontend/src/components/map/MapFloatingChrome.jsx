import React from "react";
import MapFilterSheet from "./MapFilterSheet";

/**
 * 지도 캔버스 HUD — 필터 칩·상태. 검색 패널은 MapPage map-search-panel-layer, 알림은 MapTopBar.
 */
function MapFloatingChrome({
  filterChipLabel,
  onClearFilterChip,
  jobsLoading,
  jobsError,
  showLocationFab = false,
  hideLocationFab = false,
  locating,
  onOpenLocation,
  filterSheetOpen,
  filterSheetProps,
}) {
  return (
    <div className="geo-map-chrome geo-map-chrome--minimal" aria-label="지도 탐색">
      {filterChipLabel ? (
        <button type="button" className="geo-map-filter-chip" onClick={onClearFilterChip} aria-label="필터 해제">
          {filterChipLabel}
          <span className="geo-map-filter-chip__x" aria-hidden="true">
            ×
          </span>
        </button>
      ) : null}

      {jobsLoading ? (
        <div className="geo-map-status" role="status" aria-live="polite">
          불러오는 중
        </div>
      ) : null}

      {showLocationFab && !hideLocationFab && onOpenLocation ? (
        <button
          type="button"
          className={`geo-map-fab geo-map-fab--loc${locating ? " is-busy" : ""}`}
          onClick={onOpenLocation}
          aria-label="내 위치"
        >
          <span className="geo-map-fab__glyph geo-map-fab__glyph--loc" aria-hidden="true" />
        </button>
      ) : null}

      <MapFilterSheet open={filterSheetOpen} {...filterSheetProps} />
    </div>
  );
}

export default React.memo(MapFloatingChrome);
