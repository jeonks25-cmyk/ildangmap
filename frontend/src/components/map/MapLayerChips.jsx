import React, { useMemo } from "react";
import { MAP_ITEM_TYPE } from "../../constants/mapItemTypes";

/** MVP: 현장 생활 정보 최소 UX */
export const MAP_LAYER_MVP_CATEGORIES = [
  {
    key: "parking",
    label: "주차",
    layers: [MAP_ITEM_TYPE.PARKING],
  },
  {
    key: "restroom",
    label: "화장실",
    layers: [MAP_ITEM_TYPE.RESTROOM],
  },
  {
    key: "restaurant",
    label: "식당",
    layers: [MAP_ITEM_TYPE.RESTAURANT, MAP_ITEM_TYPE.FOOD],
  },
];

const MVP_LAYER_KEYS = MAP_LAYER_MVP_CATEGORIES.flatMap((category) => category.layers);

/** 추후 기능 — 코드 유지, UI 비노출 */
export const MAP_LAYER_HIDDEN_CATEGORIES = [
  {
    key: "sos",
    label: "긴급 SOS",
    layers: [MAP_ITEM_TYPE.SOS, MAP_ITEM_TYPE.HELPER_REQUEST],
  },
  {
    key: "access",
    label: "출입정보",
    layers: [MAP_ITEM_TYPE.ACCESS_INFO, MAP_ITEM_TYPE.SITE_MEMO],
  },
  {
    key: "elevator",
    label: "엘리베이터",
    layers: [MAP_ITEM_TYPE.ELEVATOR],
  },
  {
    key: "material",
    label: "자재 픽업",
    layers: [MAP_ITEM_TYPE.MATERIAL_PICKUP, MAP_ITEM_TYPE.MATERIAL_SHARE],
  },
  {
    key: "memo",
    label: "현장 메모",
    layers: [MAP_ITEM_TYPE.DANGER, MAP_ITEM_TYPE.MEETING_PLACE, MAP_ITEM_TYPE.MEETING_POINT],
  },
  {
    key: "consumer",
    label: "소비자 요청",
    layers: [MAP_ITEM_TYPE.ESTIMATE, MAP_ITEM_TYPE.ESTIMATE_REQUEST],
  },
];

function isLayerVisible(visibleLayers, layer) {
  return visibleLayers?.[layer] !== false;
}

function MapLayerChips({
  visibleLayers,
  onToggleCategory,
  onShowAllLayers,
  onToggleApartmentLayer,
}) {
  const apartmentVisible = isLayerVisible(visibleLayers, MAP_ITEM_TYPE.FIELD);
  const allMvpVisible = useMemo(
    () =>
      apartmentVisible && MVP_LAYER_KEYS.every((layer) => isLayerVisible(visibleLayers, layer)),
    [apartmentVisible, visibleLayers]
  );

  return (
    <div className="map-layer-chips map-layer-chips--oyaji" role="group" aria-label="지도 필터">
      <button
        type="button"
        className={`map-layer-chip${allMvpVisible ? " is-active" : ""}`}
        aria-pressed={allMvpVisible}
        onClick={() => onShowAllLayers?.()}
      >
        전체
      </button>
      <button
        type="button"
        className={`map-layer-chip${apartmentVisible ? " is-active" : ""}`}
        aria-pressed={apartmentVisible}
        onClick={() => onToggleApartmentLayer?.()}
      >
        아파트
      </button>
      {MAP_LAYER_MVP_CATEGORIES.map((category) => {
        const active = category.layers.some((layer) => isLayerVisible(visibleLayers, layer));
        return (
          <button
            key={category.key}
            type="button"
            className={`map-layer-chip${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => onToggleCategory?.(category.layers)}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(MapLayerChips);
