/** 지도 탭 — 오야지 운영 필터 칩 (jobBoardFilter와 별도) */

export const MAP_OPS_FILTER = {
  URGENT: "map_urgent",
  AFTERNOON: "map_afternoon",
  SHORTAGE: "map_shortage",
};

export const MAP_OPS_FILTER_CHIPS = [
  { key: MAP_OPS_FILTER.URGENT, label: "긴급" },
  { key: MAP_OPS_FILTER.AFTERNOON, label: "오후합류" },
  { key: MAP_OPS_FILTER.SHORTAGE, label: "인원부족" },
];
