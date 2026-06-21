import React, { useEffect, useId, useMemo, useState } from "react";
import {
  buildScheduleSharePayload,
  copyScheduleSharePayload,
  isSiteScheduleShareable,
  openScheduleShareSms,
  shareScheduleViaSystem,
} from "../../utils/scheduleShare";
import { useUserStore } from "../../store/useUserStore";
import { getDisplayNickname } from "../../utils/displayNickname";
import "./schedule-share-sheet.css";

/**
 * 현장 일정 공유 바텀시트 — 미리보기 · 카카오(Web Share) · 문자 · 복사.
 */
export default function ScheduleShareSheet({ open, scheduleInput, onClose, onToast }) {
  const titleId = useId();
  const memoOptionId = useId();
  const [includeMemo, setIncludeMemo] = useState(false);
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const inquiryContact = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);
  const shareable = isSiteScheduleShareable(scheduleInput);

  const payload = useMemo(() => {
    if (!scheduleInput || !shareable) return null;
    return buildScheduleSharePayload(scheduleInput, { inquiryContact, includeMemo });
  }, [scheduleInput, shareable, inquiryContact, includeMemo]);

  useEffect(() => {
    if (!open) {
      setIncludeMemo(false);
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !shareable || !payload) return null;

  const handleKakao = async () => {
    const result = await shareScheduleViaSystem(payload);
    if (result.ok) {
      onToast?.(result.method === "clipboard" ? "일정 내용을 복사했습니다 · 카카오톡에 붙여넣기" : "공유 창을 열었습니다");
      onClose?.();
      return;
    }
    if (!result.cancelled) onToast?.("공유할 수 없습니다");
  };

  const handleSms = () => {
    openScheduleShareSms(payload);
    onToast?.("문자 앱으로 일정을 전달합니다");
    onClose?.();
  };

  const handleCopy = async () => {
    const result = await copyScheduleSharePayload(payload);
    if (result.ok) {
      onToast?.("일정 내용을 복사했습니다");
      onClose?.();
    } else {
      onToast?.("복사에 실패했습니다");
    }
  };

  return (
    <div className="schedule-share-sheet-root" data-open="true">
      <button type="button" className="schedule-share-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="schedule-share-sheet-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="schedule-share-sheet-panel__head">
          <h2 id={titleId} className="schedule-share-sheet-panel__title">
            현장 일정 공유
          </h2>
          <button type="button" className="schedule-share-sheet-panel__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <p className="schedule-share-sheet-panel__lead">같이 일할 사람에게 현장 일정을 전달합니다.</p>

        <section className="schedule-share-sheet-preview-wrap" aria-label="공유 미리보기">
          <h3 className="schedule-share-sheet-preview-wrap__label">미리보기</h3>
          <pre className="schedule-share-sheet-preview">{payload.fullText}</pre>
        </section>

        <label className="schedule-share-sheet-memo-opt" htmlFor={memoOptionId}>
          <input
            id={memoOptionId}
            type="checkbox"
            checked={includeMemo}
            onChange={(e) => setIncludeMemo(e.target.checked)}
          />
          <span>메모 포함</span>
        </label>

        <ul className="schedule-share-sheet-menu" role="menu">
          <li role="none">
            <button type="button" className="schedule-share-sheet-menu__btn schedule-share-sheet-menu__btn--kakao" role="menuitem" onClick={handleKakao}>
              카카오톡 공유
            </button>
          </li>
          <li role="none">
            <button type="button" className="schedule-share-sheet-menu__btn schedule-share-sheet-menu__btn--sms" role="menuitem" onClick={handleSms}>
              문자 공유
            </button>
          </li>
          <li role="none">
            <button type="button" className="schedule-share-sheet-menu__btn schedule-share-sheet-menu__btn--copy" role="menuitem" onClick={handleCopy}>
              내용 복사
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
