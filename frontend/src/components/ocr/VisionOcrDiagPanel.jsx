import React from "react";
import { formatVisionConfidence } from "../../features/site-import/utils/visionOcrDiagModel";

/** OCR 결과 화면 — Gemini Vision / Tesseract Fallback 진단 */
export default function VisionOcrDiagPanel({ diag = null }) {
  if (!diag) return null;

  const isVision = diag.engine === "gemini-vision";

  return (
    <section
      className={`vision-ocr-diag vision-ocr-diag--${isVision ? "vision" : "fallback"}`}
      aria-label="Vision OCR 진단"
    >
      <p
        className={`vision-ocr-diag__banner vision-ocr-diag__banner--${isVision ? "vision" : "fallback"}`}
        role="status"
      >
        {diag.banner}
      </p>
      <dl className="vision-ocr-diag__list">
        <div>
          <dt>OCR 엔진</dt>
          <dd>{diag.engineLabel}</dd>
        </div>
        <div>
          <dt>사용 모델</dt>
          <dd>{diag.model || "—"}</dd>
        </div>
        <div>
          <dt>구조화 성공 여부</dt>
          <dd>{diag.structureStatusLabel}</dd>
        </div>
        <div>
          <dt>apartmentName</dt>
          <dd>{diag.apartmentName || "—"}</dd>
        </div>
        <div>
          <dt>building</dt>
          <dd>{diag.building || "—"}</dd>
        </div>
        <div>
          <dt>unit</dt>
          <dd>{diag.unit || "—"}</dd>
        </div>
        <div>
          <dt>confidence</dt>
          <dd>{formatVisionConfidence(diag.confidence)}</dd>
        </div>
      </dl>
    </section>
  );
}
