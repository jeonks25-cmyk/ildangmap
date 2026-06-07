import { CRAFT_LABEL } from "./jobModel";

/**
 * 방문 견적 MVP — 근처 오야지 카드 mock (가격·입찰 비공개, 방문/일정/코멘트만)
 * @param {{ craft: string, region: string, areaPyng: string, visitSlots: string[], memo: string }} input
 */
export function getMockNearbyOyajiMatches(input) {
  const craft = String(input?.craft || "film").toLowerCase();
  const craftLabel = CRAFT_LABEL[craft] || "현장";
  const region = String(input?.region || "대전 서구").trim() || "대전 서구";
  const area = String(input?.areaPyng || "").trim() || "24";

  return [
    {
      id: "ve-oyaji-1",
      name: "이현장",
      craft,
      craftLabel,
      distanceKm: 3.2,
      recentActivity: `${region} 인근 상가 · ${craftLabel} 마감 차수`,
      reputation: "응답 빠름 · 약속 시간 준수",
      visitAvailable: "내일 15:00 이후 방문 가능",
      expectedSchedule: "견적 확인 후 주중 1일 시공 조율",
      comment: `${area}평 기준 자재 톤은 현장에서 같이 보죠. 급하지 않게 맞춰드릴게요.`,
    },
    {
      id: "ve-oyaji-2",
      name: "박반장",
      craft,
      craftLabel,
      distanceKm: 5.8,
      recentActivity: "탄방동 현장 · 오전 집결 후 이동 중",
      reputation: "상가·아파트 혼합 경험 다수",
      visitAvailable: "모레 오전 방문 가능",
      expectedSchedule: "주말 전 실측·자재 확정",
      comment: "동선이 가까워 저녁 무렵 잠깐 들를 수도 있어요. 편한 연락처 남겨주세요.",
    },
    {
      id: "ve-oyaji-3",
      name: "최오야지",
      craft,
      craftLabel,
      distanceKm: 7.1,
      recentActivity: "유성구 도장 · 2차 마감 현장",
      reputation: "거래처 재의뢰 비중 높음",
      visitAvailable: "이번 주 금요일 오후",
      expectedSchedule: "방문 후 견적서 정리까지 1~2일",
      comment: "최저가 경쟁이 아니라, 방문 후 맞는 공법만 제안드릴게요.",
    },
  ];
}
