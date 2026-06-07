import React, { useEffect, useRef } from "react";
import FloatingActionButton from "../ui/FloatingActionButton";
import "./map-quick-add.css";
import "../ui/floating-action-button.css";

const PLACE_ACTIONS = [
  { key: "parking_save", label: "주차", emoji: "🚗" },
  { key: "restroom_save", label: "화장실", emoji: "🚻" },
  { key: "restaurant_save", label: "식당", emoji: "🍜" },
];

export default function MapQuickAddFab({ open, onToggle, onSelect, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const historyPushedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        if (window.history.state?.mapQuickAddMenu) {
          window.history.back();
        }
      }
      return undefined;
    }
    window.history.pushState({ mapQuickAddMenu: true }, "");
    historyPushedRef.current = true;
    const onPop = () => {
      historyPushedRef.current = false;
      onClose?.();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onClose]);

  const handleSelect = (key) => {
    onSelect?.(key);
    onClose?.();
  };

  return (
    <div className={`floating-action-button-anchor map-quick-add-anchor${open ? " is-open" : ""}`}>
      <div
        className={`map-quick-add-bubble${open ? " is-open" : ""}`}
        role="menu"
        aria-label="장소 빠른 등록"
        aria-hidden={!open}
      >
        <div className="map-quick-add-bubble__body">
          {PLACE_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              className="map-quick-add-bubble__action"
              role="menuitem"
              onClick={() => handleSelect(action.key)}
            >
              <span className="map-quick-add-bubble__icon" aria-hidden>
                {action.emoji}
              </span>
              <span className="map-quick-add-bubble__label">{action.label}</span>
            </button>
          ))}
        </div>
        <span className="map-quick-add-bubble__tail" aria-hidden />
      </div>
      <FloatingActionButton
        embedded
        label="장소"
        open={open}
        aria-label={open ? "장소 등록 메뉴 닫기" : "주차·화장실·식당 등록"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      />
    </div>
  );
}
