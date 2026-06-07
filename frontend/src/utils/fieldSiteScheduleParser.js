import { CRAFT_LABEL } from "./jobModel";

/** 아파트·상가·건물명 추출 */
export function extractBuildingName(address) {
  const blob = String(address || "").trim();
  if (!blob) return "";
  const apt = blob.match(/([가-힣A-Za-z0-9]+(?:아파트|APT|apt))/i)?.[1];
  if (apt) return apt.replace(/\s+/g, "");
  const officetel = blob.match(/([가-힣A-Za-z0-9]+오피스텔)/)?.[1];
  if (officetel) return officetel.replace(/\s+/g, "");
  const villa = blob.match(/([가-힣A-Za-z0-9]+빌라)/)?.[1];
  if (villa) return villa.replace(/\s+/g, "");
  const shop = blob.match(/([가-힣A-Za-z0-9]+(?:상가|빌딩|타워|플라자|몰))/i)?.[1];
  if (shop) return shop.replace(/\s+/g, "");
  return "";
}

export function extractDongHo(address) {
  const blob = String(address || "");
  const dong = blob.match(/(\d{1,3}\s*동)/)?.[1]?.replace(/\s+/g, "") || "";
  const ho = blob.match(/(\d{2,4}\s*호)/)?.[1]?.replace(/\s+/g, "") || "";
  return { dong, ho };
}

/** 주소 + 공정 → 현장명 제안 목록 */
export function suggestSiteNamesFromAddress(address, craft) {
  const building = extractBuildingName(address);
  const { dong } = extractDongHo(address);
  const craftLabel = CRAFT_LABEL[craft] || (craft && String(craft).length <= 8 ? craft : "");
  const suggestions = [];

  if (building && craftLabel) {
    suggestions.push(`${building} ${craftLabel}`);
  }
  if (building && dong) {
    suggestions.push(`${building} ${dong}`);
  }
  if (building) {
    suggestions.push(building);
  }
  if (dong && craftLabel) {
    suggestions.push(`${dong} ${craftLabel}`);
  }

  const seen = new Set();
  return suggestions.filter((name) => {
    const key = name.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseWorkTimeParts(workTime) {
  const match = String(workTime || "").match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
  if (!match) return { start: "08:00", end: "17:00" };
  return { start: match[1], end: match[2] };
}

export function joinWorkTimeParts(start, end) {
  const s = String(start || "08:00").trim();
  const e = String(end || "17:00").trim();
  return `${s}~${e}`;
}

export function computeDurationDays(workDate, workDateEnd) {
  if (!workDate) return 1;
  if (!workDateEnd || workDateEnd === workDate) return 1;
  const start = new Date(`${workDate}T00:00:00`);
  const end = new Date(`${workDateEnd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}
