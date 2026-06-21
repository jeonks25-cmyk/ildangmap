/** 장소 신고·검수 임계값 */
export const PLACE_REPORT_THRESHOLDS = {
  PENDING_REVIEW: 3,
  AUTO_HIDE: 5,
  DELETE_CANDIDATE: 10,
};

/** 장소 검증 — 틀림 표시가 맞음보다 많을 때 자동 검수 */
export const PLACE_VERIFY_REVIEW_MIN_WRONG = 3;

export const PLACE_MODERATION_STATUS = {
  PUBLIC: "public",
  PENDING_REVIEW: "pending_review",
  HIDDEN: "hidden",
  DELETE_CANDIDATE: "delete_candidate",
  DELETED: "deleted",
};

export const PLACE_MODERATION_STATUS_LABEL = {
  public: "공개",
  pending_review: "검수 대기",
  hidden: "숨김",
  delete_candidate: "삭제 후보",
  deleted: "삭제됨",
};

export const PLACE_REPORT_REASONS = [
  "잘못된 위치",
  "잘못된 정보",
  "광고/홍보",
  "욕설/도배",
  "기타",
];

export const BOARD_POST_REPORT_REASONS = ["정보가 틀림", "광고성", "욕설"];
