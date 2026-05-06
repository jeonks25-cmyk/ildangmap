import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function MapPage() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const clustererRef = useRef(null);

    const [selectedJob, setSelectedJob] = useState(null);

    const [jobs, setJobs] = useState([
        {
            id: 1,
            title: "아파트 필름 보조",
            region: "대전 서구",
            pay: "150000원",
            lat: 36.3504,
            lng: 127.3845,
            applicants: 3,
            desc: "아파트 필름 보조 구합니다.",
        },
        {
            id: 2,
            title: "상가 필름 시공",
            region: "대전 중구",
            pay: "200000원",
            lat: 36.325,
            lng: 127.421,
            applicants: 1,
            desc: "상가 필름 시공 가능하신 분.",
        },
    ]);

    const [title, setTitle] = useState("");
    const [region, setRegion] = useState("");
    const [pay, setPay] = useState("");
    const [address, setAddress] = useState("");

    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
            const map = new window.kakao.maps.Map(mapRef.current, {
                center: new window.kakao.maps.LatLng(36.3504, 127.3845),
                level: 13,
            });

            mapInstanceRef.current = map;

            const clusterer = new window.kakao.maps.MarkerClusterer({
                map: map,
                averageCenter: true,
                minLevel: 7,
            });

            clustererRef.current = clusterer;

            window.kakao.maps.event.addListener(map, "click", () => {
                setSelectedJob(null);
            });

            renderMarkers();
        });
    }, []);

    useEffect(() => {
        renderMarkers();
    }, [jobs]);

    const renderMarkers = () => {
        if (!mapInstanceRef.current || !clustererRef.current) return;

        clustererRef.current.clear();

        const markers = jobs.map((job) => {
            const marker = new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(job.lat, job.lng),
            });

            window.kakao.maps.event.addListener(marker, "click", () => {
                setSelectedJob(job);

                mapInstanceRef.current.panTo(
                    new window.kakao.maps.LatLng(job.lat, job.lng)
                );
            });

            return marker;
        });

        clustererRef.current.addMarkers(markers);
    };

    const handleAddressChange = (e) => {
        const value = e.target.value;

        setAddress(value);

        if (!value.trim()) {
            setSuggestions([]);
            return;
        }

        const ps = new window.kakao.maps.services.Places();

        ps.keywordSearch(value, (data, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                setSuggestions(data.slice(0, 5));
            } else {
                setSuggestions([]);
            }
        });
    };

    const selectSuggestion = (place) => {
        setAddress(place.place_name);
        setSuggestions([]);

        if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(
                new window.kakao.maps.LatLng(place.y, place.x)
            );
        }
    };

    const addJob = () => {
        if (!title || !region || !pay || !address) {
            alert("모든 항목 입력");
            return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, (result, status) => {
            if (status !== window.kakao.maps.services.Status.OK) {
                alert("주소 검색 실패");
                return;
            }

            const lat = Number(result[0].y);
            const lng = Number(result[0].x);

            const newJob = {
                id: Date.now(),
                title,
                region,
                pay: pay + "원",
                lat,
                lng,
                applicants: 0,
                desc: `${title} 구합니다.`,
            };

            setJobs((prev) => [...prev, newJob]);

            setTitle("");
            setRegion("");
            setPay("");
            setAddress("");
            setSuggestions([]);

            mapInstanceRef.current.panTo(
                new window.kakao.maps.LatLng(lat, lng)
            );
        });
    };

    const moveToMyLocation = () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            mapInstanceRef.current.panTo(
                new window.kakao.maps.LatLng(lat, lng)
            );

            new window.kakao.maps.Marker({
                map: mapInstanceRef.current,
                position: new window.kakao.maps.LatLng(lat, lng),
            });
        });
    };

    const applyJob = () => {
        const updated = jobs.map((job) =>
            job.id === selectedJob.id
                ? { ...job, applicants: job.applicants + 1 }
                : job
        );

        setJobs(updated);

        setSelectedJob(
            updated.find((job) => job.id === selectedJob.id)
        );
    };

    return (
        <div className="app">

            <aside className="sidebar">
                <h1>일당맵</h1>
                <p className="sub-text">기술자 · 오야지 연결</p>

                <h2>내 공고</h2>

                <div className="job-list">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="job-card"
                            onClick={() => {
                                setSelectedJob(job);

                                mapInstanceRef.current.panTo(
                                    new window.kakao.maps.LatLng(
                                        job.lat,
                                        job.lng
                                    )
                                );
                            }}
                        >
                            <strong>{job.title}</strong>

                            <p>📍 {job.region}</p>

                            <p>💰 {job.pay}</p>

                            <p>👷 지원자 {job.applicants}명</p>
                        </div>
                    ))}
                </div>
            </aside>

            <div className="register-panel">

                <div className="mode-buttons">
                    <button className="active">기술자</button>
                    <button>오야지</button>
                </div>

                <input
                    placeholder="공고 제목"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <input
                    placeholder="지역"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                />

                <input
                    placeholder="일당"
                    value={pay}
                    onChange={(e) => setPay(e.target.value)}
                />

                <input
                    placeholder="주소 입력"
                    value={address}
                    onChange={handleAddressChange}
                />

                {suggestions.length > 0 && (
                    <div className="suggestion-box">
                        {suggestions.map((place) => (
                            <div
                                key={place.id}
                                className="suggestion-item"
                                onClick={() => selectSuggestion(place)}
                            >
                                <strong>{place.place_name}</strong>

                                <p>{place.address_name}</p>
                            </div>
                        ))}
                    </div>
                )}

                <button className="register-btn" onClick={addJob}>
                    공고 등록
                </button>
            </div>

            <main className="map-area">
                <div ref={mapRef} className="map"></div>

                <button
                    className="my-location-btn"
                    onClick={moveToMyLocation}
                >
                    📍
                </button>

                <div className="bottom-nav">
                    <button>🗺️</button>
                    <button>📋</button>
                    <button>⚙️</button>
                </div>

                {selectedJob && (
                    <div className="bottom-sheet">

                        <button
                            className="close-btn"
                            onClick={() => setSelectedJob(null)}
                        >
                            ×
                        </button>

                        <div className="sheet-bar"></div>

                        <h3>{selectedJob.title}</h3>

                        <p>📍 {selectedJob.region}</p>

                        <p>💰 {selectedJob.pay}</p>

                        <p>{selectedJob.desc}</p>

                        <p>
                            👷 현재 지원자 : {selectedJob.applicants}명
                        </p>

                        <button
                            className="apply-btn"
                            onClick={applyJob}
                        >
                            지원하기
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}