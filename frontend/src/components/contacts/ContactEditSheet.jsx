import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTIVITY_REGIONS } from "../../constants/activityRegions";
import { getContactDisplayName } from "../../utils/fieldContactsMock";

export default function ContactEditSheet({ open, contact, onClose, onSave, onDelete }) {
  const [phone, setPhone] = useState("");
  const [homeRegion, setHomeRegion] = useState("대전 서구");
  const [memo, setMemo] = useState("");
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    setPhone(String(contact.phone || ""));
    setHomeRegion(String(contact.homeRegion || "대전 서구"));
    setMemo(String(contact.memo || ""));
    setRegionSheetOpen(false);
  }, [open, contact]);

  if (!open || !contact) return null;

  const displayName = getContactDisplayName(contact);

  const handleSave = () => {
    onSave?.({
      phone: phone.trim(),
      homeRegion,
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
            <p className="contact-edit-sheet__name">{displayName}</p>

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
            <button type="button" className="contact-edit-sheet__save" onClick={handleSave}>
              저장
            </button>
            <button type="button" className="contact-edit-sheet__delete" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </div>
      </div>

      {regionSheetOpen ? (
        <div className="settings-region-sheet-backdrop" role="presentation" onClick={() => setRegionSheetOpen(false)}>
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
