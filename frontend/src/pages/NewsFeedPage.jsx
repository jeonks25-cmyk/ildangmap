import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BetaBanner from "../components/news/BetaBanner";
import NewsCard from "../components/news/NewsCard";
import NewsRecentChanges from "../components/news/NewsRecentChanges";
import { NEWS_CATEGORIES, NEWS_ITEMS, PINNED_NEWS_ID, sortNewsItems } from "../constants/newsData";
import "../styles/ildang-news.css";

const FILTER_OPTIONS = [{ key: "all", label: "전체" }, ...Object.values(NEWS_CATEGORIES)];

export default function NewsFeedPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const items = useMemo(() => {
    const filtered =
      filter === "all" ? [...NEWS_ITEMS] : NEWS_ITEMS.filter((item) => item.category === filter);
    return sortNewsItems(filtered);
  }, [filter]);

  return (
    <div className="ildang-news-page">
      <header className="ildang-news-page__header">
        <button type="button" className="ildang-news-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="ildang-news-page__eyebrow">📢</p>
          <h1 className="ildang-news-page__title">일당맵 소식</h1>
          <p className="ildang-news-page__lead">일당맵이 이렇게 바뀌고 있어요</p>
        </div>
      </header>

      <div className="ildang-news-page__body">
        <BetaBanner />

        <NewsRecentChanges />

        <div className="ildang-news-filters" role="tablist" aria-label="소식 카테고리">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={filter === option.key}
              className={`ildang-news-filters__chip${filter === option.key ? " is-active" : ""}`}
              onClick={() => setFilter(option.key)}
            >
              {option.key === "all" ? option.label : `${option.emoji} ${option.label}`}
            </button>
          ))}
        </div>

        <div className="ildang-news-list">
          {items.length === 0 ? (
            <p className="ildang-news-page__empty">해당 카테고리 소식이 없습니다.</p>
          ) : (
            items.map((item) => (
              <NewsCard key={item.id} item={item} pinned={item.id === PINNED_NEWS_ID} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
