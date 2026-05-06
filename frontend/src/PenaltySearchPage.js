import React, { useState } from "react";

function PenaltySearchPage() {
    const [userName, setUserName] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        if (!userName) {
            alert("사용자 이름을 입력하세요.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/penalty/${userName}`
            );

            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error(error);
            alert("조회 실패");
        }
    };

    const totalScore = results.reduce(
        (sum, item) => sum + item.penaltyScore,
        0
    );

    return (
        <div style={{ padding: "30px" }}>
            <h2>패널티 조회</h2>

            <input
                placeholder="사용자 이름 입력"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSearch}>
                조회하기
            </button>

            <hr />

            {results.length > 0 && (
                <>
                    <h3>총 패널티 점수: {totalScore}</h3>

                    {results.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                border: "1px solid #ddd",
                                padding: "20px",
                                marginBottom: "20px",
                                borderRadius: "10px",
                            }}
                        >
                            <h3>{item.userName}</h3>
                            <p>사유: {item.reason}</p>
                            <p>점수: {item.penaltyScore}</p>
                            <p>발생일: {item.createdDate}</p>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

export default PenaltySearchPage;