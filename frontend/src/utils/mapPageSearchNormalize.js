/** Shared by map job search pipeline and briefing/search UI match. */
export function normalizeMapSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
