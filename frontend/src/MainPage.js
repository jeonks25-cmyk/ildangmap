import React, { useEffect, useState } from "react";

const MapPage = () => {
    const [selectedJob, setSelectedJob] = useState(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src =
            "//dapi.kakao.com/v2/maps/sdk.js?appkey=e3ca13655de915a192d4448f0c03bf7d&autoload=false";
        script.async = true;

        document.head.appendChild(script);

        script.onload = () => {
            window.kakao.maps.load(() => {
                const container = document.getElementById("map");

                const options = {
                    center: new window.kakao.maps.LatLng(36.3504, 127.3845),
                    level: 5,
                };

                const map = new window.kakao.maps.Map(container, options);

                // 🔥 테스트 데이터
                const jobs = [
                    {
                        id: 1,
                        title: "아파트 필름 보조",
                        lat: 36.3504,
                        lng: 127.3845,
                        location: "대전 서구",
                        pay: 150000,
                    },
                    {
                        id: 2,
                        title: "상가 필름 시공",
                        lat: 36.355,
                        lng: 127.39,
                        location: "대전 유성구",
                        pay: 200000,
                    },
                ];

                jobs.forEach((job) => {
                    const marker = new window.kakao.maps.Marker({
                        map: map,
                        position: new window.kakao.maps.LatLng(job.lat, job.lng),
                    });

                    // ✅ 마커 클릭
                    window.kakao.maps.event.addListener(marker, "click", () => {
                        console.log("클릭됨:", job);
                        setSelectedJob(job);
                    });
                });
            });
        };
    }, []);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            {/* 지도 */}
            <div
                id="map"
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />

            {/* 🔥 거지맵 스타일 팝업 */}
            {selectedJob && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "100px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "320px",
                        background: "white",
                        borderRadius: "16px",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                        padding: "16px",
                        zIndex: 9999,
                    }}
                >
                    <h3>{selectedJob.title}</h3>
                    <p>📍 {selectedJob.location}</p>
                    <p>💰 {selectedJob.pay.toLocaleString()}원</p>

                    <button
                        style={{
                            width: "100%",
                            padding: "12px",
                            marginTop: "10px",
                            background: "black",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            cursor: "pointer",
                        }}
                    >
                        지원하기
                    </button>

                    <button
                        onClick={() => setSelectedJob(null)}
                        style={{
                            width: "100%",
                            marginTop: "8px",
                            padding: "10px",
                            background: "#eee",
                            border: "none",
                            borderRadius: "10px",
                            cursor: "pointer",
                        }}
                    >
                        닫기
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapPage;