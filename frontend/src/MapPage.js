import React, { useEffect, useRef, useState } from "react";
import "./App.css";

function MapPage() {

    const mapRef = useRef(null);

    const [jobs, setJobs] = useState([]);

    const [selectedJob, setSelectedJob] = useState(null);

    useEffect(() => {

        fetch("http://localhost:8080/jobs")
            .then((res) => res.json())
            .then((data) => {
                setJobs(data);
            });

    }, []);

    useEffect(() => {

        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {

            const container = mapRef.current;

            const options = {
                center: new window.kakao.maps.LatLng(36.3504, 127.3845),
                level: 8,
            };

            const map = new window.kakao.maps.Map(container, options);

            jobs.forEach((job) => {

                const marker = new window.kakao.maps.Marker({
                    map: map,
                    position: new window.kakao.maps.LatLng(job.lat, job.lng),
                });

                window.kakao.maps.event.addListener(marker, "click", () => {
                    setSelectedJob(job);
                });

            });

        });

    }, [jobs]);

    return (
        <div className="page">

            <div className="topbar">

                <div className="logo">
                    <div className="title">일당맵</div>
                    <div className="sub">기술자 · 오야지 연결</div>
                </div>

                <div className="mode-buttons">
                    <button className="active">기술자</button>
                    <button>오야지</button>
                </div>

                <div className="search-area">
                    <input placeholder="주소 검색" />
                    <button>검색</button>
                </div>

                <button className="register-btn">등록하기</button>

            </div>

            <div className="content">

                <div className="left-panel">

                    <div className="job-list-title">
                        내 공고
                    </div>

                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="job-card"
                            onClick={() => setSelectedJob(job)}
                        >
                            <div className="job-title">
                                {job.title}
                            </div>

                            <div className="job-location">
                                📍 {job.location}
                            </div>

                            <div className="job-pay">
                                💰 {job.pay}원
                            </div>
                        </div>
                    ))}

                </div>

                <div className="map-wrap">
                    <div ref={mapRef} className="map"></div>
                </div>

            </div>

            <div className="bottom-nav">
                <button>🗺️</button>
                <button>📅</button>
                <button>⚙️</button>
            </div>

            {selectedJob && (
                <div className="bottom-sheet">

                    <div className="sheet-handle"></div>

                    <div className="sheet-title">
                        {selectedJob.title}
                    </div>

                    <div className="sheet-location">
                        📍 {selectedJob.location}
                    </div>

                    <div className="sheet-pay">
                        💰 {selectedJob.pay}원
                    </div>

                    <button className="apply-btn">
                        지원하기
                    </button>

                </div>
            )}

        </div>
    );
}

export default MapPage;