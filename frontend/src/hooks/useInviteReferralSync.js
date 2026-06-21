import { useEffect } from "react";
import { captureInviteFromUrl } from "../utils/pendingInvite";
import { applyPendingInvite } from "../utils/applyPendingInvite";
import { useUserStore } from "../store/useUserStore";

/** 앱 진입 시 초대 URL 캡처 + 로그인 후 추천인 적용 */
export default function useInviteReferralSync() {
  const isAuthenticated = useUserStore((s) => s.session?.isAuthenticated);
  const userId = useUserStore((s) => s.profile?.applicantUserId || s.session?.user?.id);

  useEffect(() => {
    captureInviteFromUrl();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    applyPendingInvite();
  }, [isAuthenticated, userId]);
}
