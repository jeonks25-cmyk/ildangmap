import React, { useState } from "react";

function WorkerCalendarSearchPage() {
    const [workerName, setWorkerName] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        if (!workerName) {
            alert("기술자 이름을 입력하세요.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/worker-calendar/${workerName}`
            );

            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error(error);
            alert("조회 실패");
        }
    };

    return (
        <div style={{ padding: "30px" }}>
            <h2>기술자 일정 조회</h2>

            <input
                placeholder="기술자 이름 입력"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSearch}>
                일정 조회
            </button>

            <hr />

            {results.map((item) => (
                <div
                    key={item.id}
                    style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        marginBottom: "20px",
                        borderRadius: "10px",
                    }}
                >
                    <h3>{item.workerName}</h3>
                    <p>작업 날짜: {item.workDate}</p>
                    <p>상태: {item.status}</p>
                </div>
            ))}
        </div>
    );
}

export default WorkerCalendarSearchPage;