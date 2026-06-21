import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NOTICE_TICKER_INTERVAL_MS,
  NOTICE_TICKER_ITEMS,
  NOTICE_TICKER_PATH,
} from "../../constants/noticeTickerMocks";
import "./notice-ticker.css";

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") return String(item.text || item.title || "").trim();
      return "";
    })
    .filter(Boolean);
}

/**
 * 지도 상단 공지 티커 — 한 줄 marquee + 5초마다 다음 공지.
 */
export default function NoticeTicker({
  items = NOTICE_TICKER_ITEMS,
  intervalMs = NOTICE_TICKER_INTERVAL_MS,
  to = NOTICE_TICKER_PATH,
}) {
  const navigate = useNavigate();
  const notices = normalizeItems(items);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [marquee, setMarquee] = useState(false);
  const measureRef = useRef(null);
  const viewportRef = useRef(null);

  const activeIndex = notices.length ? index % notices.length : 0;
  const activeText = notices[activeIndex] || "";

  const measureOverflow = useCallback(() => {
    const label = measureRef.current;
    const viewport = viewportRef.current;
    if (!label || !viewport) {
      setMarquee(false);
      return;
    }
    setMarquee(label.scrollWidth > viewport.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measureOverflow();
  }, [activeText, measureOverflow]);

  useEffect(() => {
    const onResize = () => measureOverflow();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureOverflow]);

  useEffect(() => {
    if (notices.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % notices.length);
        setVisible(true);
      }, 200);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, notices.length]);

  if (!notices.length) return null;

  const marqueeDuration = `${Math.max(6, Math.min(16, activeText.length * 0.45))}s`;

  const handleClick = () => {
    if (to) navigate(to);
  };

  return (
    <button
      type="button"
      className="notice-ticker"
      onClick={handleClick}
      aria-live="polite"
      aria-label={`공지: ${activeText}. 눌러서 자세히 보기`}
    >
      <span className="notice-ticker__icon" aria-hidden="true">
        📢
      </span>
      <span className="notice-ticker__viewport" ref={viewportRef}>
        <span
          key={`${activeIndex}-${activeText}`}
          ref={measureRef}
          className={`notice-ticker__line${marquee ? " is-marquee" : ""}${visible ? " is-visible" : " is-fading"}`}
          style={marquee ? { "--notice-marquee-duration": marqueeDuration } : undefined}
        >
          {activeText}
        </span>
      </span>
      <span className="notice-ticker__chev" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
