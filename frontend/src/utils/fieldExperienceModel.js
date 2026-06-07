import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";

const COMMON_TAGS = [
  { id: "parking_easy", label: "주차 편했음", types: [MAP_ITEM_TYPE.PARKING] },
  { id: "free_parking", label: "무료주차 가능", types: [MAP_ITEM_TYPE.PARKING] },
  { id: "large_vehicle_ok", label: "대형차 가능", types: [MAP_ITEM_TYPE.PARKING] },
  { id: "restroom_ok", label: "화장실 사용 가능", types: [MAP_ITEM_TYPE.RESTROOM] },
  { id: "driver_restaurant", label: "기사식당", types: [MAP_ITEM_TYPE.RESTAURANT] },
  { id: "solo_ok", label: "혼밥 가능", types: [MAP_ITEM_TYPE.RESTAURANT] },
  { id: "early_open", label: "새벽 가능", types: [MAP_ITEM_TYPE.RESTAURANT, MAP_ITEM_TYPE.CONVENIENCE_STORE] },
  { id: "work_clothes_ok", label: "작업복 가능", types: [MAP_ITEM_TYPE.RESTAURANT] },
  { id: "entry_register", label: "출입 등록 필요", types: [MAP_ITEM_TYPE.ACCESS_INFO] },
  { id: "security_call", label: "경비실 호출", types: [MAP_ITEM_TYPE.ACCESS_INFO] },
  { id: "elevator_slow", label: "엘베 느림", types: [MAP_ITEM_TYPE.ELEVATOR, MAP_ITEM_TYPE.SITE_MEMO] },
  { id: "material_route_hard", label: "자재동선 불편", types: [MAP_ITEM_TYPE.MATERIAL_PICKUP, MAP_ITEM_TYPE.SITE_MEMO] },
  { id: "complaints_often", label: "민원 잦음", types: [MAP_ITEM_TYPE.SITE_MEMO] },
  { id: "good_meeting_spot", label: "만남장소 좋음", types: [MAP_ITEM_TYPE.MEETING_PLACE] },
  { id: "tools_quick", label: "소모품 빨리 해결", types: [MAP_ITEM_TYPE.HARDWARE_STORE] },
];

const ACTION_TAGS = {
  experience_save: ["parking_easy", "entry_register", "elevator_slow", "material_route_hard", "complaints_often"],
  parking_save: ["free_parking", "parking_easy", "large_vehicle_ok"],
  restroom_save: ["restroom_ok"],
  restaurant_save: ["driver_restaurant", "solo_ok", "early_open", "work_clothes_ok"],
  meeting_place_save: ["good_meeting_spot"],
  site_done: ["parking_easy", "driver_restaurant", "entry_register", "material_route_hard"],
};

function byIds(ids) {
  const set = new Set(ids || []);
  return COMMON_TAGS.filter((tag) => set.has(tag.id));
}

export function getExperienceHubKey({ fieldItem, item } = {}) {
  const relatedFieldId =
    item?.relation?.relatedFieldId ?? item?.relatedFieldId ?? fieldItem?.sourceId ?? fieldItem?.id ?? "";
  if (relatedFieldId !== "") return `field:${relatedFieldId}`;
  if (item?.sourceId) return `${item.type || "item"}:${item.sourceId}`;
  return item?.id || "field:unknown";
}

export function getQuickSaveTagsForContext({ item, actionKey } = {}) {
  if (actionKey && ACTION_TAGS[actionKey]) return byIds(ACTION_TAGS[actionKey]);
  if (!item?.type) return byIds(ACTION_TAGS.experience_save);

  const typeTags = COMMON_TAGS.filter((tag) => tag.types.includes(item.type));
  if (typeTags.length) return typeTags.slice(0, 5);
  return byIds(ACTION_TAGS.experience_save);
}

export function createFieldExperienceRecord({
  tag,
  memo = "",
  item,
  fieldItem,
  actionKey = "quick_save",
  createdBy = "oyaji-demo",
} = {}) {
  const now = new Date().toISOString();
  const label = typeof tag === "string" ? tag : tag?.label || "";
  const tagId = typeof tag === "string" ? tag : tag?.id || label;
  return {
    id: `experience:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    hubKey: getExperienceHubKey({ fieldItem, item }),
    fieldId: fieldItem?.sourceId ?? item?.relation?.relatedFieldId ?? item?.relatedFieldId ?? null,
    itemId: item?.id || null,
    itemType: item?.type || null,
    tagId,
    label,
    memo: String(memo || "").trim(),
    actionKey,
    createdAt: now,
    updatedAt: now,
    usageMeta: {
      savedFrom: item ? "map_item" : "fab",
      recentVisitor: true,
      usedCount: 1,
      confirmedCount: 1,
    },
  };
}

export function getCompletionExperiencePrompts(fieldItem) {
  if (!fieldItem) return [];
  return [
    "주차 위치 기록할까요?",
    "다음 팀을 위해 출입 정보를 남길까요?",
    "근처 추천식당이나 화장실을 저장할까요?",
  ];
}
