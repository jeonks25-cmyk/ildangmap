import React from "react";
import PageSectionHeader from "../layout/PageSectionHeader";
import "./map-top-bar.css";

function IconFilter() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function NotifyButton({ onOpenNotifications, unreadCount }) {
  if (!onOpenNotifications) return null;
  return (
    <button
      type="button"
      className="map-page-head__notify"
      onClick={onOpenNotifications}
      aria-label={unreadCount > 0 ? `알림, ${unreadCount}건` : "알림"}
    >
      <span className="map-page-head__notify-icon" aria-hidden>
        🔔
      </span>
      <span className="map-page-head__notify-label">알림</span>
      {unreadCount > 0 ? (
        <span className="map-page-head__badge map-page-head__badge--notify" aria-hidden>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function MapTopBar({
  onOpenFilter,
  filterActiveCount = 0,
  title = "일당맵",
  searchLabel = "검색",
  filterLabel = "상세 검색",
  showFilter = true,
  searchAsInput = false,
  titleOnly = false,
  searchQuery = "",
  searchPlaceholder = "아파트 / 추천식당 / 주소 검색",
  onSearchQueryChange,
  onSearchSubmit,
  onSearchFocus,
  onOpenNotifications,
  unreadCount = 0,
  categoryRow = null,
  categoryRowRef = null,
  noticeRow = null,
}) {
  if (titleOnly) {
    return (
      <header className="app-page-head map-page-head map-page-head--market map-page-head--branded map-page-head--geo-stack map-page-head--title-only">
        <div className="map-page-head__row map-page-head__row--primary">
          <h1 className="map-page-head__brand">{title}</h1>
          <NotifyButton onOpenNotifications={onOpenNotifications} unreadCount={unreadCount} />
        </div>
      </header>
    );
  }

  if (searchAsInput) {
    return (
      <header className="app-page-head map-page-head map-page-head--market map-page-head--search map-page-head--branded map-page-head--geo-stack">
        <div className="map-page-head__row map-page-head__row--primary">
          <h1 className="map-page-head__brand">{title}</h1>
          <form
            className="map-page-head__search-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <input
              className="map-page-head__search-input"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              onFocus={() => onSearchFocus?.()}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
            />
            {searchQuery ? (
              <button
                type="button"
                className="map-page-head__search-clear"
                onClick={() => onSearchQueryChange?.("")}
                aria-label="검색어 지우기"
              >
                ×
              </button>
            ) : null}
          </form>
          <NotifyButton onOpenNotifications={onOpenNotifications} unreadCount={unreadCount} />
        </div>
        {noticeRow ? <div className="map-page-head__row map-page-head__row--notice">{noticeRow}</div> : null}
        {categoryRow ? (
          <div className="map-page-head__row map-page-head__row--categories" ref={categoryRowRef}>
            {categoryRow}
          </div>
        ) : null}
      </header>
    );
  }

  const actions = showFilter ? (
    <button type="button" className="map-page-head__action" onClick={onOpenFilter} aria-label={filterLabel}>
      <IconFilter />
      {filterActiveCount > 0 ? (
        <span className="map-page-head__badge map-page-head__badge--filter">{filterActiveCount}</span>
      ) : null}
    </button>
  ) : null;

  return <PageSectionHeader className="map-page-head map-page-head--market" title={title} actions={actions} />;
}

export default React.memo(MapTopBar);
