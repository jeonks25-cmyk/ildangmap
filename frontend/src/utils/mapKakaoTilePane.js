/** 일당맵 커스텀 마커만 (Kakao 내부 class*=marker 제외) */
const MARKER_SELECTOR =
  ".geo-life-marker, .geo-pin-marker, .geo-pay-marker, .geo-estimate-marker, .geo-hmarker, .geo-compact-marker, .geo-place-marker, .job-pin-marker, .map-search-marker";

function scoreTilePaneCandidate(child) {
  const rect = child.getBoundingClientRect();
  const area = rect.width * rect.height;
  let score = area;
  const tileLike = child.querySelectorAll("img").length + child.querySelectorAll("canvas").length;
  score += tileLike * 10000;
  if (child.querySelector(MARKER_SELECTOR)) score -= 50000;
  return score;
}

/**
 * Kakao map-container 직계 자식 중 타일·pan/zoom 대상 pane
 */
export function pickKakaoTilePane(container) {
  if (!(container instanceof HTMLElement)) return null;

  const children = Array.from(container.children).filter((child) => child instanceof HTMLElement);
  if (!children.length) return null;

  let best = children[0];
  let bestScore = scoreTilePaneCandidate(best);

  children.forEach((child) => {
    const score = scoreTilePaneCandidate(child);
    if (score > bestScore) {
      bestScore = score;
      best = child;
    }
  });

  return best;
}

export { MARKER_SELECTOR };
