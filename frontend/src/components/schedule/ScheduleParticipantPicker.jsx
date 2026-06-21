import React, { useMemo } from "react";
import { buildContactsList, useContactsStore } from "../../store/useContactsStore";
import { getContactDisplayName } from "../../utils/fieldContactsMock";

/** 현장 일정 생성 시 참여 인원 선택 */
export default function ScheduleParticipantPicker({ selectedIds, onChange, maxVisible = 8 }) {
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const contactOverridesById = useContactsStore((s) => s.contactOverridesById);
  const removedContactIds = useContactsStore((s) => s.removedContactIds);

  const contacts = useMemo(
    () => buildContactsList(favoriteById, memoById, addedContacts, contactOverridesById, removedContactIds),
    [favoriteById, memoById, addedContacts, contactOverridesById, removedContactIds]
  );

  const visible = contacts.slice(0, maxVisible);

  if (!visible.length) {
    return <p className="schedule-participant-picker__empty">팀원을 먼저 추가해 주세요.</p>;
  }

  const toggle = (id) => {
    const key = String(id);
    const next = new Set((selectedIds || []).map(String));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.([...next]);
  };

  return (
    <fieldset className="schedule-participant-picker">
      <legend>참여 인원</legend>
      <ul className="schedule-participant-picker__list">
        {visible.map((contact) => {
          const id = String(contact.id);
          const checked = (selectedIds || []).map(String).includes(id);
          return (
            <li key={id}>
              <label className="schedule-participant-picker__row">
                <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                <span className="schedule-participant-picker__name">{getContactDisplayName(contact)}</span>
                {contact.homeRegion ? (
                  <span className="schedule-participant-picker__sub">{contact.homeRegion}</span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
