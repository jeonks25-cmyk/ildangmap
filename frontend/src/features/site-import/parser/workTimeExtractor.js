/**
 * 현장 일정 — 명시적 작업 시간만 추출 (카카오톡 전송 시간 무시)
 */

const KAKAO_SEND_TIME_LINE_RE = /^(오전|오후)\s*\d{1,2}:\d{2}$/u;
const KAKAO_SEND_TIME_INLINE_RE = /(?:^|\s)(오전|오후)\s*(\d{1,2}):(\d{2})(?:\s|$)/u;
const STANDALONE_CLOCK_RE = /^\d{1,2}:\d{2}$/;

const EXPLICIT_RANGE_RE = /(\d{1,2}:\d{2})\s*[~\-–—]\s*(\d{1,2}:\d{2})/g;
const EXPLICIT_START_RE =
  /(\d{1,2}:\d{2})\s*(?:시작|출근|입장|도착|합류|부터)/u;
const EXPLICIT_KOREAN_MEET_RE =
  /(?:(?:내일|모레)\s*)?(?:오전|오후)?\s*(\d{1,2})\s*시\s*(반)?\s*(?:집결|시작|입장|도착|합류|출근)/u;
const EXPLICIT_KOREAN_RANGE_RE =
  /(\d{1,2})\s*시\s*[~\-–—]\s*(\d{1,2})\s*시/u;
const EXPLICIT_TOMORROW_HOUR_RE = /(?:내일|모레)\s*(?:오전|오후)?\s*(\d{1,2})\s*시/u;

const WORK_CONTEXT_RE = /(?:시작|집결|입장|도착|합류|출근|작업|현장|부터|까지|입장)/u;

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function normalizeClockTime(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(hour)}:${pad2(minute)}`;
}

function hourToClock(hour, period = "", half = false) {
  let h = Number(hour);
  if (!Number.isFinite(h)) return null;
  const p = String(period || "");
  if (/오후/u.test(p) && h < 12) h += 12;
  if (/오전/u.test(p) && h === 12) h = 0;
  if (h > 23) h = 23;
  return `${pad2(h)}:${half ? "30" : "00"}`;
}

/** 카카오톡 메시지 전송 시각 줄 */
export function isKakaoSendTimeLine(line) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (KAKAO_SEND_TIME_LINE_RE.test(s)) return true;
  if (STANDALONE_CLOCK_RE.test(s)) return true;
  if (KAKAO_SEND_TIME_INLINE_RE.test(s) && !WORK_CONTEXT_RE.test(s)) {
    const stripped = s.replace(KAKAO_SEND_TIME_INLINE_RE, "").trim();
    if (!stripped || stripped.length <= 2) return true;
  }
  return false;
}

function pushCandidate(candidates, payload) {
  candidates.push({
    ...payload,
    accepted: Boolean(payload.accepted),
  });
}

/**
 * @param {string} text
 * @returns {{
 *   startTime: string|null,
 *   endTime: string|null,
 *   extracted: boolean,
 *   candidates: Array<{ label: string, startTime?: string, endTime?: string, accepted: boolean, line?: string }>,
 * }}
 */
export function extractExplicitWorkTimes(text) {
  const rawText = String(text || "").trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = [];
  let startTime = null;
  let endTime = null;

  lines.forEach((line, index) => {
    if (isKakaoSendTimeLine(line)) {
      pushCandidate(candidates, {
        label: "kakao_send_time",
        line,
        accepted: false,
        reason: "전송 시각 — 무시",
      });
      return;
    }

    let rangeMatch;
    EXPLICIT_RANGE_RE.lastIndex = 0;
    while ((rangeMatch = EXPLICIT_RANGE_RE.exec(line)) !== null) {
      const start = normalizeClockTime(rangeMatch[1]);
      const end = normalizeClockTime(rangeMatch[2]);
      pushCandidate(candidates, {
        label: "explicit_range",
        startTime: start,
        endTime: end,
        line,
        accepted: true,
      });
      if (!startTime && start) startTime = start;
      if (!endTime && end) endTime = end;
    }

    const startMatch = line.match(EXPLICIT_START_RE);
    if (startMatch) {
      const start = normalizeClockTime(startMatch[1]);
      pushCandidate(candidates, {
        label: "explicit_start_keyword",
        startTime: start,
        line,
        accepted: true,
      });
      if (!startTime && start) startTime = start;
    }

    const meetMatch = line.match(EXPLICIT_KOREAN_MEET_RE);
    if (meetMatch) {
      const period = (line.match(/(오전|오후)/u) || [])[0] || "";
      const start = hourToClock(meetMatch[1], period, Boolean(meetMatch[2]));
      pushCandidate(candidates, {
        label: "korean_meet_time",
        startTime: start,
        line,
        accepted: true,
      });
      if (!startTime && start) startTime = start;
    }

    const koreanRange = line.match(EXPLICIT_KOREAN_RANGE_RE);
    if (koreanRange) {
      const start = hourToClock(koreanRange[1]);
      const end = hourToClock(koreanRange[2]);
      pushCandidate(candidates, {
        label: "korean_hour_range",
        startTime: start,
        endTime: end,
        line,
        accepted: true,
      });
      if (!startTime && start) startTime = start;
      if (!endTime && end) endTime = end;
    }

    const tomorrowHour = line.match(EXPLICIT_TOMORROW_HOUR_RE);
    if (tomorrowHour && WORK_CONTEXT_RE.test(line)) {
      const period = (line.match(/(오전|오후)/u) || [])[0] || "";
      const start = hourToClock(tomorrowHour[1], period);
      pushCandidate(candidates, {
        label: "tomorrow_hour",
        startTime: start,
        line,
        accepted: true,
      });
      if (!startTime && start) startTime = start;
    }

    void index;
  });

  const extracted = Boolean(startTime || endTime);
  return {
    startTime: extracted ? startTime : null,
    endTime: extracted ? endTime : null,
    extracted,
    candidates,
  };
}

export function isExplicitWorkTimeLine(line) {
  const { extracted } = extractExplicitWorkTimes(line);
  return extracted;
}
