import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NOTIFICATION_SETTING_OPTIONS,
  notificationRowIcon,
  sectionLabelForType,
} from "../components/notifications/notificationModel";
import { useNotifications } from "../context/NotificationContext";
import { useNotificationNavigation } from "../hooks/useTabNotificationOverlay";

const FILTER_CHIPS = [
  { key: "all", label: "전체" },
  { key: "attendance", label: "출퇴근" },
  { key: "schedule", label: "일정" },
  { key: "site", label: "현장" },
  { key: "message", label: "메시지" },
  { key: "team", label: "팀" },
];

function matchesFilter(item, filterKey) {
  if (filterKey === "all") return true;
  const section = sectionLabelForType(item.type || item.kind);
  if (filterKey === "attendance") return section === "출퇴근";
  if (filterKey === "schedule") return section === "일정";
  if (filterKey === "site") return section === "현장";
  if (filterKey === "message") return section === "메시지";
  if (filterKey === "team") return section === "팀";
  return true;
}

export default function FieldNotificationsTabPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { handleNotificationClick } = useNotificationNavigation();
  const [filterKey, setFilterKey] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications
      .filter((item) => matchesFilter(item, filterKey))
      .filter((item) => {
        if (!q) return true;
        return (
          String(item.primaryLine || "").toLowerCase().includes(q) ||
          String(item.secondaryLine || "").toLowerCase().includes(q)
        );
      });
  }, [filterKey, notifications, searchQuery]);

  return (
    <div className="field-notif-page">
      <header className="field-notif-page__top">
        <div className="field-notif-page__top-row">
          <h1 className="field-notif-page__title">알림</h1>
          <div className="field-notif-page__top-actions">
            <button type="button" className="field-notif-page__ghost" onClick={() => navigate(-1)}>
              닫기
            </button>
            {unreadCount > 0 ? (
              <button type="button" className="field-notif-page__ghost" onClick={markAllRead}>
                모두 읽음
              </button>
            ) : null}
          </div>
        </div>
        <input
          type="search"
          className="field-notif-page__search"
          placeholder="알림 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="field-notif-page__chips" role="tablist" aria-label="알림 필터">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              role="tab"
              className={`field-notif-page__chip${filterKey === chip.key ? " is-active" : ""}`}
              onClick={() => setFilterKey(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </header>

      <ul className="field-notif-page__list">
        {rows.length ? (
          rows.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`field-notif-page__row${item.isRead ? "" : " is-unread"}`}
                onClick={() => handleNotificationClick(item)}
              >
                <span className="field-notif-page__row-icon" aria-hidden>
                  {notificationRowIcon(item.type || item.kind)}
                </span>
                <span className="field-notif-page__row-body">
                  <strong>{item.primaryLine}</strong>
                  <span>{item.secondaryLine || sectionLabelForType(item.type || item.kind)}</span>
                </span>
                <time>{item.timeLabel}</time>
              </button>
            </li>
          ))
        ) : (
          <li className="field-notif-page__empty">새 알림이 없습니다.</li>
        )}
      </ul>

      <section className="field-notif-page__settings" aria-label="알림 설정 안내">
        <p className="field-notif-page__settings-title">알림 유형</p>
        <ul>
          {NOTIFICATION_SETTING_OPTIONS.map((opt) => (
            <li key={opt.key}>
              <strong>{opt.label}</strong> · {opt.description}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
