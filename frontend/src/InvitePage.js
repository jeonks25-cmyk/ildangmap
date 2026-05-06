import React, { useState } from "react";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Clock,
    Users,
    Send
} from "lucide-react";

export default function InvitePage() {
    const [selectedWorkers, setSelectedWorkers] = useState([]);

    const jobInfo = {
        title: "대전 아파트 필름 시공",
        date: "2026-04-28",
        time: "07:30 집합",
        pay: "25만원",
        location: "대전 유성구",
        needPeople: "기공 2명 필요"
    };

    const workers = [
        {
            id: 1,
            name: "김철수",
            distance: "2.1km",
            experience: "아파트 필름 84회",
            available: true,
            favorite: true
        },
        {
            id: 2,
            name: "박영희",
            distance: "3.4km",
            experience: "상가 필름 57회",
            available: true,
            favorite: true
        },
        {
            id: 3,
            name: "이민수",
            distance: "5.2km",
            experience: "아파트 필름 39회",
            available: true,
            favorite: false
        },
        {
            id: 4,
            name: "최준호",
            distance: "4.7km",
            experience: "샷시 시공 63회",
            available: false,
            favorite: false
        }
    ];

    const toggleWorker = (id) => {
        if (selectedWorkers.includes(id)) {
            setSelectedWorkers(
                selectedWorkers.filter((workerId) => workerId !== id)
            );
        } else {
            setSelectedWorkers([...selectedWorkers, id]);
        }
    };

    const handleSendInvite = () => {
        if (selectedWorkers.length === 0) {
            alert("기술자를 선택해주세요");
            return;
        }

        alert(
            `${selectedWorkers.length}명에게 일정 초대를 발송했습니다`
        );
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f7f7f7",
                paddingBottom: "120px"
            }}
        >
            {/* 상단 */}
            <div
                style={{
                    background: "white",
                    padding: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    fontWeight: "700",
                    fontSize: "24px"
                }}
            >
                <ArrowLeft size={28} />
                일정 초대 보내기
            </div>

            {/* 현장 정보 */}
            <div
                style={{
                    margin: "20px",
                    background: "white",
                    borderRadius: "18px",
                    padding: "24px"
                }}
            >
                <div
                    style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        marginBottom: "18px"
                    }}
                >
                    {jobInfo.title}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <Calendar size={18} />
                    {jobInfo.date}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <Clock size={18} />
                    {jobInfo.time}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <MapPin size={18} />
                    {jobInfo.location}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <Users size={18} />
                    {jobInfo.needPeople}
                </div>

                <div
                    style={{
                        marginTop: "14px",
                        fontWeight: "700",
                        fontSize: "18px",
                        color: "#b7791f"
                    }}
                >
                    일당 {jobInfo.pay}
                </div>
            </div>

            {/* 추천 기술자 */}
            <div
                style={{
                    margin: "20px"
                }}
            >
                <div
                    style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        marginBottom: "16px"
                    }}
                >
                    일정 가능한 추천 기술자
                </div>

                {workers.map((worker) => (
                    <div
                        key={worker.id}
                        onClick={() =>
                            worker.available && toggleWorker(worker.id)
                        }
                        style={{
                            background: "white",
                            borderRadius: "16px",
                            padding: "20px",
                            marginBottom: "14px",
                            cursor: worker.available ? "pointer" : "default",
                            opacity: worker.available ? 1 : 0.5,
                            border: selectedWorkers.includes(worker.id)
                                ? "2px solid #111"
                                : "1px solid #eee"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "10px"
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "20px",
                                    fontWeight: "700"
                                }}
                            >
                                {worker.favorite ? "★ " : ""}
                                {worker.name}
                            </div>

                            <div
                                style={{
                                    fontWeight: "700",
                                    color: worker.available
                                        ? "#27ae60"
                                        : "#999"
                                }}
                            >
                                {worker.available ? "가능" : "일정 있음"}
                            </div>
                        </div>

                        <div style={{ marginBottom: "6px" }}>
                            거리: {worker.distance}
                        </div>

                        <div>
                            경험: {worker.experience}
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 고정 버튼 */}
            <button
                onClick={handleSendInvite}
                style={{
                    position: "fixed",
                    bottom: "30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "90%",
                    maxWidth: "460px",
                    border: "none",
                    background: "#111",
                    color: "white",
                    padding: "18px",
                    borderRadius: "16px",
                    fontSize: "18px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px"
                }}
            >
                <Send size={20} />
                선택한 기술자에게 초대 보내기
            </button>
        </div>
    );
}