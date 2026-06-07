/** localStorage ILDANG_MAP_DEBUG=1 → 터치 hit target / draggable 로그 */

export function isMapTouchDebugEnabled() {
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem("ILDANG_MAP_DEBUG") === "1";
  } catch (_) {
    return false;
  }
}

export function isMapMinimalUiEnabled() {
  try {
    return typeof window !== "undefined" && window.localStorage?.getItem("ILDANG_MAP_MINIMAL") === "1";
  } catch (_) {
    return false;
  }
}

export function logMapDraggableState(map, label = "map") {
  if (!isMapTouchDebugEnabled() || !map) return;
  const draggable = typeof map.getDraggable === "function" ? map.getDraggable() : "(no getDraggable)";
  const zoomable = typeof map.getZoomable === "function" ? map.getZoomable() : "(no getZoomable)";
  // eslint-disable-next-line no-console
  console.info(`[map-debug] ${label} draggable=${draggable} zoomable=${zoomable}`);
}

export function logPointerHitTarget(event, label = "pointer") {
  if (!isMapTouchDebugEnabled()) return;
  const x = event.clientX;
  const y = event.clientY;
  const el = document.elementFromPoint(x, y);
  const tag = el?.tagName?.toLowerCase() || "none";
  const id = el?.id ? `#${el.id}` : "";
  const cls =
    el?.className && typeof el.className === "string"
      ? `.${el.className.split(/\s+/).slice(0, 4).join(".")}`
      : "";
  // eslint-disable-next-line no-console
  console.info(`[map-debug] ${label} hit`, { x, y, tag, id, cls, el });
}
