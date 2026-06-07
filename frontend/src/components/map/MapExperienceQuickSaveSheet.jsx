import React, { useEffect, useMemo, useState } from "react";
import { getQuickSaveTagsForContext } from "../../utils/fieldExperienceModel";

export default function MapExperienceQuickSaveSheet({
  open,
  item,
  fieldItem,
  actionKey,
  prompts = [],
  onClose,
  onSave,
}) {
  const [memo, setMemo] = useState("");
  const tags = useMemo(() => getQuickSaveTagsForContext({ item, actionKey }), [actionKey, item]);
  const title = item?.title || fieldItem?.title || "현장 경험 저장";

  useEffect(() => {
    if (open) setMemo("");
  }, [open]);

  if (!open) return null;

  const handleSaveTag = (tag) => {
    onSave?.({ tag, memo: "", item, fieldItem, actionKey });
  };

  const handleSaveMemo = () => {
    if (!memo.trim()) return;
    onSave?.({ tag: { id: "memo", label: "짧은 메모" }, memo, item, fieldItem, actionKey });
  };

  return (
    <div className="map-experience-save" role="presentation">
      <button type="button" className="map-experience-save__backdrop" aria-label="닫기" onClick={onClose} />
      <section className="map-experience-save__panel" role="dialog" aria-label="현장 경험 저장">
        <header className="map-experience-save__head">
          <p className="map-experience-save__eyebrow">3초 저장</p>
          <h2 className="map-experience-save__title">{title}</h2>
          <button type="button" className="map-experience-save__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <p className="map-experience-save__hint">긴 글 없이, 다음 팀에게 남길 경험만 눌러주세요.</p>
        {prompts.length ? (
          <div className="map-experience-save__prompts" aria-label="현장 종료 저장 제안">
            {prompts.slice(0, 2).map((prompt) => (
              <span key={prompt} className="map-experience-save__prompt">
                {prompt}
              </span>
            ))}
          </div>
        ) : null}
        <div className="map-experience-save__chips" aria-label="빠른 경험 저장">
          {tags.map((tag) => (
            <button key={tag.id} type="button" className="map-experience-save__chip" onClick={() => handleSaveTag(tag)}>
              {tag.label}
            </button>
          ))}
        </div>
        <label className="map-experience-save__memo">
          <span>짧은 메모 선택</span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={2}
            placeholder="예: 오늘 엘베 공사중, 후문으로만 출입"
          />
        </label>
        <button
          type="button"
          className="map-experience-save__submit"
          disabled={!memo.trim()}
          onClick={handleSaveMemo}
        >
          메모 저장
        </button>
      </section>
    </div>
  );
}
