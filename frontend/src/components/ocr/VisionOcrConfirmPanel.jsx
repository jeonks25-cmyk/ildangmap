import React from "react";
import { formatVisionOcrForDisplay, getVisionRawJsonForDev } from "../../features/site-import/utils/visionOcrDisplay";
import { isStructureDebugEnabled } from "../../features/site-import/parser/siteImportStructureMetrics";
import VisionOcrDiagPanel from "./VisionOcrDiagPanel";

/**
 * Gemini Vision 결과 확인 — 적용 전 사용자 검토
 */
export default function VisionOcrConfirmPanel({
  visionData = null,
  visionOcrDiag = null,
  onApply,
  onCancel,
  busy = false,
  applyLabel = "적용",
}) {
  if (!visionData) return null;

  const rows = formatVisionOcrForDisplay(visionData);
  const showDev = isStructureDebugEnabled();

  return (
    <section className="vision-ocr-confirm" aria-label="Gemini Vision 결과 확인">
      <header className="vision-ocr-confirm__head">
        <h4 className="vision-ocr-confirm__title">Gemini 결과</h4>
        <p className="vision-ocr-confirm__lead">아래 내용을 확인한 뒤 폼에 넣으세요. 틀리면 적용 후 수정할 수 있습니다.</p>
      </header>

      <dl className="vision-ocr-confirm__list">
        {rows.map((row) => (
          <div key={row.key} className="vision-ocr-confirm__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="vision-ocr-confirm__actions">
        {onCancel ? (
          <button type="button" className="vision-ocr-confirm__cancel" onClick={onCancel} disabled={busy}>
            취소
          </button>
        ) : null}
        <button
          type="button"
          className="vision-ocr-confirm__apply"
          onClick={() => onApply?.(visionData)}
          disabled={busy}
        >
          {busy ? "적용 중…" : applyLabel}
        </button>
      </div>

      <VisionOcrDiagPanel diag={visionOcrDiag} />

      {showDev ? (
        <details className="vision-ocr-confirm__raw">
          <summary>Gemini 응답 원문 (JSON)</summary>
          <pre className="vision-ocr-confirm__raw-pre">{getVisionRawJsonForDev(visionData)}</pre>
        </details>
      ) : null}
    </section>
  );
}
