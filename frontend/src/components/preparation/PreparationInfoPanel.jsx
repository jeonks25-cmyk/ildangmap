import React, { useId } from "react";

export default function PreparationInfoPanel({
  title = "현장 준비 정보",
  infoItems = [],
  checklistItems = [],
  onToggleChecklist,
}) {
  const titleId = useId();

  return (
    <section className="prep-info-card" aria-labelledby={titleId}>
      <h3 id={titleId} className="prep-info-card__title">
        {title}
      </h3>

      <div className="prep-info-list">
        {infoItems.map((item) => (
          <article key={item.key} className="prep-info-item">
            <span className="prep-info-item__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="prep-info-item__body">
              <span className="prep-info-item__label">{item.label}</span>
              <strong className="prep-info-item__value">{item.value}</strong>
            </div>
          </article>
        ))}
      </div>

      {checklistItems.length ? (
        <div className="prep-checklist">
          <div className="prep-checklist__title">준비 완료 체크</div>
          <div className="prep-checklist__list" role="group" aria-label="준비 완료 체크리스트">
            {checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`prep-checklist__item${item.checked ? " is-checked" : ""}`}
                onClick={() => onToggleChecklist?.(item.id)}
              >
                <span className="prep-checklist__mark" aria-hidden="true">
                  {item.checked ? "☑" : "☐"}
                </span>
                <span className="prep-checklist__label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
