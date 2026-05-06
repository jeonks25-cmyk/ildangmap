import React, { useEffect, useState } from "react";

const CalendarPage = () => {
    const [schedules, setSchedules] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");

    // 일정 가져오기
    useEffect(() => {
        fetch("http://localhost:8081/schedule")
            .then((res) => res.json())
            .then((data) => setSchedules(data));
    }, []);

    // 이번 달 날짜 생성 (간단 버전)
    const days = [];
    for (let i = 1; i <= 31; i++) {
        const day = i.toString().padStart(2, "0");
        const date = `2026-05-${day}`;
        days.push(date);
    }

    // 특정 날짜 일정 필터
    const selectedList = schedules.filter(
        (s) => s.date === selectedDate
    );

    return (
        <div style={{ padding: "10px" }}>
            <h2>📅 일정</h2>

            {/* 달력 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "5px",
                }}
            >
                {days.map((d) => {
                    const hasSchedule = schedules.some(
                        (s) => s.date === d
                    );

                    return (
                        <div
                            key={d}
                            onClick={() => setSelectedDate(d)}
                            style={{
                                border: "1px solid #ddd",
                                padding: "10px",
                                textAlign: "center",
                                background: hasSchedule ? "#e3f2fd" : "white",
                                cursor: "pointer",
                            }}
                        >
                            {d.slice(-2)}

                            {hasSchedule && (
                                <div style={{ fontSize: "10px", color: "blue" }}>
                                    ●
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 하단 상세 */}
            {selectedDate && (
                <div
                    style={{
                        marginTop: "20px",
                        padding: "10px",
                        borderTop: "2px solid black",
                    }}
                >
                    <h3>{selectedDate} 일정</h3>

                    {selectedList.length === 0 && <p>일정 없음</p>}

                    {selectedList.map((s) => (
                        <div
                            key={s.id}
                            style={{
                                border: "1px solid #ddd",
                                marginBottom: "5px",
                                padding: "10px",
                            }}
                        >
                            <strong>{s.title}</strong>
                            <div>{s.workerName}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarPage;