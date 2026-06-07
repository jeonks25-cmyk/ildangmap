import React, { useCallback, useState } from "react";

function newMsgId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
}

export default function FieldNoticeBoard({ notices, onChange }) {
  const [compose, setCompose] = useState("");

  const deleteMsg = useCallback(
    (id) => {
      onChange?.(notices.filter((m) => m.id !== id));
    },
    [notices, onChange]
  );

  const sendCompose = useCallback(() => {
    const text = compose.trim();
    if (!text) return;
    const row = {
      id: newMsgId(),
      author: "나",
      text,
      createdAt: new Date().toISOString(),
    };
    onChange?.([row, ...notices]);
    setCompose("");
  }, [compose, notices, onChange]);

  return (
    <section className="field-notice-board field-notice-board--memo" aria-label="현장 알림">
      <h2 className="field-room-section-title field-room-section-title--compact">현장 알림</h2>
      <p className="field-notice-board__hint">짧은 운영 메모만. 긴 대화는 피해 주세요.</p>

      <div className="field-notice-board__scroll">
        <ul className="field-notice-board__list">
          {notices.map((msg) => (
            <li key={msg.id} className="field-memo-row">
              <button
                type="button"
                className="field-memo-row__del"
                onClick={() => deleteMsg(msg.id)}
                aria-label="삭제"
              >
                ×
              </button>
              <p className="field-memo-row__author">{msg.author}</p>
              <p className="field-memo-row__text">{msg.text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="field-notice-composer">
        <input
          type="text"
          className="field-notice-composer__input"
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          placeholder="현장 알림 입력..."
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendCompose();
            }
          }}
        />
        <button type="button" className="field-notice-composer__send" onClick={sendCompose} disabled={!compose.trim()}>
          전송
        </button>
      </div>
    </section>
  );
}
