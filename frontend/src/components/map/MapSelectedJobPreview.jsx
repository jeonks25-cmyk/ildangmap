import React from "react";
import MapJobPreviewCard from "./MapJobPreviewCard";

/**
 * 마커·목록 선택 시 — 지도 하단 미리보기 카드
 */
function MapSelectedFieldPreview({ job, onApplyJob, onDismiss, className = "" }) {
  if (!job) return null;

  return (
    <div
      className={`map-job-preview map-job-preview--mobile-only${className ? ` ${className}` : ""}`}
      role="region"
      aria-label="선택한 현장 미리보기"
    >
      <MapJobPreviewCard job={job} onApply={onApplyJob} onDismiss={onDismiss} />
    </div>
  );
}

export default React.memo(MapSelectedFieldPreview);
