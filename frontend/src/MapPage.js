import React, { useEffect, useRef, useState } from "react";
import "./App.css";

function MapPage() {
    const mapRef = useRef(null);

    const [jobs, setJobs] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8080/jobs")
            .then((res) => res.json())
            .then((data) => {
                setJobs(data);
            });
    }, []);

    useEffect(() => {
        if (!window.kakao) return;

        window.kakao.maps.load(() => {
            const container = mapRef.current;

            const options = {
                center: new window.kakao.maps.LatLng(36.3504, 127.3845),
                level: 8,
            };

            const map = new window.kakao.maps.Map(container, options);

            setTimeout(() => {
                map.relayout();
                map.setCenter(new window.kakao.maps.LatLng(36.3504, 127.3845));
            }, 500);

            jobs.forEach((job) => {
                const marker = new window.kakao.maps.Marker({
                    map: map,
                    position: new window.kakao.maps.LatLng(job.lat, job.lng),
                });

                const infowindow = new window.kakao.maps.InfoWindow({
                    content: `
            <div style="padding:8px;font-size:12px;">
              <b>${job.title}</b><br/>
              ${job.location}<br/>
              💰 ${job.pay}
            </div>
          `,
                });

                window.kakao.maps.event.addListener(marker, "click", () => {
                    infowindow.open(map, marker);
                });
            });
        });
    }, [jobs]);

    return (
        <div className="map-page">
            <div className="top-bar">
                <div>
                    <div className="logo">일당맵</div>
                    <div className="sub-logo">기술자 · 오야지 연결</div>
                </div>

                <div className="mode-buttons">
                    <button className="active">기술자</button>
                    <button>오야지</button>
                </div>

                <div className="search-box">
                    <input type="text" placeholder="주소 검색" />
                    <button>검색</button>
                </div>

                <button className="register-btn">등록하기</button>
            </div>

            <div ref={mapRef} className="map-container"></div>

            <div className="job-panel">
                <h2>내 공고</h2>

                {jobs.map((job) => (
                    <div key={job.id} className="job-card">
                        <h3>{job.title}</h3>
                        <p>📍 {job.location}</p>
                        <p>💰 {job.pay}</p>
                    </div>
                ))}
            </div>

            <div className="bottom-nav">
                <button>🗺️</button>
                <button>📅</button>
                <button>⚙️</button>
            </div>
        </div>
    );
}

export default MapPage;