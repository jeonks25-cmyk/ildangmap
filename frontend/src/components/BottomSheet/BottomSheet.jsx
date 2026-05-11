import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * 거지맵형 모바일 BottomSheet
 * - 높이: minVh ~ maxVh 사이에서 드래그(포인터)로 조절
 * - 기본 defaultVh (28vh 권장)
 */
export default function BottomSheet({
  title = "주변 공고",
  minVh = 28,
  maxVh = 70,
  defaultVh = 28,
  className = "",
  onHeightCommit,
  children,
}) {
  const [heightVh, setHeightVh] = useState(() =>
    Math.min(maxVh, Math.max(minVh, defaultVh))
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startY: 0, startVh: defaultVh });
  const sheetRef = useRef(null);

  const clamp = useCallback(
    (v) => Math.min(maxVh, Math.max(minVh, v)),
    [minVh, maxVh]
  );

  useEffect(() => {
    setHeightVh((h) => clamp(h));
  }, [minVh, maxVh, clamp]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const dy = dragRef.current.startY - e.clientY;
      const dvh = (dy / window.innerHeight) * 100;
      setHeightVh(clamp(dragRef.current.startVh + dvh));
    };

    const onUp = () => {
      setDragging(false);
      onHeightCommit?.();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, clamp, onHeightCommit]);

  const onGrabPointerDown = (e) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startVh: heightVh };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {
      /* noop */
    }
    setDragging(true);
  };

  const onHeaderClick = (e) => {
    if (dragging) return;
    if (e.target.closest(".bottom-sheet-grab-area")) return;
    setHeightVh((h) => (h >= (minVh + maxVh) / 2 ? minVh : maxVh));
    onHeightCommit?.();
  };

  return (
    <div
      ref={sheetRef}
      className={`bottom-sheet bottom-sheet--geo bottom-sheet--draggable ${
        dragging ? "bottom-sheet--dragging" : ""
      } ${className}`.trim()}
      style={{ height: `${heightVh}vh` }}
    >
      <button
        type="button"
        className="bottom-sheet-handle bottom-sheet-handle--geo"
        onClick={onHeaderClick}
        aria-expanded={heightVh >= (minVh + maxVh) / 2}
      >
        <div
          className="bottom-sheet-grab-area"
          onPointerDown={onGrabPointerDown}
          role="presentation"
        >
          <span className="bottom-sheet-grabber bottom-sheet-grabber--geo" aria-hidden="true" />
        </div>
        <div className="bottom-sheet-handle-row--geo">
          <span className="bottom-sheet-title">{title}</span>
          <span className="bottom-sheet-handle-hint" aria-hidden="true">
            {heightVh >= (minVh + maxVh) / 2 ? "아래로 드래그" : "위로 드래그"}
          </span>
        </div>
      </button>

      <div className="bottom-sheet-content">{children}</div>
    </div>
  );
}
