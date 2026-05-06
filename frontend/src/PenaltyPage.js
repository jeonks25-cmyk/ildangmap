import React, { useState } from "react";

function PenaltyPage() {
    const [userName, setUserName] = useState("");
    const [reason, setReason] = useState("");
    const [penaltyScore, setPenaltyScore] = useState("");

    const handleSave = async () => {
        const data = {
            userName,
            reason,
            penaltyScore: parseInt(penaltyScore),
        };

        try {
            const response = await fetch("http://localhost:8080/penalty", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert("패널티 등록 완료!");

                setUserName("");
                setReason("");
                setPenaltyScore("");
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
            <h2>패널티 등록</h2>

            <input
                placeholder="사용자 이름"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="사유 (노쇼 / 당일취소 / 지각)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
            <br /><br />

            <input
                placeholder="패널티 점수"
                value={penaltyScore}
                onChange={(e) => setPenaltyScore(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSave}>
                패널티 저장
            </button>
        </div>
    );
}

export default PenaltyPage;