import { mockMe, mockUsers } from "../mocks/mockUsers";
import {
  AUTH_STORAGE_KEY,
  LEGACY_USER_STORAGE_KEY,
  USER_PROFILE_STORAGE_KEY,
} from "../constants/authStorage";
import { myProfileMock } from "../utils/myProfileMock";
import { favoriteWorkersMock, oyajiTrustProfileMock } from "../utils/oyajiMock";
import { isMockApiEnabled, runApiRequest } from "./client";

const USER_MODE_STORAGE_KEY = "user_mode_v1";
const USER_PREFS_STORAGE_KEY = "user_map_prefs_v1";
/** 숫자 id로 applicantUserId·현장 참여 매칭이 되도록 고정 (데모/테스트) */
const MOCK_KAKAO_USERS = [
  { id: "1", nickname: "", profileImage: "" },
  { id: "2", nickname: "", profileImage: "" },
  { id: "3", nickname: "", profileImage: "" },
];

function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function buildMockMeResponse() {
  const savedSession = readJsonStorage(AUTH_STORAGE_KEY, {});
  const savedProfile = readJsonStorage(USER_PROFILE_STORAGE_KEY, {});
  if (!savedSession?.isAuthenticated) {
    return null;
  }
  const displayNickname = String(savedProfile?.displayNickname || savedProfile?.nickname || "").trim();
  const nicknameSetupRequired =
    savedProfile?.nicknameSetupRequired === true || !displayNickname;
  const id = Number(savedProfile?.id || savedSession?.user?.id) || 1;
  return {
    id,
    displayNickname: displayNickname || null,
    profileImageUrl: savedProfile?.profileImage || savedSession?.user?.profileImage || "",
    nicknameSetupRequired,
    userType: (savedProfile?.userType || "worker").toUpperCase(),
    canChangeNickname: Boolean(savedProfile?.canChangeNickname ?? !nicknameSetupRequired),
    nicknameChangeAvailableAt: savedProfile?.nicknameChangeAvailableAt || null,
  };
}

/** @deprecated 내부 mock — profile-meta 등 레거시 */
function buildMockMe() {
  const savedSession = readJsonStorage(AUTH_STORAGE_KEY, {});
  const savedProfile = readJsonStorage(USER_PROFILE_STORAGE_KEY, {});
  const savedUser = readJsonStorage(LEGACY_USER_STORAGE_KEY, {});
  const savedPrefs = readJsonStorage(USER_PREFS_STORAGE_KEY, {});
  const savedMode = localStorage.getItem(USER_MODE_STORAGE_KEY);
  const explicit = savedProfile?.userType;
  const userType =
    explicit === "consumer" || explicit === "foreman" || explicit === "worker"
      ? explicit
      : savedMode === "oyaji"
        ? "foreman"
        : "worker";
  const fallback =
    userType === "consumer"
      ? { ...mockMe, userType: "consumer", role: "소비자", trade: savedProfile?.trade || mockMe.trade }
      : mockUsers.find((user) => user.userType === userType) || mockMe;

  const numericId = Number(savedProfile?.id);
  const fromSessionUser = Number(savedSession?.user?.id);
  const applicantUserId =
    Number.isFinite(numericId) && numericId > 0
      ? numericId
      : Number.isFinite(fromSessionUser) && fromSessionUser > 0
        ? fromSessionUser
        : 1;

  return {
    ...fallback,
    id: savedProfile?.id || savedSession?.user?.id || (userType === "foreman" ? "foreman-me" : "worker-me"),
    applicantUserId,
    provider: savedSession?.provider || "kakao-mock",
    name: savedProfile?.name || savedSession?.user?.nickname || savedUser?.nickname || fallback.name,
    userType,
    trade: savedProfile?.craft || savedPrefs?.craft || fallback.trade,
    role: savedProfile?.role || savedPrefs?.trade || fallback.role,
    region: savedProfile?.region || savedPrefs?.regionLabel || fallback.region,
    phone: savedUser?.phone || fallback.phone,
    profileImage: savedProfile?.profileImage || savedSession?.user?.profileImage || savedUser?.profileImage || fallback.profileImage,
  };
}

function pickMockKakaoUser() {
  const index = Math.floor(Math.random() * MOCK_KAKAO_USERS.length);
  return { ...(MOCK_KAKAO_USERS[index] || MOCK_KAKAO_USERS[0]) };
}

function buildWorkerProfileMeta(me) {
  return {
    ...myProfileMock,
    name: me?.name || myProfileMock.name,
    trade: me?.role || myProfileMock.trade,
    craft: me?.trade || myProfileMock.craft,
    region: me?.region || myProfileMock.region,
    profileImage: me?.profileImage || myProfileMock.profileImage,
  };
}

function buildForemanProfileMeta(me) {
  return {
    name: me?.name || "현장 오야지",
    trade: "오야지",
    craft: me?.trade || "film",
    region: me?.region || "대전 서구",
    profileImage: me?.profileImage || "",
    trustStats: oyajiTrustProfileMock.trustStats,
    verificationBadges: oyajiTrustProfileMock.verificationBadges,
    workHistory: [
      { id: "recruit-success", label: "팀 연결", value: "32회" },
      { id: "urgent-response", label: "긴급 대응", value: "빠름" },
      { id: "settlement-rate", label: "정산완료율", value: "100%" },
    ],
    recentCoworkers: oyajiTrustProfileMock.recentCoworkers,
    frequentRegions: [me?.region || "대전 서구", "세종", "청주"],
    intro: "현장 연결과 정산 흐름을 꾸준히 관리하는 오야지입니다.",
  };
}

export async function loginWithKakaoMock() {
  return runApiRequest({
    path: "/auth/kakao/mock",
    method: "POST",
    useMock: true,
    mock: () => pickMockKakaoUser(),
  });
}

function hasConfiguredLiveApi() {
  return Boolean(String(process.env.REACT_APP_API_BASE_URL || "").trim());
}

/**
 * GET /api/users/me — ApiResponse envelope 또는 본문 → 사용자 객체.
 * runApiRequest가 unwrap한 뒤에도 { data: { id } } 형태가 남는 경우를 처리한다.
 */
export function extractMePayload(payload) {
  if (payload == null || typeof payload !== "object") return null;

  const directId = payload.id ?? payload.userId;
  if (directId != null && directId !== "") return payload;

  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    const inner = payload.data;
    if (inner == null) return null;
    if (typeof inner === "object") {
      const innerId = inner.id ?? inner.userId;
      if (innerId != null && innerId !== "") return inner;
      if (
        Object.prototype.hasOwnProperty.call(inner, "data") &&
        inner.data != null &&
        typeof inner.data === "object"
      ) {
        return inner.data;
      }
      if (payload.success === true) return inner;
    }
  }

  return payload;
}

export async function getMe() {
  const raw = await runApiRequest({
    path: "/api/users/me",
    /** 백엔드 URL이 있으면 OAuth 세션 동기화는 항상 live API */
    useMock: isMockApiEnabled() && !hasConfiguredLiveApi(),
    mock: () => buildMockMeResponse(),
  });
  return extractMePayload(raw);
}

export async function getUsers() {
  return runApiRequest({
    path: "/users",
    useMock: isMockApiEnabled(),
    mock: () => mockUsers,
  });
}

export async function getProfileMeta() {
  return runApiRequest({
    path: "/users/me/profile-meta",
    useMock: isMockApiEnabled(),
    mock: () => {
      const me = buildMockMe();
      return me.userType === "foreman" ? buildForemanProfileMeta(me) : buildWorkerProfileMeta(me);
    },
  });
}

export async function getFavoriteWorkers() {
  return runApiRequest({
    path: "/users/favorites",
    useMock: isMockApiEnabled(),
    mock: () => favoriteWorkersMock,
  });
}

export async function getOyajiTrustProfile() {
  return runApiRequest({
    path: "/users/me/oyaji-trust",
    mock: () => oyajiTrustProfileMock,
    useMock: isMockApiEnabled(),
  });
}
