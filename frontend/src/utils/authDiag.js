/**
 * OAuth / 세션 동기화 진단 로그 (운영 디버깅용 — [AUTH-DIAG] 접두사로 필터)
 */
export function authDiag(step, detail) {
  if (detail !== undefined) {
    console.log(`[AUTH-DIAG] ${step}`, detail);
  } else {
    console.log(`[AUTH-DIAG] ${step}`);
  }
}

export function authDiagStoreSnapshot(store, label = "store") {
  const session = store?.session;
  authDiag(label, {
    authReady: store?.authReady,
    meVerified: store?.meVerified,
    meBootstrapLoading: store?.meBootstrapLoading,
    isAuthenticated: session?.isAuthenticated,
    userId: session?.user?.id,
    provider: session?.provider,
    profileId: store?.profile?.id,
  });
}
