import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function MapPage() {

    const mapRef = useRef(null);

    const clustererRef = useRef(null);

    const myMarkerRef = useRef(null);

    const myCircleRef = useRef(null);

    const [map, setMap] = useState(null);

    const [selectedJob, setSelectedJob] =
        useState(null);

    const [mode, setMode] =
        useState("worker");

    const [visibleJobs, setVisibleJobs] =
        useState([]);

    const [myLocation, setMyLocation] =
        useState(null);

    const [distanceFilter, setDistanceFilter] =
        useState("all");

    const [user, setUser] =
        useState(null);

    const [jobs, setJobs] = useState([

        {
            id: 1,

            title: "아파트 필름 보조",

            region: "대전 서구",

            pay: "150000원",

            lat: 36.3504,
            lng: 127.3845,

            date: "2026-05-10",

            startTime: "08:00",

            endTime: "17:00",

            skill: "인테리어 필름",

            beginner: true,

            meal: true,

            urgent: true,

            recruitCount: 2,

            description:
                "아파트 필름 보조 구합니다.",

            applicants: [
                {
                    nickname: "김민수",

                    career: "경력 5년",

                    status: "pending",
                },
            ],
        },
    ]);

    useEffect(() => {

        navigator.geolocation.getCurrentPosition(
            (position) => {

                setMyLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            }
        );

    }, []);

    useEffect(() => {

        const savedUser =
            localStorage.getItem("user");

        if (savedUser) {

            setUser(
                JSON.parse(savedUser)
            );
        }

    }, []);

    useEffect(() => {

        if (!window.kakao || !window.kakao.maps)
            return;

        window.kakao.maps.load(() => {

            const kakaoMap =
                new window.kakao.maps.Map(
                    mapRef.current,
                    {
                        center:
                            new window.kakao.maps.LatLng(
                                36.3504,
                                127.3845
                            ),

                        level: 13,
                    }
                );

            setMap(kakaoMap);

        });

    }, []);

    useEffect(() => {

        if (!map) return;

        if (clustererRef.current) {
            clustererRef.current.clear();
        }

        const clusterer =
            new window.kakao.maps.MarkerClusterer({
                map,
                averageCenter: true,
                minLevel: 7,
            });

        clustererRef.current = clusterer;

        const markers = jobs.map((job) => {

            const marker =
                new window.kakao.maps.Marker({
                    position:
                        new window.kakao.maps.LatLng(
                            job.lat,
                            job.lng
                        ),
                });

            window.kakao.maps.event.addListener(
                marker,
                "click",
                () => {

                    setSelectedJob(job);

                    map.panTo(
                        new window.kakao.maps.LatLng(
                            job.lat,
                            job.lng
                        )
                    );
                }
            );

            return marker;
        });

        clusterer.addMarkers(markers);

        const updateVisibleJobs = () => {

            const bounds =
                map.getBounds();

            let filtered =
                jobs.filter((job) => {

                    const position =
                        new window.kakao.maps.LatLng(
                            job.lat,
                            job.lng
                        );

                    return bounds.contain(
                        position
                    );
                });

            if (
                myLocation &&
                distanceFilter !== "all"
            ) {

                filtered =
                    filtered.filter((job) => {

                        const distance =
                            getDistance(
                                myLocation.lat,
                                myLocation.lng,
                                job.lat,
                                job.lng
                            );

                        return (
                            distance <=
                            Number(distanceFilter)
                        );
                    });
            }

            if (myLocation) {

                filtered.sort((a, b) => {

                    const distanceA =
                        getDistance(
                            myLocation.lat,
                            myLocation.lng,
                            a.lat,
                            a.lng
                        );

                    const distanceB =
                        getDistance(
                            myLocation.lat,
                            myLocation.lng,
                            b.lat,
                            b.lng
                        );

                    return (
                        distanceA -
                        distanceB
                    );
                });
            }


            setVisibleJobs(filtered);
        };

        updateVisibleJobs();

        window.kakao.maps.event.addListener(
            map,
            "idle",
            updateVisibleJobs
        );

    }, [map, jobs]);

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

    const getStatusText = (status) => {

        if (status === "approved")
            return "✅ 승인됨";

        if (status === "rejected")
            return "❌ 거절됨";

        return "⏳ 지원중";
    };

    const applyJob = () => {

        if (!selectedJob) return;

        if (!user) {

            alert("로그인 후 지원 가능");

            return;
        }

        const alreadyApplied =
            selectedJob.applicants.some(
                (applicant) =>
                    applicant.nickname ===
                    user.nickname
            );

        if (alreadyApplied) {

            alert("이미 지원함");

            return;
        }

        const updatedJobs =
            jobs.map((job) =>

                job.id === selectedJob.id
                    ? {
                        ...job,

                        applicants: [
                            ...job.applicants,

                            {
                                nickname:
                                user.nickname,

                                career:
                                    "경력 미등록",

                                status:
                                    "pending",
                            },
                        ],
                    }
                    : job
            );

        setJobs(updatedJobs);

        setSelectedJob(
            updatedJobs.find(
                (job) =>
                    job.id === selectedJob.id
            )
        );
    };

    const moveToMyLocation = () => {

        if (!map) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {

                const lat =
                    position.coords.latitude;

                const lng =
                    position.coords.longitude;

                const moveLatLng =
                    new window.kakao.maps.LatLng(
                        lat,
                        lng
                    );

                map.panTo(moveLatLng);

                if (myMarkerRef.current) {
                    myMarkerRef.current.setMap(null);
                }

                if (myCircleRef.current) {
                    myCircleRef.current.setMap(null);
                }

                const marker =
                    new window.kakao.maps.Marker({

                        map: map,

                        position:
                        moveLatLng,
                    });

                const circle =
                    new window.kakao.maps.Circle({

                        center: moveLatLng,

                        radius: 300,

                        strokeWeight: 2,

                        strokeColor: "#1d2b72",

                        strokeOpacity: 0.8,

                        fillColor: "#1d2b72",

                        fillOpacity: 0.15,
                    });

                circle.setMap(map);

                myMarkerRef.current =
                    marker;

                myCircleRef.current =
                    circle;
            }
        );
    };

    const getDistance = (
        lat1,
        lng1,
        lat2,
        lng2
    ) => {

        const R = 6371;

        const dLat =
            (lat2 - lat1) *
            Math.PI /
            180;

        const dLng =
            (lng2 - lng1) *
            Math.PI /
            180;

        const a =
            Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +

            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *

            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        return R * c;
    };

    const getJobStatus = (job) => {

        const today =
            new Date();

        const jobDate =
            new Date(job.date);

        const diffTime =
            jobDate - today;

        const diffDay =
            Math.ceil(
                diffTime /
                (1000 * 60 * 60 * 24)
            );

        if (
            job.applicants.length >=
            job.recruitCount
        ) {

            return "closed";
        }

        if (diffDay <= 0) {

            return "today";
        }

        if (diffDay === 1) {

            return "tomorrow";
        }

        if (job.urgent) {

            return "urgent";
        }

        return "normal";
    };

    const updateApplicantStatus = (
        applicantNickname,
        newStatus
    ) => {

        const updatedJobs =
            jobs.map((job) => {

                if (
                    job.id !==
                    selectedJob.id
                )
                    return job;

                return {
                    ...job,

                    applicants:
                        job.applicants.map(
                            (
                                applicant
                            ) =>

                                applicant.nickname ===
                                applicantNickname
                                    ? {
                                        ...applicant,

                                        status:
                                        newStatus,
                                    }
                                    : applicant
                        ),
                };
            });

        setJobs(updatedJobs);

        setSelectedJob(
            updatedJobs.find(
                (job) =>
                    job.id === selectedJob.id
            )
        );
    };

    return (
        <div className="app">

            <aside className="sidebar">

                <h1>일당맵</h1>

                <p className="sub-text">
                    기술자 · 오야지 연결
                </p>

                <div className="login-box">

                    {user ? (

                        <>

                            <img
                                src={user.profileImage}
                                alt=""
                                className="profile-img"
                            />

                            <div className="user-name">
                                {user.nickname}
                            </div>

                            <button
                                className="logout-btn"
                                onClick={logout}
                            >
                                로그아웃
                            </button>

                        </>

                    ) : (

                        <button
                            className="kakao-login-btn"
                            onClick={loginWithKakao}
                        >
                            카카오 로그인
                        </button>

                    )}

                </div>

                <div className="mode-buttons">

                    <button
                        className={
                            mode === "worker"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setMode("worker")
                        }
                    >
                        기술자
                    </button>

                    <button
                        className={
                            mode === "boss"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setMode("boss")
                        }
                    >
                        오야지
                    </button>

                </div>

                <h2>
                    공고 목록
                </h2>

                <div className="distance-filters">

                    <button
                        className={
                            distanceFilter === "3"
                                ? "active-filter"
                                : ""
                        }
                        onClick={() =>
                            setDistanceFilter("3")
                        }
                    >
                        3km
                    </button>

                    <button
                        className={
                            distanceFilter === "5"
                                ? "active-filter"
                                : ""
                        }
                        onClick={() =>
                            setDistanceFilter("5")
                        }
                    >
                        5km
                    </button>

                    <button
                        className={
                            distanceFilter === "10"
                                ? "active-filter"
                                : ""
                        }
                        onClick={() =>
                            setDistanceFilter("10")
                        }
                    >
                        10km
                    </button>

                    <button
                        className={
                            distanceFilter === "all"
                                ? "active-filter"
                                : ""
                        }
                        onClick={() =>
                            setDistanceFilter("all")
                        }
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
                            }`}
                            onClick={() =>
                                setSelectedJob(
                                    job
                                )
                            }
                        >
                            <div
                                className={`job-status ${
                                    getJobStatus(job)
                                }`}
                            >

                                {getJobStatus(job) === "today" &&
                                    "오늘마감"}

                                {getJobStatus(job) === "tomorrow" &&
                                    "내일작업"}

                                {getJobStatus(job) === "closed" &&
                                    "모집완료"}

                                {getJobStatus(job) === "urgent" &&
                                    "긴급"}

                            </div>

                            <strong>
                                {job.title}
                            </strong>

                            <div className="job-tags">

                                {job.beginner && (

                                    <div className="job-tag">
                                        초보가능
                                    </div>
                                )}

                                {job.meal && (

                                    <div className="job-tag">
                                        식대제공
                                    </div>
                                )}

                                {job.urgent && (

                                    <div className="job-tag">
                                        급구
                                    </div>
                                )}

                            </div>

                            <p>
                                📍 {job.region}
                            </p>

                            <p>
                                💰 {job.pay}
                            </p>

                            <p>
                                👷{" "}
                                {
                                    job.applicants
                                        .length
                                }
                                명 지원
                            </p>

                        </div>
                    ))}

                </div>

            </aside>

            <main className="map-area">

                <div
                    ref={mapRef}
                    className="map"
                ></div>

                {selectedJob && (

                    <div className="bottom-sheet">

                        <div className="drag-bar"></div>

                        <h3>
                            {selectedJob.title}
                        </h3>

                        <p>
                            📍{" "}
                            {
                                selectedJob.region
                            }
                        </p>

                        <p>
                            💰{" "}
                            {
                                selectedJob.pay
                            }
                        </p>

                        <p>
                            {
                                selectedJob.description
                            }
                        </p>

                        {mode === "boss" && (

                            <div
                                style={{
                                    marginTop:
                                        "16px",
                                }}
                            >

                                <strong>
                                    지원자 목록
                                </strong>

                                {selectedJob
                                        .applicants
                                        .length ===
                                    0 && (
                                        <p>
                                            아직 지원자 없음
                                        </p>
                                    )}

                                {selectedJob.applicants.map(
                                    (
                                        applicant,
                                        index
                                    ) => (

                                        <div
                                            key={
                                                index
                                            }
                                            className="applicant-card"
                                        >

                                            <p>
                                                👤{" "}
                                                {
                                                    applicant.nickname
                                                }
                                            </p>

                                            <p>
                                                📌{" "}
                                                {
                                                    applicant.career
                                                }
                                            </p>

                                            <p>
                                                {getStatusText(
                                                    applicant.status
                                                )}
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
                                    )
                                )}

                            </div>
                        )}

                        <div className="sheet-buttons">

                            <button className="call-btn">
                                📞 전화
                            </button>

                            <button className="kakao-btn">
                                💬 카톡
                            </button>

                            {mode ===
                                "worker" && (

                                    <button
                                        className="apply-btn"
                                        onClick={
                                            applyJob
                                        }
                                    >
                                        지원하기
                                    </button>
                                )}

                        </div>

                    </div>
                )}

                <button
                    className="location-btn"
                    onClick={moveToMyLocation}
                >
                    📍
                </button>

            </main>

        </div>
    );
}