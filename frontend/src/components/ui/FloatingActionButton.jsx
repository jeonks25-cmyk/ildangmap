import React from "react";
import FloatingButton, { FloatingButtonAddIcon } from "../map/FloatingButton";
import "./floating-action-button.css";

/**
 * 탭 공통 추가 FAB — 지도(+장소) / 일정(+일정) / 인원(+인원)
 * 위치·크기·색상·그림자는 label 외 동일
 */
export default function FloatingActionButton({
  label,
  embedded = false,
  open = false,
  className = "",
  ...rest
}) {
  const button = (
    <FloatingButton
      variant="labeled"
      className={["floating-action-button", open ? "is-open" : "", className].filter(Boolean).join(" ")}
      icon={<FloatingButtonAddIcon />}
      label={label}
      open={open}
      {...rest}
    />
  );

  if (embedded) return button;

  return <div className="floating-action-button-anchor">{button}</div>;
}
