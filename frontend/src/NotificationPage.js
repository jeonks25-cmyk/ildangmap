import React, { useState } from "react";

function NotificationPage() {
    const [userName, setUserName] = useState("");
    const [notifications, setNotifications] = useState([]);

    const handleSearch = async () => {
        if (!userName) {
            alert("사용자 이름을 입력하세요.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/notification/${userName}`
            );

            const data = await response.json();
            setNotifications(data);
        } catch (error) {
            console.error(error);
            alert("알림 조회 실패");
        }
    };

    return (
        <div style={{ padding: "30px" }}>
            <h2>알림 조회</h2>

            <input
                placeholder="사용자 이름 입력"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
            />
            <br /><br />

            <button onClick={handleSearch}>
                알림 조회
            </button>

            <hr />

            {notifications.map((item) => (
                <div
                    key={item.id}
                    style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        marginBottom: "20px",
                        borderRadius: "10px",
                        backgroundColor: item.isRead ? "#f5f5f5" : "#fff8dc",
                    }}
                >
                    <h3>{item.userName}</h3>
                    <p>{item.message}</p>
                    <p>생성시간: {item.createdAt}</p>
                    <p>
                        상태: {item.isRead ? "읽음" : "안읽음"}
                    </p>
                </div>
            ))}
        </div>
    );
}

export default NotificationPage;