import React from "react";
import { MAP_ITEM_TYPE } from "../../constants/mapItemTypes";
import { deriveFieldOperationMood, deriveFieldWorkStyle } from "../../utils/fieldHistoryModel";

const TYPE_ICON = {
  [MAP_ITEM_TYPE.SOS]: "🚨",
  [MAP_ITEM_TYPE.PARKING]: "🅿️",
  [MAP_ITEM_TYPE.ACCESS_INFO]: "🚪",
  [MAP_ITEM_TYPE.ELEVATOR]: "🛗",
  [MAP_ITEM_TYPE.MATERIAL_PICKUP]: "📦",
  [MAP_ITEM_TYPE.SITE_MEMO]: "⚠️",
  [MAP_ITEM_TYPE.RESTAURANT]: "🍚",
  [MAP_ITEM_TYPE.RESTROOM]: "🚻",
};

const PRIORITY_LABEL = {
  critical: "필수",
  important: "중요",
  optional: "참고",
};

function buildOperationLine(item) {
  const source = item?.source || {};
  if (item?.type === MAP_ITEM_TYPE.ACCESS_INFO) return source.entryMethod || item.meta || "출입 정보 확인";
  if (item?.type === MAP_ITEM_TYPE.PARKING) {
    if (source.free) return "무료 주차 가능";
    if (source.ladderTruckOk) return "사다리차 대기 가능";
    return item.meta || "주차 위치 확인";
  }
  if (item?.type === MAP_ITEM_TYPE.MATERIAL_PICKUP) return source.pickupPoint || item.meta || "상차 위치 확인";
  if (item?.type === MAP_ITEM_TYPE.SITE_MEMO) return source.memo || item.meta || "댓글 확인";
  if (item?.type === MAP_ITEM_TYPE.ELEVATOR) return source.useNote || item.meta || "엘리베이터 정보 확인";
  if (item?.type === MAP_ITEM_TYPE.SOS) return source.need || item.meta || "긴급 도움 요청";
  return item?.meta || item?.title || "운영 정보 확인";
}

function getFieldScheduleStatus(fieldItem) {
  const source = fieldItem?.source || {};
  const notice = source.operationNotice || source.connectionNotice;
  const noticeText = typeof notice === "string" ? notice : notice?.text || "";
  const duration = Number(source.durationDays);
  const durationText = Number.isFinite(duration) && duration > 1 ? `${duration}일 현장` : "당일 현장";
  const shiftText =
    source.workType === "morning"
      ? "오전만 진행"
      : source.workType === "afternoon"
        ? "오후 시작"
        : source.workTime || "시간 확인";
  return {
    date: source.workDate || source.date || "",
    durationText,
    shiftText,
    teamText: source.connectionNotice?.state === "changed" ? "팀에게 변경 표시됨" : "팀 연결 상태 확인",
    noticeText,
  };
}

function summarizeOperationTimeline(events) {
  const list = Array.isArray(events) ? events.filter(Boolean) : [];
  const lines = [];
  const mood = deriveFieldOperationMood(list);
  const workStyle = deriveFieldWorkStyle({ timelineEvents: list });
  mood.forEach((line) => lines.push(line));
  workStyle.forEach((line) => lines.push(line));
  const changed = list.filter((event) => event?.type === "schedule_change");
  const memoCount = list.filter((event) => event?.type === "map_memo" || event?.type === "field_atmosphere" || event?.type === "experience").length;
  const team = list.find((event) => event?.type === "team_recall" && event?.teamName);
  if (changed.some((event) => /연장/.test(`${event.text || ""} ${event.detail || ""}`))) lines.push("최근 일정이 연장되는 흐름");
  else if (changed.some((event) => /오후/.test(`${event.text || ""} ${event.detail || ""}`))) lines.push("최근 오후 시작으로 조정됨");
  else if (changed.length) lines.push("최근 일정 변경 있음");
  if (memoCount >= 2) lines.push("현장 분위기 메모가 자주 남음");
  else if (memoCount === 1) lines.push("최근 현장 메모가 추가됨");
  if (team) lines.push(`${team.teamName} 다시 부른 흐름`);
  return [...new Set(lines)].slice(0, 3);
}

export default function MapOperationContextCard({
  fieldItem,
  items,
  activeCheckIn,
  timeline = [],
  operationTimeline = [],
  recentCheckIns = [],
  experienceContext = [],
  onCheckIn,
  onCheckOut,
  onOpenItem,
  onOpenExperienceSave,
}) {
  const list = (Array.isArray(items) ? items : [])
    .filter((item) => item?.isArrivalRelevant && !item?.isOperationDimmed)
    .slice(0, 3);
  const today = timeline[0]?.items?.slice(0, 3) || [];
  const recentOps = summarizeOperationTimeline(operationTimeline);
  const scheduleStatus = getFieldScheduleStatus(fieldItem);

  if (!fieldItem) return null;

  return (
    <section className="map-operation-context-card" aria-label="현장 작업 기록">
      <p className="map-operation-context-card__eyebrow">현장 체크인</p>
      <h3 className="map-operation-context-card__title">{fieldItem.title}</h3>
      <div className="map-operation-context-card__schedule" aria-label="현장 일정 상태">
        <span>{scheduleStatus.date || "일정 확인"}</span>
        <span>{scheduleStatus.durationText}</span>
        <span>{scheduleStatus.shiftText}</span>
        <strong>{scheduleStatus.noticeText || scheduleStatus.teamText}</strong>
      </div>
      <div className="map-operation-context-card__checkin">
        <p className="map-operation-context-card__checkin-text">
          {activeCheckIn ? "오늘 이 현장에서 작업 중" : "오늘 작업 시작하시겠어요?"}
        </p>
        {activeCheckIn ? (
          <button type="button" className="map-operation-context-card__checkin-btn" onClick={() => onCheckOut?.(activeCheckIn)}>
            체크아웃
          </button>
        ) : (
          <button type="button" className="map-operation-context-card__checkin-btn" onClick={() => onCheckIn?.(fieldItem)}>
            체크인
          </button>
        )}
      </div>
      {activeCheckIn ? (
        <button type="button" className="map-operation-context-card__save" onClick={() => onOpenExperienceSave?.()}>
          주차·출입·추천식당 기록
        </button>
      ) : null}
      {experienceContext.length ? (
        <div className="map-operation-context-card__context" aria-label="현장 경험 맥락">
          {experienceContext.map((line) => (
            <span key={line} className="map-operation-context-card__context-chip">
              {line}
            </span>
          ))}
        </div>
      ) : null}
      {recentOps.length ? (
        <div className="map-operation-context-card__timeline" aria-label="최근 현장 분위기">
          <p className="map-operation-context-card__timeline-title">최근 현장 분위기</p>
          {recentOps.slice(0, 2).map((line) => (
            <div key={line} className="map-operation-context-card__timeline-row">
              <span aria-hidden="true">기억</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      ) : null}
      {list.length ? (
        <div className="map-operation-context-card__list">
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`map-operation-context-card__row map-operation-context-card__row--${
                item.operationPriority || "optional"
              }${item.isOperationSticky ? " is-sticky" : ""}`}
              onClick={() => onOpenItem?.(item)}
            >
              <span className="map-operation-context-card__icon" aria-hidden="true">
                {TYPE_ICON[item.type] || "📍"}
              </span>
              <span className="map-operation-context-card__text">{buildOperationLine(item)}</span>
              <span className="map-operation-context-card__priority">
                {PRIORITY_LABEL[item.operationPriority] || "참고"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {recentCheckIns.length ? (
        <div className="map-operation-context-card__recent">
          <span>최근 작업한 팀</span>
          <strong>{recentCheckIns.join(" · ")}</strong>
        </div>
      ) : null}
      {today.length ? (
        <div className="map-operation-context-card__timeline" aria-label="작업 히스토리">
          <p className="map-operation-context-card__timeline-title">오늘 작업 흐름</p>
          {today.slice(0, 2).map((event) => (
            <div key={event.id} className="map-operation-context-card__timeline-row">
              <span aria-hidden="true">{event.icon}</span>
              <span>{event.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
