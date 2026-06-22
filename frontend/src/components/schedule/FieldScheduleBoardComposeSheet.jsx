import React, { useEffect, useMemo, useState } from "react";
import { compressImageFileToDataUrl } from "../../utils/briefingImageCompress";

const ALL_POST_TYPES = [
  { value: "notice", label: "공지", ownerOnly: true },
  { value: "question", label: "질문" },
  { value: "worklog", label: "작업일지" },
  { value: "photo", label: "작업사진" },
];

/** 현장 일정 게시판 글쓰기 바텀시트 */
export default function FieldScheduleBoardComposeSheet({
  open,
  siteTitle = "",
  isOwner = false,
  onClose,
  onSubmit,
  onToast,
}) {
  const postTypes = useMemo(
    () => ALL_POST_TYPES.filter((t) => !t.ownerOnly || isOwner),
    [isOwner]
  );
  const defaultType = postTypes[0]?.value || "question";

  const [postType, setPostType] = useState(defaultType);
  const [body, setBody] = useState("");
  const [imageDataUrls, setImageDataUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPostType(defaultType);
    setBody("");
    setImageDataUrls([]);
    setSubmitting(false);
  }, [open, defaultType]);

  if (!open) return null;

  const needsPhoto = postType === "photo";
  const canSubmit = Boolean(body.trim() || (needsPhoto && imageDataUrls.length));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        body: body.trim(),
        postType,
        imageDataUrl: imageDataUrls[0] || undefined,
        imageDataUrls: imageDataUrls.length ? imageDataUrls : undefined,
      });
      onClose?.();
    } catch (err) {
      onToast?.(err?.message || "게시에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const addPhoto = async (file) => {
    if (!file) return;
    if (imageDataUrls.length >= 8) {
      onToast?.("사진은 최대 8장까지 등록할 수 있습니다.");
      return;
    }
    try {
      const data = await compressImageFileToDataUrl(file);
      setImageDataUrls((prev) => [...prev, data]);
    } catch (_) {
      onToast?.("이미지를 불러올 수 없습니다");
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
          {postTypes.map((opt) => (
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

        {needsPhoto || imageDataUrls.length ? (
          <div className="field-board-compose__photo">
            <label>
              <span>{imageDataUrls.length ? "사진 추가" : "작업사진 첨부"}</span>
              <input
                type="file"
                accept="image/*"
                multiple={needsPhoto}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const file of files) {
                    await addPhoto(file);
                  }
                  e.target.value = "";
                  if (postType !== "photo" && files.length) setPostType("photo");
                }}
              />
            </label>
            {imageDataUrls.length ? (
              <p className="field-board-compose__photo-count">사진 {imageDataUrls.length}장 선택됨</p>
            ) : null}
            {imageDataUrls.length ? (
              <div className="field-board-compose__previews">
                {imageDataUrls.map((src, idx) => (
                  <img key={`${idx}-${src.slice(0, 24)}`} className="field-board-compose__preview" src={src} alt="" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="site-board-compose__hint">공지 · 질문 · 작업일지 · 작업사진을 남길 수 있습니다.</p>
        <button type="submit" className="site-board-compose__submit" disabled={!canSubmit || submitting}>
          {submitting ? "등록 중…" : "등록"}
        </button>
      </form>
    </div>
  );
}
