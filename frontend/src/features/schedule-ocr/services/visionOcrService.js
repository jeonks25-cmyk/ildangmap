import { parseVisionSiteImage } from "../../../api/visionParseApi";
import { buildVisionOcrDiagFromVision } from "../../site-import/utils/visionOcrDiagModel";

/**
 * Gemini Vision API 호출 — 구조화/폼 적용 없이 JSON만 반환
 */
export async function fetchVisionSiteData(file) {
  const visionData = await parseVisionSiteImage(file);
  const visionOcrDiag = buildVisionOcrDiagFromVision(visionData);
  return { visionData, visionOcrDiag };
}
