import { useEffect } from "react";

/**
 * Kakao map pan/zoom — pane inline 스타일 조작 없음.
 *
 * 이전: MutationObserver + 800ms interval로 pane pointer-events/touch-action을 재적용했으나,
 * pinch zoom 중 타일 DOM 변경 때마다 sync()가 실행되어 활성 터치 시퀀스가 끊김.
 *
 * 제스처 라우팅: map-touch-passthrough.css (.map-container { touch-action: none })
 * 마커 tap: applyMapOverlayPassthrough (overlay hook)
 */
export default function useMapKakaoPassthrough(_mapContainerRef, _enabled) {
  useEffect(() => undefined, []);
}
