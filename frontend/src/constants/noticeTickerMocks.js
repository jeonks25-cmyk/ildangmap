/** 지도 상단 공지 티커 — MVP mock (추후 관리자·API 연동) */
export const MAP_NOTICES = [
  {
    id: 4,
    text: "업데이트 v0.1.1 배포 완료",
  },
  {
    text: "장소 등록 기능이 추가되었습니다",
  },
  {
    text: "잘못된 장소는 신고해주세요",
  },
];

/** @deprecated MAP_NOTICES 사용 */
export const NOTICE_TICKER_ITEMS = MAP_NOTICES;

/** 공지 1건당 약 10초 (8~12초 권장 범위) */
export const NOTICE_MARQUEE_SECONDS_PER_ITEM = 10;

export const NOTICE_TICKER_PATH = "/settings/news";
