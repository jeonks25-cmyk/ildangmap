import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FIELD_AUTHOR_ROLE_META,
  FIELD_NOTIFICATION_THREADS,
  FIELD_NOTIF_TYPE_META,
  formatFieldNotifListTime,
  getDefaultBriefingRoomHref,
} from "../utils/fieldNotificationFeedMock";
import { useUiStore } from "../store/useUiStore";

const FILTER_CHIPS = [
  { key: "all", label: "전체" },
  { key: "mine", label: "내 현장" },
  { key: "urgent", label: "긴급" },
  { key: "estimate", label: "견적" },
  { key: "notice", label: "공지" },
];

function matchesFilter(thread, filterKey) {
  if (thread.archived) return false;
  if (filterKey === "all") return true;
  if (filterKey === "mine") return thread.mine;
  if (filterKey === "urgent") return thread.urgent || thread.lastType === "urgent";
  if (filterKey === "estimate") return thread.estimate || thread.lastType === "estimate";
  if (filterKey === "notice") return thread.lastType === "notice";
  return true;
}

function matchesSearch(thread, q) {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    thread.siteTitle.toLowerCase().includes(s) ||
    String(thread.previewLine || "")
      .toLowerCase()
      .includes(s) ||
    String(thread.lastAuthorName || "")
      .toLowerCase()
      .includes(s)
  );
}

export default function FieldNotificationsTabPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdHighlight = useMemo(() => {
    const raw = searchParams.get("jobId");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const openNotificationSettings = useUiStore((s) => s.openNotificationSettings);
  const [filterKey, setFilterKey] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const highlightRef = useRef(null);

  const threads = useMemo(() => {
    return FIELD_NOTIFICATION_THREADS.filter((t) => matchesFilter(t, filterKey))
      .filter((t) => matchesSearch(t, searchQuery))
      .slice()
      .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  }, [filterKey, searchQuery]);

  useEffect(() => {
    if (jobIdHighlight == null) return undefined;
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [jobIdHighlight, threads]);

  return (
    <div className="field-notif-page">
      <header className="field-notif-page__top">
        <div className="field-notif-page__top-row">
          <h1 className="field-notif-page__title">현장 알림</h1>
          <div className="field-notif-page__top-actions">
            <button
              type="button"
              className={`field-notif-page__icon-btn${searchOpen ? " is-on" : ""}`}
              aria-label="검색"
              onClick={() => setSearchOpen((o) => !o)}
            >
              🔍
            </button>
            <button type="button" className="field-notif-page__icon-btn" aria-label="알림 설정" onClick={() => openNotificationSettings()}>
              ⚙️
            </button>
          </div>
        </div>
        <p className="field-notif-page__sub">누가 무엇을 남겼는지 빠르게 보는 현장 운영 기록이에요. 단톡이 아니라 짧은 기록만 모입니다.</p>
        {searchOpen ? (
          <label className="field-notif-page__search">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="현장명·최근 알림 검색"
              aria-label="현장 검색"
              autoFocus
            />
          </label>
        ) : null}
      </header>

      <div className="field-notif-page__chips" role="tablist" aria-label="알림 필터">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={filterKey === c.key}
            className={`field-notif-chip${filterKey === c.key ? " field-notif-chip--active" : ""}`}
            onClick={() => setFilterKey(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="field-notif-page__brief-wrap">
        <button
          type="button"
          className="field-notif-page__brief"
          onClick={() => navigate(getDefaultBriefingRoomHref())}
        >
          <span className="field-notif-page__brief-title">브리핑룸 입장</span>
          <span className="field-notif-page__brief-sub">현장 브리핑 · 출입 · 주차 · 준비물 · 안전 · 사진 · 운영로그</span>
        </button>
      </div>

      <ul className="field-notif-list" aria-label="현장 알림 목록">
        {threads.length === 0 ? (
          <li className="field-notif-list__empty">조건에 맞는 알림이 없습니다.</li>
        ) : (
          threads.map((thread) => {
            const meta = FIELD_NOTIF_TYPE_META[thread.lastType] || FIELD_NOTIF_TYPE_META.notice;
            const roleKey = thread.lastAuthorRole && FIELD_AUTHOR_ROLE_META[thread.lastAuthorRole] ? thread.lastAuthorRole : "worker";
            const roleMeta = FIELD_AUTHOR_ROLE_META[roleKey] || FIELD_AUTHOR_ROLE_META.worker;
            const authorName = String(thread.lastAuthorName || "현장").trim() || "현장";
            const authorInitial = authorName.slice(0, 1);
            const highlight = jobIdHighlight != null && thread.jobId === jobIdHighlight;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`field-notif-row field-notif-row--card${highlight ? " field-notif-row--highlight" : ""}`}
                  ref={highlight ? highlightRef : undefined}
                  onClick={() => navigate(`/notifications/${encodeURIComponent(thread.id)}`)}
                >
                  <span className="field-notif-row__avatar" aria-hidden="true">
                    {thread.thumbEmoji}
                  </span>
                  <span className="field-notif-row__body">
                    <span className="field-notif-row__title-line">
                      <span className="field-notif-row__site">{thread.siteTitle}</span>
                      <span className="field-notif-row__title-right">
                        <span className="field-notif-row__time">{formatFieldNotifListTime(thread.lastAt)}</span>
                        {thread.unreadCount > 0 ? (
                          <span className="field-notif-row__unread" aria-label={`읽지 않음 ${thread.unreadCount}`}>
                            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="field-notif-row__actor-line">
                      <span className="field-notif-row__actor-avatar" aria-hidden="true">
                        {thread.lastAuthorAvatarUrl ? (
                          <img className="field-notif-row__actor-img" src={thread.lastAuthorAvatarUrl} alt="" />
                        ) : (
                          <span className={`field-notif-row__actor-init field-notif-row__actor-init--${roleMeta.tone}`}>{authorInitial}</span>
                        )}
                      </span>
                      <span className="field-notif-row__actor-meta">
                        <strong className="field-notif-row__actor-name">{authorName}</strong>
                        <span className={`field-notif-role-badge field-notif-role-badge--sm field-notif-role-badge--${roleMeta.tone}`}>
                          {roleMeta.label}
                        </span>
                        <span className={`field-notif-badge field-notif-badge--sm field-notif-badge--${meta.tone}`}>
                          <span className="field-notif-badge__dot" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </span>
                    </span>
                    <span className="field-notif-row__preview">{thread.previewLine}</span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
