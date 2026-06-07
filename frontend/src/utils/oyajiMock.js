export const favoriteWorkersMock = [
  {
    id: "fav-worker-1",
    name: "김OO",
    role: "필름 기공",
    region: "대전 서구",
    note: "최근 12회 함께 작업 · 노쇼 0회",
  },
  {
    id: "fav-worker-2",
    name: "박OO",
    role: "도배 준기공",
    region: "대전 유성구",
    note: "급구 응답 빠름 · 당일 투입 가능",
  },
  {
    id: "fav-worker-3",
    name: "이OO",
    role: "전기 기공",
    region: "세종",
    note: "상가 현장 경험 많음 · 장기 가능",
  },
];

export const oyajiTrustProfileMock = {
  verificationBadges: ["현장 검증됨", "최근 활동중"],
  trustStats: [
    { id: "settlement-rate", label: "정산완료율", value: "100%" },
    { id: "recruit-success", label: "최근 팀 연결", value: "32회" },
    { id: "urgent-response", label: "긴급 연결 응답", value: "빠름" },
    { id: "recent-activity", label: "최근 활동", value: "활동중" },
  ],
  recentCoworkers: ["김OO", "박OO", "이OO"],
  note: "별점 대신 최근 정산 기록과 함께 작업한 이력으로 신뢰를 확인합니다.",
  monthlySettlement: {
    laborCost: "4,280,000원",
  },
  averageRate: {
    label: "대전 필름 기공 평균",
    value: "17.5만",
  },
};
