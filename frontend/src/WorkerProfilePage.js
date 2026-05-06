import React from "react";

function WorkerProfilePage() {
    const cardStyle = {
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        marginBottom: "20px",
    };

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
                    maxWidth: "850px",
                    margin: "0 auto",
                }}
            >
                {/* 기본 프로필 */}
                <div style={cardStyle}>
                    <h1 style={{ marginTop: 0 }}>
                        기술자 프로필
                    </h1>

                    <h2 style={{ marginBottom: "8px" }}>
                        김철수 🔵 인증기술자
                    </h2>

                    <p>분야: 인테리어 필름</p>
                    <p>경력: 8년</p>
                    <p>활동지역: 대전 / 세종 / 청주</p>
                    <p>즐겨찾기 등록: 24명</p>
                    <p>같은 오야지 재호출: 17회</p>
                </div>

                {/* 아파트별 시공 기록 */}
                <div style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>
                        아파트별 시공 기록
                    </h2>

                    <p>둔산 크로바 아파트: 7회</p>
                    <p>관저 더샵 아파트: 4회</p>
                    <p>도안 센트럴푸르지오: 3회</p>
                    <p>세종 첫마을 아파트: 5회</p>
                </div>

                {/* 오야지별 작업 기록 */}
                <div style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>
                        함께 작업한 오야지
                    </h2>

                    <p>김반장: 19회</p>
                    <p>박소장: 13회</p>
                    <p>이팀장: 8회</p>
                    <p>정실장: 6회</p>
                </div>

                {/* GPS 출근 기록 */}
                <div style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>
                        GPS 출근 인증 기록
                    </h2>

                    <p>정상 출근: 182회</p>
                    <p>지각: 2회</p>
                    <p>노쇼: 0회</p>
                    <p>당일취소: 1회</p>
                </div>

                {/* 최근 현장 이력 */}
                <div style={cardStyle}>
                    <h2 style={{ marginTop: 0 }}>
                        최근 현장 이력
                    </h2>

                    <p>• 둔산동 구축 아파트 필름 시공</p>
                    <p>• 세종 상가 샷시 필름 작업</p>
                    <p>• 청주 오피스텔 리모델링 시공</p>
                    <p>• 유성구 병원 내부 필름 시공</p>
                </div>
            </div>
        </div>
    );
}

export default WorkerProfilePage;