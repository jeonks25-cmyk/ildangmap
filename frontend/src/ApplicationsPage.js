import React, { useEffect, useState } from "react";

function ApplicationsPage() {
    const [applications, setApplications] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8080/apply/list")
            .then((res) => res.json())
            .then((data) => {
                console.log("지원자 목록:", data);

                // null 방지
                if (Array.isArray(data)) {
                    setApplications(data);
                } else {
                    setApplications([]);
                }
            })
            .catch((err) => {
                console.error("에러 발생:", err);
                setApplications([]);
            });
    }, []);

    const handleApprove = (id) => {
        fetch(`http://localhost:8080/apply/approve/${id}`, {
            method: "POST",
        })
            .then((res) => res.text())
            .then((msg) => {
                alert(msg);

                // 승인 후 다시 목록 불러오기
                return fetch("http://localhost:8080/apply/list");
            })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setApplications(data);
                } else {
                    setApplications([]);
                }
            })
            .catch((err) => {
                console.error(err);
                alert("승인 실패");
            });
    };

    return (
        <div style={{ padding: "30px" }}>
            <h1>지원자 목록</h1>

            {applications.length === 0 ? (
                <p>지원자가 없습니다.</p>
            ) : (
                applications.map((app) => (
                    <div
                        key={app.id}
                        style={{
                            border: "1px solid #ddd",
                            padding: "20px",
                            marginBottom: "20px",
                            borderRadius: "10px",
                        }}
                    >
                        <h3>지원자 ID: {app.id}</h3>
                        <p>상태: {app.status}</p>
                        <p>공고 제목: {app.job?.title || "제목 없음"}</p>

                        {app.status !== "ACCEPTED" && (
                            <button onClick={() => handleApprove(app.id)}>
                                승인하기
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default ApplicationsPage;