import React, { useState } from "react";

function CheckInPage() {
    const [location, setLocation] = useState("");
    const [status, setStatus] = useState("");

    const handleCheckIn = () => {
        if (!navigator.geolocation) {
            alert("GPS를 지원하지 않는 브라우저입니다.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const currentLocation =
                    `위도: ${lat.toFixed(5)}, 경도: ${lng.toFixed(5)}`;

                setLocation(currentLocation);
                setStatus("출근 완료");

                alert("GPS 출근 체크 완료!");
            },
            () => {
                alert("위치 정보를 가져올 수 없습니다.");
            }
        );
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                padding: "30px",
            }}
        >
            <div
                style={{
                    maxWidth: "700px",
                    margin: "0 auto",
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
            >
                <h1>GPS 출근 체크</h1>

                <div
                    style={{
                        marginTop: "20px",
                        padding: "20px",
                        backgroundColor: "#fafafa",
                        borderRadius: "12px",
                    }}
                >
                    <p>
                        <strong>현장:</strong> 둔산동 아파트 필름 시공
                    </p>

                    <p>
                        <strong>집결 시간:</strong> 오전 8시
                    </p>

                    <p>
                        <strong>현재 상태:</strong> {status || "출근 전"}
                    </p>

                    <p>
                        <strong>현재 위치:</strong> {location || "미확인"}
                    </p>
                </div>

                <button
                    onClick={handleCheckIn}
                    style={{
                        marginTop: "24px",
                        padding: "14px 24px",
                        border: "none",
                        borderRadius: "10px",
                        backgroundColor: "#ffe066",
                        fontWeight: "700",
                        cursor: "pointer",
                    }}
                >
                    출근 체크하기
                </button>
            </div>
        </div>
    );
}

export default CheckInPage;