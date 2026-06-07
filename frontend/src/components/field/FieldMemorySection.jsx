import React, { useMemo, useState } from "react";
import { loadFieldMemoryLines, saveFieldMemoryLines } from "../../utils/fieldMemoryStorage";

export default function FieldMemorySection({ siteKey, title = "댓글" }) {
  const key = useMemo(() => String(siteKey || "").trim(), [siteKey]);
  const [lines, setLines] = useState(() => (key ? loadFieldMemoryLines(key) : []));
  const [draft, setDraft] = useState("");

  if (!key) return null;

  const onAdd = () => {
    const t = String(draft || "").trim();
    if (!t) return;
    const next = [t, ...lines].slice(0, 20);
    setLines(next);
    saveFieldMemoryLines(key, next);
    setDraft("");
  };

  return (
    <section className="field-memory-section" aria-labelledby="field-memory-title">
      <h2 id="field-memory-title" className="field-memory-section__title">
        {title}
      </h2>
      <p className="field-memory-section__hint">처음 가는 현장에서 공유하는 운영 정보예요. 짧은 줄만 남겨 주세요.</p>
      <ul className="field-memory-section__list">
        {lines.length === 0 ? (
          <li className="field-memory-section__empty">예: 지하2층 주차 가능 / 후문 출입 / 화장실 3층</li>
        ) : (
          lines.map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`} className="field-memory-section__item">
              {line}
            </li>
          ))
        )}
      </ul>
      <div className="field-memory-section__composer">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="한 줄 메모 추가"
          maxLength={120}
          className="field-memory-section__input"
        />
        <button type="button" className="field-memory-section__add" onClick={onAdd}>
          추가
        </button>
      </div>
    </section>
  );
}
