import { useEffect } from "react";
import { MARKER_SELECTOR, pickKakaoTilePane } from "../utils/mapKakaoTilePane";

function syncCustomMarkerTouches(root) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll(MARKER_SELECTOR).forEach((marker) => {
    if (marker instanceof HTMLElement) {
      marker.style.pointerEvents = "auto";
      marker.style.touchAction = "manipulation";
    }
  });
}

/**
 * Kakao map pan/zoom — 타일 pane만 제스처 수신, 마커 pane은 통과 + 마커만 tap.
 * 모든 pane에 pointer-events:auto를 주면 상위 투명 pane이 pinch를 가로채는 문제가 있음.
 */
export default function useMapKakaoPassthrough(mapContainerRef, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const container = mapContainerRef?.current;
    if (!container) return undefined;

    const sync = () => {
      container.style.pointerEvents = "auto";
      container.style.touchAction = "none";

      const tilePane = pickKakaoTilePane(container);

      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const isTile = child === tilePane;
        child.style.pointerEvents = isTile ? "auto" : "none";
        child.style.touchAction = isTile ? "none" : "auto";
        syncCustomMarkerTouches(child);
      });

      if (tilePane instanceof HTMLElement) {
        tilePane.setAttribute("data-ildang-tile-pane", "true");
        tilePane.style.pointerEvents = "auto";
        tilePane.style.touchAction = "none";
      }

      syncCustomMarkerTouches(container);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(container, { childList: true, subtree: true });
    const timer = window.setInterval(sync, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [enabled, mapContainerRef]);
}
