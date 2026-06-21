import React from "react";
import { formatNewsDate, RECENT_CHANGES } from "../../constants/newsData";

export default function NewsRecentChanges() {
  return (
    <section className="ildang-news-recent" aria-labelledby="ildang-news-recent-title">
      <h2 id="ildang-news-recent-title" className="ildang-news-recent__title">
        🔥 최근 변경사항
      </h2>
      <ul className="ildang-news-recent__list">
        {RECENT_CHANGES.map((entry) => (
          <li key={entry.label} className="ildang-news-recent__item">
            <span className="ildang-news-recent__check" aria-hidden="true">
              ✓
            </span>
            <span className="ildang-news-recent__text">{entry.label}</span>
            <time className="ildang-news-recent__date" dateTime={entry.date}>
              {formatNewsDate(entry.date)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
