import { generateIcsCalendar } from "./icsGenerator";

function buildFilename(name = "ildangmap-schedule") {
  const safe = String(name).replace(/[^\w가-힣.-]+/g, "_").slice(0, 40);
  return `${safe || "ildangmap-schedule"}.ics`;
}

/**
 * @returns {{ ok: boolean, method: 'share'|'download', error?: string }}
 */
export async function downloadOrShareIcs(events, options = {}) {
  const ics = generateIcsCalendar(events, options);
  if (!ics.includes("BEGIN:VEVENT")) {
    return { ok: false, error: "no_events" };
  }

  const filename = buildFilename(options.filename || "ildangmap-schedule");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/calendar" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: options.shareTitle || "일당맵 일정",
        text: options.shareText || "캘린더에 저장하세요",
      });
      return { ok: true, method: "share" };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, error: "cancelled" };
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, method: "download" };
}
