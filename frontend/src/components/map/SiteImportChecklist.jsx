import React from "react";

function iconForStatus(status) {
  if (status === "ok") return "✓";
  if (status === "warn") return "⚠";
  return "✗";
}

const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤"];

export default function SiteImportChecklist({ checklist = [], title = "인식 결과" }) {
  if (!checklist.length) return null;

  return (
    <section className="site-import-checklist" aria-label="OCR 인식 체크리스트">
      <p className="site-import-checklist__title">{title}</p>
      <ul className="site-import-checklist__list">
        {checklist.map((row) => (
          <li
            key={row.key}
            className={`site-import-checklist__item site-import-checklist__item--${row.status}`}
          >
            <span className="site-import-checklist__icon" aria-hidden="true">
              {iconForStatus(row.status)}
            </span>
            <span className="site-import-checklist__label">{row.label}</span>
            {row.status === "ok" ? (
              <span className="site-import-checklist__suffix">확인</span>
            ) : row.status === "warn" ? (
              <span className="site-import-checklist__suffix">
                {row.key === "workItems" ? "일부 누락 가능" : row.detail}
              </span>
            ) : (
              <span className="site-import-checklist__suffix">미검출</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SiteNameCandidatePicker({
  candidates = [],
  selectedName = "",
  rawName = "",
  onSelect,
}) {
  if (!candidates.length) return null;

  return (
    <section className="site-import-candidates" aria-label="현장명 후보">
      <p className="site-import-candidates__title">현장명 후보</p>
      {rawName ? (
        <p className="site-import-candidates__raw">
          OCR 원문: <strong>{rawName}</strong>
        </p>
      ) : null}
      <ul className="site-import-candidates__list">
        {candidates.map((candidate, index) => {
          const active = selectedName === candidate.name;
          return (
            <li key={`${candidate.name}-${index}`}>
              <button
                type="button"
                className={`site-import-candidates__btn${active ? " is-selected" : ""}`}
                onClick={() => onSelect?.(candidate)}
              >
                <span className="site-import-candidates__label">
                  {CIRCLED_NUMBERS[index] || `${index + 1}.`} {candidate.name}
                </span>
                <span className="site-import-candidates__score">({candidate.scorePercent}%)</span>
              </button>
              {candidate.detail ? (
                <small className="site-import-candidates__detail">{candidate.detail}</small>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SiteMemoryRecommendation({ recommendation = null, memoryMatch = null }) {
  if (!recommendation) return null;

  return (
    <section className="site-import-memory" aria-label="AI 현장 추천">
      <p className="site-import-memory__title">AI 현장 추천</p>
      {memoryMatch?.siteName ? (
        <p className="site-import-memory__match">
          기억된 현장 <strong>{memoryMatch.siteName}</strong>
          {memoryMatch.registrationCount ? ` · 등록 ${memoryMatch.registrationCount}회` : ""}
        </p>
      ) : null}
      <ul className="site-import-memory__list">
        {recommendation.title ? (
          <li>
            <span>제목</span>
            <strong>{recommendation.title}</strong>
          </li>
        ) : null}
        {recommendation.craftLabel ? (
          <li>
            <span>공정</span>
            <strong>{recommendation.craftLabel}</strong>
          </li>
        ) : null}
        {recommendation.colorLabel ? (
          <li>
            <span>색상</span>
            <strong className="site-import-memory__color">
              <i style={{ background: recommendation.colorBg }} aria-hidden="true" />
              {recommendation.colorLabel}
            </strong>
          </li>
        ) : null}
        {recommendation.participants?.length ? (
          <li>
            <span>참여자</span>
            <strong>{recommendation.participants.join(", ")}</strong>
          </li>
        ) : null}
        {recommendation.knownBuildings?.length ? (
          <li>
            <span>자주 가는 동</span>
            <strong>{recommendation.knownBuildings.join(", ")}</strong>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export function SiteImportMultiScheduleList({ rows = [], onToggle, onToggleAll }) {
  if (!rows.length) return null;
  const selectedCount = rows.filter((r) => r.selected !== false).length;

  return (
    <section className="site-import-multi" aria-label="발견된 일정">
      <div className="site-import-multi__head">
        <p className="site-import-multi__title">발견된 일정 {rows.length}건</p>
        <button type="button" className="site-import-multi__toggle-all" onClick={onToggleAll}>
          {selectedCount === rows.length ? "전체 해제" : "전체 선택"}
        </button>
      </div>
      <ul className="site-import-multi__list">
        {rows.map((row) => (
          <li key={row.id} className="site-import-multi__row">
            <label>
              <input
                type="checkbox"
                checked={row.selected !== false}
                onChange={(e) => onToggle?.(row.id, e.target.checked)}
              />
              <span>{row.title || `${row.building}동 ${row.unit}호`}</span>
              {row.dateKey ? <small>{row.dateKey}</small> : null}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
