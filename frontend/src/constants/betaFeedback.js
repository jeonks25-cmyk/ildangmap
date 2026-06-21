/** 베타 피드백 폼 상수 */

export const BETA_FEEDBACK_CATEGORIES = [
  { value: "MAP", label: "지도·장소" },
  { value: "SCHEDULE", label: "일정·캘린더" },
  { value: "JOB_POST", label: "구인·현장" },
  { value: "LOGIN", label: "로그인·계정" },
  { value: "NOTIFICATION", label: "알림" },
  { value: "OTHER", label: "기타" },
];

export const BETA_FEEDBACK_SEVERITIES = [
  { value: "CRITICAL", label: "매우 불편함", hint: "바로 고쳐야 할 문제" },
  { value: "NORMAL", label: "불편함", hint: "사용에 방해가 됨" },
  { value: "SUGGESTION", label: "있으면 좋음", hint: "개선 아이디어" },
];

export const BETA_FEEDBACK_STATUSES = [
  { value: "NEW", label: "신규" },
  { value: "IN_REVIEW", label: "검토 중" },
  { value: "DONE", label: "완료" },
];

export const BETA_FEEDBACK_MAX_IMAGES = 3;
export const BETA_FEEDBACK_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
