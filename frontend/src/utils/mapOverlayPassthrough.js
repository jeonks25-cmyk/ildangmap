/**
 * CustomOverlay — 앵커는 통과, 마커 버블만 클릭 가능.
 * map-container 직계 pane에는 pointer-events를 건드리지 않음 (pan/zoom 유지).
 */
export function applyMapOverlayPassthrough(anchorEl, interactiveEl) {
  if (!anchorEl) return;

  anchorEl.style.pointerEvents = "none";
  if (interactiveEl) {
    interactiveEl.style.pointerEvents = "auto";
    interactiveEl.style.touchAction = "manipulation";
  }

  let node = anchorEl.parentElement;
  while (node && !node.classList?.contains?.("map-container")) {
    if (node.parentElement?.classList?.contains?.("map-container")) {
      break;
    }
    node.style.pointerEvents = "none";
    node = node.parentElement;
  }
}
