import React, { useCallback, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";

/** 현장·헬프·견적 요청 등록 — 지도 HUD 우측 상단 전용 */
const POST_MENU_ITEMS = [
  { id: "post", label: "현장 등록", desc: "함께 작업할 현장 요청", icon: "👷", state: { fabMenu: "post" } },
  { id: "help", label: "긴급헬프", desc: "즉시 투입·단기 보조", icon: "🚨", state: { fabMenu: "help" } },
  {
    id: "estimate",
    label: "견적 요청",
    desc: "소비자 시공·방문 견적",
    icon: "📐",
    state: { fabMenu: "consumer" },
  },
];

export default function MapWriteMenuSheet({ open, onClose }) {
  const navigate = useNavigate();
  const titleId = useId();

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

  const onPick = useCallback(
    (item) => {
      navigate("/map", { state: item.state });
      onClose?.();
    },
    [navigate, onClose]
  );

  if (!open) return null;

  return (
    <div className="geo-write-sheet-root" data-open="true">
      <button type="button" className="geo-write-sheet-backdrop" aria-label="메뉴 닫기" onClick={onClose} />
      <div
        className="geo-write-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="geo-write-sheet-panel__head">
          <h2 id={titleId} className="geo-write-sheet-panel__title">
            현장 등록
          </h2>
          <button type="button" className="geo-write-sheet-panel__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <ul className="geo-write-sheet-menu" role="menu">
          {POST_MENU_ITEMS.map((item) => (
            <li key={item.id} className="geo-write-sheet-menu__item" role="none">
              <button type="button" className="geo-write-sheet-menu__btn" role="menuitem" onClick={() => onPick(item)}>
                <span className="geo-write-sheet-menu__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="geo-write-sheet-menu__text">
                  <span className="geo-write-sheet-menu__label">{item.label}</span>
                  {item.desc ? <span className="geo-write-sheet-menu__desc">{item.desc}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
