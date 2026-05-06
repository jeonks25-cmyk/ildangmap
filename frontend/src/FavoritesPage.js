import React from "react";
import { Link } from "react-router-dom";

function FavoritesPage() {
    const favoriteWorkers = [
        {
            id: 1,
            name: "김철수",
            skill: "인테리어 필름",
            recentSite: "둔산 크로바 아파트",
            lastWork: "3일 전",
            gpsTrust: "정상 출근 182회",
            noShow: "노쇼 0회",
        },
        {
            id: 2,
            name: "박민수",
            skill: "도배",
            recentSite: "관저 더샵 아파트",
            lastWork: "1주 전",
            gpsTrust: "정상 출근 96회",
            noShow: "노쇼 1회",
        },
        {
            id: 3,
            name: "이현우",
            skill: "타일",
            recentSite: "세종 첫마을 아파트",
            lastWork: "5일 전",
            gpsTrust: "정상 출근 143회",
            noShow: "노쇼 0회",
        },
    ];

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                padding: "24px",
            }}
        >
            <div
                style={{
                    maxWidth: "900px",
                    margin: "0 auto",
                }}
            >
                <h1>즐겨찾기 기술자</h1>

                <p>
                    자주 함께 일하는 기술자를 빠르게 확인하고
                    바로 다시 연락할 수 있습니다.
                </p>

                {favoriteWorkers.map((worker) => (
                    <div
                        key={worker.id}
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "16px",
                            padding: "20px",
                            marginBottom: "18px",
                            boxShadow:
                                "0 2px 10px rgba(0,0,0,0.06)",
                        }}
                    >
                        <h2>
                            {worker.name} 🔵
                        </h2>

                        <p>분야: {worker.skill}</p>
                        <p>최근 현장: {worker.recentSite}</p>
                        <p>마지막 작업: {worker.lastWork}</p>
                        <p>{worker.gpsTrust}</p>
                        <p>{worker.noShow}</p>

                        <div
                            style={{
                                marginTop: "16px",
                                display: "flex",
                                gap: "10px",
                            }}
                        >
                            <Link to="/chat">
                                <button
                                    style={{
                                        padding: "12px 18px",
                                        border: "none",
                                        borderRadius: "10px",
                                        backgroundColor: "#ffe066",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                    }}
                                >
                                    바로 채팅
                                </button>
                            </Link>

                            <Link to="/worker-profile">
                                <button
                                    style={{
                                        padding: "12px 18px",
                                        border: "none",
                                        borderRadius: "10px",
                                        backgroundColor: "#fff3bf",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                    }}
                                >
                                    프로필 보기
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FavoritesPage;