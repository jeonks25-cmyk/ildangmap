import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { formatBirthYearLabel } from "../utils/fieldProfileCard";
import { usePersonCard } from "../context/PersonCardContext";

const QUICK_REPLIES = ["가능합니다", "주소 부탁드립니다", "몇 시까지 가면 될까요?"];

function formatHeaderTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toDateKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDateDivider(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatBubbleTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getRoomById, markRoomRead, sendMessage } = useChat();
  const { openPersonCard } = usePersonCard();
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const room = getRoomById(roomId);
  const isConsumerRequestRoom = room?.kind === "consumer-request";

  useEffect(() => {
    if (!roomId) return;
    markRoomRead(roomId);
  }, [markRoomRead, roomId, room?.messages?.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [room?.messages?.length]);

  const messageRows = useMemo(() => {
    const list = Array.isArray(room?.messages) ? room.messages : [];
    const rows = [];
    let prevDateKey = "";
    list.forEach((message) => {
      const dateKey = toDateKey(message.createdAt);
      if (dateKey && dateKey !== prevDateKey) {
        rows.push({ kind: "date", id: `date-${dateKey}`, createdAt: message.createdAt });
        prevDateKey = dateKey;
      }
      rows.push({ kind: "message", ...message });
    });
    return rows;
  }, [room]);

  const onSend = () => {
    const text = input.trim();
    if (!text || !room) return;
    sendMessage(room.id, text, "me");
    setInput("");
  };

  if (!room) {
    return (
      <div className="chat-room-page">
        <header className="chat-room-header">
          <button type="button" className="chat-room-header__back" onClick={() => navigate("/chat")}>
            ‹
          </button>
          <div className="chat-room-header__copy">
            <h1 className="chat-room-header__title">채팅방 없음</h1>
          </div>
        </header>
        <div className="chat-room-empty">채팅방을 찾지 못했습니다.</div>
      </div>
    );
  }

  return (
    <div className="chat-room-page">
      <header className="chat-room-header">
        <button type="button" className="chat-room-header__back" onClick={() => navigate("/chat")}>
          ‹
        </button>
        <div className="chat-room-header__copy">
          <h1 className="chat-room-header__title">
            <button type="button" className="chat-room-header__name-btn" onClick={() => openPersonCard(room)}>
              {room.ownerName}
            </button>
          </h1>
          <p className="chat-room-header__sub">
            {[formatBirthYearLabel(room.ownerBirthYear), room.jobTitle].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      <div className="chat-room-body">
        {location.state?.fromApply ? (
          <div className="chat-room-banner">참여 요청이 접수되어 현장 대화가 열렸습니다.</div>
        ) : null}
        {isConsumerRequestRoom ? <div className="chat-room-banner">소비자 시공 문의 채팅이 연결되었습니다.</div> : null}

        <section className="chat-room-job-card" aria-label={isConsumerRequestRoom ? "문의 요약" : "현장 요약"}>
          <div className="chat-room-job-card__pay">{room.pay}</div>
          <div className="chat-room-job-card__title">{room.jobTitle}</div>
          <div className="chat-room-job-card__meta">{room.workTime}</div>
          <div className={`chat-room-job-card__status chat-room-job-card__status--${room.status}`}>
            {isConsumerRequestRoom
              ? "견적 상담중"
              : room.status === "approved"
                ? "참여 승인 완료"
                : room.status === "applied"
                  ? "참여 확인 중"
                  : "문의 채팅"}
          </div>
        </section>

        <section className="chat-room-address-card" aria-label="주소 공개 상태">
          <div className="chat-room-address-card__title">{isConsumerRequestRoom ? "지역 안내" : "주소 안내"}</div>
          <div className="chat-room-address-card__line">{room.shortRegion}</div>
          {room.status === "approved" && !isConsumerRequestRoom ? (
            <>
              <div className="chat-room-address-card__full">{room.privateSnapshot?.fullAddress || "상세주소 확인 중"}</div>
              {room.privateSnapshot?.accessPassword ? (
                <div className="chat-room-address-card__note">현장 비밀번호: {room.privateSnapshot.accessPassword}</div>
              ) : null}
            </>
          ) : (
            <div className="chat-room-address-card__note">
              {isConsumerRequestRoom ? "상세주소는 채팅에서 일정 조율 후 안내됩니다." : "상세주소는 참여 승인 후 공개됩니다."}
            </div>
          )}
        </section>

        <div className="chat-room-message-list" role="log" aria-live="polite">
          {messageRows.map((row) => {
            if (row.kind === "date") {
              return (
                <div key={row.id} className="chat-room-date-divider">
                  {formatDateDivider(row.createdAt)}
                </div>
              );
            }
            if (row.type === "system") {
              return (
                <div key={row.id} className="chat-room-system-message">
                  {row.text}
                </div>
              );
            }
            const mine = row.sender === "me";
            return (
              <div key={row.id} className={`chat-room-bubble-row${mine ? " is-mine" : ""}`}>
                <div className={`chat-room-bubble${mine ? " is-mine" : ""}`}>
                  <div className="chat-room-bubble__text">{row.text}</div>
                </div>
                <div className="chat-room-bubble__time">{formatBubbleTime(row.createdAt)}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <div className="chat-room-compose">
        <div className="chat-room-quick-replies" aria-label="빠른 응답">
          {QUICK_REPLIES.map((text) => (
            <button
              key={text}
              type="button"
              className="chat-room-quick-replies__btn"
              onClick={() => room && sendMessage(room.id, text, "me")}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="chat-room-inputbar">
          <input
            className="chat-room-inputbar__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요"
            aria-label="메시지 입력"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button type="button" className="chat-room-inputbar__send" onClick={onSend}>
            전송
          </button>
        </div>

        <div className="chat-room-footnote">마지막 업데이트 {formatHeaderTime(room.updatedAt)}</div>
      </div>
    </div>
  );
}
