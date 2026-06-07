import React from "react";
import { MapPlaceListFab } from "./MapPlaceOverlay";
import MapLocationFab from "./MapLocationFab";

/** 지도 플로팅 — 목록(좌상) · 내위치(우상), 배경 패널 없음 */
export default function MapPlaceTools({ onOpenList, onOpenLocation, locating = false, listOpen = false }) {
  return (
    <>
      <div className="map-floating-anchor map-floating-anchor--list">
        <MapPlaceListFab onClick={onOpenList} open={listOpen} />
      </div>
      <div className="map-floating-anchor map-floating-anchor--location">
        <MapLocationFab locating={locating} onClick={onOpenLocation} />
      </div>
    </>
  );
}
