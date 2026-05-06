import React, { useEffect, useState } from "react";
import axios from "axios";

function OAuthPage() {
    const [result, setResult] = useState("로그인 처리중...");

    useEffect(() => {
        const code = new URL(window.location.href).searchParams.get("code");

        if (code) {
            axios
                .get("http://localhost:8080/api/kakao/login", {
                    params: {
                        code: code,
                    },
                })
                .then((res) => {
                    console.log(res.data);
                    setResult("로그인 성공");
                })
                .catch((err) => {
                    console.error(err);
                    setResult("로그인 실패");
                });
        }
    }, []);

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "24px",
            }}
        >
            {result}
        </div>
    );
}

export default OAuthPage;