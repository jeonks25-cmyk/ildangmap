/** 일정 탭 — 사용자 선택 색상 (연한 배경) */
export const SCHEDULE_COLOR_OPTIONS = [
  { id: "red", label: "빨강", bg: "#fee2e2", text: "#991b1b" },
  { id: "orange", label: "주황", bg: "#ffedd5", text: "#9a3412" },
  { id: "yellow", label: "노랑", bg: "#fef9c3", text: "#854d0e" },
  { id: "green", label: "초록", bg: "#dcfce7", text: "#166534" },
  { id: "blue", label: "파랑", bg: "#dbeafe", text: "#1e40af" },
  { id: "purple", label: "보라", bg: "#ede9fe", text: "#5b21b6" },
  { id: "gray", label: "회색", bg: "#f3f4f6", text: "#374151" },
];

const COLOR_BY_ID = Object.fromEntries(SCHEDULE_COLOR_OPTIONS.map((c) => [c.id, c]));

const CRAFT_DEFAULT_COLOR = {
  film: "orange",
  wallpaper: "green",
  tile: "yellow",
  electric: "blue",
  paint: "green",
};

export function normalizeScheduleColorId(colorId) {
  const id = String(colorId || "").trim();
  return COLOR_BY_ID[id] ? id : "gray";
}

export function getScheduleColorOption(colorId) {
  return COLOR_BY_ID[normalizeScheduleColorId(colorId)] || COLOR_BY_ID.gray;
}

export function resolveFieldScheduleColor(schedule) {
  if (schedule?.calendarColor) return normalizeScheduleColorId(schedule.calendarColor);
  const craft = String(schedule?.craft || "").toLowerCase();
  return CRAFT_DEFAULT_COLOR[craft] || "gray";
}

export function resolvePersonalEventColor(personalEvent) {
  return normalizeScheduleColorId(personalEvent?.color);
}
