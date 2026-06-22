import React, { useEffect, useState } from "react";
import { compressImageFileToDataUrl } from "../../utils/briefingImageCompress";

const POST_TYPES = [
  { value: "general", label: "공지" },
  { value: "question", label: "질문" },
  { value: "worklog", label: "작업일지" },
  { value: "photo", label: "작업사진" },
];

/** 현장 일정 게시판 글쓰기 바텀시트 */
export default function FieldScheduleBoardComposeSheet({
  open,
  siteTitle = "",
  onClose,
  onSubmit,
  onToast,
}) {
  const [postType, setPostType] = useState("general");
  const [body, setBody] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPostType("general");
    setBody("");
    setImageDataUrl("");
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const needsPhoto = postType === "photo";
  const canSubmit = Boolean(body.trim() || (needsPhoto && imageDataUrl));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        body: body.trim(),
        postType,
        imageDataUrl: imageDataUrl || undefined,
      });
      onClose?.();
    } catch (err) {
      onToast?.(err?.message || "게시에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-board-compose" role="presentation">
      <button type="button" className="site-board-compose__backdrop" aria-label="닫기" onClick={onClose} />
      <form className="site-board-compose__panel" onSubmit={handleSubmit} aria-label="글쓰기">
        <header className="site-board-compose__head">
          <h3>글쓰기</h3>
          <button type="button" className="site-board-compose__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        {siteTitle ? <p className="site-board-compose__site">{siteTitle}</p> : null}

        <div className="field-board-compose__types" role="tablist" aria-label="게시글 유형">
          {POST_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={postType === opt.value}
              className={`field-board-compose__type${postType === opt.value ? " is-active" : ""}`}
              onClick={() => setPostType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            postType === "question"
              ? "현장에서 궁금한 점을 남겨 주세요"
              : postType === "worklog"
                ? "오늘 작업 내용을 간단히 남겨 주세요"
                : postType === "photo"
                  ? "사진 설명(선택)"
                  : "현장 공지를 입력하세요"
          }
          rows={4}
          maxLength={500}
          autoFocus
        />

        {needsPhoto || imageDataUrl ? (
          <label className="field-board-compose__photo">
            <span>{imageDataUrl ? "사진 변경" : "작업사진 첨부"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const data = await compressImageFileToDataUrl(file);
                  setImageDataUrl(data);
                  if (postType !== "photo") setPostType("photo");
                } catch (_) {
                  onToast?.("이미지를 불러올 수 없습니다");
                }
              }}
            />
            {imageDataUrl ? <img className="field-board-compose__preview" src={imageDataUrl} alt="" /> : null}
          </label>
        ) : null}

        <p className="site-board-compose__hint">공지 · 질문 · 작업일지 · 작업사진을 남길 수 있습니다.</p>
        <button type="submit" className="site-board-compose__submit" disabled={!canSubmit || submitting}>
          {submitting ? "등록 중…" : "등록"}
        </button>
      </form>
    </div>
  );
}
