import { useEffect } from "react";

/** Spring OAuth2 — 레거시 /oauth/kakao/callback → /auth/callback 호환 */
export default function OAuthPage() {
  useEffect(() => {
    const qs = window.location.search || "";
    window.location.replace(`${window.location.origin}/auth/callback${qs || "?login=success"}`);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "20px",
        fontWeight: "700",
      }}
    >
      이동 중…
    </div>
  );
}
