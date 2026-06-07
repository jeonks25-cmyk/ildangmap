import React, { useMemo, useState } from "react";
import { buildPersonLines } from "../../utils/fieldProfileCard";
import { getContactSearchBlob } from "../../utils/fieldContactsMock";

/**
 * 그룹 화면 내부 "사람 추가" 체크리스트 시트.
 * 전체 연락처를 보여주고, 체크 = 그룹 포함 / 해제 = 그룹 제외 (M:N, 즉시 반영).
 * 일정/명함/채팅/알림과 무관 — useContactsStore 멤버십만 토글.
 */
export default function ContactGroupAddSheet({
  open,
  group,
  contacts,
  memberIds,
  onAdd,
  onRemove,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const memberSet = useMemo(() => new Set((memberIds || []).map(String)), [memberIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(contacts) ? contacts : [];
    if (!q) return list;
    return list.filter((c) => getContactSearchBlob(c).includes(q));
  }, [contacts, query]);

  if (!open || !group) return null;

  return (
    <div className="group-add-sheet" role="presentation" onClick={onClose}>
      <section
        className="group-add-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${group.name} 사람 추가`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="group-add-sheet__head">
          <div>
            <p className="group-add-sheet__eyebrow">사람 추가</p>
            <h2 className="group-add-sheet__title">{group.name}</h2>
          </div>
          <button type="button" className="group-add-sheet__done" onClick={onClose}>
            완료
          </button>
        </header>

        <label className="contacts-search group-add-sheet__search">
          <span className="contacts-search__icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="contacts-search__input"
            placeholder="이름 · 지역"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="연락처 검색"
          />
        </label>

        <div className="group-add-sheet__list" role="list">
          {filtered.length === 0 ? (
            <p className="group-add-sheet__empty">검색 결과가 없습니다.</p>
          ) : (
            filtered.map((contact) => {
              const checked = memberSet.has(String(contact.id));
              const identityLine = buildPersonLines(contact, "invite").lines.join(" · ");
              return (
                <label key={contact.id} className="group-add-sheet__row" role="listitem">
                  <input
                    type="checkbox"
                    className="group-add-sheet__check"
                    checked={checked}
                    onChange={() => (checked ? onRemove?.(contact.id) : onAdd?.(contact.id))}
                    aria-label={`${contact.name} ${checked ? "그룹에서 제외" : "그룹에 추가"}`}
                  />
                  <span className="group-add-sheet__row-body">
                    <span className="group-add-sheet__row-name">{contact.name}</span>
                    {identityLine ? (
                      <span className="group-add-sheet__row-sub">{identityLine}</span>
                    ) : null}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
