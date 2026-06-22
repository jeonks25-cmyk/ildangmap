/**
 * OCR 텍스트에서 현장 후보 줄 추출 — 사용자 선택 UX용
 */

import { isKakaoSenderLine, isLikelyPersonName } from "../../site-import/parser/siteNameCandidateScorer";
import { isNoiseLine } from "../../site-import/parser/siteFieldParser";

const DIAG = "[SCHEDULE-OCR]";

const SITE_KEYWORD_RE =
  /동|호|비밀번호|공동비번|세대비번|공용현관|현관비번|비번|비밀번호|#+\d/u;
const PHONE_RE = /010[-\s.]?\d{3,4}[-\s.]?\d{4}/;
const ACCOUNT_RE = /\d{3,6}[-\s]\d{2,6}[-\s]\d{4,}/;
const LONG_DIGIT_RE = /\d{10,}/;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u;
const CHATTER_RE =
  /^(ㅋ+|ㅎ+|ㅠ+|ㅜ+|ㅇㅋ|ㅇㅇ|ㄱㄱ|ㄴㄴ|네+|응+|ㅇㅇ|감사|수고|알겠|확인했|ㅇㅋㅇㅋ)/iu;

function normalizeLine(line) {
  return String(line || "").replace(/\s+/g, " ").trim();
}

/** 계좌·전화·잡담·이모지 줄 — 후보 제외 */
export function isExcludedSiteLine(line, lineIndex = 0) {
  const s = normalizeLine(line);
  if (!s || s.length < 2) return true;
  if (SITE_KEYWORD_RE.test(s)) {
    if (PHONE_RE.test(s) || ACCOUNT_RE.test(s)) return true;
    return false;
  }
  if (isNoiseLine(s)) return true;
  if (isKakaoSenderLine(s, lineIndex)) return true;
  if (isLikelyPersonName(s, lineIndex)) return true;
  if (PHONE_RE.test(s)) return true;
  if (ACCOUNT_RE.test(s)) return true;
  if (LONG_DIGIT_RE.test(s.replace(/\s/g, "")) && !SITE_KEYWORD_RE.test(s)) return true;
  if (EMOJI_RE.test(s)) return true;
  if (CHATTER_RE.test(s) && !SITE_KEYWORD_RE.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^(전송|메시지\s*입력|사진|동영상|파일)/u.test(s)) return true;
  return false;
}

function scoreSiteLine(line) {
  const s = normalizeLine(line);
  let score = 0;
  const reasons = [];

  if (SITE_KEYWORD_RE.test(s)) {
    score += 100;
    reasons.push("+100:site_keyword");
  }
  if (/\d{3,4}\s*동\s*\d{2,4}\s*호/u.test(s)) {
    score += 40;
    reasons.push("+40:dong_ho_spaced");
  }
  if (/\d{3,4}동\d{2,4}호?/u.test(s.replace(/\s/g, ""))) {
    score += 35;
    reasons.push("+35:dong_ho_compact");
  }
  if (/[가-힣]{2,}/u.test(s) && /\d{3,}/.test(s)) {
    score += 15;
    reasons.push("+15:hangul_digits");
  }
  if (s.length >= 6 && s.length <= 48) {
    score += 5;
    reasons.push("+5:length_ok");
  }
  if (/인테리어|아파트|타일|필름|도배|주방|욕실/u.test(s)) {
    score += 10;
    reasons.push("+10:trade_hint");
  }

  return { score, reasons };
}

/**
 * @param {string} ocrText
 * @param {{ maxCandidates?: number }} [options]
 * @returns {{ candidates: Array<{ id: string, text: string, score: number, reasons: string[], lineIndex: number }>, selectedId: string|null }}
 */
export function extractSiteLineCandidates(ocrText, options = {}) {
  const maxCandidates = options.maxCandidates ?? 8;
  const lines = String(ocrText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bucket = new Map();

  lines.forEach((line, lineIndex) => {
    if (isExcludedSiteLine(line, lineIndex)) return;
    const { score, reasons } = scoreSiteLine(line);
    if (score <= 0 && line.length < 4) return;

    const text = normalizeLine(line);
    const prev = bucket.get(text);
    if (!prev || score > prev.score) {
      bucket.set(text, {
        id: `line-${lineIndex}-${text.slice(0, 12)}`,
        text,
        score,
        reasons,
        lineIndex,
      });
    }
  });

  const candidates = [...bucket.values()]
    .sort((a, b) => b.score - a.score || a.lineIndex - b.lineIndex)
    .slice(0, maxCandidates);

  const selectedId = candidates[0]?.id || null;

  if (typeof console !== "undefined" && console.log) {
    console.log(`${DIAG} siteLineCandidates:`, candidates.map((c) => ({
      text: c.text,
      score: c.score,
      reasons: c.reasons,
    })));
    console.log(`${DIAG} selectedSiteLine:`, candidates[0]?.text || "—");
  }

  return { candidates, selectedId };
}
