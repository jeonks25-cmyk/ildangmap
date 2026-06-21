import React, { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { captureInviteFromUrl, readPendingInvite, resolveInviterDisplayName } from "../utils/pendingInvite";
import "../styles/invite-landing.css";

export default function InviteLandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, authReady, startKakaoOAuthLogin } = useAuth();

  useEffect(() => {
    captureInviteFromUrl(searchParams.toString() ? `?${searchParams.toString()}` : undefined);
  }, [searchParams]);

  const refUserId = searchParams.get("ref") || readPendingInvite()?.ref;
  const inviterName = useMemo(() => resolveInviterDisplayName(refUserId), [refUserId]);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate("/map", { replace: true });
      return;
    }
    startKakaoOAuthLogin();
  };

  return (
    <div className="invite-landing-page">
      <header className="invite-landing-page__hero">
        <p className="invite-landing-page__brand">일당맵</p>
        <h1 className="invite-landing-page__title">
          <strong>{inviterName}</strong>님이 초대했습니다
        </h1>
        <p className="invite-landing-page__lead">
          현장 위치, 주차장, 화장실, 식당, 일정, 인원 정보를 한곳에서 공유하는 현장 네트워크입니다.
        </p>
      </header>

      <section className="invite-landing-page__card" aria-label="초대 안내">
        <ul className="invite-landing-page__points">
          <li>지도에서 현장·편의시설 확인</li>
          <li>일정·인원을 팀과 공유</li>
          <li>홈 화면에 추가하면 앱처럼 사용</li>
        </ul>
        <button type="button" className="invite-landing-page__cta" onClick={handleStart} disabled={!authReady}>
          {isAuthenticated ? "일당맵 시작하기" : "카카오로 참여하기"}
        </button>
        {!isAuthenticated ? (
          <button type="button" className="invite-landing-page__secondary" onClick={() => navigate("/map")}>
            둘러보기
          </button>
        ) : null}
      </section>
    </div>
  );
}
