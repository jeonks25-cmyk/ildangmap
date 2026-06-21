import { useUserStore } from "../store/useUserStore";

/** Rehydrate / partial state에서 profile 이 비어도 렌더가 죽지 않도록 */
const PROFILE_FALLBACK = {
  id: "",
  applicantUserId: null,
  name: "",
  nickname: "",
  profileImage: "",
  loginProvider: "",
  userType: "",
  shellPersona: "",
  needsPersonaChoice: false,
  trade: "전체",
  regions: ["대전"],
  craft: "film",
  role: "기공",
  homeRegion: "대전",
  experienceYears: null,
  basePay: null,
  workRegions: [],
  setupCompleted: false,
  displayNickname: "",
  nicknameSetupRequired: false,
  canChangeNickname: true,
  nicknameChangeAvailableAt: "",
};

const PROFILE_META_FALLBACK = {
  name: "",
  trade: "기공",
  craft: "film",
  regions: ["대전"],
  profileImage: "",
  trustStats: [],
  verificationBadges: [],
  workHistory: [],
  recentCoworkers: [],
  frequentRegions: [],
  intro: "",
};

export function UserProfileProvider({ children }) {
  return children;
}

export function useUserProfile() {
  const rawProfile = useUserStore((state) => state.profile);
  const profile = rawProfile && typeof rawProfile === "object" ? rawProfile : PROFILE_FALLBACK;
  const setProfile = useUserStore((state) => state.setProfile);
  const completeInitialProfile = useUserStore((state) => state.completeInitialProfile);
  const resetProfile = useUserStore((state) => state.resetProfile);
  const rawMeta = useUserStore((state) => state.profileMeta);
  const profileMeta = rawMeta && typeof rawMeta === "object" ? rawMeta : PROFILE_META_FALLBACK;
  const favoriteWorkers = useUserStore((state) => state.favoriteWorkers);
  const oyajiTrustProfile = useUserStore((state) => state.oyajiTrustProfile);
  const loading = useUserStore((state) => state.loading || state.meBootstrapLoading);
  const error = useUserStore((state) => state.error);
  const extrasLoading = useUserStore((state) => state.extrasLoading);
  const extrasError = useUserStore((state) => state.extrasError);
  const refreshCurrentUser = useUserStore((state) => state.refreshCurrentUser);
  const refreshUserExtras = useUserStore((state) => state.refreshUserExtras);

  // Bootstrap is centralized in useAppBootstrap -> AppShell.
  // This bridge stays read-oriented so profile consumers do not trigger hidden network calls.

  return {
    profile,
    setProfile,
    completeInitialProfile,
    resetProfile,
    profileMeta,
    favoriteWorkers,
    oyajiTrustProfile,
    loading,
    error,
    extrasLoading,
    extrasError,
    refreshCurrentUser,
    refreshUserExtras,
    isProfileCompleted: Boolean(profile?.setupCompleted && !profile?.nicknameSetupRequired && profile?.displayNickname),
  };
}
