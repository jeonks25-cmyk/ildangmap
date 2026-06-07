/** UI 표시용 — ● 가능 / × 불가능 */
export const AVAILABILITY_STATUS = {
  available: { key: "available", glyph: "●", label: "가능", className: "is-available" },
  unavailable: { key: "unavailable", glyph: "×", label: "불가능", className: "is-unavailable" },
};

export function getAvailabilityMeta(statusKey) {
  return AVAILABILITY_STATUS[statusKey] || AVAILABILITY_STATUS.unavailable;
}
