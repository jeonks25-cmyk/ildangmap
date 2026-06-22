export const SCHEDULE_OCR_ERROR = {
  ENGINE_FAILED: "engine_failed",
  EMPTY_TEXT: "empty_text",
  TABLE_PARSE_FAILED: "table_parse_failed",
  GENERATE_FAILED: "generate_failed",
  UNSUPPORTED_FORMAT: "unsupported_format",
  VISION_FAILED: "vision_failed",
};

export const SCHEDULE_OCR_STAGE = {
  SUCCESS: "success",
  CHAT_PARSED: "chat_parsed",
  TABLE_PARSED: "table_parsed",
  REVIEW_REQUIRED: "review_required",
  SITE_CANDIDATES: "site_candidates",
  VISION_REVIEW: "vision_review",
};

export function getScheduleOcrErrorMessage(code) {
  switch (code) {
    case SCHEDULE_OCR_ERROR.ENGINE_FAILED:
      return "이미지 내 텍스트를 읽지 못했습니다.";
    case SCHEDULE_OCR_ERROR.EMPTY_TEXT:
      return "이미지 내 텍스트를 읽지 못했습니다.";
    case SCHEDULE_OCR_ERROR.VISION_FAILED:
      return "AI Vision으로 이미지를 읽지 못했습니다. 설정에서 API 키를 확인하거나 다시 시도해 주세요.";
    case SCHEDULE_OCR_ERROR.TABLE_PARSE_FAILED:
      return "텍스트는 읽었지만 공정표 형식을 인식하지 못했습니다.";
    case SCHEDULE_OCR_ERROR.GENERATE_FAILED:
      return "공정표를 분석했지만 일정을 생성하지 못했습니다.";
    case SCHEDULE_OCR_ERROR.UNSUPPORTED_FORMAT:
      return "지원하지 않는 공정표 형식입니다.";
    default:
      return "이미지 처리 중 오류가 발생했습니다.";
  }
}
