/**
 * 현장명 후보 점수 — 발신자명·동호 붙은 명칭·키워드 근접 가중
 */

const DIAG = "[SCHEDULE-OCR]";

/** 자주 보이는 카톡 발신자·오야지명 (감점·후보 제외) */
const COMMON_PERSON_NAMES = new Set([
  "장재열",
  "홍길동",
  "김철수",
  "이영희",
  "박민수",
  "최오야지",
  "김오야지",
  "박오야지",
  "이오야지",
  "정오야지",
  "현장오야지",
]);

const SITE_KEYWORD_RE = /동|호|공동비번|세대비번|공용현관|현관비번|비밀번호/gu;
const DONG_HO_ATTACHED_RE = /([가-힣]{2,12})(\d{3,4})동(\d{2,4})호?/gu;
const PERSON_NAME_RE = /^[가-힣]{2,3}$/u;
const SENDER_LINE_RE = /^[가-힣]{2,4}(?:\s*[:：]|\s+오\d{1,2}|\s*$)/u;

function compactBlob(text) {
  return String(text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

function dedupeRepeatedSuffix(name) {
  let s = String(name || "").trim();
  if (s.length < 4) return s;
  for (let len = 2; len <= Math.min(6, Math.floor(s.length / 2)); len++) {
    const tail = s.slice(-len);
    if (s.endsWith(tail + tail)) return s.slice(0, -len).trim();
  }
  return s;
}

export function isPlausibleSiteNameForScoring(name) {
  const n = String(name || "").trim();
  if (n.length < 2 || n.length > 18) return false;
  if (/^(KT|SKT|LG)/i.test(n)) return false;
  if (/[@&]|QQ|haC|연락처|인테리어|오전|오후|자세히/i.test(n)) return false;
  const hangul = (n.match(/[가-힣]/g) || []).length;
  if (hangul < 2) return false;
  if (hangul / n.length < 0.45) return false;
  return true;
}

function addScore(bucket, text, delta, reason) {
  const key = String(text || "").trim();
  if (!key || key.length < 2) return;
  if (!bucket.has(key)) {
    bucket.set(key, { text: key, score: 0, reasons: [] });
  }
  const row = bucket.get(key);
  row.score += delta;
  row.reasons.push(`${delta >= 0 ? "+" : ""}${delta}:${reason}`);
}

export function isLikelyPersonName(name, lineIndex = -1) {
  const n = String(name || "").trim();
  if (!n) return false;
  if (COMMON_PERSON_NAMES.has(n)) return true;
  if (PERSON_NAME_RE.test(n) && n.length === 3) return true;
  if (/오야지$/u.test(n)) return true;
  if (lineIndex >= 0 && lineIndex <= 2 && n.length >= 2 && n.length <= 4 && PERSON_NAME_RE.test(n)) {
    return true;
  }
  return false;
}

/** 카카오톡 말풍선 상단 발신자 영역 줄 */
export function isKakaoSenderLine(line, lineIndex = 0) {
  const s = String(line || "").trim();
  if (!s || lineIndex > 2) return false;
  if (/\d{3,4}\s*동/u.test(s)) return false;
  if (/공동비번|세대비번|비번|현관/i.test(s)) return false;
  if (s.length > 8) return false;
  if (!/^[가-힣]{2,4}$/u.test(s)) return false;
  if (SENDER_LINE_RE.test(s)) return true;
  return lineIndex === 0 && PERSON_NAME_RE.test(s);
}

export function detectSenderLines(lines) {
  const senders = new Set();
  (Array.isArray(lines) ? lines : []).forEach((line, index) => {
    if (!isKakaoSenderLine(line, index)) return;
    const name = String(line || "").trim().replace(/\s*[:：].*$/, "");
    if (name) senders.add(name);
  });
  return senders;
}

function scoreProximityToKeywords(blob, name) {
  let bonus = 0;
  const compact = compactBlob(blob);
  const nameIdx = compact.indexOf(compactBlob(name));
  if (nameIdx < 0) return 0;

  let m;
  SITE_KEYWORD_RE.lastIndex = 0;
  while ((m = SITE_KEYWORD_RE.exec(compact)) !== null) {
    const dist = Math.abs(m.index - nameIdx);
    if (dist <= 50) {
      bonus = Math.max(bonus, 40 - Math.floor(dist / 2));
    }
  }
  return bonus;
}

/**
 * @param {object} ctx
 * @param {string} ctx.rawText
 * @param {string[]} ctx.lines
 * @param {object[]} ctx.matches
 * @param {string} ctx.building
 * @param {string} ctx.unit
 */
export function scoreSiteNameCandidates(ctx) {
  const { rawText = "", lines = [], matches = [], building = "", unit = "" } = ctx;
  const bucket = new Map();
  const blob = compactBlob(rawText);
  const senderLines = detectSenderLines(lines);

  for (const m of matches) {
    const name = dedupeRepeatedSuffix(String(m.siteName || "").trim());
    if (!name || !isPlausibleSiteNameForScoring(name)) continue;
    if (senderLines.has(name) || isLikelyPersonName(name, m.lineIndex)) continue;

    if (m.source === "compact_dong_ho" || m.source === "full_blob") {
      addScore(bucket, name, 100, "attached_dong_ho");
    } else if (m.source === "cross_line") {
      addScore(bucket, name, 15, "cross_line");
    } else {
      addScore(bucket, name, 10, m.source || "match");
    }

    if (isLikelyPersonName(name, m.lineIndex)) {
      addScore(bucket, name, -50, "person_name");
    }
  }

  let dm;
  DONG_HO_ATTACHED_RE.lastIndex = 0;
  while ((dm = DONG_HO_ATTACHED_RE.exec(blob)) !== null) {
    const attached = dedupeRepeatedSuffix(dm[1]);
    if (!attached || !isPlausibleSiteNameForScoring(attached)) continue;
    if (senderLines.has(attached) || isLikelyPersonName(attached)) continue;
    if (building && unit && dm[2] === building && dm[3] === unit) {
      addScore(bucket, attached, 100, "dong_ho_inline");
    } else {
      addScore(bucket, attached, 80, "dong_ho_inline");
    }
  }

  for (const line of lines) {
    const compact = compactBlob(line);
    const hangulRuns = compact.match(/[가-힣]{2,12}/gu) || [];
    const lineIndex = lines.indexOf(line);
    for (const run of hangulRuns) {
      const name = dedupeRepeatedSuffix(run);
      if (!isPlausibleSiteNameForScoring(name)) continue;
      if (senderLines.has(name)) continue;
      if (isKakaoSenderLine(line, lineIndex)) continue;

      const prox = scoreProximityToKeywords(blob, name);
      if (prox > 0) addScore(bucket, name, prox, "near_keyword");

      if (isLikelyPersonName(name, lineIndex)) {
        addScore(bucket, name, -50, "person_name");
      }
    }
  }

  for (const sender of senderLines) {
    if (bucket.has(sender)) bucket.delete(sender);
  }

  const siteCandidates = [...bucket.values()]
    .filter((c) => c.score > 0 && isPlausibleSiteNameForScoring(c.text))
    .sort((a, b) => b.score - a.score);

  const selected =
    siteCandidates.find((c) => !isLikelyPersonName(c.text))?.text ||
    siteCandidates[0]?.text ||
    "";

  return { siteCandidates, selectedSite: selected, senderLines: [...senderLines] };
}

export function logSiteNameCandidateSelection(selection, building, unit) {
  if (typeof console === "undefined" || !console.log) return;
  console.log(`${DIAG} siteCandidates:`, (selection.siteCandidates || []).map((c) => ({
    text: c.text,
    score: c.score,
    reasons: c.reasons,
  })));
  console.log(`${DIAG} selectedSite:`, selection.selectedSite || "—", {
    building,
    unit,
    senderLines: selection.senderLines,
  });
}
