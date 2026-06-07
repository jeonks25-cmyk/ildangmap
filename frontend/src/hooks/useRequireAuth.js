import { useCallback } from "react";
import { useUserStore } from "../store/useUserStore";
import { useUiStore } from "../store/useUiStore";

/** @returns {boolean} 글쓰기·등록 등 가능 */
export function canPerformMemberAction(state) {
  const s = state || useUserStore.getState();
  return Boolean(
    s.authReady &&
      s.meVerified &&
      s.session?.isAuthenticated &&
      s.profile?.setupCompleted &&
      !s.profile?.nicknameSetupRequired,
  );
}

/**
 * 로그인 + 닉네임 설정 완료 가드 (훅 외부에서도 사용)
 * @returns {boolean} 허용 여부
 */
export function guardMemberAction(reason = "default") {
  const { session, authReady, profile, meVerified, meBootstrapLoading } = useUserStore.getState();
  if (!authReady || meBootstrapLoading || !meVerified) return false;
  if (!session?.isAuthenticated) {
    useUiStore.getState().openAuthPrompt(reason);
    return false;
  }
  if (profile?.nicknameSetupRequired || !profile?.setupCompleted) {
    useUiStore.getState().showAppToast("활동명 설정을 먼저 완료해주세요.");
    return false;
  }
  return true;
}

/**
 * 로그인 + 닉네임 설정 완료(setupCompleted) 필요 액션 가드
 * @returns {boolean} 허용 여부
 */
export function useRequireAuth(reason = "default") {
  const authReady = useUserStore((s) => s.authReady);
  const meVerified = useUserStore((s) => s.meVerified);
  const meBootstrapLoading = useUserStore((s) => s.meBootstrapLoading);
  const isAuthenticated = useUserStore((s) => Boolean(s.session?.isAuthenticated));
  const setupCompleted = useUserStore((s) => Boolean(s.profile?.setupCompleted));
  const nicknameSetupRequired = useUserStore((s) => Boolean(s.profile?.nicknameSetupRequired));

  return useCallback(() => {
    if (!authReady || meBootstrapLoading || !meVerified) return false;
    if (!isAuthenticated) {
      useUiStore.getState().openAuthPrompt(reason);
      return false;
    }
    if (nicknameSetupRequired || !setupCompleted) {
      useUiStore.getState().showAppToast("활동명 설정을 먼저 완료해주세요.");
      return false;
    }
    return true;
  }, [authReady, meVerified, meBootstrapLoading, isAuthenticated, setupCompleted, nicknameSetupRequired, reason]);
}
