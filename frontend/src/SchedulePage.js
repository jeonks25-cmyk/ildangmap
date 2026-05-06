import React, { useEffect, useState } from "react";

function SchedulePage() {
    const [schedules, setSchedules] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetch("http://localhost:8081/schedule")
            .then((res) => res.json())
            .then((data) => setSchedules(data));
    }, []);

    const today = new Date();
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div style={{ padding: "20px" }}>
            <h2>📅 일정</h2>

            {/* 달력 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "10px",
                }}
            >
                {days.map((day) => (
                    <div
                        key={day}
                        onClick={() => setSelectedDate(day)}
                        style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                            textAlign: "center",
                            cursor: "pointer",
                            background:
                                selectedDate === day ? "#ffe0b2" : "white",
                        }}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* 하단 카드 */}
            {selectedDate && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        background: "white",
                        padding: "20px",
                        borderTop: "1px solid #ddd",
                    }}
                >
                    <h3>{selectedDate}일 일정</h3>

                    {schedules.map((s, index) => (
                        <div key={index}>
                            <p>📌 {s.title}</p>
                            <p>👷 {s.workerName}</p>
                            <hr />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SchedulePage;