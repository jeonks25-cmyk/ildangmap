import React, { useEffect, useRef, useState } from "react";
import { BETA_FEEDBACK_MAX_IMAGE_BYTES, BETA_FEEDBACK_MAX_IMAGES } from "../../constants/betaFeedback";

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function BetaFeedbackImagePicker({ files, onChange, disabled }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleSelect = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const next = [...files];
    for (const file of selected) {
      if (next.length >= BETA_FEEDBACK_MAX_IMAGES) break;
      if (!file.type.startsWith("image/")) continue;
      if (file.size > BETA_FEEDBACK_MAX_IMAGE_BYTES) continue;
      next.push(file);
    }
    onChange(next);
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="beta-feedback-images">
      <div className="beta-feedback-images__grid">
        {previews.map((url, index) => (
          <div key={url} className="beta-feedback-images__item">
            <img src={url} alt={`첨부 ${index + 1}`} />
            <button
              type="button"
              className="beta-feedback-images__remove"
              onClick={() => removeAt(index)}
              disabled={disabled}
              aria-label="이미지 삭제"
            >
              ×
            </button>
          </div>
        ))}
        {files.length < BETA_FEEDBACK_MAX_IMAGES ? (
          <button
            type="button"
            className="beta-feedback-images__add"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            + 스크린샷
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleSelect}
      />
      <p className="beta-feedback-images__hint">
        최대 {BETA_FEEDBACK_MAX_IMAGES}장 · 파일당 {formatBytes(BETA_FEEDBACK_MAX_IMAGE_BYTES)} 이하
      </p>
    </div>
  );
}
