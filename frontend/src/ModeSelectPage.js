import React from "react";
import { Link } from "react-router-dom";

function ModeSelectPage() {
    const cardStyle = {
        backgroundColor: "#ffffff",
        borderRadius: "18px",
        padding: "30px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        textAlign: "center",
        flex: 1,
    };

    const buttonStyle = {
        marginTop: "20px",
        padding: "14px 24px",
        border: "none",
        borderRadius: "12px",
        backgroundColor: "#ffe066",
        fontWeight: "700",
        cursor: "pointer",
        width: "100%",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "24px",
            }}
        >
            <div
                style={{
                    maxWidth: "900px",
                    width: "100%",
                }}
            >
                <h1
                    style={{
                        textAlign: "center",
                        marginBottom: "30px",
                    }}
                >
                    일당맵 시작하기
                </h1>

                <div
                    style={{
                        display: "flex",
                        gap: "20px",
                        flexWrap: "wrap",
                    }}
                >
                    {/* 오야지 모드 */}
                    <div style={cardStyle}>
                        <h2>오야지 모드</h2>

                        <p>
                            기술자 찾기 / 일정 초대 / 정산 /
                            단골 관리 중심
                        </p>

                        <Link to="/home">
                            <button style={buttonStyle}>
                                오야지로 시작
                            </button>
                        </Link>
                    </div>

                    {/* 기술자 모드 */}
                    <div style={cardStyle}>
                        <h2>기술자 모드</h2>

                        <p>
                            오늘 일정 / 초대 수락 / 출근 체크 /
                            작업 완료 중심
                        </p>

                        <Link to="/schedule-auto">
                            <button style={buttonStyle}>
                                기술자로 시작
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModeSelectPage;