import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MAP_NOTICES,
  NOTICE_MARQUEE_SECONDS_PER_ITEM,
  NOTICE_TICKER_PATH,
} from "../../constants/noticeTickerMocks";
import "./notice-ticker.css";

function normalizeNotices(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { id: null, text, key: `notice-${index}` } : null;
      }
      if (item && typeof item === "object") {
        const text = String(item.text || item.title || "").trim();
        if (!text) return null;
        return {
          id: item.id ?? null,
          text,
          detailPath: item.detailPath || null,
          key: item.id != null ? `notice-${item.id}` : `notice-${index}-${text.slice(0, 12)}`,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function resolveNoticePath(notice) {
  if (notice.detailPath) return notice.detailPath;
  if (notice.id != null) return `/settings/news/${notice.id}`;
  return NOTICE_TICKER_PATH;
}

/**
 * 필터탭 바로 아래 — 한 줄씩 좌측 Marquee (약 8~12초/건).
 */
export default function NoticeTicker({ items = MAP_NOTICES, secondsPerItem = NOTICE_MARQUEE_SECONDS_PER_ITEM }) {
  const navigate = useNavigate();
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const notices = useMemo(() => normalizeNotices(items), [items]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    setViewportWidth(Math.round(node.getBoundingClientRect().width));

    return () => observer.disconnect();
  }, []);

  if (!notices.length) return null;

  const loopDurationSec = Math.max(8, notices.length * secondsPerItem);
  const loopNotices = notices.length > 1 ? [...notices, ...notices] : notices;
  const itemWidth = viewportWidth > 0 ? `${viewportWidth}px` : "100%";

  const handleOpen = (notice) => {
    navigate(resolveNoticePath(notice));
  };

  return (
    <div className="notice-marquee" role="region" aria-label="공지">
      <div className="notice-marquee__viewport" ref={viewportRef} aria-live="polite">
        <div
          className={`notice-marquee__track${notices.length > 1 ? " is-animated" : ""}`}
          style={notices.length > 1 ? { animationDuration: `${loopDurationSec}s` } : undefined}
        >
          {loopNotices.map((notice, i) => (
            <button
              key={`${notice.key}-${i}`}
              type="button"
              className="notice-marquee__item"
              style={{ flexBasis: itemWidth, width: itemWidth, maxWidth: itemWidth }}
              onClick={() => handleOpen(notice)}
              aria-label={`공지: ${notice.text}. 눌러서 자세히 보기`}
            >
              <span className="notice-marquee__icon" aria-hidden="true">
                📢
              </span>
              <span className="notice-marquee__text">{notice.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
