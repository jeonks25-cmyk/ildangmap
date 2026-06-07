import React from "react";
import "./map-search-marker.css";

/** 검색 마커 탭 시 — 장소명·주소만 표시 (등록 카드 아님) */
export default function MapSearchMarkerInfo({ marker, open, onClose }) {
  if (!open || !marker) return null;

  const roadAddress = marker.roadAddress || marker.address || "";
  const jibunAddress = marker.jibunAddress || "";
  const showJibun = jibunAddress && jibunAddress !== roadAddress;

  return (
    <div className="map-search-marker-info" role="dialog" aria-label="검색 위치">
      <div className="map-search-marker-info__head">
        <h3 className="map-search-marker-info__title">{marker.title || "검색 위치"}</h3>
        <button type="button" className="map-search-marker-info__close" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      {roadAddress ? <p className="map-search-marker-info__address">{roadAddress}</p> : null}
      {showJibun ? (
        <p className="map-search-marker-info__address map-search-marker-info__address--sub">{jibunAddress}</p>
      ) : null}
    </div>
  );
}
