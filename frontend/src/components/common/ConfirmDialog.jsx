import React from "react";
import { createPortal } from "react-dom";

/**
 * 삭제 등 위험 동작 전 확인 다이얼로그.
 */
export default function ConfirmDialog({
  open,
  title = "확인",
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button type="button" className="confirm-dialog__backdrop" aria-label="닫기" onClick={onCancel} />
      <div className="confirm-dialog__panel">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        {message ? <p className="confirm-dialog__message">{message}</p> : null}
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog__btn${danger ? " confirm-dialog__btn--danger" : " confirm-dialog__btn--confirm"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
