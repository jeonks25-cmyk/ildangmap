import { useUserStore } from "../store/useUserStore";

export function AuthProvider({ children }) {
  return children;
}

export function useAuth() {
  const session = useUserStore((state) => state.session);
  const authUser = useUserStore((state) => state.session.user);
  const authReady = useUserStore((state) => state.authReady);
  const meVerified = useUserStore((state) => state.meVerified);
  const isAuthenticated = useUserStore(
    (state) => Boolean(state.authReady && state.meVerified && state.session?.isAuthenticated),
  );
  const meBootstrapLoading = useUserStore((state) => state.meBootstrapLoading);
  const loginWithKakaoMock = useUserStore((state) => state.loginWithKakaoMock);
  const startKakaoOAuthLogin = useUserStore((state) => state.startKakaoOAuthLogin);
  const logout = useUserStore((state) => state.logout);

  return {
    session,
    authUser,
    isAuthenticated,
    authReady,
    meVerified,
    meBootstrapLoading,
    loginWithKakaoMock,
    startKakaoOAuthLogin,
    logout,
  };
}
