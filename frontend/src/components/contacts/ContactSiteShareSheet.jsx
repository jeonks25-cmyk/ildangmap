import React from "react";
import { createPortal } from "react-dom";
import { getPublicRegionLine, formatJobCardWorkDateLine } from "../../utils/jobModel";

export default function ContactSiteShareSheet({ open, contact, jobs, mode = "share", onClose, onShare }) {
  if (!open || !contact) return null;
  const list = Array.isArray(jobs) ? jobs.filter((j) => j && j.id != null).slice(0, 12) : [];

  const isInvite = mode === "invite";
  const title = isInvite ? "현장 초대" : "현장 공유";
  const sub = isInvite
    ? `${contact.name}님께 작업 요청을 보냅니다`
    : `${contact.name}님께 현장 정보를 공유합니다`;
  const hint = isInvite ? "급구 · 대타 · 인원 추가 등" : "이 현장 참고해봐";
  const actionLabel = isInvite ? "참여 가능 여부 보내기" : "공유 보내기";

  return createPortal(
    <div className="contact-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="contact-sheet__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="contact-sheet__panel">
        <header className="contact-sheet__head">
          <h2 className="contact-sheet__title">{title}</h2>
          <p className="contact-sheet__sub">{sub}</p>
          <button type="button" className="contact-sheet__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <ul className="contact-site-list">
          {list.length === 0 ? (
            <li className="contact-site-list__empty">등록된 현장이 없습니다</li>
          ) : (
            list.map((job) => (
              <li key={job.id}>
                <button type="button" className="contact-site-card" onClick={() => onShare?.(contact, job, mode)}>
                  <strong className="contact-site-card__title">{job.title || "제목 없음"}</strong>
                  <span className="contact-site-card__meta">
                    {formatJobCardWorkDateLine(job) || "일정 미정"} · {getPublicRegionLine(job)}
                  </span>
                  <span className="contact-site-card__hint">{hint}</span>
                  <span className="contact-site-card__action">{actionLabel}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}
