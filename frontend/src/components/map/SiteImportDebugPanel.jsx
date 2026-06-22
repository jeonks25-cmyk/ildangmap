import React from "react";

export default function SiteImportDebugPanel({ trace = null, title = "구조화 디버그" }) {
  if (!trace) return null;

  return (
    <section className="site-import-debug" aria-label={title}>
      <p className="site-import-debug__title">{title}</p>
      <dl className="site-import-debug__list">
        <div>
          <dt>OCR 원문</dt>
          <dd>{trace.rawText || "—"}</dd>
        </div>
        <div>
          <dt>정규화</dt>
          <dd>{trace.normalizedText || "—"}</dd>
        </div>
        <div>
          <dt>현장명 후보</dt>
          <dd>{(trace.siteNameCandidates || []).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt>동 후보</dt>
          <dd>{(trace.buildingCandidates || []).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt>호 후보</dt>
          <dd>{(trace.unitCandidates || []).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt>시간 후보</dt>
          <dd>
            {(trace.timeCandidates || [])
              .map((c) => {
                const time =
                  c.startTime && c.endTime
                    ? `${c.startTime}~${c.endTime}`
                    : c.startTime || c.endTime || "";
                const flag = c.accepted ? "✓" : "✗";
                return `${flag} ${c.label}${time ? ` ${time}` : ""}${c.reason ? ` (${c.reason})` : ""}`;
              })
              .join("\n") || (trace.timeExtracted ? "명시적 작업 시간" : "— (자동 입력 안 함)")}
          </dd>
        </div>
        <div>
          <dt>최종 선택</dt>
          <dd>
            {trace.final?.title ||
              [trace.final?.siteName, trace.final?.building && `${trace.final.building}동`, trace.final?.unit && `${trace.final.unit}호`]
                .filter(Boolean)
                .join(" ") ||
              "—"}
          </dd>
        </div>
        {trace.structureOk != null ? (
          <div>
            <dt>구조화 성공</dt>
            <dd>{trace.structureOk ? "✓ 현장명·동·호" : "✗ 미완료"}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
