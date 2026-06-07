import React from "react";
import MapSelectedJobPreview from "./MapSelectedJobPreview";
import MiniCalendarModal from "./MiniCalendarModal";

/**
 * 지도 탭 — 선택 현장 하단 미리보기 + 날짜 선택.
 */
function MapFieldSelectionOverlaySection({
  includePreview = false,
  includeCalendar = false,
  selectedJobPreview,
  jobListPanelOpen,
  onApplyJob,
  onDismissSelection,
  calendarOpen,
  onCalendarClose,
  selectedDateKey,
  onSelectDate,
}) {
  return (
    <>
      {includePreview && selectedJobPreview && !jobListPanelOpen ? (
        <MapSelectedJobPreview
          className="map-job-preview--geo"
          job={selectedJobPreview}
          onApplyJob={onApplyJob}
          onDismiss={onDismissSelection}
        />
      ) : null}
      {includeCalendar ? (
        <MiniCalendarModal
          open={calendarOpen}
          onClose={onCalendarClose}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
        />
      ) : null}
    </>
  );
}

function selectionOverlayPropsEqual(prev, next) {
  if (prev.includePreview !== next.includePreview) return false;
  if (prev.includeCalendar !== next.includeCalendar) return false;
  const previewOn = prev.includePreview && next.includePreview;
  const calendarOn = prev.includeCalendar && next.includeCalendar;
  if (previewOn) {
    if (prev.selectedJobPreview !== next.selectedJobPreview) return false;
    if (prev.jobListPanelOpen !== next.jobListPanelOpen) return false;
    if (prev.onApplyJob !== next.onApplyJob) return false;
    if (prev.onDismissSelection !== next.onDismissSelection) return false;
  }
  if (calendarOn) {
    if (prev.calendarOpen !== next.calendarOpen) return false;
    if (prev.selectedDateKey !== next.selectedDateKey) return false;
    if (prev.onCalendarClose !== next.onCalendarClose) return false;
    if (prev.onSelectDate !== next.onSelectDate) return false;
  }
  return true;
}

export default React.memo(MapFieldSelectionOverlaySection, selectionOverlayPropsEqual);
