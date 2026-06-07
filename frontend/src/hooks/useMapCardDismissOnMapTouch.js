import { useEffect } from "react";
import { MARKER_SELECTOR } from "../utils/mapKakaoTilePane";

/** 지도 카드 밖(지도 영역) 터치 시 닫기 — dim/전면 오버레이 없음 */
const MAP_CARD_DISMISS_IGNORE = [
  ".map-card-container",
  ".map-page-head",
  ".map-layer-chips",
  ".map-floating-btn",
  ".map-geo-stage__loc-fab",
  ".map-floating-action-layer__add-fab",
  ".floating-action-button",
  ".floating-action-button-anchor",
  ".map-floating-anchor",
  ".map-search-marker",
  ".map-search-marker-info",
  ".map-quick-add-anchor",
  ".map-quick-add-bubble",
  ".map-quick-add-bubble__action",
  ".geo-map-filter-chip",
  MARKER_SELECTOR,
].join(", ");

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {import("react").RefObject<HTMLElement|null>} mapContainerRef
 */
export default function useMapCardDismissOnMapTouch(open, onClose, mapContainerRef) {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const container = mapContainerRef?.current;
    if (!container) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!container.contains(target)) return;
      if (target.closest(MAP_CARD_DISMISS_IGNORE)) return;
      onClose();
    };

    container.addEventListener("pointerdown", onPointerDown, true);
    return () => container.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, onClose, mapContainerRef]);
}
