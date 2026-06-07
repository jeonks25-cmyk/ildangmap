import React, { memo } from "react";
import { SCHEDULE_ENTRY_TYPE } from "../../utils/unifiedScheduleModel";

const PersonalScheduleCard = memo(function PersonalScheduleCard({ entry, onEdit, onDelete }) {
  if (!entry || entry.type !== SCHEDULE_ENTRY_TYPE.PERSONAL) return null;

  return (
    <li className="personal-schedule-card">
      <div className="personal-schedule-card__main">
        <span className="personal-schedule-card__badge">개인</span>
        <strong className="personal-schedule-card__title">{entry.title}</strong>
      </div>
      <div className="personal-schedule-card__actions">
        <button type="button" className="personal-schedule-card__btn" onClick={() => onEdit(entry)}>
          수정
        </button>
        <button type="button" className="personal-schedule-card__btn personal-schedule-card__btn--danger" onClick={() => onDelete(entry.id)}>
          삭제
        </button>
      </div>
    </li>
  );
});

export default PersonalScheduleCard;
