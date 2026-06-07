import React from "react";
import MapCardContainer from "./MapCardContainer";
import "./map-search-panel-card.css";

export default function MapSearchPanel({
  open,
  mapContainerRef,
  query,
  placeholder,
  recommendedKeywords = [],
  placeResults = [],
  loading = false,
  showRecent = true,
  hideForm = false,
  recentSearches = [],
  onQueryChange,
  onPickKeyword,
  onPickPlace,
  onPickRecent,
  onClearRecent,
  onClose,
  onSubmit,
}) {
  const searchForm = !hideForm ? (
    <form
      className="map-search-panel__form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <span className="map-search-panel__icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="map-search-panel__input"
        value={query}
        onChange={(e) => onQueryChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus
        aria-label="장소 검색 입력"
      />
      {query ? (
        <button
          type="button"
          className="map-search-panel__clear"
          onClick={() => onQueryChange?.("")}
          aria-label="검색어 지우기"
        >
          ×
        </button>
      ) : null}
    </form>
  ) : null;

  return (
    <MapCardContainer
      open={open}
      onClose={onClose}
      mapContainerRef={mapContainerRef}
      title="장소 검색"
      showBack={false}
      lead="주소·장소를 검색해 지도에서 확인"
      stickySlot={searchForm}
      className="map-search-panel-card"
      ariaLabel="장소 검색"
    >
      {placeResults.length || loading ? (
        <section className="map-search-panel__section" aria-labelledby="map-search-place-title">
          <div className="map-search-panel__section-head">
            <h3 id="map-search-place-title" className="map-search-panel__section-title">
              검색 결과
            </h3>
          </div>
          {loading ? <div className="map-search-panel__empty">검색 중입니다.</div> : null}
          <div className="map-search-panel__recent-list" role="list">
            {placeResults.map((item) => (
              <button
                key={item.id}
                type="button"
                className="map-search-panel__recent"
                role="listitem"
                onClick={() => onPickPlace?.(item)}
              >
                <span className="map-search-panel__recent-icon" aria-hidden="true">
                  📍
                </span>
                <span className="map-search-panel__recent-text">
                  <strong>{item.title}</strong>
                  <small>{item.roadAddress || item.jibunAddress || item.address}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {recommendedKeywords.length ? (
        <section className="map-search-panel__section" aria-labelledby="map-search-recommend-title">
          <div className="map-search-panel__section-head">
            <h3 id="map-search-recommend-title" className="map-search-panel__section-title">
              빠른 검색
            </h3>
          </div>
          <div className="map-search-panel__keyword-list" role="list">
            {recommendedKeywords.map((item) => (
              <button
                key={item.query}
                type="button"
                className="map-search-panel__keyword"
                role="listitem"
                onClick={() => onPickKeyword?.(item.query)}
              >
                <span className="map-search-panel__keyword-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="map-search-panel__keyword-text">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showRecent ? (
        <section className="map-search-panel__section" aria-labelledby="map-search-recent-title">
          <div className="map-search-panel__section-head">
            <h3 id="map-search-recent-title" className="map-search-panel__section-title">
              최근 검색
            </h3>
            {recentSearches.length ? (
              <button type="button" className="map-search-panel__link" onClick={onClearRecent}>
                기록 지우기
              </button>
            ) : null}
          </div>
          {recentSearches.length ? (
            <div className="map-search-panel__recent-list" role="list">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="map-search-panel__recent"
                  role="listitem"
                  onClick={() => onPickRecent?.(item)}
                >
                  <span className="map-search-panel__recent-icon" aria-hidden="true">
                    🕘
                  </span>
                  <span className="map-search-panel__recent-text">{item}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="map-search-panel__empty">최근 검색이 아직 없습니다. 원하는 현장을 바로 검색해보세요.</div>
          )}
        </section>
      ) : null}
    </MapCardContainer>
  );
}
