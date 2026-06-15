import React, { useState } from "react";
import {
  composerPayloadToIcsInput,
  downloadOrShareIcs,
  fieldScheduleToIcsInputs,
  personalEventToIcsInput,
} from "../../features/calendar-export";

/**
 * @param {{
 *   events?: import('../../features/calendar-export/calendarExportModel').IcsEventInput[],
 *   personalEvent?: object,
 *   fieldSchedule?: object,
 *   composerPayload?: object,
 *   label?: string,
 *   className?: string,
 *   onDone?: (result: { ok: boolean, method?: string, error?: string }) => void,
 * }} props
 */
export default function CalendarSaveButton({
  events,
  personalEvent,
  fieldSchedule,
  composerPayload,
  label = "캘린더 저장",
  className = "",
  onDone,
}) {
  const [busy, setBusy] = useState(false);

  const resolveEvents = () => {
    if (Array.isArray(events) && events.length) return events;
    if (personalEvent) {
      const one = personalEventToIcsInput(personalEvent);
      return one ? [one] : [];
    }
    if (fieldSchedule) return fieldScheduleToIcsInputs(fieldSchedule);
    if (composerPayload) return composerPayloadToIcsInput(composerPayload) || [];
    return [];
  };

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const icsEvents = resolveEvents();
      const result = await downloadOrShareIcs(icsEvents, {
        filename: icsEvents[0]?.title || "ildangmap-schedule",
        shareTitle: "일당맵 일정",
        shareText: "캘린더 앱에서 일정을 추가하세요.",
      });
      onDone?.(result);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={`calendar-save-btn ${className}`.trim()} onClick={handleClick} disabled={busy}>
      {busy ? "준비 중…" : label}
    </button>
  );
}
