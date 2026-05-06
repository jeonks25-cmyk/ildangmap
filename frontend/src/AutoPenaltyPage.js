import React, { useState } from "react";

function AutoPenaltyPage() {
    const [status, setStatus] = useState("정상");

    const applyLateCancelPenalty = () => {
        setStatus("당일취소 패널티 적용");
        alert("당일취소 패널티가 적용되었습니다.");
    };

    const applyNoShowPenalty = () => {
        setStatus("노쇼 패널티 적용");
        alert("노쇼 패널티가 적용되었습니다.");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                padding: "24px",
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
                <h1>자동 패널티 관리</h1>

                <div
                    style={{
                        marginTop: "20px",
                        padding: "20px",
                        backgroundColor: "#fafafa",
                        borderRadius: "12px",
                    }}
                >
                    <p>
                        <strong>기술자:</strong> 김철수
                    </p>

                    <p>
                        <strong>현장:</strong> 둔산동 아파트 필름 시공
                    </p>

                    <p>
                        <strong>상태:</strong> {status}
                    </p>
                </div>

                <div
                    style={{
                        marginTop: "24px",
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        onClick={applyLateCancelPenalty}
                        style={{
                            padding: "14px 20px",
                            border: "none",
                            borderRadius: "10px",
                            backgroundColor: "#fff3bf",
                            fontWeight: "700",
                            cursor: "pointer",
                        }}
                    >
                        당일취소 패널티
                    </button>

                    <button
                        onClick={applyNoShowPenalty}
                        style={{
                            padding: "14px 20px",
                            border: "none",
                            borderRadius: "10px",
                            backgroundColor: "#ffd8d8",
                            fontWeight: "700",
                            cursor: "pointer",
                        }}
                    >
                        노쇼 패널티
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AutoPenaltyPage;