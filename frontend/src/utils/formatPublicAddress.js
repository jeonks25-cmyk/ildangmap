/**
 * 공개용 주소 — 도로명까지만 노출, 번지·층·상세는 --- 처리
 * @param {string} address
 */
export function formatPublicAddress(address) {
  const raw = String(address ?? "").trim();
  if (!raw) return "";
  if (raw.includes("---")) return raw;

  const roadMatch = raw.match(/^(.+?(?:로|길|대로|번길|거리))\s*.*/);
  if (roadMatch) {
    return `${roadMatch[1].trim()} ---`;
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return raw;

  const detailPattern = /^[\d,.]+(?:층|호|동|상가|빌딩|타워|단지)?$|^\d+-\d+/;
  let cut = tokens.length;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (detailPattern.test(tokens[i]) || /^\d/.test(tokens[i])) {
      cut = i;
    } else {
      break;
    }
  }

  if (cut < tokens.length && cut > 0) {
    return `${tokens.slice(0, cut).join(" ")} ---`;
  }

  return raw;
}
