export const MAP_OVERLAY_ANCHOR_CLASS = "map-overlay-anchor--passthrough";
export const MAP_OVERLAY_MARKER_CLASS = "map-overlay-marker--interactive";

/**
 * CustomOverlay — 앵커는 통과, 마커 bubble만 클릭.
 * 조상 pane inline pointer-events 조작 없음 (pinch zoom 유지).
 */
export function applyMapOverlayPassthrough(anchorEl, interactiveEl) {
  if (anchorEl instanceof HTMLElement) {
    anchorEl.classList.add(MAP_OVERLAY_ANCHOR_CLASS);
  }
  if (interactiveEl instanceof HTMLElement) {
    interactiveEl.classList.add(MAP_OVERLAY_MARKER_CLASS);
  }
}
