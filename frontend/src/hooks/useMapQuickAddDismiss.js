import { useEffect } from "react";
import { MARKER_SELECTOR } from "../utils/mapKakaoTilePane";

const QUICK_ADD_DISMISS_IGNORE = [
  ".map-quick-add-anchor",
  ".floating-action-button-anchor",
  ".floating-action-button",
  ".map-page-head",
  ".map-floating-anchor",
  ".map-search-marker",
  ".map-search-marker-info",
  ".map-geo-stage__loc-fab",
  ".map-card-container",
  ".map-layer-chips",
  MARKER_SELECTOR,
].join(", ");

/** 말풍선 메뉴 — 지도·카드 밖 터치 시 닫기 */
export default function useMapQuickAddDismiss(open, onClose) {
  useEffect(() => {
    if (!open || !onClose) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(QUICK_ADD_DISMISS_IGNORE)) return;
      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, onClose]);
}
