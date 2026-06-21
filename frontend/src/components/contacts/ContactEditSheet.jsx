import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ActivityRegionsSheet from "../shared/ActivityRegionsSheet";
import { formatRegionsLabel, normalizeActivityRegions } from "../../constants/activityRegions";
import { getContactDisplayName } from "../../utils/fieldContactsMock";
import { CRAFT_KEYS, CRAFT_LABEL } from "../../utils/jobModel";

function digitsOnly(value, maxLen) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, maxLen);
}

export default function ContactEditSheet({ open, contact, onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [regions, setRegions] = useState(["대전"]);
  const [trade, setTrade] = useState("film");
  const [experienceYearsText, setExperienceYearsText] = useState("");
  const [basePayText, setBasePayText] = useState("");
  const [memo, setMemo] = useState("");
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    setName(String(contact.nickname || contact.name || ""));
    setPhone(String(contact.phone || ""));
    setRegions(normalizeActivityRegions(contact));
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
    const normalizedRegions = normalizeActivityRegions(regions);
    onSave?.({
      name: trimmedName,
      nickname: trimmedName,
      phone: phone.trim(),
      regions: normalizedRegions,
      homeRegion: formatRegionsLabel(normalizedRegions),
      trade,
      experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? experienceYears : null,
      basePay: Number.isFinite(basePay) && basePay > 0 ? basePay : null,
      memo: memo.trim(),
    });
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
                {formatRegionsLabel(regions)}
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
          </div>
        </div>
      </div>

      <ActivityRegionsSheet
        open={regionSheetOpen}
        value={regions}
        onChange={setRegions}
        onClose={() => setRegionSheetOpen(false)}
      />
    </>,
    document.body
  );
}
