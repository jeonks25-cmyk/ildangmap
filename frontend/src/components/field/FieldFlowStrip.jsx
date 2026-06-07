import React, { useEffect, useMemo, useState } from "react";
import "./field-flow-strip.css";

const ROTATE_MS = 9200;

/**
 * 조용한 현장 흐름 1줄 — 맥락만, 숫자·강조는 StatusBar/overlay
 */
export default function FieldFlowStrip({
  events = [],
  onEventClick,
  ariaLabel = "현장 흐름",
  className = "",
}) {
  const list = useMemo(() => (Array.isArray(events) ? events.filter((e) => e && e.text) : []), [events]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [list]);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [list.length]);

  if (list.length === 0) {
    return null;
  }

  const current = list[index % list.length];

  return (
    <div
      className={`field-flow-strip${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="off"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={`field-flow-strip__line field-flow-strip__line--${current.tone || "normal"}`}
        onClick={() => onEventClick?.(current)}
      >
        <span className="field-flow-strip__dot" aria-hidden />
        <span className="field-flow-strip__text" key={current.id}>
          {current.text}
        </span>
      </button>
    </div>
  );
}
