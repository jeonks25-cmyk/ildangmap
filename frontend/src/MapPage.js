import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function MapPage() {
    const mapRef = useRef(null);
    const clustererRef = useRef(null);
    const overlayRefs = useRef([]);
    const myMarkerRef = useRef(null);
    const myCircleRef = useRef(null);

    const [map, setMap] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [mode, setMode] = useState("worker");
    const [visibleJobs, setVisibleJobs] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [distanceFilter, setDistanceFilter] = useState("all");
    const [suggestions, setSuggestions] = useState([]);
    const [user, setUser] = useState(null);
    const isMobile = window.innerWidth <= 950;

    const [form, setForm] = useState({
        title: "",
        region: "",
        pay: "",
        lat: "",
        lng: "",
        date: "",
        startTime: "",
        endTime: "",
        skill: "준기공",
        placeType: "apartment",
        description: "",
        recruitCount: 1,
        beginner: false,
        meal: false,
        urgent: false,
    });

    const [jobs, setJobs] = useState([
        {
            id: 1,
            title: "아파트 필름 보조",
            region: "대전 서구",
            pay: "150,000원",

            trustScore: 92,
            paymentRate: 100,
            cancelRate: 3,
            repeatRate: 78,

            lat: 36.3504,
            lng: 127.3845,
            date: "2026-05-10",
            startTime: "08:00",
            endTime: "17:00",
            skill: "준기공",
            placeType: "apartment",
            beginner: true,
            meal: true,
            urgent: true,
            recruitCount: 2,
            description: "아파트 필름 보조 구합니다.",
            applicants: [
                {
                    nickname: "김민수",

                    career: "경력 5년",

                    status: "pending",

                    skillLevel: "기공",

                    workCount: 84,

                    noShow: 0,

                    lateCount: 1,

                    repeatRate: 82,
                },
            ],
        },
        {
            id: 2,
            title: "상가 도장 보조",
            region: "대전 유성구",
            pay: "140,000원",
            trustScore: 81,
            paymentRate: 95,
            cancelRate: 8,
            repeatRate: 64,
            lat: 36.3621,
            lng: 127.3564,
            date: "2026-05-11",
            startTime: "08:00",
            endTime: "17:00",
            skill: "초보",
            placeType: "store",
            beginner: true,
            meal: false,
            urgent: false,
            recruitCount: 2,
            description: "상가 도장 보조 구합니다.",
            applicants: [],
        },
        {
            id: 3,
            title: "관공서 필름 기공",
            region: "대전 중구",
            pay: "200,000원",
            trustScore: 97,
            paymentRate: 100,
            cancelRate: 1,
            repeatRate: 91,
            lat: 36.3251,
            lng: 127.4214,
            date: "2026-05-12",
            startTime: "08:00",
            endTime: "17:00",
            skill: "기공",
            placeType: "public",
            beginner: false,
            meal: true,
            urgent: false,
            recruitCount: 1,
            description: "관공서 필름 기공 구합니다.",
            applicants: [],
        },
    ]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setMyLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {}
        );
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
            const kakaoMap = new window.kakao.maps.Map(mapRef.current, {
                center: new window.kakao.maps.LatLng(36.3504, 127.3845),
                level: 6,
            });

            setMap(kakaoMap);

            setTimeout(() => {
                kakaoMap.relayout();
                kakaoMap.setCenter(
                    new window.kakao.maps.LatLng(36.3504, 127.3845)
                );
            }, 300);

            const handleResize = () => {
                window.dispatchEvent(new Event("resize"));
            };

            window.addEventListener("orientationchange", handleResize);

            return () => {
                window.removeEventListener("orientationchange", handleResize);
            };
        });
    }, []);

    useEffect(() => {
        if (!map) return;

        const handleResize = () => {
            setTimeout(() => {
                map.relayout();
            }, 200);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [map]);

    useEffect(() => {
        if (!map) return;

        overlayRefs.current.forEach((overlay) => overlay.setMap(null));
        overlayRefs.current = [];

        if (clustererRef.current) {
            clustererRef.current.clear();
        }

        const clusterer = new window.kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 7,
            styles: [
                {
                    width: "48px",
                    height: "48px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: "50%",
                    textAlign: "center",
                    fontWeight: "800",
                    lineHeight: "48px",
                    border: "3px solid white",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
                },


            ],
        });

        clustererRef.current = clusterer;

        const markers = jobs.map((job) => {
            const position = new window.kakao.maps.LatLng(job.lat, job.lng);

            const marker = new window.kakao.maps.Marker({
                position,
                opacity: 0,
            });

            const markerEl = document.createElement("div");

            markerEl.className =
                selectedJob?.id === job.id
                    ? "custom-marker active"
                    : "custom-marker";

            markerEl.style.border = `1.5px solid ${getSkillColor(job.skill)}`;
            markerEl.innerHTML = `
                <span class="marker-emoji">${getPlaceEmoji(job.placeType, job.title)}</span>
                <span class="marker-pay">${job.pay}</span>
            `;

            markerEl.addEventListener("click", () => {
                setSelectedJob(job);
            });

            const overlay = new window.kakao.maps.CustomOverlay({
                position,
                content: markerEl,
                yAnchor: 1.15,
                zIndex: selectedJob?.id === job.id ? 999 : 10,
            });

            if (map.getLevel() <= 8) {
                overlay.setMap(map);
            }

            overlayRefs.current.push(overlay);

            window.kakao.maps.event.addListener(marker, "click", () => {
                setSelectedJob(job);
                map.panTo(position);
                map.setLevel(4);
            });

            return marker;
        });

        clusterer.addMarkers(markers);

        const updateOverlayVisibility = () => {
            const level = map.getLevel();

            overlayRefs.current.forEach((overlay) => {
                if (level <= 8) {
                    overlay.setMap(map);
                } else {
                    overlay.setMap(null);
                }
            });
        };

        const updateVisibleJobs = () => {
            const bounds = map.getBounds();

            let filtered = jobs.filter((job) => {
                const position = new window.kakao.maps.LatLng(job.lat, job.lng);
                return bounds.contain(position);
            });

            if (myLocation && distanceFilter !== "all") {
                filtered = filtered.filter((job) => {
                    const distance = getDistance(
                        myLocation.lat,
                        myLocation.lng,
                        job.lat,
                        job.lng
                    );

                    return distance <= Number(distanceFilter);
                });
            }

            if (myLocation) {
                filtered.sort((a, b) => {
                    const distanceA = getDistance(
                        myLocation.lat,
                        myLocation.lng,
                        a.lat,
                        a.lng
                    );

                    const distanceB = getDistance(
                        myLocation.lat,
                        myLocation.lng,
                        b.lat,
                        b.lng
                    );

                    return distanceA - distanceB;
                });
            }

            setVisibleJobs(filtered);
        };

        updateOverlayVisibility();
        updateVisibleJobs();

        window.kakao.maps.event.addListener(map, "idle", () => {
            updateOverlayVisibility();
            updateVisibleJobs();
        });

        window.kakao.maps.event.addListener(map, "zoom_changed", () => {
            updateOverlayVisibility();
        });
    }, [map, jobs, selectedJob, distanceFilter, myLocation]);

    const getSkillColor = (skill) => {
        if (skill === "초보") return "#34c759";
        if (skill === "준기공") return "#ff9500";
        if (skill === "기공") return "#007aff";
        if (skill === "오야지") return "#af52de";
        return "#1d2b72";
    };

    const getPlaceEmoji = (placeType, title) => {
        if (placeType === "apartment" || title.includes("아파트")) return "🏠";
        if (placeType === "store" || title.includes("상가")) return "🏢";
        if (placeType === "public" || title.includes("관공서")) return "🏛️";
        if (placeType === "factory" || title.includes("공장")) return "🏭";
        return "📍";
    };

    const searchAddress = (keyword) => {
        if (!window.kakao || !window.kakao.maps || !keyword) {
            setSuggestions([]);
            return;
        }

        const ps = new window.kakao.maps.services.Places();

        ps.keywordSearch(keyword, (data, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                setSuggestions(data);
            } else {
                setSuggestions([]);
            }
        });
    };

    const loginWithKakao = () => {
        window.location.href =
            `https://kauth.kakao.com/oauth/authorize` +
            `?client_id=e3ca13655de915a192d4448f0c03bf7d` +
            `&redirect_uri=http://localhost:3000/oauth` +
            `&response_type=code`;
    };

    const logout = () => {
        localStorage.removeItem("user");
        setUser(null);
    };

    const registerJob = () => {
        if (!form.title || !form.region || !form.pay || !form.lat || !form.lng) {
            alert("주소 검색 후 공고 제목과 일당을 입력해주세요.");
            return;
        }

        const newJob = {
            id: Date.now(),
            ...form,
            lat: Number(form.lat),
            lng: Number(form.lng),
            applicants: [],
        };

        setJobs([newJob, ...jobs]);

        setForm({
            title: "",
            region: "",
            pay: "",
            lat: "",
            lng: "",
            date: "",
            startTime: "",
            endTime: "",
            skill: "준기공",
            placeType: "apartment",
            description: "",
            recruitCount: 1,
            beginner: false,
            meal: false,
            urgent: false,
        });

        setSuggestions([]);
        alert("공고 등록 완료");
    };

    const getStatusText = (status) => {
        if (status === "approved") return "✅ 승인됨";
        if (status === "rejected") return "❌ 거절됨";
        return "⏳ 지원중";
    };

    const applyJob = () => {
        if (!selectedJob) return;

        if (!user) {
            alert("로그인 후 지원 가능");
            return;
        }

        const alreadyApplied = selectedJob.applicants.some(
            (applicant) => applicant.nickname === user.nickname
        );

        if (alreadyApplied) {
            alert("이미 지원함");
            return;
        }

        const updatedJobs = jobs.map((job) =>
            job.id === selectedJob.id
                ? {
                    ...job,
                    applicants: [
                        ...job.applicants,
                        {
                            nickname: user.nickname,
                            career: "경력 미등록",
                            status: "pending",
                        },
                    ],
                }
                : job
        );

        setJobs(updatedJobs);
        setSelectedJob(updatedJobs.find((job) => job.id === selectedJob.id));
    };

    const moveToMyLocation = () => {
        if (!map) return;

        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const moveLatLng = new window.kakao.maps.LatLng(lat, lng);

            map.panTo(moveLatLng);
            map.setLevel(4);

            if (myMarkerRef.current) {
                myMarkerRef.current.setMap(null);
            }

            if (myCircleRef.current) {
                myCircleRef.current.setMap(null);
            }

            const marker = new window.kakao.maps.Marker({
                map,
                position: moveLatLng,
            });

            const circle = new window.kakao.maps.Circle({
                center: moveLatLng,
                radius: 300,
                strokeWeight: 2,
                strokeColor: "#1d2b72",
                strokeOpacity: 0.8,
                fillColor: "#1d2b72",
                fillOpacity: 0.15,
            });

            circle.setMap(map);

            myMarkerRef.current = marker;
            myCircleRef.current = circle;
        });
    };

    const getDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    const getJobStatus = (job) => {
        const today = new Date();
        const jobDate = new Date(job.date);
        const diffTime = jobDate - today;
        const diffDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (job.applicants.length >= job.recruitCount) return "closed";
        if (diffDay <= 0) return "today";
        if (diffDay === 1) return "tomorrow";
        if (job.urgent) return "urgent";

        return "normal";
    };

    const updateApplicantStatus = (applicantNickname, newStatus) => {
        const updatedJobs = jobs.map((job) => {
            if (job.id !== selectedJob.id) return job;

            return {
                ...job,
                applicants: job.applicants.map((applicant) =>
                    applicant.nickname === applicantNickname
                        ? {
                            ...applicant,
                            status: newStatus,
                        }
                        : applicant
                ),
            };
        });

        setJobs(updatedJobs);
        setSelectedJob(updatedJobs.find((job) => job.id === selectedJob.id));
    };

    const moveToJob = (job) => {
        setSelectedJob(job);

        if (!map) return;

        const moveLatLng = new window.kakao.maps.LatLng(job.lat, job.lng);

        map.panTo(moveLatLng);
    };

    return (
        <div className="app">
            <aside className="sidebar desktop-sidebar">
                <h1>일당맵</h1>

                <p className="sub-text">기술자 · 오야지 연결</p>

                <div className="login-box">
                    {user ? (
                        <>
                            <img
                                src={user.profileImage}
                                alt=""
                                className="profile-img"
                            />

                            <div className="user-name">{user.nickname}</div>

                            <button className="logout-btn" onClick={logout}>
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button className="kakao-login-btn" onClick={loginWithKakao}>
                            카카오 로그인
                        </button>
                    )}
                </div>

                <div className="mode-buttons">
                    <button
                        className={`mode-btn ${mode === "worker" ? "active" : ""}`}
                        onClick={() => setMode("worker")}
                    >
                        기술자
                    </button>

                    <button
                        className={`mode-btn ${mode === "boss" ? "active" : ""}`}
                        onClick={() => setMode("boss")}
                    >
                        오야지
                    </button>
                </div>

                {mode === "boss" && (
                    <div className="register-panel">
                        <input
                            placeholder="공고 제목"
                            value={form.title}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    title: e.target.value,
                                })
                            }
                        />

                        <div className="address-input-wrap">
                            <input
                                placeholder="주소 검색"
                                value={form.region}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        region: e.target.value,
                                    });

                                    searchAddress(e.target.value);
                                }}
                            />

                            {suggestions.length > 0 && (
                                <div className="address-suggestions">
                                    {suggestions.map((place) => (
                                        <div
                                            key={place.id}
                                            className="suggestion-item"
                                            onClick={() => {
                                                setForm({
                                                    ...form,
                                                    region: place.place_name,
                                                    lat: place.y,
                                                    lng: place.x,
                                                });

                                                setSuggestions([]);

                                                if (map) {
                                                    const moveLatLng =
                                                        new window.kakao.maps.LatLng(
                                                            place.y,
                                                            place.x
                                                        );

                                                    map.panTo(moveLatLng);
                                                    map.setLevel(4);
                                                }
                                            }}
                                        >
                                            <strong>{place.place_name}</strong>
                                            <p>{place.address_name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input
                            placeholder="일당 예: 150,000원"
                            value={form.pay}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    pay: e.target.value,
                                })
                            }
                        />

                        <select
                            value={form.skill}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    skill: e.target.value,
                                })
                            }
                        >
                            <option value="초보">초보</option>
                            <option value="준기공">준기공</option>
                            <option value="기공">기공</option>
                            <option value="오야지">오야지</option>
                        </select>

                        <select
                            value={form.placeType}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    placeType: e.target.value,
                                })
                            }
                        >
                            <option value="apartment">아파트</option>
                            <option value="store">상가</option>
                            <option value="public">관공서</option>
                            <option value="factory">공장</option>
                        </select>

                        <select
                            value={form.recruitCount}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    recruitCount: Number(e.target.value),
                                })
                            }
                        >
                            <option value={1}>1명</option>
                            <option value={2}>2명</option>
                            <option value={3}>3명</option>
                            <option value={4}>4명</option>
                        </select>

                        <textarea
                            placeholder="상세 설명"
                            value={form.description}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    description: e.target.value,
                                })
                            }
                        />

                        <label>
                            <input
                                type="checkbox"
                                checked={form.beginner}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        beginner: e.target.checked,
                                    })
                                }
                            />
                            초보 가능
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={form.meal}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        meal: e.target.checked,
                                    })
                                }
                            />
                            식대 제공
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={form.urgent}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        urgent: e.target.checked,
                                    })
                                }
                            />
                            긴급 모집
                        </label>

                        <button className="register-btn" onClick={registerJob}>
                            공고 등록
                        </button>
                    </div>
                )}

                <h2>공고 목록</h2>

                <div className="distance-filters">
                    <button
                        className={distanceFilter === "3" ? "active-filter" : ""}
                        onClick={() => setDistanceFilter("3")}
                    >
                        3km
                    </button>

                    <button
                        className={distanceFilter === "5" ? "active-filter" : ""}
                        onClick={() => setDistanceFilter("5")}
                    >
                        5km
                    </button>

                    <button
                        className={distanceFilter === "10" ? "active-filter" : ""}
                        onClick={() => setDistanceFilter("10")}
                    >
                        10km
                    </button>

                    <button
                        className={distanceFilter === "all" ? "active-filter" : ""}
                        onClick={() => setDistanceFilter("all")}
                    >
                        전체
                    </button>
                </div>

                <div className="job-list">
                    {visibleJobs.map((job) => (
                        <div
                            key={job.id}
                            className={`job-card ${
                                job.urgent ? "urgent-card" : ""
                            } ${selectedJob?.id === job.id ? "selected-job" : ""}`}
                            onClick={() => moveToJob(job)}
                        >
                            <div className={`job-status ${getJobStatus(job)}`}>
                                {getJobStatus(job) === "today" && "오늘마감"}
                                {getJobStatus(job) === "tomorrow" && "내일작업"}
                                {getJobStatus(job) === "closed" && "모집완료"}
                                {getJobStatus(job) === "urgent" && "긴급"}
                                {getJobStatus(job) === "normal" && "모집중"}
                            </div>

                            <strong>{job.title}</strong>

                            <div className="job-tags">
                                <div className="job-tag">{job.skill}</div>

                                {job.beginner && <div className="job-tag">초보가능</div>}
                                {job.meal && <div className="job-tag">식대제공</div>}
                                {job.urgent && <div className="job-tag">급구</div>}
                            </div>

                            <p>📍 {job.region}</p>
                            <p>💰 {job.pay}</p>
                            <div className="trust-mini">

    <span className="trust-badge">
        ⭐ 신뢰 {job.trustScore}
    </span>

                                <span className="trust-sub">
        재호출 {job.repeatRate}%
    </span>

                            </div>

                            <p>
                                👷 {job.recruitCount}명 모집 · {job.applicants.length}명 지원
                            </p>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="map-area">

                {/* 모바일 UI */}
                {isMobile && (
                    <>

                        {/* 상단바 */}
                        <div className="mobile-topbar">

                            <div>
                                <div className="mobile-logo">
                                    일당맵
                                </div>

                                <div className="mobile-sub">
                                    기술자 연결 플랫폼
                                </div>
                            </div>

                            <div className="mobile-top-right">

                                <button
                                    className="kakao-login-btn"
                                    onClick={() => alert("카카오 로그인 준비중")}
                                >
                                    카카오 로그인
                                </button>

                                <div className="mobile-toggle">

                                    <button
                                        className={`toggle-btn ${
                                            mode === "worker" ? "active" : ""
                                        }`}
                                        onClick={() => setMode("worker")}
                                    >
                                        기술자
                                    </button>

                                    <button
                                        className={`toggle-btn ${
                                            mode === "boss" ? "active" : ""
                                        }`}
                                        onClick={() => setMode("boss")}
                                    >
                                        오야지
                                    </button>

                                </div>
                            </div>
                        </div>

                        {/* 현재 위치 버튼 */}
                        <button className="my-location-btn">
                            📍
                        </button>

                        {/* 하단 네비 */}
                        <div className="mobile-bottom-nav">

                            <button className="bottom-nav-btn">
                                🗺️
                                <span>지도</span>
                            </button>

                            <button className="bottom-nav-btn">
                                📅
                                <span>캘린더</span>
                            </button>

                            <button className="bottom-nav-btn">
                                💬
                                <span>채팅방</span>
                            </button>

                        </div>

                    </>
                )}

                {/* 지도 */}
                <div
                    id="map"
                    ref={mapRef}
                    className="map"
                />

                {selectedJob && (

                    <>

                        {/* PC 우측 카드 */}

                        <div className="job-detail-card desktop-only">

                            <div className={`sheet-status ${getJobStatus(selectedJob)}`}>
                                {getJobStatus(selectedJob) === "today" && "오늘마감"}
                                {getJobStatus(selectedJob) === "tomorrow" && "내일작업"}
                                {getJobStatus(selectedJob) === "closed" && "모집완료"}
                                {getJobStatus(selectedJob) === "urgent" && "긴급"}
                                {getJobStatus(selectedJob) === "normal" && "모집중"}
                            </div>

                            <h3>{selectedJob.title}</h3>

                            <p>{selectedJob.region}</p>

                            <p>💰 {selectedJob.pay}</p>

                            <p>
                                👥 {selectedJob.recruitCount}명 모집 /
                                {selectedJob.applicants.length}명 지원
                            </p>

                            <p>
                                ⏰ {selectedJob.startTime || "08:00"} ~
                                {selectedJob.endTime || "17:00"}
                            </p>

                            {mode === "boss" && (

                                <div className="applicant-section">

                                    <h4>지원자 목록</h4>

                                    {selectedJob.applicants.length === 0 && (
                                        <p className="empty-text">
                                            아직 지원자가 없습니다.
                                        </p>
                                    )}

                                    {selectedJob.applicants.map((applicant, index) => (

                                        <div
                                            key={index}
                                            className="applicant-card"
                                        >

                                            <h5>
                                                👤 {applicant.nickname}
                                            </h5>

                                            <p>
                                                📌 {applicant.career}
                                            </p>

                                            <div className="worker-trust-box">

                                                <div className="worker-badge">
                                                    {applicant.skillLevel}
                                                </div>

                                                <div className="worker-mini-info">
                                                    작업 {applicant.workCount}회
                                                </div>

                                                <div className="worker-mini-info">
                                                    노쇼 {applicant.noShow}회
                                                </div>

                                                <div className="worker-mini-info">
                                                    재호출 {applicant.repeatRate}%
                                                </div>

                                            </div>

                                            <p style={{ marginTop: "10px" }}>
                                                {getStatusText(applicant.status)}
                                            </p>

                                            <div className="applicant-buttons">

                                                <button
                                                    className="approve-btn"
                                                    onClick={() =>
                                                        updateApplicantStatus(
                                                            applicant.nickname,
                                                            "approved"
                                                        )
                                                    }
                                                >
                                                    승인
                                                </button>

                                                <button
                                                    className="reject-btn"
                                                    onClick={() =>
                                                        updateApplicantStatus(
                                                            applicant.nickname,
                                                            "rejected"
                                                        )
                                                    }
                                                >
                                                    거절
                                                </button>

                                            </div>

                                        </div>
                                    ))}

                                </div>
                            )}

                            <div className="card-buttons">

                                <div className="trust-box">

                                    <h4>오야지 신뢰 정보</h4>

                                    <div className="trust-row">
                                        <span>정산 완료율</span>
                                        <strong>{selectedJob.paymentRate}%</strong>
                                    </div>

                                    <div className="trust-row">
                                        <span>작업 취소율</span>
                                        <strong>{selectedJob.cancelRate}%</strong>
                                    </div>

                                    <div className="trust-row">
                                        <span>재호출률</span>
                                        <strong>{selectedJob.repeatRate}%</strong>
                                    </div>

                                </div>

                                <button className="phone-btn">
                                    전화
                                </button>

                                <button className="kakao-btn">
                                    카톡
                                </button>

                                <button className="apply-btn">
                                    지원하기
                                </button>

                            </div>

                        </div>

                        {/* 모바일 하단 시트 */}

                        <div className="bottom-sheet mobile-only">

                            <div className="drag-bar"></div>

                            <div className={`sheet-status ${getJobStatus(selectedJob)}`}>
                                {getJobStatus(selectedJob) === "today" && "오늘마감"}
                                {getJobStatus(selectedJob) === "tomorrow" && "내일작업"}
                                {getJobStatus(selectedJob) === "closed" && "모집완료"}
                                {getJobStatus(selectedJob) === "urgent" && "긴급"}
                                {getJobStatus(selectedJob) === "normal" && "모집중"}
                            </div>

                            <h3>{selectedJob.title}</h3>

                            <p>{selectedJob.region}</p>

                            <p>💰 {selectedJob.pay}</p>

                            <p>
                                👥 {selectedJob.recruitCount}명 모집 /
                                {selectedJob.applicants.length}명 지원
                            </p>

                            <p>
                                ⏰ {selectedJob.startTime || "08:00"} ~
                                {selectedJob.endTime || "17:00"}
                            </p>

                            <div className="card-buttons">

                                <button className="phone-btn">
                                    전화
                                </button>

                                <button className="kakao-btn">
                                    카톡
                                </button>

                                <button className="apply-btn">
                                    지원하기
                                </button>

                            </div>

                        </div>

                    </>

                )}

                <button className="location-btn" onClick={moveToMyLocation}>
                    📍
                </button>
            </main>
        </div>
    );
}