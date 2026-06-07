const TAP_MOVE_PX = 10;
const TAP_MAX_MS = 400;

/**
 * 마커만 tap/click — pointerdown은 전파 유지(지도 pan). 짧은 tap만 카드 오픈.
 * @returns {() => void} cleanup
 */
export function bindMarkerPointerTarget(el, onActivate) {
  if (!el || typeof onActivate !== "function") return () => {};

  let pointerId = null;
  let start = null;

  const clear = () => {
    pointerId = null;
    start = null;
  };

  const isTap = (e) => {
    if (!start) return false;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const dt = Date.now() - start.at;
    return dx <= TAP_MOVE_PX && dy <= TAP_MOVE_PX && dt <= TAP_MAX_MS;
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerId = e.pointerId;
    start = { x: e.clientX, y: e.clientY, at: Date.now() };
  };

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId || !start) return;
    const tap = isTap(e);
    clear();
    if (!tap) return;
    e.stopPropagation();
    e.preventDefault();
    onActivate();
  };

  const onPointerCancel = () => {
    clear();
  };

  const onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onActivate();
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    onActivate();
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown, true);

  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown, true);
  };
}
