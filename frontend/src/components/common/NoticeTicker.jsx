import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MAP_NOTICES,
  NOTICE_TICKER_INTERVAL_MS,
  NOTICE_TICKER_PATH,
} from "../../constants/noticeTickerMocks";
import "./notice-ticker.css";

const SWIPE_THRESHOLD_PX = 36;
const SLIDE_MS = 320;

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
 * 지도 상단 공지 티커 — 📢 고정, 텍스트만 좌측 슬라이드 · 자동 순환 · 스와이프.
 */
export default function NoticeTicker({
  items = MAP_NOTICES,
  intervalMs = NOTICE_TICKER_INTERVAL_MS,
  to = NOTICE_TICKER_PATH,
}) {
  const navigate = useNavigate();
  const notices = normalizeItems(items);
  const loopNotices = notices.length > 1 ? [...notices, notices[0]] : notices;

  const [index, setIndex] = useState(0);
  const [animated, setAnimated] = useState(true);
  const indexRef = useRef(0);
  const touchRef = useRef({ startX: 0, startY: 0, tracking: false });
  const resetTimerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const scheduleAuto = useCallback(() => {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    if (notices.length <= 1) return;
    intervalRef.current = window.setInterval(() => {
      setAnimated(true);
      setIndex((prev) => prev + 1);
    }, intervalMs);
  }, [intervalMs, notices.length]);

  const goRelative = useCallback(
    (delta) => {
      if (notices.length <= 1) return;
      clearResetTimer();
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);

      const prev = indexRef.current;
      if (delta > 0) {
        setAnimated(true);
        setIndex(prev + 1);
      } else if (prev === 0) {
        setAnimated(false);
        setIndex(notices.length - 1);
      } else {
        setAnimated(true);
        setIndex(prev - 1);
      }

      window.setTimeout(scheduleAuto, SLIDE_MS + 40);
    },
    [clearResetTimer, notices.length, scheduleAuto]
  );

  useEffect(() => {
    scheduleAuto();
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
      clearResetTimer();
    };
  }, [scheduleAuto, clearResetTimer]);

  useEffect(() => {
    if (notices.length <= 1) return undefined;
    if (index !== loopNotices.length - 1) return undefined;

    clearResetTimer();
    resetTimerRef.current = window.setTimeout(() => {
      setAnimated(false);
      setIndex(0);
      resetTimerRef.current = window.setTimeout(() => {
        setAnimated(true);
        resetTimerRef.current = null;
      }, 20);
    }, SLIDE_MS);

    return clearResetTimer;
  }, [index, loopNotices.length, notices.length, clearResetTimer]);

  const onTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, tracking: true };
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
  };

  const onTouchEnd = (event) => {
    if (!touchRef.current.tracking) return;
    touchRef.current.tracking = false;
    const touch = event.changedTouches?.[0];
    if (!touch) {
      scheduleAuto();
      return;
    }
    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      scheduleAuto();
      return;
    }
    if (dx < 0) goRelative(1);
    else goRelative(-1);
  };

  if (!notices.length) return null;

  const activeText = notices[index % notices.length] || notices[0];

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
      <span
        className="notice-ticker__viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          touchRef.current.tracking = false;
          scheduleAuto();
        }}
      >
        <span
          className={`notice-ticker__track${animated ? " is-animated" : ""}`}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {loopNotices.map((text, i) => (
            <span key={`${i}-${text}`} className="notice-ticker__item">
              {text}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
