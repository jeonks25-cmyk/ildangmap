import React, { useState } from "react";

function WorkerSearchPage() {
    const [region, setRegion] = useState("");
    const [skill, setSkill] = useState("");
    const [onlyCertified, setOnlyCertified] = useState(false);

    const workers = [
        {
            id: 1,
            name: "김철수",
            skill: "인테리어 필름",
            region: "대전",
            rating: 4.9,
            certified: true,
            career: "8년",
        },
        {
            id: 2,
            name: "박민수",
            skill: "도배",
            region: "세종",
            rating: 4.7,
            certified: false,
            career: "5년",
        },
        {
            id: 3,
            name: "이현우",
            skill: "타일",
            region: "청주",
            rating: 4.8,
            certified: true,
            career: "10년",
        },
    ];

    const filteredWorkers = workers.filter((worker) => {
        const matchRegion =
            region === "" || worker.region.includes(region);

        const matchSkill =
            skill === "" || worker.skill.includes(skill);

        const matchCertified =
            !onlyCertified || worker.certified === true;

        return (
            matchRegion &&
            matchSkill &&
            matchCertified
        );
    });

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
                <h1>기술자 검색</h1>

                {/* 검색 필터 */}
                <div
                    style={{
                        backgroundColor: "#fff",
                        padding: "20px",
                        borderRadius: "16px",
                        marginBottom: "24px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                    }}
                >
                    <input
                        type="text"
                        placeholder="지역 입력 (예: 대전)"
                        value={region}
                        onChange={(e) =>
                            setRegion(e.target.value)
                        }
                        style={{
                            width: "100%",
                            padding: "12px",
                            marginBottom: "12px",
                        }}
                    />

                    <input
                        type="text"
                        placeholder="분야 입력 (예: 필름)"
                        value={skill}
                        onChange={(e) =>
                            setSkill(e.target.value)
                        }
                        style={{
                            width: "100%",
                            padding: "12px",
                            marginBottom: "12px",
                        }}
                    />

                    <label>
                        <input
                            type="checkbox"
                            checked={onlyCertified}
                            onChange={(e) =>
                                setOnlyCertified(e.target.checked)
                            }
                        />
                        인증 기술자만 보기
                    </label>
                </div>

                {/* 결과 목록 */}
                {filteredWorkers.map((worker) => (
                    <div
                        key={worker.id}
                        style={{
                            backgroundColor: "#fff",
                            padding: "20px",
                            borderRadius: "16px",
                            marginBottom: "16px",
                            boxShadow:
                                "0 2px 10px rgba(0,0,0,0.06)",
                        }}
                    >
                        <h2>
                            {worker.name}
                            {worker.certified && " 🔵"}
                        </h2>

                        <p>분야: {worker.skill}</p>
                        <p>지역: {worker.region}</p>
                        <p>경력: {worker.career}</p>
                        <p>평점: ★ {worker.rating}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WorkerSearchPage;