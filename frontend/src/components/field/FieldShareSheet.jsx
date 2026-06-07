import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getShareTargetGroups } from "../../utils/fieldOpsMock";
import { pushFieldOpsInbox } from "../../utils/fieldOpsStorage";
import { openFieldNavigation } from "../../utils/externalMapLinks";

const TABS = [
  { key: "participants", label: "참여자" },
  { key: "recent", label: "최근" },
  { key: "favorites", label: "즐겨찾기" },
  { key: "search", label: "검색" },
];

export default function FieldShareSheet({ open, field, onClose, onShared }) {
  const [tab, setTab] = useState("participants");
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");

  const groups = useMemo(() => (field?.id != null ? getShareTargetGroups(field.id) : null), [field?.id]);

  const list = useMemo(() => {
    if (!groups) return [];
    if (tab === "participants") return groups.participants;
    if (tab === "recent") return groups.recent;
    if (tab === "favorites") return groups.favorites;
    const q = search.trim().toLowerCase();
    return groups.all.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.craft.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
    );
  }, [groups, tab, search]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!field || selected.size === 0) return;
    const payload = {
      fieldId: field.id,
      fieldName: field.fieldName,
      address: field.address,
      region: field.region,
      date: field.date,
      startTime: field.startTime,
      endTime: field.endTime,
      payLabel: field.payLabel,
      jobType: field.jobType,
      meetLocation: field.meetLocation,
      contactPhone: field.contactPhone,
      ownerName: field.ownerName,
      lat: field.lat,
      lng: field.lng,
    };

    selected.forEach((personId) => {
      pushFieldOpsInbox({
        type: "urgent_share",
        fieldId: field.id,
        personId,
        payload,
        title: "긴급 현장 이동 요청",
      });
    });

    // eslint-disable-next-line no-console
    console.log("[현장 공유]", payload, "->", [...selected]);
    onShared?.([...selected]);
    setSelected(new Set());
    onClose?.();
  }, [field, onClose, onShared, selected]);

  if (!open || !field) return null;

  return createPortal(
    <div className="field-ops-sheet" role="dialog" aria-modal="true" aria-label="현장 공유">
      <button type="button" className="field-ops-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="field-ops-sheet__panel field-ops-sheet__panel--tall">
        <header className="field-ops-sheet__head">
          <h2 className="field-ops-sheet__title">현장 공유</h2>
          <button type="button" className="field-ops-sheet__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <p className="field-ops-sheet__lead">{field.fieldName} 정보를 선택한 인원에게 보냅니다.</p>

        <div className="field-share-preview">
          <strong>{field.fieldName}</strong>
          <span>{field.address}</span>
          <span>
            {field.timeLabel} · {field.payLabel} · {field.jobType}
          </span>
          <span>집합 {field.meetLocation}</span>
          <button type="button" className="field-share-preview__nav" onClick={() => openFieldNavigation(field)}>
            지도/길찾기 미리보기
          </button>
        </div>

        <div className="field-share-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`field-share-tabs__btn${tab === t.key ? " is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "search" ? (
          <input
            className="field-ops-sheet__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·공정 검색"
          />
        ) : null}

        <ul className="field-share-list">
          {list.map((person) => {
            const checked = selected.has(person.id);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  className={`field-share-row${checked ? " is-selected" : ""}`}
                  onClick={() => toggle(person.id)}
                >
                  <span className="field-share-row__avatar">{person.name.slice(0, 1)}</span>
                  <span className="field-share-row__meta">
                    <strong>{person.name}</strong>
                    <span>
                      {person.role} · {person.craft} · {person.region}
                    </span>
                  </span>
                  <span className="field-share-row__check" aria-hidden="true">
                    {checked ? "✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="field-ops-sheet__foot">
          <button
            type="button"
            className="field-ops-sheet__submit"
            disabled={selected.size === 0}
            onClick={handleSend}
          >
            {selected.size > 0 ? `${selected.size}명에 공유` : "대상 선택"}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
