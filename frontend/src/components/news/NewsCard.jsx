import React from "react";
import { useNavigate } from "react-router-dom";
import { formatNewsDate, getCategoryMeta, isNewsNew } from "../../constants/newsData";

export default function NewsCard({ item, pinned = false }) {
  const navigate = useNavigate();
  const category = getCategoryMeta(item.category);
  const showNew = isNewsNew(item);

  return (
    <article className={`ildang-news-card ildang-news-card--${item.category}${pinned ? " ildang-news-card--pinned" : ""}`}>
      <div className="ildang-news-card__meta">
        <span className="ildang-news-card__category">
          {category.emoji} {category.label}
          {pinned ? <span className="ildang-news-card__pin">고정</span> : null}
          {showNew ? <span className="ildang-news-card__new">NEW</span> : null}
        </span>
        <time className="ildang-news-card__date" dateTime={item.date}>
          {formatNewsDate(item.date)}
        </time>
      </div>
      <h3 className="ildang-news-card__title">{item.title}</h3>
      <p className="ildang-news-card__summary">{item.summary}</p>
      <button
        type="button"
        className="ildang-news-card__more"
        onClick={() => navigate(`/settings/news/${item.id}`)}
      >
        자세히 보기
      </button>
    </article>
  );
}
