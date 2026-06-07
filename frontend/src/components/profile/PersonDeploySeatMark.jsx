import React from "react";

/**
 * 극장 객석 예약형 표시 — 색이 아닌 형태·패턴으로 가능/불가 구분 (색맹 접근성).
 * 가능: 빈 좌석(테두리만) / 불가: 빗금 채움 + ✕
 */
export default function PersonDeploySeatMark({
  available,
  size = "md",
  withLabel = false,
  className = "",
}) {
  const stateClass = available ? "deploy-seat-mark--open" : "deploy-seat-mark--taken";

  return (
    <span
      className={["deploy-seat-mark", stateClass, `deploy-seat-mark--${size}`, className].filter(Boolean).join(" ")}
      aria-hidden={withLabel ? undefined : true}
    >
      {!available ? <span className="deploy-seat-mark__x">✕</span> : null}
      {withLabel ? (
        <span className="deploy-seat-mark__label">{available ? "가능" : "불가"}</span>
      ) : null}
    </span>
  );
}
