import React, { useEffect, useId, useMemo } from "react";
import {
  buildScheduleSharePayload,
  copyScheduleSharePayload,
  openScheduleShareSms,
  shareScheduleViaSystem,
} from "../../utils/scheduleShare";
import { useUserStore } from "../../store/useUserStore";
import { getDisplayNickname } from "../../utils/displayNickname";
import "./schedule-share-sheet.css";

/**
 * 일정 공유 바텀시트 — 카카오(Web Share) · 문자 · 복사.
 */
export default function ScheduleShareSheet({ open, scheduleInput, onClose, onToast }) {
  const titleId = useId();
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const inquiryContact = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);

  const payload = useMemo(
    () => (scheduleInput ? buildScheduleSharePayload(scheduleInput, { inquiryContact }) : null),
    [scheduleInput, inquiryContact]
  );

  useEffect(() => {
    if (!open) return undefined;
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

  if (!open || !payload) return null;

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
            일정 공유
          </h2>
          <button type="button" className="schedule-share-sheet-panel__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <pre className="schedule-share-sheet-preview" aria-label="공유 미리보기">
          {payload.fullText}
        </pre>

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
              링크 복사
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
