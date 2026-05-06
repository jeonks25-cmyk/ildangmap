import React, { useState } from "react";

function ChatPage() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "오야지",
            text: "내일 둔산동 아파트 필름 가능하세요?",
        },
        {
            id: 2,
            sender: "기술자",
            text: "네 가능합니다. 오전 8시 가능해요.",
        },
    ]);

    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;

        const newMessage = {
            id: Date.now(),
            sender: "오야지",
            text: input,
        };

        setMessages([...messages, newMessage]);
        setInput("");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f7f7f8",
                padding: "20px",
            }}
        >
            <div
                style={{
                    maxWidth: "700px",
                    margin: "0 auto",
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
            >
                <h1 style={{ marginTop: 0 }}>
                    1:1 현장 채팅
                </h1>

                <div
                    style={{
                        minHeight: "400px",
                        marginBottom: "20px",
                    }}
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                marginBottom: "16px",
                            }}
                        >
                            <strong>{msg.sender}</strong>
                            <p
                                style={{
                                    margin: "6px 0 0 0",
                                    padding: "12px",
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: "10px",
                                }}
                            >
                                {msg.text}
                            </p>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                    }}
                >
                    <input
                        type="text"
                        placeholder="메시지를 입력하세요"
                        value={input}
                        onChange={(e) =>
                            setInput(e.target.value)
                        }
                        style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            border: "1px solid #ddd",
                        }}
                    />

                    <button
                        onClick={handleSend}
                        style={{
                            padding: "12px 20px",
                            border: "none",
                            borderRadius: "10px",
                            backgroundColor: "#ffe066",
                            fontWeight: "700",
                            cursor: "pointer",
                        }}
                    >
                        전송
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;