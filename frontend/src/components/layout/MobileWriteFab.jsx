import React, { useCallback, useEffect, useId, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  { id: "post", label: "공고 등록", icon: "📝", path: "/map", state: { fabMenu: "post" } },
  { id: "urgent", label: "긴급 모집", icon: "🔥", path: "/map", state: { fabMenu: "urgent" } },
  { id: "help", label: "근처 헬프", icon: "🤝", path: "/map", state: { fabMenu: "help" } },
  { id: "schedule", label: "일정 등록", icon: "📅", path: "/calendar", state: {} },
];

export default function MobileWriteFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const isMapExplore = location.pathname === "/map";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const onPick = useCallback(
    (item) => {
      if (item.path === "/calendar") {
        navigate("/calendar");
      } else {
        navigate(item.path, { state: item.state });
      }
      close();
    },
    [navigate, close]
  );

  return (
    <div className="daangn-write-fab-root" data-open={open ? "true" : "false"}>
      {open ? (
        <>
          <button
            type="button"
            className="daangn-write-fab-backdrop"
            aria-label="메뉴 닫기"
            onClick={close}
          />
          <div
            id="daangn-write-fab-panel"
            className="daangn-write-fab-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="daangn-write-fab-panel__head">
              <h2 id={titleId} className="daangn-write-fab-panel__title">
                글쓰기
              </h2>
              <button type="button" className="daangn-write-fab-panel__close" onClick={close} aria-label="닫기">
                ✕
              </button>
            </div>
            <ul className="daangn-write-fab-menu" role="menu">
              {MENU_ITEMS.map((item) => (
                <li key={item.id} className="daangn-write-fab-menu__item" role="none">
                  <button
                    type="button"
                    className="daangn-write-fab-menu__btn"
                    role="menuitem"
                    onClick={() => onPick(item)}
                  >
                    <span className="daangn-write-fab-menu__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="daangn-write-fab-menu__label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <button
        type="button"
        className={`daangn-write-fab-btn${open ? " daangn-write-fab-btn--open" : ""}${
          isMapExplore && !open ? " daangn-write-fab-btn--pill" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? "daangn-write-fab-panel" : undefined}
        aria-label={open ? "메뉴 닫기" : "글쓰기 메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="daangn-write-fab-btn__glyph" aria-hidden="true">
          {open ? "×" : "+"}
        </span>
        {isMapExplore && !open ? (
          <span className="daangn-write-fab-btn__text" aria-hidden="true">
            글쓰기
          </span>
        ) : null}
      </button>
    </div>
  );
}
