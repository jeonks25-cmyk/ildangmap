import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTIVITY_REGIONS } from "../../constants/activityRegions";
import { getContactDisplayName } from "../../utils/fieldContactsMock";
import { CRAFT_KEYS, CRAFT_LABEL } from "../../utils/jobModel";

function digitsOnly(value, maxLen) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, maxLen);
}

export default function ContactEditSheet({ open, contact, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [homeRegion, setHomeRegion] = useState("대전 서구");
  const [trade, setTrade] = useState("film");
  const [experienceYearsText, setExperienceYearsText] = useState("");
  const [basePayText, setBasePayText] = useState("");
  const [memo, setMemo] = useState("");
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    setName(String(contact.nickname || contact.name || ""));
    setPhone(String(contact.phone || ""));
    setHomeRegion(String(contact.homeRegion || "대전 서구"));
    setTrade(String(contact.trade || "film"));
    setExperienceYearsText(
      contact.experienceYears != null && Number.isFinite(Number(contact.experienceYears))
        ? String(contact.experienceYears)
        : ""
    );
    setBasePayText(contact.basePay != null && Number.isFinite(Number(contact.basePay)) ? String(contact.basePay) : "");
    setMemo(String(contact.memo || ""));
    setRegionSheetOpen(false);
  }, [open, contact]);

  if (!open || !contact) return null;

  const displayName = getContactDisplayName(contact);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const experienceYears = experienceYearsText ? Number(experienceYearsText) : null;
    const basePay = basePayText ? Number(basePayText) : null;
    onSave?.({
      name: trimmedName,
      nickname: trimmedName,
      phone: phone.trim(),
      homeRegion,
      trade,
      experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? experienceYears : null,
      basePay: Number.isFinite(basePay) && basePay > 0 ? basePay : null,
      memo: memo.trim(),
    });
  };

  const handleDelete = () => {
    const ok = window.confirm(`'${displayName}'님을 목록에서 삭제할까요?`);
    if (!ok) return;
    onDelete?.();
  };

  return createPortal(
    <>
      <div className="contact-edit-sheet" role="dialog" aria-modal="true" aria-label={`${displayName} 정보 수정`}>
        <button type="button" className="contact-edit-sheet__backdrop" aria-label="닫기" onClick={onClose} />
        <div className="contact-edit-sheet__panel">
          <div className="contact-edit-sheet__grab" aria-hidden="true" />
          <header className="contact-edit-sheet__head">
            <h2 className="contact-edit-sheet__title">인원 정보 수정</h2>
            <button type="button" className="contact-edit-sheet__close" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </header>

          <div className="contact-edit-sheet__body">
            <label className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">이름</span>
              <input
                type="text"
                className="contact-edit-sheet__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="활동명 또는 이름"
                maxLength={20}
              />
            </label>

            <label className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">연락처</span>
              <input
                type="tel"
                className="contact-edit-sheet__input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </label>

            <div className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">활동지역</span>
              <button type="button" className="contact-edit-sheet__region-btn" onClick={() => setRegionSheetOpen(true)}>
                {homeRegion}
                <span aria-hidden="true">›</span>
              </button>
            </div>

            <div className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">직종</span>
              <div className="contact-edit-sheet__chips" role="list">
                {CRAFT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="listitem"
                    className={`contact-edit-sheet__chip${trade === key ? " is-active" : ""}`}
                    onClick={() => setTrade(key)}
                  >
                    {CRAFT_LABEL[key] || key}
                  </button>
                ))}
              </div>
            </div>

            <label className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">경력 (년)</span>
              <input
                type="text"
                inputMode="numeric"
                className="contact-edit-sheet__input"
                value={experienceYearsText}
                onChange={(e) => setExperienceYearsText(digitsOnly(e.target.value, 2))}
                placeholder="예: 8"
              />
            </label>

            <label className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">희망 일당 (만원)</span>
              <input
                type="text"
                inputMode="numeric"
                className="contact-edit-sheet__input"
                value={basePayText}
                onChange={(e) => setBasePayText(digitsOnly(e.target.value, 3))}
                placeholder="숫자만 입력"
              />
            </label>

            <label className="contact-edit-sheet__field">
              <span className="contact-edit-sheet__label">메모</span>
              <textarea
                className="contact-edit-sheet__textarea"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="현장 메모, 특이사항"
                rows={3}
                maxLength={120}
              />
            </label>
          </div>

          <div className="contact-edit-sheet__actions">
            <button type="button" className="contact-edit-sheet__save" onClick={handleSave} disabled={!name.trim()}>
              저장
            </button>
            <button type="button" className="contact-edit-sheet__delete" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </div>
      </div>

      {regionSheetOpen ? (
        <div
          className="contact-edit-sheet__region-backdrop settings-region-sheet-backdrop"
          role="presentation"
          onClick={() => setRegionSheetOpen(false)}
        >
          <div
            className="settings-region-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="활동지역 선택"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-region-sheet__head">
              <strong>활동지역</strong>
              <button type="button" className="settings-sheet__close" onClick={() => setRegionSheetOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="settings-region-sheet__list">
              {ACTIVITY_REGIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`settings-region-sheet__item${homeRegion === item ? " is-active" : ""}`}
                  onClick={() => {
                    setHomeRegion(item);
                    setRegionSheetOpen(false);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
