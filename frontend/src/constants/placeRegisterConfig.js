import { MAP_ITEM_TYPE } from "./mapItemTypes";

/** 장소 등록 UX 모드 */
export const PLACE_REGISTER_MODE = {
  /** 식당 — POI 자동 탐색, 식당명 필수 */
  AUTO_REQUIRED: "auto_required",
  /** 주차 — 자동 시도, 실패 시 수동 허용 */
  AUTO_OPTIONAL: "auto_optional",
  /** 화장실 — 수동 입력 우선, 자동 탐색 생략 */
  MANUAL_FIRST: "manual_first",
  /** 아파트 등 — 주소만 */
  ADDRESS_ONLY: "address_only",
};

export const PLACE_AUTO_SEARCH_FAIL_MESSAGE = "근처 장소를 찾지 못했습니다. 직접 입력해주세요.";

/**
 * 장소 등록 자동 탐색 설정 — 카테고리별 Kakao Places 검색·UX.
 */
export const PLACE_REGISTER_CONFIG = {
  [MAP_ITEM_TYPE.RESTAURANT]: {
    mode: PLACE_REGISTER_MODE.AUTO_REQUIRED,
    categoryCode: "FD6",
    radiusM: 50,
    label: "식당",
    registerLabel: "식당 등록",
    titlePlaceholder: "식당 이름",
    autoSearch: true,
  },
  [MAP_ITEM_TYPE.PARKING]: {
    mode: PLACE_REGISTER_MODE.AUTO_OPTIONAL,
    categoryCode: "PK6",
    keyword: "주차장",
    radiusM: 50,
    label: "주차",
    registerLabel: "주차 등록",
    titlePlaceholder: "예: 현장 뒤 공터, 지하주차장 입구",
    descriptionPlaceholder: "주차 방법·비용 메모 (선택)",
    autoSearch: true,
  },
  [MAP_ITEM_TYPE.RESTROOM]: {
    mode: PLACE_REGISTER_MODE.AUTO_OPTIONAL,
    keyword: "화장실",
    radiusM: 50,
    label: "화장실",
    registerLabel: "화장실 등록",
    titlePlaceholder: "예: 1층 경비실 옆",
    locationHintPlaceholder: "예: GS25 화장실 사용 가능, 건물 뒤편",
    locationHintExamples: ["1층 경비실 옆", "GS25 화장실 사용 가능", "건물 뒤편"],
    showLocationHint: true,
    autoSearch: true,
  },
  [MAP_ITEM_TYPE.FIELD]: {
    mode: PLACE_REGISTER_MODE.AUTO_OPTIONAL,
    keyword: "아파트",
    radiusM: 80,
    label: "아파트",
    registerLabel: "아파트 등록",
    titlePlaceholder: "아파트·단지 이름",
    autoSearch: true,
  },
  [MAP_ITEM_TYPE.MEETING_PLACE]: {
    mode: PLACE_REGISTER_MODE.AUTO_OPTIONAL,
    keyword: "만남",
    radiusM: 50,
    label: "만남장소",
    registerLabel: "만남장소 등록",
    titlePlaceholder: "만남 장소 이름",
    autoSearch: true,
  },
};

export function getPlaceRegisterConfig(type) {
  return PLACE_REGISTER_CONFIG[type] || null;
}

/** + 장소 FAB → 유형 선택 시트 옵션 */
export const PLACE_CATEGORY_OPTIONS = [
  { type: MAP_ITEM_TYPE.RESTAURANT, label: "식당", desc: "근처 식당 자동 찾기" },
  { type: MAP_ITEM_TYPE.RESTROOM, label: "화장실", desc: "근처 화장실 자동 찾기" },
  { type: MAP_ITEM_TYPE.PARKING, label: "주차장", desc: "자동 찾기 또는 직접 입력" },
  { type: MAP_ITEM_TYPE.FIELD, label: "아파트", desc: "근처 아파트 자동 찾기" },
];
