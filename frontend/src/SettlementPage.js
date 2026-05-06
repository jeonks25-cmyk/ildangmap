import React, { useState } from "react";
import {
    ArrowLeft,
    Calendar,
    Wallet,
    CheckCircle
} from "lucide-react";

export default function SettlementPage() {
    const [payments, setPayments] = useState([
        {
            id: 1,
            worker: "김철수",
            job: "대전 아파트 필름 시공",
            date: "2026-04-28",
            amount: "250,000원",
            status: "예정"
        },
        {
            id: 2,
            worker: "박영희",
            job: "세종 상가 샷시",
            date: "2026-04-29",
            amount: "220,000원",
            status: "완료"
        }
    ]);

    const handleComplete = (id) => {
        setPayments(
            payments.map((item) =>
                item.id === id
                    ? { ...item, status: "완료" }
                    : item
            )
        );

        alert("정산완료 처리되었습니다.");
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
                정산 관리
            </div>

            <div style={{ padding: "20px" }}>
                {payments.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            background: "white",
                            borderRadius: "18px",
                            padding: "24px",
                            marginBottom: "18px"
                        }}
                    >
                        <div
                            style={{
                                fontSize: "22px",
                                fontWeight: "700",
                                marginBottom: "14px"
                            }}
                        >
                            {item.job}
                        </div>

                        <div
                            style={{
                                marginBottom: "12px",
                                fontSize: "18px"
                            }}
                        >
                            기술자 : {item.worker}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginBottom: "10px"
                            }}
                        >
                            <Calendar size={18} />
                            {item.date}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginBottom: "14px"
                            }}
                        >
                            <Wallet size={18} />
                            {item.amount}
                        </div>

                        <div
                            style={{
                                marginBottom: "18px",
                                fontWeight: "700",
                                color:
                                    item.status === "완료"
                                        ? "#27ae60"
                                        : "#e67e22"
                            }}
                        >
                            정산상태 : {item.status}
                        </div>

                        {item.status === "예정" ? (
                            <button
                                onClick={() => handleComplete(item.id)}
                                style={{
                                    width: "100%",
                                    border: "none",
                                    padding: "16px",
                                    borderRadius: "14px",
                                    background: "#111",
                                    color: "white",
                                    fontWeight: "700",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    gap: "10px"
                                }}
                            >
                                <CheckCircle size={18} />
                                정산완료 처리
                            </button>
                        ) : (
                            <div
                                style={{
                                    padding: "16px",
                                    borderRadius: "14px",
                                    background: "#e8f7ed",
                                    color: "#1d7a38",
                                    fontWeight: "700",
                                    textAlign: "center"
                                }}
                            >
                                정산 완료됨
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}