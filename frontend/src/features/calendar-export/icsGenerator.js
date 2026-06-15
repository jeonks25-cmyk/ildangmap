function pad2(n) {
  return String(n).padStart(2, "0");
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function dateKeyToIcsLocal(dateKey, time = "00:00") {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const [hh, mm] = String(time).split(":").map(Number);
  if (!y || !m || !d) return "";
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh || 0)}${pad2(mm || 0)}00`;
}

function foldLine(line) {
  const max = 73;
  if (line.length <= max) return [line];
  const parts = [];
  let rest = line;
  parts.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts;
}

/**
 * @param {import('./calendarExportModel').IcsEventInput[]} events
 */
export function generateIcsCalendar(events, { calendarName = "일당맵 일정" } = {}) {
  const list = (Array.isArray(events) ? events : []).filter((e) => e?.dateKey && e?.title);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ildangmap//Schedule Export//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  list.forEach((event) => {
    const dtStart = dateKeyToIcsLocal(event.dateKey, event.startTime || "08:00");
    const dtEnd = dateKeyToIcsLocal(event.dateKey, event.endTime || "17:00");
    if (!dtStart || !dtEnd) return;

    const block = [
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.uid || `ildangmap-${event.dateKey}-${event.title}@ildangmap.app`)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    ];
    if (event.location) block.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.memo) block.push(`DESCRIPTION:${escapeIcsText(event.memo)}`);
    block.push("END:VEVENT");
    lines.push(...block);
  });

  lines.push("END:VCALENDAR");
  return lines.flatMap(foldLine).join("\r\n");
}
