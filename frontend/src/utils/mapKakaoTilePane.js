/** 일당맵 커스텀 마커만 (Kakao 내부 class*=marker 제외) */
const MARKER_SELECTOR =
  ".geo-life-marker, .geo-pin-marker, .geo-pay-marker, .geo-estimate-marker, .geo-hmarker, .geo-compact-marker, .geo-place-marker, .job-pin-marker, .map-search-marker";

/**
 * Kakao map-container 직계 자식 중 면적이 가장 큰 pane (타일·pan 대상)
 */
export function pickKakaoTilePane(container) {
  if (!(container instanceof HTMLElement)) return null;

  let best = null;
  let bestArea = 0;

  Array.from(container.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const rect = child.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      best = child;
    }
  });

  return best || container;
}

export { MARKER_SELECTOR };
