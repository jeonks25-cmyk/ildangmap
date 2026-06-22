import { formatVisionConfidence } from "./visionOcrDiagModel";

function displayOrNone(value) {
  const text = String(value ?? "").trim();
  return text || "없음";
}

/** Gemini Vision JSON → 사용자 확인용 라벨 목록 */
export function formatVisionOcrForDisplay(data = {}) {
  const apartmentName = String(data.apartmentName || "").trim();
  const building = String(data.building || "").trim();
  const unit = String(data.unit || "").trim();
  const title = String(data.title || "").trim();

  let siteLabel = title;
  if (!siteLabel && apartmentName && building && unit) {
    siteLabel = `${apartmentName} ${building}동 ${unit}호`;
  } else if (!siteLabel && apartmentName) {
    siteLabel = apartmentName;
  } else if (!siteLabel && building && unit) {
    siteLabel = `${building}동 ${unit}호`;
  }

  const workItems = Array.isArray(data.workItems)
    ? data.workItems.map((v) => String(v || "").trim()).filter(Boolean)
    : [];

  return [
    { key: "site", label: "현장명", value: siteLabel || "없음" },
    { key: "building", label: "동", value: displayOrNone(building) },
    { key: "unit", label: "호", value: displayOrNone(unit) },
    { key: "commonPassword", label: "공동비번", value: displayOrNone(data.commonPassword) },
    { key: "housePassword", label: "세대비번", value: displayOrNone(data.housePassword) },
    {
      key: "workItems",
      label: "작업내용",
      value: workItems.length ? workItems.join(" · ") : "없음",
    },
    { key: "confidence", label: "신뢰도", value: formatVisionConfidence(data.confidence) },
  ];
}

/** 개발자 패널용 — 서버가 넘긴 rawGeminiJson 우선 */
export function getVisionRawJsonForDev(data = {}) {
  const raw = String(data.rawGeminiJson || "").trim();
  if (raw) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  return JSON.stringify(data, null, 2);
}
