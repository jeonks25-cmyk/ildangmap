import React from "react";
import { formatBirthYearLabel } from "../../utils/fieldProfileCard";
import { usePersonCard } from "../../context/PersonCardContext";

export default function BriefingPostAuthorRow({ post, timeLine }) {
  const { openPersonCard } = usePersonCard();
  const name = String(post?.authorName || "현장").trim() || "현장";
  const img = typeof post?.authorImageUrl === "string" ? post.authorImageUrl.trim() : "";
  const badge = String(post?.authorRoleLabel || "").trim() || "기술자";
  const birthLabel = formatBirthYearLabel(post?.authorBirthYear);
  const initial = name.slice(0, 1);

  return (
    <div className="briefing-post-author-row">
      {img ? (
        <img className="briefing-post-author-row__avatar-img" src={img} alt="" loading="lazy" />
      ) : (
        <div className="briefing-post-author-row__avatar" aria-hidden="true">
          {initial}
        </div>
      )}
      <div className="briefing-post-author-row__text">
        <button type="button" className="briefing-post-author-row__name-btn" onClick={() => openPersonCard(post)}>
          {name}
        </button>
        {birthLabel ? (
          <>
            <span className="briefing-post-author-row__sep" aria-hidden="true">
              ·
            </span>
            <span className="briefing-post-author-row__birth">{birthLabel}</span>
          </>
        ) : null}
        <span className="briefing-post-author-row__sep" aria-hidden="true">
          ·
        </span>
        <span className="briefing-post-author-row__badge">{badge}</span>
        <span className="briefing-post-author-row__sep" aria-hidden="true">
          ·
        </span>
        <span className="briefing-post-author-row__time">{timeLine}</span>
      </div>
    </div>
  );
}
