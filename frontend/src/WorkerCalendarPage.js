import React, { useState } from "react";

function WorkerCalendarPage() {
    const [workerName, setWorkerName] = useState("");
    const [workDate, setWorkDate] = useState("");
    const [status, setStatus] = useState("");

    const handleSave = async () => {
        const data = {
            workerName,
            workDate,
            status,
        };

        try {
            const response = await fetch("http://localhost:8080/worker-calendar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert("캘린더 등록 완료!");

                setWorkerName("");
                setWorkDate("");
                setStatus("");
            } else {
                alert("등록 실패");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류");
        }
    };

    return (
        <div style={{ padding: "30px" }}>
            <h2>기술자 일정 등록</h2>

            <input
                placeholder="기술자 이름"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
            />
            <br /><br />

            <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="상태 (가능 / 확정 / 휴무)"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSave}>
                일정 저장
            </button>
        </div>
    );
}

export default WorkerCalendarPage;