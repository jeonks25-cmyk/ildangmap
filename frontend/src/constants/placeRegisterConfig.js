import { MAP_ITEM_TYPE } from "./mapItemTypes";

/**
 * 장소 등록 자동 탐색 설정 — 카테고리별 Kakao Places 검색.
 * 식당 우선 적용, 화장실·주차장 등 동일 로직 재사용.
 */
export const PLACE_REGISTER_CONFIG = {
  [MAP_ITEM_TYPE.RESTAURANT]: {
    categoryCode: "FD6",
    radiusM: 50,
    label: "식당",
    registerLabel: "식당 등록",
  },
  [MAP_ITEM_TYPE.RESTROOM]: {
    keyword: "화장실",
    radiusM: 50,
    label: "화장실",
    registerLabel: "화장실 등록",
  },
  [MAP_ITEM_TYPE.PARKING]: {
    keyword: "주차장",
    radiusM: 50,
    label: "주차",
    registerLabel: "주차 등록",
  },
  [MAP_ITEM_TYPE.FIELD]: {
    radiusM: 50,
    label: "아파트",
    registerLabel: "아파트 등록",
    addressOnly: true,
  },
  [MAP_ITEM_TYPE.MEETING_PLACE]: {
    keyword: "만남",
    radiusM: 50,
    label: "만남장소",
    registerLabel: "만남장소 등록",
  },
};

export function getPlaceRegisterConfig(type) {
  return PLACE_REGISTER_CONFIG[type] || null;
}
