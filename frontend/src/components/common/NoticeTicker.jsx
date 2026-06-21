import React, { useMemo } from "react";
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
 * 지도 상단 공지 — 필터탭 아래, 좌측 연속 Marquee · 터치 시 해당 공지 상세.
 */
export default function NoticeTicker({ items = MAP_NOTICES, secondsPerItem = NOTICE_MARQUEE_SECONDS_PER_ITEM }) {
  const navigate = useNavigate();
  const notices = useMemo(() => normalizeNotices(items), [items]);

  if (!notices.length) return null;

  const loopDurationSec = Math.max(8, notices.length * secondsPerItem);
  const loopNotices = [...notices, ...notices];

  const handleOpen = (notice) => {
    navigate(resolveNoticePath(notice));
  };

  return (
    <div className="notice-marquee" role="region" aria-label="공지">
      <div className="notice-marquee__viewport" aria-live="polite">
        <div
          className="notice-marquee__track"
          style={{ animationDuration: `${loopDurationSec}s` }}
        >
          {loopNotices.map((notice, i) => (
            <button
              key={`${notice.key}-${i}`}
              type="button"
              className="notice-marquee__item"
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
