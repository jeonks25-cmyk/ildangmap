/**
 * Field site domain helpers — notices retention, schedule change logs.
 * Keeps MVP storage predictable for future server migration.
 */

/** Active localStorage window for operational memos (days). */
export const FIELD_NOTICE_RETENTION_DAYS = 90;

/**
 * @param {unknown} raw
 * @param {number} index
 * @returns {{ id: string, author: string, text: string, createdAt: string } | null}
 */
export function normalizeFieldNotice(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id != null ? String(raw.id) : `m-${index}`;
  const author = String(raw.author ?? "").trim() || "오야지";
  const text = String(raw.text ?? "").trim();
  if (!text) return null;

  let createdAt = raw.createdAt != null ? String(raw.createdAt).trim() : "";
  if (!createdAt) {
    createdAt = new Date().toISOString();
  }
  return { id, author, text, createdAt };
}

/**
 * @param {unknown} list
 * @returns {Array<{ id: string, author: string, text: string, createdAt: string }>}
 */
export function normalizeNotices(list) {
  return (Array.isArray(list) ? list : [])
    .map((item, index) => normalizeFieldNotice(item, index))
    .filter(Boolean);
}

/**
 * Drop notices older than retention (by createdAt). Keeps invalid-date rows.
 * @param {Array<{ createdAt?: string }>} notices
 * @param {number} [retentionDays]
 * @param {Date} [now]
 */
export function pruneNoticesByRetention(notices, retentionDays = FIELD_NOTICE_RETENTION_DAYS, now = new Date()) {
  const ms = retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - ms;
  return notices.filter((n) => {
    const t = Date.parse(n.createdAt);
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
}

/**
 * @param {{ date?: string, startTime?: string, endTime?: string }} before
 * @param {{ date?: string, startTime?: string, endTime?: string }} after
 * @param {string} [changedBy] actor id or role key (MVP: "owner")
 */
export function buildScheduleChangeLogEntry(before, after, changedBy = "owner") {
  return {
    beforeDate: before.date ?? null,
    afterDate: after.date ?? null,
    beforeStartTime: before.startTime ?? null,
    afterStartTime: after.startTime ?? null,
    beforeEndTime: before.endTime ?? null,
    afterEndTime: after.endTime ?? null,
    changedBy,
    changedAt: new Date().toISOString(),
  };
}
