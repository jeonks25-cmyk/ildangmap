/** 현장 운영 mock — 참여자·공유 대상·명함 */

export const MOCK_FIELD_PEOPLE = [
  {
    id: "p-kim",
    name: "김준호",
    status: "confirmed",
    birthYear: 1992,
    birthYearShort: "92",
    gender: "남",
    role: "조공",
    craft: "타일",
    region: "대전 서구",
    phone: "010-2345-6789",
    kakao: "kim_tile",
    experience: "타일 조공 4년",
    rating: 4.8,
    photo: "",
    tags: ["participant", "recent", "favorite"],
  },
  {
    id: "p-lee",
    name: "이서연",
    status: "confirmed",
    birthYear: 1997,
    birthYearShort: "97",
    gender: "여",
    role: "기공",
    craft: "필름",
    region: "대전 유성구",
    phone: "010-3456-7890",
    kakao: "lee_film",
    experience: "필름 기공 7년",
    rating: 4.9,
    photo: "",
    tags: ["participant", "recent"],
  },
  {
    id: "p-park",
    name: "박민수",
    status: "confirmed",
    birthYear: 1988,
    birthYearShort: "88",
    gender: "남",
    role: "기공",
    craft: "도배",
    region: "대전 중구",
    phone: "010-4567-8901",
    kakao: "park_wall",
    experience: "도배·필름 10년",
    rating: 4.7,
    photo: "",
    tags: ["favorite"],
  },
  {
    id: "p-choi",
    name: "최민호",
    status: "confirmed",
    birthYear: 1995,
    birthYearShort: "95",
    gender: "남",
    role: "조공",
    craft: "타일",
    region: "세종",
    phone: "010-5678-9012",
    kakao: "choi_tile",
    experience: "타일 조공 2년",
    rating: 4.5,
    photo: "",
    tags: ["recent"],
  },
  {
    id: "p-oyaji",
    name: "박오야지",
    status: "confirmed",
    birthYear: 1972,
    birthYearShort: "72",
    gender: "남",
    role: "오야지",
    craft: "현장 운영",
    region: "대전 서구",
    phone: "010-1111-2222",
    kakao: "oyaji_park",
    experience: "현장 운영 12년",
    rating: 4.9,
    photo: "",
    tags: [],
  },
];

const FIELD_PARTICIPANT_IDS = {
  1: ["p-kim", "p-lee"],
  2: ["p-lee", "p-park"],
  3: ["p-kim", "p-lee", "p-choi", "p-park", "p-oyaji"],
  4: ["p-park"],
  5: ["p-kim", "p-choi"],
};

export function getPersonById(personId) {
  return MOCK_FIELD_PEOPLE.find((p) => p.id === personId) || null;
}

export function getFieldParticipants(fieldId) {
  const ids = FIELD_PARTICIPANT_IDS[Number(fieldId)] || ["p-kim", "p-lee"];
  return ids.map((id) => getPersonById(id)).filter(Boolean);
}

export function getShareTargetGroups(fieldId) {
  const participants = getFieldParticipants(fieldId).filter((p) => p.role !== "오야지");
  const recent = MOCK_FIELD_PEOPLE.filter((p) => p.tags.includes("recent") && !participants.find((x) => x.id === p.id));
  const favorites = MOCK_FIELD_PEOPLE.filter((p) => p.tags.includes("favorite"));
  const all = MOCK_FIELD_PEOPLE.filter((p) => p.role !== "오야지");
  return { participants, recent, favorites, all };
}

export function buildDefaultBusinessCardFromProfile(profile, authUser) {
  const name = profile?.nickname || profile?.name || authUser?.nickname || "현장 사용자";
  return {
    id: "me",
    name,
    birthYearShort: "",
    gender: "",
    role: profile?.role || profile?.trade || "기공",
    craft: profile?.craft ? String(profile.craft) : "필름",
    region: profile?.homeRegion || profile?.region || "대전 서구",
    phone: profile?.phone || "010-0000-0000",
    kakao: profile?.kakaoId || "",
    experience: profile?.experienceYears
      ? `경력 ${profile.experienceYears}년`
      : profile?.intro || "현장 경력을 소개해 주세요.",
    rating: 4.8,
    photo: profile?.profileImage || authUser?.profileImage || "",
    tags: [],
  };
}
