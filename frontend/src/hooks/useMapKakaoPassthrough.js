import { useEffect } from "react";
import { MARKER_SELECTOR, pickKakaoTilePane } from "../utils/mapKakaoTilePane";

/**
 * Kakao map pan/zoom — 컨테이너·타일 pane은 항상 auto.
 * 커스텀 마커 DOM만 manipulation (pane 전체를 none 하지 않음).
 */
export default function useMapKakaoPassthrough(mapContainerRef, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const container = mapContainerRef?.current;
    if (!container) return undefined;

    const sync = () => {
      container.style.pointerEvents = "auto";
      container.style.touchAction = "none";

      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        child.style.pointerEvents = "auto";
        child.style.touchAction = "none";
        child.removeAttribute("data-ildang-tile-pane");
        child.querySelectorAll(MARKER_SELECTOR).forEach((marker) => {
          if (marker instanceof HTMLElement) {
            marker.style.pointerEvents = "auto";
            marker.style.touchAction = "manipulation";
          }
        });
      });

      const tilePane = pickKakaoTilePane(container);
      if (tilePane instanceof HTMLElement) {
        tilePane.setAttribute("data-ildang-tile-pane", "true");
      }
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
