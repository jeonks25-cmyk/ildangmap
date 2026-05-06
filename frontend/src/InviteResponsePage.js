import React, { useState } from "react";
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Wallet
} from "lucide-react";

export default function InviteResponsePage() {
    const [status, setStatus] = useState("waiting");

    const inviteInfo = {
        title: "대전 아파트 필름 시공",
        boss: "김사장",
        date: "2026-04-28",
        time: "07:30 집합",
        location: "대전 유성구",
        pay: "250,000원"
    };

    const handleAccept = () => {
        setStatus("accepted");
        alert("일정을 수락했습니다. 캘린더에 자동 등록되었습니다.");
    };

    const handleReject = () => {
        setStatus("rejected");
        alert("일정을 거절했습니다.");
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
                받은 일정 초대
            </div>

            {/* 카드 */}
            <div
                style={{
                    margin: "20px",
                    background: "white",
                    borderRadius: "20px",
                    padding: "28px"
                }}
            >
                <div
                    style={{
                        fontSize: "28px",
                        fontWeight: "700",
                        marginBottom: "16px"
                    }}
                >
                    {inviteInfo.title}
                </div>

                <div
                    style={{
                        marginBottom: "20px",
                        fontSize: "18px",
                        color: "#555"
                    }}
                >
                    오야지 : {inviteInfo.boss}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                    <Calendar size={18} />
                    {inviteInfo.date}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                    <Clock size={18} />
                    {inviteInfo.time}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                    <MapPin size={18} />
                    {inviteInfo.location}
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <Wallet size={18} />
                    일당 {inviteInfo.pay}
                </div>

                {status === "waiting" && (
                    <div
                        style={{
                            display: "flex",
                            gap: "14px"
                        }}
                    >
                        <button
                            onClick={handleReject}
                            style={{
                                flex: 1,
                                padding: "16px",
                                borderRadius: "14px",
                                border: "1px solid #ddd",
                                background: "white",
                                fontWeight: "700",
                                fontSize: "16px",
                                cursor: "pointer"
                            }}
                        >
                            거절
                        </button>

                        <button
                            onClick={handleAccept}
                            style={{
                                flex: 1,
                                padding: "16px",
                                borderRadius: "14px",
                                border: "none",
                                background: "#111",
                                color: "white",
                                fontWeight: "700",
                                fontSize: "16px",
                                cursor: "pointer"
                            }}
                        >
                            수락
                        </button>
                    </div>
                )}

                {status === "accepted" && (
                    <div
                        style={{
                            padding: "18px",
                            borderRadius: "14px",
                            background: "#e8f7ed",
                            color: "#1d7a38",
                            fontWeight: "700",
                            textAlign: "center"
                        }}
                    >
                        일정 수락 완료
                        <br />
                        캘린더 자동 등록됨
                    </div>
                )}

                {status === "rejected" && (
                    <div
                        style={{
                            padding: "18px",
                            borderRadius: "14px",
                            background: "#fdeaea",
                            color: "#c0392b",
                            fontWeight: "700",
                            textAlign: "center"
                        }}
                    >
                        일정 거절 완료
                    </div>
                )}
            </div>
        </div>
    );
}