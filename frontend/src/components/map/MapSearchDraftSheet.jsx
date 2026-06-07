import React, { useEffect, useState } from "react";
import { MAP_ITEM_TYPE } from "../../constants/mapItemTypes";
import { getPlaceTypeIcon } from "../../utils/placeDistance";

/** MVP 등록 — 아파트·주차·화장실·식당 (말풍선 퀵액션과 동일 아이콘) */
const REGISTER_CATEGORIES = [
  { type: MAP_ITEM_TYPE.FIELD, label: "아파트" },
  { type: MAP_ITEM_TYPE.PARKING, label: "주차" },
  { type: MAP_ITEM_TYPE.RESTROOM, label: "화장실" },
  { type: MAP_ITEM_TYPE.RESTAURANT, label: "식당" },
];

export default function MapSearchDraftSheet({ item, open, onClose, onRegister }) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.title || "");
  }, [item, open]);

  if (!open || !item) return null;
  const roadAddress = item.roadAddress || item.address || "";
  const jibunAddress = item.jibunAddress || "";

  return (
    <div className="map-life-info-sheet map-search-draft-sheet" role="presentation">
      <section className="map-life-info-sheet__panel map-search-draft-sheet__panel" role="dialog" aria-label="등록 위치 확인">
        <header className="map-life-info-sheet__head map-search-draft-sheet__head">
          <span className="map-life-info-sheet__type">
            <span aria-hidden="true">📍</span>
            임시 핀
          </span>
          <button type="button" className="map-life-info-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <input
          className="map-search-draft-sheet__name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="이름"
          aria-label="등록 이름"
        />
        {roadAddress ? <p className="map-search-draft-sheet__address">{roadAddress}</p> : null}
        {jibunAddress && jibunAddress !== roadAddress ? (
          <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">{jibunAddress}</p>
        ) : null}
        <p className="map-search-draft-sheet__hint">지도를 움직이면 중앙 핀 위치로 저장됩니다.</p>
        <div className="map-search-draft-sheet__actions" aria-label="일당맵에 등록">
          {REGISTER_CATEGORIES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className={`map-search-draft-sheet__register${item.preferredType === type ? " is-active" : ""}`}
              onClick={() => onRegister?.(type, title)}
              aria-label={`${label}로 등록`}
            >
              <span className="map-search-draft-sheet__register-icon" aria-hidden="true">
                {getPlaceTypeIcon(type)}
              </span>
              <span className="map-search-draft-sheet__register-label">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
