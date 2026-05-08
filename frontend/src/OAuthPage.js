import { useEffect } from "react";

export default function OAuthPage() {

    useEffect(() => {

        const code =
            new URL(window.location.href)
                .searchParams.get("code");

        if (!code) return;

        fetch(
            "https://kauth.kakao.com/oauth/token",
            {
                method: "POST",

                headers: {
                    "Content-type":
                        "application/x-www-form-urlencoded;charset=utf-8",
                },

                body:
                    `grant_type=authorization_code` +
                    `&client_id=e3ca13655de915a192d4448f0c03bf7d` +
                    `&redirect_uri=http://localhost:3000/oauth` +
                    `&code=${code}`,
            }
        )
            .then((res) => res.json())

            .then((tokenData) => {

                fetch(
                    "https://kapi.kakao.com/v2/user/me",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${tokenData.access_token}`,
                        },
                    }
                )
                    .then((res) =>
                        res.json()
                    )

                    .then((userData) => {

                        const profile = {
                            nickname:
                            userData.properties
                                .nickname,

                            profileImage:
                            userData.properties
                                .profile_image,
                        };

                        localStorage.setItem(
                            "user",
                            JSON.stringify(
                                profile
                            )
                        );

                        window.location.href =
                            "/";
                    });
            });

    }, []);

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",

                display: "flex",

                justifyContent:
                    "center",

                alignItems:
                    "center",

                fontSize: "20px",

                fontWeight: "700",
            }}
        >
            카카오 로그인 중...
        </div>
    );
}