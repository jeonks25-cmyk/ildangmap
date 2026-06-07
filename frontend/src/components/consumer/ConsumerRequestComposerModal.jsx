import React, { useEffect, useMemo, useRef, useState } from "react";
import { CRAFT_LABEL } from "../../utils/jobModel";
import { buildConsumerMockPhoto } from "../../utils/consumerRequestsStorage";

const REQUEST_CRAFT_OPTIONS = ["film", "wallpaper", "tile", "electric", "paint"];

function buildMockPhotos(seed, count) {
  return Array.from({ length: count }).map((_, index) => buildConsumerMockPhoto(`${seed}-${index + 1}`, `첨부 사진 ${index + 1}`));
}

export default function ConsumerRequestComposerModal({ open, onClose, onSubmit }) {
  const closeTimerRef = useRef(null);
  const [craft, setCraft] = useState("film");
  const [region, setRegion] = useState("대전 서구");
  const [description, setDescription] = useState("샤시 필름 시공 문의");
  const [photoCount, setPhotoCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdTitle, setCreatedTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setCraft("film");
    setRegion("대전 서구");
    setDescription("샤시 필름 시공 문의");
    setPhotoCount(1);
    setSubmitting(false);
    setSubmitted(false);
    setCreatedTitle("");
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const photos = useMemo(() => buildMockPhotos(`consumer-${craft}`, photoCount), [craft, photoCount]);

  const handleSubmit = async () => {
    if (submitting || !region.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const next = await Promise.resolve(
        onSubmit?.({
          craft,
          shortRegion: region.trim(),
          title: description.trim(),
          description: description.trim(),
          photoCount,
          photos,
          customerName: `${region.trim().split(" ").slice(-1)[0] || "일반"} 고객`,
        })
      );
      setCreatedTitle(next?.title || description.trim());
      setSubmitted(true);
      closeTimerRef.current = window.setTimeout(() => onClose?.(), 900);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="consumer-request-backdrop" role="presentation" onClick={() => onClose?.()}>
      <div
        className="consumer-request-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consumer-request-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="consumer-request-sheet__grab" aria-hidden="true" />
        <div className="consumer-request-sheet__head">
          <div>
            <div className="consumer-request-sheet__eyebrow">시공 요청</div>
            <h2 id="consumer-request-title" className="consumer-request-sheet__title">
              가볍게 시공 문의 남기기
            </h2>
            <p className="consumer-request-sheet__sub">복잡한 견적서 대신 간단한 작업과 지역만 남기면 됩니다.</p>
          </div>
          <button type="button" className="consumer-request-sheet__close" onClick={() => onClose?.()} aria-label="닫기">
            ✕
          </button>
        </div>

        {!submitted ? (
          <div className="consumer-request-sheet__body">
            <div className="consumer-request-sheet__field">
              <span className="consumer-request-sheet__label">어떤 작업인가요?</span>
              <div className="consumer-request-sheet__crafts">
                {REQUEST_CRAFT_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`consumer-request-sheet__craft${craft === item ? " is-active" : ""}`}
                    onClick={() => setCraft(item)}
                  >
                    {CRAFT_LABEL[item] || item}
                  </button>
                ))}
              </div>
            </div>

            <label className="consumer-request-sheet__field">
              <span className="consumer-request-sheet__label">지역</span>
              <input
                className="consumer-request-sheet__input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 대전 서구"
              />
              <span className="consumer-request-sheet__hint">상세주소는 받지 않고 동 단위까지만 공유됩니다.</span>
            </label>

            <label className="consumer-request-sheet__field">
              <span className="consumer-request-sheet__label">간단 설명</span>
              <textarea
                className="consumer-request-sheet__input consumer-request-sheet__input--textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 샤시 필름 시공 문의"
                rows={4}
              />
            </label>

            <div className="consumer-request-sheet__field">
              <span className="consumer-request-sheet__label">사진 첨부 (선택)</span>
              <div className="consumer-request-sheet__photo-actions">
                {[0, 1, 2].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`consumer-request-sheet__photo-chip${photoCount === count ? " is-active" : ""}`}
                    onClick={() => setPhotoCount(count)}
                  >
                    {count === 0 ? "없음" : `${count}장`}
                  </button>
                ))}
              </div>
              {photos.length ? (
                <div className="consumer-request-sheet__photos">
                  {photos.map((src, index) => (
                    <div key={src} className="consumer-request-sheet__photo">
                      <img src={src} alt={`요청 사진 ${index + 1}`} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="consumer-request-sheet__submit"
              onClick={handleSubmit}
              disabled={submitting || !region.trim() || !description.trim()}
            >
              {submitting ? "등록 중..." : "시공 요청 남기기"}
            </button>
          </div>
        ) : (
          <div className="consumer-request-sheet__done">
            <div className="consumer-request-sheet__done-mark" aria-hidden="true">
              ✓
            </div>
            <h3 className="consumer-request-sheet__done-title">시공 요청을 올렸습니다</h3>
            <p className="consumer-request-sheet__done-sub">{createdTitle || description}</p>
            <p className="consumer-request-sheet__done-note">근처 오야지가 보고 가볍게 응답할 수 있는 보조 요청으로 등록됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
