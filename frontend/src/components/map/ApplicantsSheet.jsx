import React from "react";
import { getApplicantsArray, JOB_STATUS, normalizeLifecycleStatus } from "../../utils/jobModel";
import { normalizeParticipantStatus } from "../../utils/jobPrivacyPolicy";

function applicantStatusKo(st) {
  const normalized = normalizeParticipantStatus(st);
  if (normalized === "pending") return "지원";
  if (normalized === "approved" || normalized === "checked_in" || normalized === "completed") return "확정";
  if (normalized === "rejected") return "거절";
  return String(st || "");
}

export default function ApplicantsSheet({ job, onClose, onConfirm, onReject, canManageApplicants }) {
  if (!job) return null;
  const list = getApplicantsArray(job);
  const lifecycle = normalizeLifecycleStatus(job);
  const defaultManage =
    lifecycle === JOB_STATUS.RECRUITING || lifecycle === JOB_STATUS.FULL || lifecycle === JOB_STATUS.CONFIRMED;
  const canManage =
    typeof canManageApplicants === "boolean" ? canManageApplicants : defaultManage;

  return (
    <div className="applicants-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="applicants-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="참여 요청 목록"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="applicants-sheet__grab" aria-hidden="true" />
        <div className="applicants-sheet__head">
          <h2 className="applicants-sheet__title">참여 요청 ({list.length}명)</h2>
          <button type="button" className="applicants-sheet__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <p className="applicants-sheet__sub">{job.title}</p>

        <div className="applicants-sheet__list">
          {list.length === 0 ? <p className="applicants-sheet__empty">참여 요청이 없습니다.</p> : null}
          {list.map((a) => {
            if (!a) return null;
            const normalizedStatus = normalizeParticipantStatus(a.status);
            const confirmed = normalizedStatus === "approved" || normalizedStatus === "checked_in" || normalizedStatus === "completed";
            const rejected = normalizedStatus === "rejected";
            return (
              <div
                key={a.id}
                className={`applicants-sheet__card${confirmed ? " is-confirmed" : ""}${rejected ? " is-rejected" : ""}`}
              >
                <div className="applicants-sheet__card-top">
                  <strong className="applicants-sheet__name">{a.name}</strong>
                  {confirmed ? <span className="applicants-sheet__pill applicants-sheet__pill--ok">확정됨</span> : null}
                  {rejected ? <span className="applicants-sheet__pill applicants-sheet__pill--no">거절됨</span> : null}
                </div>
                <div className="applicants-sheet__meta">
                  <div className="applicants-sheet__role">{a.role}</div>
                  <div className="applicants-sheet__stats">
                    작업 {a.experience ?? 0}회 · 노쇼 {a.noShow ?? 0}회 · {applicantStatusKo(a.status)}
                  </div>
                </div>
                {canManage && normalizedStatus === "pending" ? (
                  <div className="applicants-sheet__actions">
                    <button type="button" className="applicants-sheet__btn applicants-sheet__btn--ok" onClick={() => onConfirm?.(a.id)}>
                      확정
                    </button>
                    <button type="button" className="applicants-sheet__btn applicants-sheet__btn--no" onClick={() => onReject?.(a.id)}>
                      거절
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
