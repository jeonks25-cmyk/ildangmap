import React from "react";

function FavoriteSchedulePage() {
    const favoriteSchedules = [
        {
            id: 1,
            name: "김철수",
            skill: "인테리어 필름",
            availableDates: [
                "4월 24일 가능",
                "4월 26일 가능",
                "4월 28일 가능",
            ],
        },
        {
            id: 2,
            name: "박민수",
            skill: "도배",
            availableDates: [
                "4월 23일 가능",
                "4월 27일 가능",
            ],
        },
        {
            id: 3,
            name: "이현우",
            skill: "타일",
            availableDates: [
                "4월 25일 가능",
                "4월 29일 가능",
            ],
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
                <h1>즐겨찾기 기술자 일정</h1>

                <p>
                    자주 함께 일하는 기술자의
                    빈 날짜를 바로 확인할 수 있습니다.
                </p>

                {favoriteSchedules.map((worker) => (
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

                        <h3>이번 주 가능 일정</h3>

                        {worker.availableDates.map((date, index) => (
                            <p key={index}>
                                • {date}
                            </p>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FavoriteSchedulePage;