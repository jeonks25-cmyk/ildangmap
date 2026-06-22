import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AUTH_STORAGE_KEY,
  LEGACY_USER_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  USER_PROFILE_STORAGE_KEY,
} from "../constants/authStorage";
import {
  extractMePayload,
  getFavoriteWorkers,
  getMe,
  getOyajiTrustProfile,
  getProfileMeta,
  loginWithKakaoMock as loginWithKakaoMockApi,
  updateUserProfile,
} from "../api/userApi";
import { fetchOAuthConfigDiagnostics, getKakaoOAuthStartUrl, getKakaoRedirectMustMatch, getSpringOAuthApiBase, logoutSession, probeSpringOAuthBackend } from "../api/authApi";
import { changeNickname, setInitialNickname } from "../api/nicknameApi";
import { getApiBaseUrl, isMockApiEnabled, isNetworkError } from "../api/client";
import { profileToApiPayload, normalizeBusinessCardFields, BUSINESS_CARD_FIELD_KEYS } from "../models/profileModel";
import {
  createSafeJsonStorage,
  isAuthError,
  pickPersistedStoreState,
  readJsonStorage,
  removeStorageKey,
  runAsyncStoreAction,
  writeJsonStorage,
} from "./storeUtils";
import { useContactsStore } from "./useContactsStore";
import { useSettlementStore } from "./useSettlementStore";
import { useSiteBoardStore } from "./useSiteBoardStore";
import { useNotificationStore } from "./useNotificationStore";
import { useUiStore } from "./useUiStore";
import { validateNicknameInput } from "../utils/displayNickname";
import { authDiag, authDiagStoreSnapshot } from "../utils/authDiag";
import { formatRegionsLabel, getPrimaryRegion, normalizeActivityRegion, normalizeActivityRegions } from "../constants/activityRegions";
import { CRAFT_KEYS } from "../utils/jobModel";

const STORE_KEY = "ildangmap_user_store_v1";

let refreshCurrentUserInFlight = null;

const HYDRATION_WAIT_MS = 3000;

function waitForUserStoreHydration(timeoutMs = HYDRATION_WAIT_MS) {
  const persistApi = useUserStore.persist;
  if (persistApi.hasHydrated()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (hydrated) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(hydrated));
    };

    const unsub = persistApi.onFinishHydration(() => {
      if (typeof unsub === "function") unsub();
      finish(true);
    });

    // hasHydrated 체크와 리스너 등록 사이 레이스
    if (persistApi.hasHydrated()) {
      if (typeof unsub === "function") unsub();
      finish(true);
      return;
    }

    window.setTimeout(() => {
      if (typeof unsub === "function") unsub();
      finish(persistApi.hasHydrated());
    }, timeoutMs);
  });
}
const USER_MODE_STORAGE_KEY = "user_mode_v1";
const USER_PREFS_STORAGE_KEY = "user_map_prefs_v1";
const VALID_CRAFTS = CRAFT_KEYS;
const VALID_ROLES = ["조공", "준기공", "기공", "오야지", "소비자", "전체"];

function createDefaultSession() {
  return {
    isAuthenticated: false,
    provider: "",
    accessToken: "",
    user: null,
  };
}

function createDefaultProfile() {
  return {
    id: "",
    applicantUserId: null,
    name: "",
    /** 현장 실명 네트워크 — 명함/연락처/참여자/작성자/채팅 공통 표시 기준 */
    realName: "",
    birthYear: null,
    residence: "",
    careerYears: null,
    /** 게시판·공개 표시용 활동명 */
    nickname: "",
    displayNickname: "",
    nicknameSetupRequired: false,
    canChangeNickname: true,
    nicknameChangeAvailableAt: "",
    profileImage: "",
    loginProvider: "",
    userType: "",
    /** 기술자 / 오야지 / 소비자 — 하단 탭·배지 UX */
    shellPersona: "",
    needsPersonaChoice: false,
    trade: "전체",
    region: "대전",
    regions: ["대전"],
    craft: "film",
    role: "",
    experienceYears: null,
    setupCompleted: false,
    referredByUserId: null,
    referredByContactId: null,
    referredByGroupId: null,
    inviteAppliedAt: null,
    desiredPay: null,
    phone: "",
    ...createEmptyBusinessCardFieldsFromModel(),
  };
}

function createEmptyBusinessCardFieldsFromModel() {
  return normalizeBusinessCardFields({});
}

function createDefaultPrefs() {
  return {
    regionLabel: "대전",
    trade: "전체",
    craft: null,
  };
}

function createDefaultProfileMeta() {
  return {
    name: "",
    trade: "기공",
    craft: "film",
    region: "대전",
    regions: ["대전"],
    profileImage: "",
    trustStats: [],
    verificationBadges: [],
    workHistory: [],
    recentCoworkers: [],
    frequentRegions: [],
    intro: "",
  };
}

/** extras API mock/원격 응답 — 로컬에 저장한 지역·소개·공종을 덮어쓰지 않음 */
function mergeProfileMetaWithLocal(state, remoteMeta) {
  const local =
    state.profileMeta && typeof state.profileMeta === "object" ? state.profileMeta : createDefaultProfileMeta();
  const remote =
    remoteMeta && typeof remoteMeta === "object" ? remoteMeta : createDefaultProfileMeta();
  const profile = state.profile && typeof state.profile === "object" ? state.profile : {};
  const regions = normalizeActivityRegions(
    profile.regions ?? local.regions ?? remote.regions ?? remote.region
  );
  const region = getPrimaryRegion(regions);
  const intro = String(local.intro ?? "").trim() ? local.intro : remote.intro;
  const craft = profile.craft ?? local.craft ?? remote.craft;
  return {
    ...remote,
    regions,
    region,
    craft,
    intro,
  };
}

function createDefaultOyajiTrustProfile() {
  return {
    verificationBadges: [],
    trustStats: [],
    recentCoworkers: [],
    note: "",
    monthlySettlement: {
      laborCost: "0원",
    },
    averageRate: {
      label: "",
      value: "",
    },
  };
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return createDefaultSession();
  return {
    isAuthenticated: raw.isAuthenticated === true,
    provider: typeof raw.provider === "string" ? raw.provider : "",
    accessToken: typeof raw.accessToken === "string" ? raw.accessToken : "",
    user: raw.user && typeof raw.user === "object" ? raw.user : null,
  };
}

function normalizePrefs(raw) {
  const defaults = createDefaultPrefs();
  if (!raw || typeof raw !== "object") return defaults;
  const regionLabel = normalizeActivityRegion(raw.regionLabel, defaults.regionLabel);
  const trade = typeof raw.trade === "string" && VALID_ROLES.includes(raw.trade) ? raw.trade : defaults.trade;
  const craft =
    raw.craft == null || VALID_CRAFTS.includes(raw.craft)
      ? raw.craft ?? null
      : defaults.craft;
  return { regionLabel, trade, craft };
}

function normalizeProfile(raw) {
  const defaults = createDefaultProfile();
  if (!raw || typeof raw !== "object") return defaults;
  const rawUserType = raw.userType;
  const userType =
    rawUserType === "foreman" || rawUserType === "FOREMAN"
      ? "foreman"
      : rawUserType === "consumer" || rawUserType === "CONSUMER"
        ? "consumer"
        : rawUserType === "worker" || rawUserType === "WORKER"
          ? "worker"
          : defaults.userType;
  const idString = raw.id != null && raw.id !== "" ? String(raw.id) : defaults.id;
  const applicantFromField = Number(raw.applicantUserId);
  const applicantFromId = Number(raw.id);
  const applicantUserId = Number.isFinite(applicantFromField) && applicantFromField > 0
    ? applicantFromField
    : Number.isFinite(applicantFromId) && applicantFromId > 0
      ? applicantFromId
      : defaults.applicantUserId;
  const realNameRaw = typeof raw.realName === "string" ? raw.realName.trim() : "";
  const nameRaw = typeof raw.name === "string" ? raw.name.trim() : "";
  const realName = realNameRaw || nameRaw || defaults.realName;
  const name = nameRaw || realName || defaults.name;
  const birthYear = Number.isFinite(Number(raw.birthYear)) && Number(raw.birthYear) > 1900 ? Number(raw.birthYear) : defaults.birthYear;
  const regions = normalizeActivityRegions(raw.regions ?? raw.region ?? raw.residence, defaults.regions);
  const region = getPrimaryRegion(regions);
  const residence = formatRegionsLabel(regions, { emptyLabel: "" }) || defaults.residence;
  const careerYears = Number.isFinite(Number(raw.careerYears))
    ? Number(raw.careerYears)
    : Number.isFinite(Number(raw.experienceYears))
      ? Number(raw.experienceYears)
      : defaults.careerYears;
  const experienceYears = Number.isFinite(Number(raw.experienceYears))
    ? Number(raw.experienceYears)
    : careerYears;
  const nicknameRaw = typeof raw.nickname === "string" ? raw.nickname.trim() : "";
  const displayNicknameRaw = typeof raw.displayNickname === "string" ? raw.displayNickname.trim() : nicknameRaw;
  const nickname = displayNicknameRaw || defaults.nickname;
  const nicknameSetupRequired = raw.nicknameSetupRequired === true;
  const setupCompleted = !nicknameSetupRequired && Boolean(displayNicknameRaw);
  const tradeStr = typeof raw.trade === "string" && raw.trade.trim() ? raw.trade.trim() : defaults.trade;
  const shellRaw = raw.shellPersona;
  let shellPersona =
    shellRaw === "foreman" || shellRaw === "technician" || shellRaw === "consumer" ? shellRaw : "";
  if (!shellPersona) {
    if (userType === "foreman") shellPersona = "foreman";
    else if (userType === "consumer") shellPersona = "consumer";
    else if (userType === "worker") shellPersona = "technician";
  }
  return {
    id: idString,
    applicantUserId,
    name,
    realName,
    birthYear,
    residence,
    careerYears,
    experienceYears,
    nickname,
    displayNickname: displayNicknameRaw || nickname,
    nicknameSetupRequired,
    canChangeNickname: true,
    nicknameChangeAvailableAt: defaults.nicknameChangeAvailableAt,
    profileImage: typeof raw.profileImage === "string" ? raw.profileImage : defaults.profileImage,
    loginProvider: typeof raw.loginProvider === "string" ? raw.loginProvider : defaults.loginProvider,
    userType,
    shellPersona,
    needsPersonaChoice: raw.needsPersonaChoice === true,
    trade: tradeStr,
    regions,
    region,
    desiredPay: Number.isFinite(Number(raw.desiredPay))
      ? Number(raw.desiredPay)
      : Number.isFinite(Number(raw.basePay))
        ? Number(raw.basePay)
        : defaults.desiredPay,
    craft: VALID_CRAFTS.includes(raw.craft) ? raw.craft : defaults.craft,
    role: typeof raw.role === "string" && VALID_ROLES.includes(raw.role) ? raw.role : defaults.role,
    phone: typeof raw.phone === "string" ? raw.phone.trim() : defaults.phone,
    setupCompleted,
    referredByUserId:
      Number.isFinite(Number(raw.referredByUserId)) && Number(raw.referredByUserId) > 0
        ? Number(raw.referredByUserId)
        : defaults.referredByUserId,
    referredByContactId:
      typeof raw.referredByContactId === "string" && raw.referredByContactId.trim()
        ? raw.referredByContactId.trim()
        : defaults.referredByContactId,
    referredByGroupId:
      typeof raw.referredByGroupId === "string" && raw.referredByGroupId.trim()
        ? raw.referredByGroupId.trim()
        : defaults.referredByGroupId,
    inviteAppliedAt: typeof raw.inviteAppliedAt === "string" ? raw.inviteAppliedAt : defaults.inviteAppliedAt,
    ...normalizeBusinessCardFields(raw),
  };
}

/** GET /users/me 응답 → Zustand (세션이 진실 소스) */
function hasConfiguredLiveApi() {
  if (String(getApiBaseUrl() || "").trim() || String(process.env.REACT_APP_API_BASE_URL || "").trim()) {
    return true;
  }
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return true;
  }
  return false;
}

function meProfileDetailPatch(normalizedMe) {
  if (!normalizedMe || typeof normalizedMe !== "object") return {};
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "birthYear")) {
    patch.birthYear =
      Number.isFinite(Number(normalizedMe.birthYear)) && Number(normalizedMe.birthYear) > 1900
        ? Number(normalizedMe.birthYear)
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "craft") && normalizedMe.craft) {
    patch.craft = String(normalizedMe.craft);
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "experienceYears")) {
    const years =
      Number.isFinite(Number(normalizedMe.experienceYears)) && Number(normalizedMe.experienceYears) >= 0
        ? Number(normalizedMe.experienceYears)
        : null;
    patch.experienceYears = years;
    patch.careerYears = years;
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "desiredPay")) {
    patch.desiredPay =
      Number.isFinite(Number(normalizedMe.desiredPay)) && Number(normalizedMe.desiredPay) > 0
        ? Number(normalizedMe.desiredPay)
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "regions")) {
    const regions = normalizeActivityRegions(normalizedMe.regions);
    patch.regions = regions;
    patch.region = getPrimaryRegion(regions);
    patch.residence = formatRegionsLabel(regions, { emptyLabel: "" });
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "phone")) {
    patch.phone = String(normalizedMe.phone || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(normalizedMe, "intro")) {
    patch.intro = String(normalizedMe.intro || "").trim();
  }
  const cardPatch = normalizeBusinessCardFields(normalizedMe);
  for (const key of BUSINESS_CARD_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(normalizedMe, key)) {
      patch[key] = cardPatch[key];
    }
  }
  return patch;
}

/** 서버 /me에 비어 있고 로컬 persist에만 있던 프로필 → PATCH 업로드 */
async function migrateLocalProfileToServer(get, legacyProfile, legacyMeta) {
  if (!get().session?.isAuthenticated) return;
  const current = get().profile;
  const meta = get().profileMeta || createDefaultProfileMeta();
  const patch = {};
  if (!current.birthYear && legacyProfile?.birthYear) patch.birthYear = legacyProfile.birthYear;
  if (!current.craft && legacyProfile?.craft) patch.craft = legacyProfile.craft;
  if (!current.desiredPay && legacyProfile?.desiredPay) patch.desiredPay = legacyProfile.desiredPay;
  if (
    (!Array.isArray(current.regions) || !current.regions.length) &&
    Array.isArray(legacyProfile?.regions) &&
    legacyProfile.regions.length
  ) {
    patch.regions = legacyProfile.regions;
  }
  if (!current.phone && legacyProfile?.phone) patch.phone = legacyProfile.phone;
  const intro = String(meta.intro || legacyMeta?.intro || "").trim();
  const legacyIntro = String(legacyMeta?.intro || legacyProfile?.intro || "").trim();
  if (!intro && legacyIntro) patch.intro = legacyIntro;
  for (const key of BUSINESS_CARD_FIELD_KEYS) {
    if (!current[key] && legacyProfile?.[key]) patch[key] = legacyProfile[key];
  }
  if (!Object.keys(patch).length) return;
  await get().saveProfileDetails(patch);
}

function applyMeResponse(state, me, providerOverride) {
  try {
    console.log("[AUTH-DIAG] applyMeResponse me JSON", JSON.stringify(me, null, 2));
  } catch {
    console.log("[AUTH-DIAG] applyMeResponse me JSON (non-serializable)", me);
  }
  const normalizedMe = extractMePayload(me);
  try {
    console.log("[AUTH-DIAG] applyMeResponse normalized JSON", JSON.stringify(normalizedMe, null, 2));
  } catch {
    console.log("[AUTH-DIAG] applyMeResponse normalized JSON (non-serializable)", normalizedMe);
  }
  const userId = normalizedMe?.id ?? normalizedMe?.userId;
  authDiag("applyMeResponse", {
    meRaw: me,
    meId: me?.id,
    meDataId: me?.data?.id,
    normalizedMe,
    userId,
    providerOverride,
  });
  if (userId == null || userId === "") {
    authDiag("applyMeResponse → guest (no userId)");
    return {
      authReady: true,
      meBootstrapLoading: false,
      meVerified: true,
      session: normalizeSession({
        ...state.session,
        isAuthenticated: false,
        user: null,
        accessToken: "",
      }),
      profile: normalizeProfile(createDefaultProfile()),
    };
  }
  const userIdStr = String(userId);
  const displayNickname = String(normalizedMe.displayNickname || "").trim();
  const nicknameSetupRequired = Boolean(normalizedMe.nicknameSetupRequired);
  const applicantId = Number(normalizedMe.id ?? normalizedMe.userId);
  const provider = providerOverride || state.session.provider || state.profile.loginProvider || "kakao";
  const profileImage = normalizedMe.profileImageUrl || state.profile.profileImage || "";
  const profileDetailPatch = meProfileDetailPatch(normalizedMe);
  const nextProfileMeta = Object.prototype.hasOwnProperty.call(normalizedMe, "intro")
    ? {
        ...(state.profileMeta && typeof state.profileMeta === "object" ? state.profileMeta : createDefaultProfileMeta()),
        intro: String(normalizedMe.intro || "").trim(),
        ...(profileDetailPatch.regions
          ? { regions: profileDetailPatch.regions, region: profileDetailPatch.region }
          : {}),
        ...(profileDetailPatch.craft ? { craft: profileDetailPatch.craft } : {}),
      }
    : state.profileMeta;
  authDiag("applyMeResponse → authenticated", { userId: userIdStr, provider });
  return {
    authReady: true,
    meBootstrapLoading: false,
    meVerified: true,
    session: normalizeSession({
      isAuthenticated: true,
      provider,
      accessToken: state.session.accessToken || "",
      user: {
        id: userIdStr,
        nickname: displayNickname,
        profileImage,
      },
    }),
    profile: normalizeProfile({
      ...state.profile,
      id: userIdStr,
      applicantUserId: Number.isFinite(applicantId) && applicantId > 0 ? applicantId : state.profile.applicantUserId,
      nickname: displayNickname,
      displayNickname,
      profileImage,
      nicknameSetupRequired,
      setupCompleted: !nicknameSetupRequired && Boolean(displayNickname),
      canChangeNickname: true,
      nicknameChangeAvailableAt: "",
      userType: normalizedMe.userType ? String(normalizedMe.userType).toLowerCase() : state.profile.userType,
      loginProvider: provider,
      ...profileDetailPatch,
    }),
    profileMeta: nextProfileMeta,
    prefs: normalizePrefs({
      ...state.prefs,
      ...(profileDetailPatch.region ? { regionLabel: profileDetailPatch.region } : {}),
      ...(profileDetailPatch.craft ? { craft: profileDetailPatch.craft } : {}),
    }),
  };
}

function normalizeUserMode(value) {
  return value === "oyaji" ? "oyaji" : "worker";
}

function readLegacyUserState() {
  const session = normalizeSession(readJsonStorage(AUTH_STORAGE_KEY, null));
  const profile = normalizeProfile(readJsonStorage(USER_PROFILE_STORAGE_KEY, null));
  const prefs = normalizePrefs(readJsonStorage(USER_PREFS_STORAGE_KEY, null));
  const legacyUser = readJsonStorage(LEGACY_USER_STORAGE_KEY, {});
  const rawMode = (() => {
    try {
      return localStorage.getItem(USER_MODE_STORAGE_KEY);
    } catch (_) {
      return "worker";
    }
  })();
  const userMode = normalizeUserMode(rawMode);
  const setupCompleted = (() => {
    const displayNick = String(profile.displayNickname || profile.nickname || "").trim();
    const setupRequired = profile.nicknameSetupRequired === true || !displayNick;
    return !setupRequired && Boolean(displayNick);
  })();

  return {
    session,
    profile: normalizeProfile({
      ...profile,
      name: profile.name || legacyUser?.nickname || "",
      nickname: profile.nickname || profile.name || legacyUser?.nickname || "",
      profileImage: profile.profileImage || legacyUser?.profileImage || "",
      loginProvider: profile.loginProvider || legacyUser?.loginProvider || session.provider || "",
      setupCompleted,
    }),
    prefs,
    userMode,
    profileMeta: createDefaultProfileMeta(),
    favoriteWorkers: [],
    oyajiTrustProfile: createDefaultOyajiTrustProfile(),
    loading: false,
    error: "",
    extrasLoading: false,
    extrasError: "",
    extrasLoaded: false,
    authReady: false,
    meBootstrapLoading: false,
    /** /users/me 동기화 완료 — persist만으로 로그인 판정하지 않음 */
    meVerified: false,
  };
}

function syncLegacyUserState(state) {
  if (!state) return;
  const session = normalizeSession(state.session);
  const profile = normalizeProfile(state.profile);
  const prefs = normalizePrefs(state.prefs);
  const userMode = normalizeUserMode(state.userMode);
  writeJsonStorage(AUTH_STORAGE_KEY, session);
  writeJsonStorage(USER_PROFILE_STORAGE_KEY, profile);
  writeJsonStorage(USER_PREFS_STORAGE_KEY, prefs);
  writeJsonStorage(LEGACY_USER_STORAGE_KEY, {
      nickname: profile.nickname || "",
    profileImage: profile.profileImage,
    loginProvider: profile.loginProvider,
  });
  try {
    localStorage.setItem(USER_MODE_STORAGE_KEY, userMode);
    if (profile.setupCompleted) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    } else {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch (_) {
    /* noop */
  }
}

function createInitialState() {
  const legacy = readLegacyUserState();
  return {
    session: legacy.session,
    profile: legacy.profile,
    prefs: legacy.prefs,
    userMode: legacy.userMode,
    authReady: legacy.authReady,
    meBootstrapLoading: legacy.meBootstrapLoading,
    meVerified: false,
  };
}

export const useUserStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),

      setSession: (patch) =>
        set((state) => ({
          session: normalizeSession({
            ...state.session,
            ...(typeof patch === "function" ? patch(state.session) : patch),
          }),
        })),

      refreshCurrentUser: async (options = {}) => {
        if (options.waitForHydration) {
          await waitForUserStoreHydration(options.hydrationTimeoutMs);
        }
        if (refreshCurrentUserInFlight && !options.force) {
          authDiag("refreshCurrentUser reuse in-flight");
          return refreshCurrentUserInFlight;
        }
        const run = (async () => {
          try {
            authDiag("refreshCurrentUser start", { force: Boolean(options.force) });
            const result = await runAsyncStoreAction({
              set,
              loadingKey: "meBootstrapLoading",
              action: () => getMe(),
              defaultErrorMessage: "사용자 정보를 불러오지 못했습니다.",
              onSuccess: (state, me) => {
                try {
                  console.log("[AUTH-DIAG] refreshCurrentUser getMe result JSON", JSON.stringify(me, null, 2));
                } catch {
                  console.log("[AUTH-DIAG] refreshCurrentUser getMe result JSON (non-serializable)", me);
                }
                authDiag("refreshCurrentUser getMe result", me);
                const legacyProfile = { ...state.profile };
                const legacyMeta =
                  state.profileMeta && typeof state.profileMeta === "object"
                    ? { ...state.profileMeta }
                    : createDefaultProfileMeta();
                const patch = applyMeResponse(state, me);
                const normalizedMe = extractMePayload(me);
                const syncUserId = normalizedMe?.id ?? normalizedMe?.userId;
                queueMicrotask(async () => {
                  if (syncUserId != null && syncUserId !== "") {
                    try {
                      await migrateLocalProfileToServer(get, legacyProfile, legacyMeta);
                    } catch (_) {
                      /* profile migration best-effort */
                    }
                    await useContactsStore.getState().bootstrapContacts(syncUserId).catch(() => {
                      /* contactsError in store */
                    });
                    await useSettlementStore.getState().bootstrapSchedules(syncUserId).catch(() => {
                      /* schedulesError in store */
                    });
                    await useSiteBoardStore.getState().bootstrapSiteBoards(syncUserId).catch(() => {
                      /* siteBoardError in store */
                    });
                  } else {
                    useContactsStore.getState().resetContacts();
                    useSettlementStore.getState().resetSchedules();
                    useSiteBoardStore.getState().resetSiteBoards();
                    useNotificationStore.getState().resetNotifications();
                  }
                });
                return patch;
              },
              onError: (state, error) => {
                authDiag("refreshCurrentUser error", {
                  message: error?.message,
                  isAuthError: isAuthError(error),
                });
                const next = { authReady: true, meBootstrapLoading: false, meVerified: true };
                if (isAuthError(error)) {
                  queueMicrotask(() => {
                    useContactsStore.getState().resetContacts();
                    useSettlementStore.getState().resetSchedules();
                    useSiteBoardStore.getState().resetSiteBoards();
                    useNotificationStore.getState().resetNotifications();
                  });
                  return {
                    ...next,
                    session: normalizeSession({
                      ...state.session,
                      isAuthenticated: false,
                      user: null,
                    }),
                    profile: normalizeProfile({
                      ...state.profile,
                      applicantUserId: null,
                    }),
                  };
                }
                return next;
              },
            });
            authDiagStoreSnapshot(get(), "refreshCurrentUser done");
            authDiag("refreshCurrentUser me payload", result);
            return result;
          } finally {
            refreshCurrentUserInFlight = null;
          }
        })();
        refreshCurrentUserInFlight = run;
        return run;
      },

      startKakaoOAuthLogin: async () => {
        if (typeof window === "undefined") return false;

        const url = getKakaoOAuthStartUrl();
        const kakaoRedirectMustMatch = getKakaoRedirectMustMatch();

        console.log("[AUTH-DIAG] startKakaoOAuthLogin enter", {
          url,
          origin: window.location.origin,
          apiBase: getSpringOAuthApiBase() || "(same-origin)",
        });
        console.log("[AUTH-DIAG] kakaoRedirectMustMatch", kakaoRedirectMustMatch);

        authDiag("startKakaoOAuthLogin", {
          url,
          origin: window.location.origin,
          apiBase: getSpringOAuthApiBase() || "(same-origin)",
          kakaoRedirectMustMatch: `${kakaoRedirectMustMatch} (카카오 개발자 콘솔 Redirect URI)`,
        });

        if (!url) {
          console.log("[AUTH-DIAG] toast branch", {
            branch: "NO_OAUTH_URL",
            message: "로그인 서버 주소가 없어요",
          });
          useUiStore.getState().showAppToast(
            "로그인 서버 주소가 없어요. REACT_APP_API_BASE_URL을 설정해 주세요."
          );
          return false;
        }

        if (url.includes("kauth.kakao.com")) {
          console.log("[AUTH-DIAG] toast branch", { branch: "DIRECT_KAKAO_URL", navigate: url });
          window.location.href = url;
          return true;
        }

        const probe = await probeSpringOAuthBackend();
        const oauthConfig = await fetchOAuthConfigDiagnostics();

        if (!probe.ok) {
          console.log("[AUTH-DIAG] toast branch", {
            branch: "PROBE_FAILED",
            message: "로그인 서버에 연결할 수 없어요",
            probeReason: probe.reason,
            healthUrl: probe.healthUrl,
            oauthConfig,
            kakaoRedirectMustMatch,
            hint: "same-origin(Vercel)에서 apiBase가 빈 문자열이면 /api/health 상대경로를 사용해야 함",
          });
          useUiStore.getState().showAppToast(
            "로그인 서버에 연결할 수 없어요. 백엔드(Spring Boot)가 실행 중인지 확인해 주세요."
          );
          return false;
        }

        if (oauthConfig.redirectUri && oauthConfig.redirectUri !== kakaoRedirectMustMatch) {
          console.log("[AUTH-DIAG] 카카오 설정값 불일치 또는 Redirect URI", {
            expected: kakaoRedirectMustMatch,
            actual: oauthConfig.redirectUri,
            note: "OAuth는 계속 진행합니다 (경고만)",
          });
        }

        console.log("[AUTH-DIAG] toast branch", { branch: "NAVIGATE_OAUTH", url });
        window.location.href = url;
        return true;
      },

      loginWithKakaoMock: async () =>
        runAsyncStoreAction({
          set,
          action: () => loginWithKakaoMockApi(),
          defaultErrorMessage: "카카오 로그인을 진행하지 못했습니다.",
          onSuccess: (state, pickedUser) => {
            const uid = Number(pickedUser?.id);
            const apl = Number.isFinite(uid) && uid > 0 ? uid : 1;
            const userId = String(pickedUser.id ?? apl);
            return {
              meVerified: true,
              session: normalizeSession({
                isAuthenticated: true,
                provider: "kakao-mock",
                accessToken: `mock-kakao-token-${Date.now()}`,
                user: {
                  id: userId,
                  nickname: "",
                  profileImage: pickedUser.profileImage || "",
                },
              }),
              profile: normalizeProfile({
                ...state.profile,
                id: userId,
                applicantUserId: apl,
                nickname: "",
                displayNickname: "",
                nicknameSetupRequired: true,
                profileImage: state.profile.profileImage || pickedUser.profileImage || "",
                loginProvider: "kakao-mock",
                region: state.prefs.regionLabel || state.profile.region,
                craft: state.prefs.craft != null ? state.prefs.craft : state.profile.craft,
                role: state.prefs.trade && state.prefs.trade !== "전체" ? state.prefs.trade : state.profile.role,
                trade: state.prefs.trade || state.profile.trade,
                setupCompleted: false,
                needsPersonaChoice: false,
              }),
            };
          },
        }).then((pickedUser) => ({
          id: pickedUser?.id,
          nickname: pickedUser?.nickname,
          profileImage: pickedUser?.profileImage,
        })),

      /** OAuth 콜백 등 — 세션만 반영 (닉네임은 /users/me 기준) */
      commitSessionAfterKakao: (pickedUser, options = {}) => {
        if (!pickedUser) return;
        const id =
          pickedUser.id != null && String(pickedUser.id).trim() !== ""
            ? String(pickedUser.id).trim()
            : `kakao-${Date.now()}`;
        const uid = Number(id);
        const applicantUserId = Number.isFinite(uid) && uid > 0 ? uid : null;
        const accessToken =
          typeof options.accessToken === "string" && options.accessToken.trim()
            ? options.accessToken.trim()
            : `kakao-token-${Date.now()}`;
        const provider = typeof options.provider === "string" && options.provider.trim() ? options.provider.trim() : "kakao";
        set((state) => ({
          session: normalizeSession({
            isAuthenticated: true,
            provider,
            accessToken,
            user: {
              id,
              nickname: "",
              profileImage: typeof pickedUser.profileImage === "string" ? pickedUser.profileImage : "",
            },
          }),
          profile: normalizeProfile({
            ...state.profile,
            id,
            nickname: "",
            displayNickname: "",
            nicknameSetupRequired: true,
            ...(applicantUserId != null ? { applicantUserId } : {}),
            profileImage:
              typeof pickedUser.profileImage === "string" ? pickedUser.profileImage : state.profile.profileImage,
            loginProvider: provider,
            region: state.prefs.regionLabel || state.profile.region,
            craft: state.prefs.craft != null ? state.prefs.craft : state.profile.craft,
            role: state.prefs.trade && state.prefs.trade !== "전체" ? state.prefs.trade : state.profile.role,
            trade: state.prefs.trade || state.profile.trade,
            setupCompleted: false,
            needsPersonaChoice: false,
          }),
          authReady: true,
          meVerified: false,
        }));
      },

      refreshUserExtras: async ({ force = false } = {}) => {
        if (!force && get().extrasLoaded) {
          return {
            profileMeta: get().profileMeta,
            favoriteWorkers: get().favoriteWorkers,
            oyajiTrustProfile: get().oyajiTrustProfile,
          };
        }
        return runAsyncStoreAction({
          set,
          loadingKey: "extrasLoading",
          errorKey: "extrasError",
          defaultErrorMessage: "사용자 부가 정보를 불러오지 못했습니다.",
          action: async () => {
            const [profileMeta, favoriteWorkers, oyajiTrustProfile] = await Promise.all([
              getProfileMeta(),
              getFavoriteWorkers(),
              getOyajiTrustProfile(),
            ]);
            return {
              profileMeta: profileMeta || createDefaultProfileMeta(),
              favoriteWorkers: Array.isArray(favoriteWorkers) ? favoriteWorkers : [],
              oyajiTrustProfile: oyajiTrustProfile || createDefaultOyajiTrustProfile(),
            };
          },
          onSuccess: (state, payload) => ({
            profileMeta: mergeProfileMetaWithLocal(state, payload.profileMeta),
            favoriteWorkers: payload.favoriteWorkers,
            oyajiTrustProfile: payload.oyajiTrustProfile,
            extrasLoaded: true,
          }),
          onError: (state, error) => {
            if (!isNetworkError(error)) return {};
            return {
              extrasLoaded: true,
              profileMeta:
                state.profileMeta && typeof state.profileMeta === "object"
                  ? state.profileMeta
                  : createDefaultProfileMeta(),
              favoriteWorkers: Array.isArray(state.favoriteWorkers) ? state.favoriteWorkers : [],
              oyajiTrustProfile:
                state.oyajiTrustProfile && typeof state.oyajiTrustProfile === "object"
                  ? state.oyajiTrustProfile
                  : createDefaultOyajiTrustProfile(),
            };
          },
        });
      },

      logout: () => {
        logoutSession().catch(() => {
          /* noop */
        });
        const prefs = get().prefs;
        const userMode = get().userMode;
        const nextState = {
          session: createDefaultSession(),
          profile: createDefaultProfile(),
          prefs,
          userMode,
          profileMeta: createDefaultProfileMeta(),
          favoriteWorkers: [],
          oyajiTrustProfile: createDefaultOyajiTrustProfile(),
          loading: false,
          error: "",
          meBootstrapLoading: false,
          authReady: true,
          meVerified: false,
          extrasLoading: false,
          extrasError: "",
          extrasLoaded: false,
        };
        set(nextState);
        removeStorageKey(ONBOARDING_STORAGE_KEY);
        useContactsStore.getState().resetContacts();
        useSettlementStore.getState().resetSchedules();
        useSiteBoardStore.getState().resetSiteBoards();
        useNotificationStore.getState().resetNotifications();
      },

      setProfile: (patch) =>
        set((state) => ({
          profile: normalizeProfile({
            ...state.profile,
            ...(typeof patch === "function" ? patch(state.profile) : patch),
          }),
        })),

      /** MVP — 프로필 상세(출생년도·지역·직종·희망일당) localStorage 저장 */
      saveLocalProfileDetails: (patch = {}) =>
        set((state) => {
          const regions = normalizeActivityRegions(
            patch.regions ?? patch.region ?? state.profile.regions ?? state.profile.region
          );
          const region = getPrimaryRegion(regions);
          const residence = formatRegionsLabel(regions, { emptyLabel: "" });
          return {
            profile: normalizeProfile({
              ...state.profile,
              ...patch,
              regions,
              region,
              residence,
              birthYear:
                patch.birthYear != null
                  ? Number.isFinite(Number(patch.birthYear)) && Number(patch.birthYear) > 1900
                    ? Number(patch.birthYear)
                    : null
                  : state.profile.birthYear,
              desiredPay:
                patch.desiredPay != null
                  ? Number.isFinite(Number(patch.desiredPay)) && Number(patch.desiredPay) > 0
                    ? Number(patch.desiredPay)
                    : null
                  : state.profile.desiredPay,
              experienceYears:
                patch.experienceYears != null
                  ? Number.isFinite(Number(patch.experienceYears)) && Number(patch.experienceYears) >= 0
                    ? Number(patch.experienceYears)
                    : null
                  : state.profile.experienceYears,
              careerYears:
                patch.careerYears != null
                  ? Number.isFinite(Number(patch.careerYears)) && Number(patch.careerYears) >= 0
                    ? Number(patch.careerYears)
                    : null
                  : state.profile.careerYears,
              phone: patch.phone != null ? String(patch.phone).trim() : state.profile.phone,
              craft: patch.craft != null ? patch.craft : state.profile.craft,
            }),
            prefs: normalizePrefs({
              ...state.prefs,
              regionLabel: region,
              craft: patch.craft != null ? patch.craft : state.prefs.craft,
            }),
          };
        }),

      /** 프로필 상세 — 서버 DB 저장 후 Zustand 반영 (mock/비로그인 시 local만) */
      saveProfileDetails: async (patch = {}) => {
        const state = get();
        const regions = normalizeActivityRegions(
          patch.regions ?? patch.region ?? state.profile.regions ?? state.profile.region
        );
        const mergedProfile = normalizeProfile({
          ...state.profile,
          ...patch,
          regions,
        });
        const mergedMeta = {
          ...(state.profileMeta && typeof state.profileMeta === "object" ? state.profileMeta : createDefaultProfileMeta()),
          ...(patch.intro != null ? { intro: String(patch.intro || "").trim() } : {}),
        };
        const apiPayload = profileToApiPayload(mergedProfile, mergedMeta);

        try {
          if (state.session?.isAuthenticated && (!isMockApiEnabled() || hasConfiguredLiveApi())) {
            const me = await updateUserProfile(apiPayload);
            set((s) => applyMeResponse(s, me, s.session.provider || "kakao"));
            return { ok: true };
          }
          get().saveLocalProfileDetails({ ...patch, regions });
          if (patch.intro != null) {
            get().setProfileMeta({ intro: String(patch.intro || "").trim() });
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error?.message || "프로필 저장에 실패했습니다." };
        }
      },

      setProfileMeta: (patch) =>
        set((state) => ({
          profileMeta: {
            ...(state.profileMeta && typeof state.profileMeta === "object" ? state.profileMeta : createDefaultProfileMeta()),
            ...(typeof patch === "function" ? patch(state.profileMeta) : patch),
          },
        })),

      completeNicknameSetup: async (nextNickname) => {
        const validated = validateNicknameInput(nextNickname);
        if (!validated.ok) return { ok: false, message: validated.message };
        try {
          const me = await setInitialNickname(validated.value);
          set((state) => applyMeResponse(state, me, state.session.provider || "kakao"));
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error?.message || "닉네임 설정에 실패했습니다." };
        }
      },

      changeDisplayNickname: async (nextNickname) => {
        const validated = validateNicknameInput(nextNickname);
        if (!validated.ok) return { ok: false, message: validated.message };
        const { profile } = get();
        if (profile?.nicknameSetupRequired) {
          return { ok: false, message: "활동명 설정을 먼저 완료해주세요." };
        }
        try {
          const me = await changeNickname(validated.value);
          set((state) => applyMeResponse(state, me, state.session.provider || "kakao"));
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error?.message || "닉네임 변경에 실패했습니다." };
        }
      },

      /** @deprecated changeDisplayNickname 사용 */
      updateDisplayNickname: (nextNickname) => {
        const validated = validateNicknameInput(nextNickname);
        if (!validated.ok) return { ok: false, message: validated.message };
        get()
          .changeDisplayNickname(validated.value)
          .catch(() => {
            /* noop */
          });
        return { ok: true };
      },

      completeInitialProfile: (payload) =>
        set((state) => {
          const userId = payload?.id || state.profile?.id || state.session?.user?.id || "";
          const displayNickname = String(payload?.displayNickname || payload?.nickname || "").trim();
          return {
            session: normalizeSession({
              ...state.session,
              user: state.session?.user
                ? { ...state.session.user, nickname: displayNickname }
                : userId
                  ? { id: String(userId), nickname: displayNickname, profileImage: "" }
                  : null,
            }),
            profile: normalizeProfile({
              ...state.profile,
              ...payload,
              nickname: displayNickname,
              displayNickname,
              nicknameSetupRequired: !displayNickname,
              setupCompleted: Boolean(displayNickname),
            }),
          };
        }),

      resetProfile: () =>
        set(() => ({
          profile: createDefaultProfile(),
        })),

      applyShellPersonaChoice: (persona) =>
        set((state) => {
          const isForeman = persona === "foreman";
          const isConsumer = persona === "consumer";
          const userMode = isForeman ? "oyaji" : "worker";
          const userType = isConsumer ? "consumer" : isForeman ? "foreman" : "worker";
          const nextRole =
            isConsumer ? "소비자" : isForeman ? "오야지" : state.profile.role === "소비자" ? "기공" : state.profile.role;
          return {
            userMode: normalizeUserMode(userMode),
            profile: normalizeProfile({
              ...state.profile,
              shellPersona: persona,
              userType,
              needsPersonaChoice: false,
              role: VALID_ROLES.includes(nextRole) ? nextRole : state.profile.role,
            }),
          };
        }),

      setUserMode: (nextMode) =>
        set(() => ({
          userMode: normalizeUserMode(nextMode),
        })),

      setPrefs: (patch) =>
        set((state) => ({
          prefs: normalizePrefs({
            ...state.prefs,
            ...(typeof patch === "function" ? patch(state.prefs) : patch),
          }),
        })),

      hydrateFromLegacy: () => {
        const nextState = createInitialState();
        set(nextState);
        return nextState;
      },

      getAuthUser: () => get().session.user,
      isProfileCompleted: () => {
        const p = get().profile;
        return Boolean(p?.setupCompleted && !p?.nicknameSetupRequired && p?.displayNickname);
      },
      isAuthReady: () => Boolean(get().authReady),
      isMeVerified: () => Boolean(get().meVerified),
      isAuthenticatedFromMe: () =>
        Boolean(get().authReady && get().meVerified && get().session?.isAuthenticated),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, [
          "session",
          "prefs",
          "userMode",
          "favoriteWorkers",
          "oyajiTrustProfile",
          "extrasLoaded",
        ]),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncLegacyUserState(state);
          if (state.profile?.needsPersonaChoice) {
            state.profile = { ...state.profile, needsPersonaChoice: false };
          }
          if (state.profile) {
            state.profile = {
              ...state.profile,
              canChangeNickname: true,
              nicknameChangeAvailableAt: "",
            };
          }
        }
        const patch = {
          authReady: true,
          meBootstrapLoading: false,
          meVerified: false,
          extrasLoading: false,
        };
        if (state?.profile?.needsPersonaChoice) {
          patch.profile = { ...state.profile, needsPersonaChoice: false };
        }
        useUserStore.setState(patch);
      },
    }
  )
);

syncLegacyUserState(useUserStore.getState());
useUserStore.subscribe((state) => {
  syncLegacyUserState(state);
});
