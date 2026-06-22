/** OCR·카톡 텍스트용 문자열 유사도 */

const APT_SUFFIX_RE = /(아파트|APT|apt|오피스텔|빌라|빌딩|타워|단지|리슈빌|캐슬|뷰)$/iu;
const NOISE_CHARS_RE = /[ㅇㅁㄴ\s·.,\-_/\\|｜:：*#]/gu;

export function stripApartmentSuffix(value) {
  return String(value || "")
    .replace(APT_SUFFIX_RE, "")
    .trim();
}

/** 비교용 정규화 — 공백·OCR 잡음·접미사 제거 */
export function normalizeForCompare(value) {
  return stripApartmentSuffix(String(value || ""))
    .replace(NOISE_CHARS_RE, "")
    .replace(/[a-z]/g, (ch) => ch.toUpperCase())
    .trim();
}

export function compactHangul(value) {
  return normalizeForCompare(value).replace(/\s+/g, "");
}

export function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const rows = s.length + 1;
  const cols = t.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

export function levenshteinRatio(a, b) {
  const left = compactHangul(a);
  const right = compactHangul(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const dist = levenshtein(left, right);
  return 1 - dist / Math.max(left.length, right.length);
}

/** bigram Dice 계수 */
export function bigramSimilarity(a, b) {
  const left = compactHangul(a);
  const right = compactHangul(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return levenshteinRatio(left, right);

  const grams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  };

  const ga = grams(left);
  const gb = grams(right);
  let overlap = 0;
  ga.forEach((count, gram) => {
    if (gb.has(gram)) overlap += Math.min(count, gb.get(gram));
  });
  const total = [...ga.values()].reduce((n, v) => n + v, 0) + [...gb.values()].reduce((n, v) => n + v, 0);
  return total ? (2 * overlap) / total : 0;
}

/** 부분 포함·편집거리·bigram 종합 */
export function fuzzySimilarity(a, b) {
  const left = compactHangul(a);
  const right = compactHangul(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  let containBoost = 0;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    containBoost = shorter / longer;
  }

  const lev = levenshteinRatio(left, right);
  const bi = bigramSimilarity(left, right);
  return Math.min(1, Math.max(containBoost * 0.92, lev * 0.55 + bi * 0.45));
}

/** 브랜드 토큰 fuzzy 탐지 */
export function findBestBrandMatch(text, brands, aliases = {}) {
  const compact = compactHangul(text);
  if (!compact) return null;

  let best = null;
  for (const brand of brands) {
    const canonical = aliases[brand] || brand;
    const brandCompact = compactHangul(canonical);
    if (!brandCompact) continue;

    let score = 0;
    if (compact.includes(brandCompact)) {
      score = 0.95;
    } else {
      score = fuzzySimilarity(compact, brandCompact);
      if (brandCompact.length >= 3 && compact.endsWith(brandCompact.slice(0, 2))) {
        score = Math.max(score, 0.72);
      }
    }

    if (!best || score > best.score) {
      best = { brand: canonical, raw: brand, score };
    }
  }
  return best && best.score >= 0.62 ? best : null;
}
