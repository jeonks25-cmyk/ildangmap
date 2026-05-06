import React, { useState } from "react";
import {
    Map,
    MessageCircle,
    Calendar,
    Settings,
    Plus
} from "lucide-react";

export default function ScheduleAutoPage() {
    const [selectedDate, setSelectedDate] = useState(20);

    const [scheduleMap, setScheduleMap] = useState({
        6: [
            {
                title: "장필공",
                amount: "250,000원",
                status: "완료"
            },
            {
                title: "대리대출",
                amount: "180,000원",
                status: "예정"
            }
        ],
        9: [
            {
                title: "금산현장",
                amount: "220,000원",
                status: "완료"
            }
        ],
        20: [
            {
                title: "장필공",
                amount: "250,000원",
                status: "미지급"
            },
            {
                title: "맨시티 2v",
                amount: "200,000원",
                status: "예정"
            }
        ],
        25: [
            {
                title: "권혁진",
                amount: "300,000원",
                status: "완료"
            }
        ]
    });

    const getColor = (status) => {
        if (status === "완료") return "#27ae60";
        if (status === "예정") return "#f1c40f";
        return "#e74c3c";
    };

    const handleAddSchedule = () => {
        const title = prompt("일정명을 입력하세요");

        if (title) {
            alert(`${title} 일정이 추가되었습니다 (임시 기능)`);
        }
    };

    const handleCompletePayment = (day, index) => {
        const updated = { ...scheduleMap };

        updated[day][index].status = "완료";

        setScheduleMap(updated);
    };

    const renderDetail = () => {
        const data = scheduleMap[selectedDate];

        if (!data) {
            return <div>등록된 일정이 없습니다.</div>;
        }

        return data.map((item, idx) => (
            <div
                key={idx}
                style={{
                    padding: "16px",
                    border: "1px solid #eee",
                    borderRadius: "14px",
                    marginBottom: "14px",
                    background: "#fafafa"
                }}
            >
                <div
                    style={{
                        fontWeight: "700",
                        fontSize: "18px",
                        marginBottom: "8px"
                    }}
                >
                    {item.title}
                </div>

                <div>금액: {item.amount}</div>

                <div style={{ marginTop: "6px" }}>
                    정산상태:
                    <span
                        style={{
                            marginLeft: "8px",
                            color: getColor(item.status),
                            fontWeight: "700"
                        }}
                    >
            {item.status}
          </span>
                </div>

                {item.status !== "완료" && (
                    <button
                        onClick={() =>
                            handleCompletePayment(selectedDate, idx)
                        }
                        style={{
                            marginTop: "14px",
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "10px",
                            background: "#111",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "600"
                        }}
                    >
                        정산완료 처리
                    </button>
                )}
            </div>
        ));
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#fff",
                paddingBottom: "140px"
            }}
        >
            {/* 상단 */}
            <div
                style={{
                    padding: "20px",
                    fontSize: "30px",
                    fontWeight: "700"
                }}
            >
                2026. 4 ▼
            </div>

            {/* 달력 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "10px",
                    padding: "20px"
                }}
            >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                    <div
                        key={day}
                        onClick={() => setSelectedDate(day)}
                        style={{
                            minHeight: "95px",
                            padding: "8px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            background:
                                selectedDate === day ? "#f8f8f8" : "#fff",
                            border:
                                selectedDate === day
                                    ? "2px solid #111"
                                    : "1px solid #eee"
                        }}
                    >
                        <div
                            style={{
                                fontWeight: "700",
                                marginBottom: "8px"
                            }}
                        >
                            {day}
                        </div>

                        {scheduleMap[day] &&
                            scheduleMap[day].map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: "11px",
                                        padding: "4px 8px",
                                        borderRadius: "8px",
                                        marginBottom: "4px",
                                        background: getColor(item.status),
                                        color: "white",
                                        fontWeight: "600"
                                    }}
                                >
                                    {item.title}
                                </div>
                            ))}
                    </div>
                ))}
            </div>

            {/* 상세보기 */}
            <div
                style={{
                    padding: "24px"
                }}
            >
                <h2>{selectedDate}일 상세보기</h2>
                {renderDetail()}
            </div>

            {/* + 버튼 */}
            <button
                onClick={handleAddSchedule}
                style={{
                    position: "fixed",
                    right: "24px",
                    bottom: "120px",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    border: "none",
                    background: "#111",
                    color: "white",
                    cursor: "pointer"
                }}
            >
                <Plus size={28} />
            </button>

            {/* 하단 메뉴 */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "white",
                    borderTop: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-around",
                    padding: "16px 0"
                }}
            >
                <Map onClick={() => (window.location.href = "/")} />
                <MessageCircle onClick={() => (window.location.href = "/chat")} />
                <Calendar onClick={() => (window.location.href = "/schedule-auto")} />
                <Settings onClick={() => (window.location.href = "/settings")} />
            </div>
        </div>
    );
}