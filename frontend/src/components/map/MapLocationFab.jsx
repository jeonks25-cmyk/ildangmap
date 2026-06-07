import React from "react";
import FloatingButton, { FloatingButtonLocationIcon } from "./FloatingButton";

/** 내 위치 — 지도 우상단 플로팅 */
export default function MapLocationFab({ onClick, locating = false }) {
  return (
    <FloatingButton
      variant="labeled"
      className="map-floating-btn--location map-geo-stage__loc-fab"
      icon={<FloatingButtonLocationIcon />}
      label="내위치"
      busy={locating}
      onClick={onClick}
      aria-label="내 위치"
    />
  );
}
