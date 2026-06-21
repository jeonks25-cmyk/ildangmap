import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import NewsFeedbackCta from "../components/news/NewsFeedbackCta";
import { formatNewsDate, getCategoryMeta, getNewsById } from "../constants/newsData";
import "../styles/ildang-news.css";

export default function NewsDetailPage() {
  const navigate = useNavigate();
  const { newsId } = useParams();
  const item = getNewsById(newsId);

  if (!item) {
    return (
      <div className="ildang-news-page">
        <header className="ildang-news-page__header">
          <button type="button" className="ildang-news-page__back" onClick={() => navigate("/settings/news")} aria-label="뒤로">
            ←
          </button>
          <h1 className="ildang-news-page__title">소식을 찾을 수 없어요</h1>
        </header>
        <div className="ildang-news-page__body">
          <p className="ildang-news-page__empty">삭제되었거나 존재하지 않는 소식입니다.</p>
          <button type="button" className="ildang-news-cta__btn" onClick={() => navigate("/settings/news")}>
            목록으로
          </button>
        </div>
      </div>
    );
  }

  const category = getCategoryMeta(item.category);

  return (
    <div className="ildang-news-page ildang-news-page--detail">
      <header className="ildang-news-page__header">
        <button type="button" className="ildang-news-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="ildang-news-detail__category">
            {category.emoji} {category.label}
          </p>
          <h1 className="ildang-news-page__title">{item.title}</h1>
          <time className="ildang-news-detail__date" dateTime={item.date}>
            {formatNewsDate(item.date)}
          </time>
        </div>
      </header>

      <div className="ildang-news-page__body">
        <article className="ildang-news-detail__content">
          {item.content.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </article>
        <NewsFeedbackCta />
      </div>
    </div>
  );
}
