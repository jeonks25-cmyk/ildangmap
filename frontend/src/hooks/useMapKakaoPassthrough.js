import { useEffect } from "react";
import { pickKakaoTilePane } from "../utils/mapKakaoTilePane";

/**
 * Kakao overlay pane 1회 pass-through — 타일 pane만 hit, 마커 bubble(auto)은 유지.
 * MutationObserver/interval 없음 (pinch 중 DOM 변경 시 제스처 끊김 방지).
 */
export default function useMapKakaoPassthrough(mapContainerRef, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const container = mapContainerRef?.current;
    if (!container) return undefined;

    let cancelled = false;

    const releaseOverlayPanes = () => {
      if (cancelled) return;
      const tilePane = pickKakaoTilePane(container);
      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child === tilePane) {
          child.style.removeProperty("pointer-events");
        } else {
          child.style.pointerEvents = "none";
        }
      });
    };

    releaseOverlayPanes();
    const timer = window.setTimeout(releaseOverlayPanes, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, mapContainerRef]);
}
