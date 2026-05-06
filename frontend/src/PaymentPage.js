import React, { useState } from "react";

function PaymentPage() {
    const [status, setStatus] = useState("작업 진행 중");

    const completeWork = () => {
        setStatus("작업 완료");
        alert("작업 완료 처리되었습니다.");
    };

    const completePayment = () => {
        setStatus("정산 완료");
        alert("급여 지급이 완료되었습니다.");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                padding: "30px",
            }}
        >
            <div
                style={{
                    maxWidth: "700px",
                    margin: "0 auto",
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
            >
                <h1>작업 완료 + 정산</h1>

                <div
                    style={{
                        marginTop: "20px",
                        padding: "20px",
                        backgroundColor: "#fafafa",
                        borderRadius: "12px",
                    }}
                >
                    <p>
                        <strong>현장:</strong> 둔산동 아파트 필름 시공
                    </p>

                    <p>
                        <strong>기술자:</strong> 김철수
                    </p>

                    <p>
                        <strong>일당:</strong> 250,000원
                    </p>

                    <p>
                        <strong>현재 상태:</strong> {status}
                    </p>
                </div>

                <button
                    onClick={completeWork}
                    style={{
                        marginTop: "24px",
                        marginRight: "12px",
                        padding: "14px 24px",
                        border: "none",
                        borderRadius: "10px",
                        backgroundColor: "#ffe066",
                        fontWeight: "700",
                        cursor: "pointer",
                    }}
                >
                    작업 완료 처리
                </button>

                <button
                    onClick={completePayment}
                    style={{
                        marginTop: "24px",
                        padding: "14px 24px",
                        border: "none",
                        borderRadius: "10px",
                        backgroundColor: "#ffd43b",
                        fontWeight: "700",
                        cursor: "pointer",
                    }}
                >
                    급여 지급 완료
                </button>
            </div>
        </div>
    );
}

export default PaymentPage;
