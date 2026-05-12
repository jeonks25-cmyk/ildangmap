import React from "react";
import { JOB_STATUS } from "../../utils/jobModel";

function applicantStatusKo(st) {
  if (st === "applied") return "지원";
  if (st === "confirmed") return "확정";
  if (st === "rejected") return "거절";
  return String(st || "");
}

export default function ApplicantsSheet({ job, onClose, onConfirm, onReject }) {
  if (!job) return null;
  const list = Array.isArray(job.applicants) ? job.applicants : [];
  const canManage = job.status === JOB_STATUS.RECRUITING;

  return (
    <div className="applicants-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="applicants-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="지원자 목록"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="applicants-sheet__grab" aria-hidden="true" />
        <div className="applicants-sheet__head">
          <h2 className="applicants-sheet__title">지원자 ({list.length}명)</h2>
          <button type="button" className="applicants-sheet__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <p className="applicants-sheet__sub">{job.title}</p>

        <div className="applicants-sheet__list">
          {list.length === 0 ? <p className="applicants-sheet__empty">지원자가 없습니다.</p> : null}
          {list.map((a) => {
            if (!a) return null;
            const confirmed = a.status === "confirmed";
            const rejected = a.status === "rejected";
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
                {canManage && a.status === "applied" ? (
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
