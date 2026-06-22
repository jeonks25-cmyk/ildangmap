/**
 * OCR 텍스트 후처리 — 동·호 복원, 비번 라벨, 현장명 fuzzy
 */

import { dedupeRepeatedSuffix } from "../../features/site-import/parser/siteFieldParser";
import { compactHangul, fuzzySimilarity } from "../../features/site-import/normalizer/fuzzyMatch";

const PASSWORD_LABEL_FIXES = [
  [/SSH\s*\|?\s*H\s*[:：]?/gi, "공동비번:"],
  [/SSH\s*H\s*[:：]?/gi, "공동비번:"],
  [/공\s*비\s*[:：]?/g, "공동비번:"],
  [/공동\s*비\s*[:：]?/g, "공동비번:"],
  [/세\s*비\s*[:：]?/g, "세대비번:"],
  [/세대\s*비\s*[:：]?/g, "세대비번:"],
];

const SITE_NAME_OCR_FIXES = [
  [/장제계룡/g, "장재계룡"],
  [/장재계룡개룡/g, "장재계룡"],
  [/장재개룡/g, "장재계룡"],
  [/장재열/g, "장재계룡"],
  [/개룡/g, "계룡"],
];

function trySplitDongHoDigits(digits) {
  const s = String(digits || "").replace(/\D/g, "");
  if (s.length < 6) return null;

  const tryCandidate = (building, unit, meta = {}) => {
    const b = parseInt(building, 10);
    const u = parseInt(unit, 10);
    if (!Number.isFinite(b) || !Number.isFinite(u)) return null;
    if (b >= 100 && b <= 9999 && u >= 10 && u <= 9999) {
      let score = 0;
      if (u >= 100 && u <= 1999) score += 30;
      else if (u >= 1000 && u <= 2999) score += 20;
      if (b >= 1000 && b <= 1999) score += 20;
      if (u >= 5000) score -= 40;
      if (meta.droppedNoiseDigit) score += 15;
      if (meta.removedIndex >= 2 && meta.removedIndex <= 6) score += 25;
      if (meta.removedIndex <= 1) score -= 20;
      if (meta.sourceLength === 9 && meta.droppedNoiseDigit && building === meta.sourcePrefix) {
        score += 30;
      }
      return { building, unit, score, ...meta };
    }
    return null;
  };

  const pickBest = (candidates) => {
    if (!candidates.length) return null;
    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  };

  // 9자리 — OCR 노이즈 숫자 1개 제거 후 8자리 분할 (슬라이딩 8자리보다 우선)
  if (s.length === 9) {
    const candidates = [];
    for (let remove = 0; remove < s.length; remove++) {
      const reduced = s.slice(0, remove) + s.slice(remove + 1);
      for (let i = 0; i <= reduced.length - 8; i++) {
        const chunk = reduced.slice(i, i + 8);
        const hit = tryCandidate(chunk.slice(0, 4), chunk.slice(4), {
          offset: i,
          droppedNoiseDigit: s[remove],
          removedIndex: remove,
          sourceLength: s.length,
          sourcePrefix: s.slice(0, 4),
        });
        if (hit) candidates.push(hit);
      }
    }
    return pickBest(candidates);
  }

  if (s.length >= 8) {
    const candidates = [];
    for (let i = 0; i <= s.length - 8; i++) {
      const chunk = s.slice(i, i + 8);
      const hit = tryCandidate(chunk.slice(0, 4), chunk.slice(4), { offset: i });
      if (hit) candidates.push(hit);
    }
    const best = pickBest(candidates);
    if (best) return best;
  }

  if (s.length === 7) {
    const hit =
      tryCandidate(s.slice(0, 3), s.slice(3)) ||
      tryCandidate(s.slice(0, 4), s.slice(4));
    return hit;
  }

  if (s.length === 6) {
    return tryCandidate(s.slice(0, 3), s.slice(3));
  }

  return null;
}

export function restoreDongHoInText(text) {
  let result = String(text || "");
  const corrections = [];

  result = result.replace(/(\d{7,10})/g, (match) => {
    const split = trySplitDongHoDigits(match);
    if (!split) return match;
    const restored = `${split.building}동 ${split.unit}호`;
    corrections.push({ type: "dong_ho_restore", from: match, to: restored });
    return restored;
  });

  result = result.replace(/([가-힣A-Za-z]{2,20})\s*[=|\-_:：\s]*[A-Za-z]?(\d{7,10})\s*[=|\-_:：\s]*/g, (full, prefix, digits) => {
    const split = trySplitDongHoDigits(digits);
    if (!split) return full;
    const siteName = correctSiteNameOcr(prefix);
    const restored = `${siteName} ${split.building}동 ${split.unit}호`;
    corrections.push({ type: "site_dong_ho_restore", from: full, to: restored });
    return restored;
  });

  return { text: result, corrections };
}

export function correctSiteNameOcr(rawName) {
  let name = String(rawName || "").trim();
  if (!name) return "";

  for (const [re, replacement] of SITE_NAME_OCR_FIXES) {
    name = name.replace(re, replacement);
  }

  name = dedupeRepeatedSuffix(name.replace(/\s+/g, ""));

  const compact = compactHangul(name);
  if (compact.length >= 6) {
    const half = Math.floor(compact.length / 2);
    const left = compact.slice(0, half);
    const right = compact.slice(half);
    if (fuzzySimilarity(left, right) >= 0.72) {
      name = left.length >= right.length ? left : right;
    }
  }

  return dedupeRepeatedSuffix(name);
}

export function restoreSiteNamesInText(text) {
  let result = String(text || "");
  const corrections = [];

  result = result.replace(/([가-힣A-Za-z]{4,24})(\d{3,4}\s*동\s*\d{2,4}\s*호)/gu, (full, namePart, dongHo) => {
    const fixed = correctSiteNameOcr(namePart);
    if (fixed && fixed !== namePart) {
      corrections.push({ type: "site_name_fuzzy", from: namePart, to: fixed });
      return `${fixed}${dongHo}`;
    }
    return full;
  });

  result = result.replace(/^([가-힣A-Za-z]{4,24})$/gmu, (line) => {
    const fixed = correctSiteNameOcr(line);
    if (fixed && fixed !== line) {
      corrections.push({ type: "site_name_line_fuzzy", from: line, to: fixed });
      return fixed;
    }
    return line;
  });

  return { text: result, corrections };
}

/**
 * @param {string} rawText
 */
export function postprocessOcrText(rawText) {
  const original = String(rawText || "");
  let text = original;
  const corrections = [];

  for (const [re, replacement] of PASSWORD_LABEL_FIXES) {
    const next = text.replace(re, replacement);
    if (next !== text) {
      corrections.push({ type: "password_label", pattern: String(re), to: replacement });
      text = next;
    }
  }

  const dongHo = restoreDongHoInText(text);
  text = dongHo.text;
  corrections.push(...dongHo.corrections);

  const siteNames = restoreSiteNamesInText(text);
  text = siteNames.text;
  corrections.push(...siteNames.corrections);

  text = text
    .replace(/[｜|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

  return {
    rawText: original,
    text,
    corrections,
  };
}

const KAKAO_JUNK_LINE_RE =
  /연락처|자세히\s*보기|인테리어|시티온|시대인|오전\s*\d{1,2}:\d{2}|오후\s*\d{1,2}:\d{2}|^우리\s+\d{3,4}\s*동|QQhaC|haCS/i;

export function filterSiteRelevantOcrText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .flatMap((line) => String(line || "").split(/[&]+/))
    .map((line) => sanitizeOcrGarbage(line))
    .map((line) => line.trim())
    .filter(Boolean);

  const siteLines = lines.filter((line) => {
    if (KAKAO_JUNK_LINE_RE.test(line)) return false;
    if (/^(KT|SKT|LG)/i.test(line)) return false;
    return (
      /\d{3,4}\s*동\s*\d{2,4}\s*호/u.test(line) ||
      /공동비번|세대비번|현관|#\d{4}/u.test(line) ||
      (/[가-힣]{3,}/u.test(line) && /\d{6,}/.test(line.replace(/\s/g, "")))
    );
  });

  if (siteLines.length) return siteLines.join("\n");

  return lines
    .filter((line) => /[가-힣]{2,}/u.test(line) && !KAKAO_JUNK_LINE_RE.test(line))
    .join("\n");
}

export function sanitizeOcrGarbage(line) {
  let s = String(line || "").trim();
  if (!s) return "";

  s = s.replace(/^(KT|SKT|LG\s*U\+)[\w\d:APM@&%.]+/i, "");
  s = s.replace(/^[\d:APM@&\w%.]{3,24}(?=[가-힣])/u, "");
  s = s.replace(/^[M@&:.\d]+(?=[가-힣])/u, "");
  s = s.replace(/[=]+$/, "").replace(/^[=]+/, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function scoreOcrCandidate(text) {
  const t = String(text || "");
  const hangul = (t.match(/[가-힣]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  const dongHo = /(\d{3,4})\s*동\s*(\d{2,4})\s*호/u.test(t) ? 120 : 0;
  let score = t.length + hangul * 3 + digits + dongHo;

  if (/^(KT|SKT|LG)/i.test(t)) score -= 200;
  if (/KT\d|@\d{3,}/.test(t) && !dongHo) score -= 120;
  if (latin > hangul * 1.5 && !dongHo) score -= 80;
  if (hangul >= 2 && /공동비번|세대비번/u.test(t)) score += 40;

  return score;
}

/**
 * 가장 긴 결과 우선 → 동·호·한글 가중치 → confidence
 */
export function pickBestOcrResult(results = []) {
  const valid = results.filter((r) => String(r?.text || r?.rawText || "").trim());
  if (!valid.length) return null;

  return valid
    .slice()
    .sort((a, b) => {
      const textA = filterSiteRelevantOcrText(postprocessOcrText(a.rawText || a.text).text);
      const textB = filterSiteRelevantOcrText(postprocessOcrText(b.rawText || b.text).text);
      const scoreDiff = scoreOcrCandidate(textB) - scoreOcrCandidate(textA);
      if (scoreDiff !== 0) return scoreDiff;
      const lenDiff = (textB.length || 0) - (textA.length || 0);
      if (lenDiff !== 0) return lenDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    })[0];
}
