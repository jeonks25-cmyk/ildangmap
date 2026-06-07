import React, { useEffect, useState } from "react";

/** 현장 게시판 글쓰기·수정 (목업) */
export default function SiteBoardComposeSheet({ open, mode = "create", initialText = "", siteTitle, onClose, onSave }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setText(initialText || "");
  }, [open, initialText]);

  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="site-board-compose" role="presentation">
      <button type="button" className="site-board-compose__backdrop" aria-label="닫기" onClick={onClose} />
      <form
        className="site-board-compose__panel"
        onSubmit={(e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          onSave?.(body);
          onClose?.();
        }}
        aria-label={isEdit ? "글 수정" : "글쓰기"}
      >
        <header className="site-board-compose__head">
          <h3>{isEdit ? "글 수정" : "글쓰기"}</h3>
          <button type="button" className="site-board-compose__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        {siteTitle ? <p className="site-board-compose__site">{siteTitle}</p> : null}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 지하3층 주차 가능"
          rows={4}
          maxLength={200}
          autoFocus
        />
        <p className="site-board-compose__hint">짧은 현장 정보를 남겨 주세요. (목업 · 최대 200자)</p>
        <button type="submit" className="site-board-compose__submit" disabled={!text.trim()}>
          {isEdit ? "수정 완료" : "등록"}
        </button>
      </form>
    </div>
  );
}
