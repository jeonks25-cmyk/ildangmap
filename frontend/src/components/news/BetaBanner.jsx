import React from "react";
import { useNavigate } from "react-router-dom";
import { BETA_BANNER } from "../../constants/newsData";

export default function BetaBanner() {
  const navigate = useNavigate();

  return (
    <section className="ildang-news-beta-banner" aria-label="베타 테스트 안내">
      <p className="ildang-news-beta-banner__eyebrow">🧪</p>
      <h2 className="ildang-news-beta-banner__title">{BETA_BANNER.title}</h2>
      <p className="ildang-news-beta-banner__desc">{BETA_BANNER.description}</p>
      <button
        type="button"
        className="ildang-news-beta-banner__cta"
        onClick={() => navigate(BETA_BANNER.ctaPath)}
      >
        {BETA_BANNER.ctaLabel}
      </button>
    </section>
  );
}
