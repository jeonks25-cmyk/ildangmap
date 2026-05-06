import React, { useState } from "react";

function CreateJob() {
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [pay, setPay] = useState("");
    const [location, setLocation] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");

    const handleSubmit = async () => {
        const jobData = {
            title,
            company,
            pay,
            location,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        };

        try {
            const response = await fetch("http://localhost:8080/jobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(jobData),
            });

            if (response.ok) {
                alert("공고 등록 완료!");

                setTitle("");
                setCompany("");
                setPay("");
                setLocation("");
                setLatitude("");
                setLongitude("");
            } else {
                alert("공고 등록 실패");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류");
        }
    };

    return (
        <div style={{ padding: "30px" }}>
            <h2>공고 등록</h2>

            <input
                placeholder="공고 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="업체명"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="급여"
                value={pay}
                onChange={(e) => setPay(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="지역"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="위도 (예: 36.3504)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="경도 (예: 127.3845)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSubmit}>
                공고 등록하기
            </button>
        </div>
    );
}

export default CreateJob;