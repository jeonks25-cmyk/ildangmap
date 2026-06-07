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

/** localStorage ILDANG_MAP_DEBUG=1 → pinch 중 touches.length 로그 (capture) */
export function installMapPinchTouchDebug(root) {
  if (!isMapTouchDebugEnabled() || !(root instanceof HTMLElement)) {
    return () => {};
  }

  const log = (phase, event) => {
    // eslint-disable-next-line no-console
    console.info(`[map-debug] touch-${phase}`, {
      touches: event.touches?.length ?? 0,
      changed: event.changedTouches?.length ?? 0,
      target:
        event.target instanceof HTMLElement
          ? `${event.target.tagName.toLowerCase()}.${String(event.target.className || "").split(/\s+/).slice(0, 3).join(".")}`
          : String(event.target),
    });
  };

  const onStart = (e) => log("start", e);
  const onMove = (e) => log("move", e);
  const onEnd = (e) => log("end", e);
  const onCancel = (e) => log("cancel", e);

  root.addEventListener("touchstart", onStart, { capture: true, passive: true });
  root.addEventListener("touchmove", onMove, { capture: true, passive: true });
  root.addEventListener("touchend", onEnd, { capture: true, passive: true });
  root.addEventListener("touchcancel", onCancel, { capture: true, passive: true });

  return () => {
    root.removeEventListener("touchstart", onStart, { capture: true });
    root.removeEventListener("touchmove", onMove, { capture: true });
    root.removeEventListener("touchend", onEnd, { capture: true });
    root.removeEventListener("touchcancel", onCancel, { capture: true });
  };
}
