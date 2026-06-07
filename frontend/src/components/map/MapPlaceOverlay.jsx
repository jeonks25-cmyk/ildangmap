import React, { useCallback, useMemo } from "react";
import PlaceDetailCard from "./PlaceDetailCard";
import PlaceInfoCardMenu from "./PlaceInfoCardMenu";
import MapCardContainer from "./MapCardContainer";
import { isPlaceInfoCard } from "../../utils/placeInfoCard";
import { getMapItemKey } from "../../utils/mapItemModel";
import {
  PLACE_SORT_DISTANCE,
  PLACE_SORT_NAME,
  getPlaceRowDescription,
  getPlaceRowTitle,
  getPlaceTypeIcon,
} from "../../utils/placeDistance";
import FloatingButton, { FloatingButtonListIcon } from "./FloatingButton";
import "./map-place-overlay.css";

export function MapPlaceListFab({ onClick, open = false }) {
  return (
    <FloatingButton
      variant="labeled"
      className="map-floating-btn--list"
      icon={<FloatingButtonListIcon />}
      label="목록"
      open={open}
      onClick={onClick}
      aria-label="주변 장소 목록 열기"
      aria-expanded={open}
    />
  );
}

/**
 * 지도 위 장소 목록·상세 — MapCardContainer 공통 셸
 */
function MapPlaceOverlay({
  open,
  mode = "list",
  detailPlace = null,
  places = [],
  sortMode = PLACE_SORT_DISTANCE,
  emptyMessage = "표시할 장소가 없습니다.",
  focusedItemKey = "",
  mapContainerRef,
  onClose,
  onBack,
  onSortModeChange,
  onSelectPlace,
  onToast,
  onEditPlace,
}) {
  const handleBackClick = useCallback(() => {
    if (mode === "detail") {
      onBack?.();
      return;
    }
    onClose?.();
  }, [mode, onBack, onClose]);

  const headerTitle = mode === "detail" ? getPlaceRowTitle(detailPlace) : "목록";

  const sortTabs = useMemo(
    () => (
      <div className="map-place-overlay__sort" role="group" aria-label="정렬">
        <button
          type="button"
          className={`map-place-overlay__sort-btn${sortMode === PLACE_SORT_DISTANCE ? " is-active" : ""}`}
          aria-pressed={sortMode === PLACE_SORT_DISTANCE}
          onClick={() => onSortModeChange?.(PLACE_SORT_DISTANCE)}
        >
          거리순
        </button>
        <button
          type="button"
          className={`map-place-overlay__sort-btn${sortMode === PLACE_SORT_NAME ? " is-active" : ""}`}
          aria-pressed={sortMode === PLACE_SORT_NAME}
          onClick={() => onSortModeChange?.(PLACE_SORT_NAME)}
        >
          이름순
        </button>
      </div>
    ),
    [sortMode, onSortModeChange],
  );

  if (!open) return null;

  if (mode === "list") {
    return (
      <MapCardContainer
        open={open}
        onClose={onClose}
        mapContainerRef={mapContainerRef}
        title={headerTitle}
        onBack={handleBackClick}
        showBack
        stickySlot={sortTabs}
        className="map-place-overlay-card"
        ariaLabel="주변 장소 목록"
      >
        <div role="list" aria-label="주변 장소 목록">
          {places.length ? (
            places.map((place, index) => {
              const key = getMapItemKey(place);
              const isSelected = Boolean(focusedItemKey && key === focusedItemKey);
              const icon = getPlaceTypeIcon(place.layer || place.type);
              const name = getPlaceRowTitle(place);
              const desc = getPlaceRowDescription(place);
              return (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  className={`map-place-overlay-row${isSelected ? " is-selected" : ""}`}
                  onClick={() => onSelectPlace?.(place)}
                >
                  <span className="map-place-overlay-row__rank" aria-hidden="true">
                    {index + 1}.
                  </span>
                  <span className="map-place-overlay-row__icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="map-place-overlay-row__body">
                    <span className="map-place-overlay-row__title">{name}</span>
                    {desc ? <span className="map-place-overlay-row__desc">{desc}</span> : null}
                  </span>
                  <span className="map-place-overlay-row__distance">{place.distanceLabel || "—"}</span>
                </button>
              );
            })
          ) : (
            <p className="map-place-overlay__empty">{emptyMessage}</p>
          )}
        </div>
      </MapCardContainer>
    );
  }

  const showInfoMenu = isPlaceInfoCard(detailPlace);
  const detailAddress = String(detailPlace?.address || detailPlace?.meta || "").trim();

  return (
    <MapCardContainer
      open={open}
      onClose={onClose}
      mapContainerRef={mapContainerRef}
      title={headerTitle}
      onBack={handleBackClick}
      showBack
      headerActions={
        showInfoMenu ? (
          <PlaceInfoCardMenu place={detailPlace} address={detailAddress} onEdit={onEditPlace} onToast={onToast} />
        ) : null
      }
      className="map-place-overlay-card map-place-overlay-card--detail"
      scrollClassName="map-place-overlay-card__scroll--detail"
      ariaLabel="장소 상세"
    >
      <PlaceDetailCard place={detailPlace} onToast={onToast} onEdit={onEditPlace} showInfoMenu={showInfoMenu} />
    </MapCardContainer>
  );
}

export default React.memo(MapPlaceOverlay);
