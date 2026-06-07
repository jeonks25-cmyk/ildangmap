import { useEffect } from "react";

/** Spring OAuth2 단일 경로 — 레거시 callback URL은 지도로 리다이렉트 */
export default function OAuthPage() {
  useEffect(() => {
    window.location.replace(`${window.location.origin}/map`);
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
