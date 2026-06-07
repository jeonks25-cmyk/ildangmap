import React, { useMemo } from "react";
import NotificationBellButton from "../components/notifications/NotificationBellButton";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/ChatContext";

function formatRoomTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function roomStatusLabel(status) {
  if (status === "approved") return "승인완료";
  if (status === "applied") return "참여대기";
  return "대화중";
}

export default function ChatTabPage() {
  const navigate = useNavigate();
  const { rooms } = useChat();

  const sortedRooms = useMemo(
    () => [...(Array.isArray(rooms) ? rooms : [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [rooms]
  );

  return (
    <div className="chat-tab-page">
      <header className="chat-tab-page__hero">
        <div>
          <h1 className="chat-tab-page__title">채팅</h1>
          <p className="chat-tab-page__lead">참여 요청한 현장과 문의한 현장을 빠르게 확인하세요.</p>
        </div>
        <NotificationBellButton ariaLabel="채팅 화면 알림 열기" />
      </header>

      <div className="chat-room-list" role="list" aria-label="채팅방 목록">
        {sortedRooms.map((room) => (
          <button
            key={room.id}
            type="button"
            role="listitem"
            className="chat-room-list__item"
            onClick={() => navigate(`/chat/${room.id}`)}
          >
            <span className="chat-room-list__avatar" aria-hidden="true">
              {room.ownerAvatar || room.ownerName?.slice(0, 1) || "현"}
            </span>
            <span className="chat-room-list__body">
              <span className="chat-room-list__top">
                <span className="chat-room-list__name">{room.ownerName}</span>
                <span className={`chat-room-list__status chat-room-list__status--${room.status}`}>
                  {roomStatusLabel(room.status)}
                </span>
              </span>
              <span className="chat-room-list__job">{room.jobTitle}</span>
              <span className="chat-room-list__last">{room.lastMessage}</span>
            </span>
            <span className="chat-room-list__side">
              <span className="chat-room-list__time">{formatRoomTime(room.updatedAt)}</span>
              {Number(room.unreadCount || 0) > 0 ? (
                <span className="chat-room-list__unread">{room.unreadCount}</span>
              ) : null}
            </span>
          </button>
        ))}

        {sortedRooms.length === 0 ? (
          <div className="chat-room-list__empty">아직 채팅방이 없습니다. 현장에 참여 요청하거나 문의를 남겨보세요.</div>
        ) : null}
      </div>
    </div>
  );
}
