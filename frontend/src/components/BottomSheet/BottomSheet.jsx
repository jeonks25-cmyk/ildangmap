import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * 거지맵형 모바일 BottomSheet
 * - 높이: minVh ~ maxVh 사이에서 드래그(포인터)로 조절
 * - 기본 defaultVh (28vh 권장)
 */
export default function BottomSheet({
  title = "주변 공고",
  /** 헤더 보조 한 줄 (선택) */
  subtitle,
  /** 우측 액션 (예: 새로고침). 있으면 닫기/힌트 대신 표시 */
  headerRight,
  /** 닫기 콜백이 있으면 우측에 "닫기" 표시 (headerRight 없을 때) */
  onClose,
  minVh = 28,
  maxVh = 70,
  defaultVh = 28,
  /** @type {number[]|undefined} 오름차순 스냅 후보 (예: [22, 40, 88]) */
  snapPointsVh,
  className = "",
  onHeightCommit,
  /** 시트 높이(vh) 변경 시마다 (드래그 중 포함) — 지도 영역 연동용 */
  onHeightVhChange,
  /** 1 이상으로 올라갈 때마다 최대 높이 근처로 스냅 (외부 FAB 등) */
  expandSignal = 0,
  children,
}) {
  const clamp = useCallback(
    (v) => Math.min(maxVh, Math.max(minVh, v)),
    [minVh, maxVh]
  );

  const snapPoints = useMemo(() => {
    if (Array.isArray(snapPointsVh) && snapPointsVh.length >= 2) {
      const sorted = [...new Set(snapPointsVh.map((p) => clamp(Number(p))))].sort((a, b) => a - b);
      return sorted.length >= 2 ? sorted : [minVh, Math.round((minVh + maxVh) / 2), maxVh].map(clamp);
    }
    return [minVh, Math.round((minVh + maxVh) / 2), maxVh].map(clamp);
  }, [snapPointsVh, minVh, maxVh, clamp]);

  const snapNearest = useCallback(
    (vh) => {
      let best = snapPoints[0];
      let bestDist = Math.abs(vh - best);
      for (let i = 1; i < snapPoints.length; i += 1) {
        const p = snapPoints[i];
        const d = Math.abs(vh - p);
        if (d < bestDist) {
          best = p;
          bestDist = d;
        }
      }
      return clamp(best);
    },
    [snapPoints, clamp]
  );

  const [heightVh, setHeightVh] = useState(() =>
    snapNearest(Math.min(maxVh, Math.max(minVh, defaultVh)))
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startY: 0, startVh: defaultVh });
  const sheetRef = useRef(null);
  const prevExpandSignalRef = useRef(0);

  useEffect(() => {
    setHeightVh((h) => clamp(h));
  }, [minVh, maxVh, clamp]);

  useEffect(() => {
    onHeightVhChange?.(heightVh);
  }, [heightVh, onHeightVhChange]);

  useEffect(() => {
    const v = Number(expandSignal);
    if (!Number.isFinite(v) || v < 1) return;
    if (prevExpandSignalRef.current === v) return;
    prevExpandSignalRef.current = v;
    setHeightVh(snapNearest(maxVh));
    onHeightCommit?.();
  }, [expandSignal, maxVh, snapNearest, onHeightCommit]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const dy = dragRef.current.startY - e.clientY;
      const dvh = (dy / window.innerHeight) * 100;
      const next = clamp(dragRef.current.startVh + dvh);
      setHeightVh(next);
      onHeightVhChange?.(next);
    };

    const onUp = () => {
      setDragging(false);
      setHeightVh((h) => snapNearest(h));
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
  }, [dragging, clamp, onHeightCommit, snapNearest, onHeightVhChange]);

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
    setHeightVh((h) => {
      let idx = snapPoints.findIndex((p) => Math.abs(p - h) < 1.5);
      if (idx < 0) idx = 0;
      const next = snapPoints[(idx + 1) % snapPoints.length];
      return next;
    });
    onHeightCommit?.();
  };

  const expanded = heightVh >= snapPoints[snapPoints.length - 1] - 4;

  return (
    <div
      ref={sheetRef}
      className={`bottom-sheet bottom-sheet--geo bottom-sheet--draggable ${
        dragging ? "bottom-sheet--dragging" : ""
      } ${className}`.trim()}
      style={{ height: `${heightVh}vh` }}
    >
      <div className="bottom-sheet-handle bottom-sheet-handle--geo">
        <div
          className="bottom-sheet-grab-area"
          onPointerDown={onGrabPointerDown}
          role="presentation"
        >
          <span className="bottom-sheet-grabber bottom-sheet-grabber--geo" aria-hidden="true" />
        </div>
        <div className="bottom-sheet-handle-row bottom-sheet-handle-row--geo">
          <button
            type="button"
            className="bottom-sheet-handle-main"
            onClick={onHeaderClick}
            aria-expanded={expanded}
          >
            <div className="bottom-sheet-title">{title}</div>
            {subtitle != null && subtitle !== "" ? (
              <div className="bottom-sheet-subtitle">{subtitle}</div>
            ) : null}
          </button>
          {headerRight != null ? (
            <div className="bottom-sheet-header-right">{headerRight}</div>
          ) : onClose ? (
            <button type="button" className="bottom-sheet-close-text" onClick={onClose} aria-label="닫기">
              닫기
            </button>
          ) : (
            <span className="bottom-sheet-handle-hint" aria-hidden="true">
              {expanded ? "아래로 드래그" : "위로 드래그"}
            </span>
          )}
        </div>
      </div>

      <div className="bottom-sheet-content">{children}</div>
    </div>
  );
}
