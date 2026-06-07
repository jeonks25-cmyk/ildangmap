import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * 카드 우측 상단 ⋮ — 수정 / 삭제 (미니 메뉴)
 */
export default function FieldCardMenu({ onEdit, onDelete, ariaLabel = "메뉴" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("touchstart", onDoc, { capture: true });
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("touchstart", onDoc, { capture: true });
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="field-card-menu" ref={rootRef}>
      <button
        type="button"
        className="field-card-menu__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open ? (
        <div className="field-card-menu__dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="field-card-menu__item"
            onClick={() => {
              onEdit?.();
              close();
            }}
          >
            수정
          </button>
          <button
            type="button"
            role="menuitem"
            className="field-card-menu__item field-card-menu__item--danger"
            onClick={() => {
              onDelete?.();
              close();
            }}
          >
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
