import React, { useEffect, useMemo, useState } from "react";
import { MAP_ITEM_TYPE } from "../../constants/mapItemTypes";
import { getPlaceRegisterConfig, PLACE_REGISTER_CONFIG } from "../../constants/placeRegisterConfig";
import { getPlaceTypeIcon } from "../../utils/placeDistance";

const REGISTER_CATEGORIES = [
  { type: MAP_ITEM_TYPE.FIELD, label: "아파트" },
  { type: MAP_ITEM_TYPE.PARKING, label: "주차" },
  { type: MAP_ITEM_TYPE.RESTROOM, label: "화장실" },
  { type: MAP_ITEM_TYPE.RESTAURANT, label: "식당" },
];

function buildRegisterPayload(item, type, title, description) {
  return {
    type,
    title: String(title || item?.title || item?.placeName || "").trim(),
    description: String(description || item?.description || "").trim(),
    lat: item?.lat,
    lng: item?.lng,
    address: item?.address,
    roadAddress: item?.roadAddress,
    jibunAddress: item?.jibunAddress,
    placeUrl: item?.placeUrl,
    kakaoMapLink: item?.kakaoMapLink,
    naverMapLink: item?.naverMapLink,
    nearestPlaceId: item?.nearestPlace?.id || item?.nearestPlaceId || "",
  };
}

/**
 * 장소 등록 시트 — 식당·화장실·주차 등 공통.
 * 자동 채우기 성공 시 2탭 이내 등록, 실패 시에만 직접 입력.
 */
export default function PlaceRegisterSheet({
  item,
  open,
  onClose,
  onRegister,
  onPreferredTypeChange,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeType, setActiveType] = useState(MAP_ITEM_TYPE.RESTAURANT);

  const isEdit = item?.mode === "edit_place";
  const loading = Boolean(item?.autoFillLoading);
  const manualRequired = Boolean(item?.manualRequired);
  const preferredType = item?.preferredType || activeType;
  const config = getPlaceRegisterConfig(preferredType);

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.title || item.placeName || "");
    setDescription(item.description || "");
    setActiveType(item.preferredType || MAP_ITEM_TYPE.RESTAURANT);
  }, [item, open]);

  const quickRegisterType = useMemo(() => {
    if (item?.preferredType) return item.preferredType;
    return MAP_ITEM_TYPE.RESTAURANT;
  }, [item?.preferredType]);

  const quickConfig = getPlaceRegisterConfig(quickRegisterType);

  if (!open || !item) return null;

  const roadAddress = item.roadAddress || item.address || "";
  const jibunAddress = item.jibunAddress || "";
  const showManualFields = manualRequired || isEdit;
  const canQuickRegister =
    !isEdit && !loading && !manualRequired && Boolean(roadAddress || item.title) && quickConfig;

  const handleTypeSelect = (type) => {
    setActiveType(type);
    onPreferredTypeChange?.(type);
  };

  const handleRegister = (type) => {
    const resolvedType = type || preferredType || activeType;
    onRegister?.(buildRegisterPayload(item, resolvedType, title, description));
  };

  return (
    <div className="map-life-info-sheet map-search-draft-sheet place-register-sheet" role="presentation">
      <section className="map-life-info-sheet__panel map-search-draft-sheet__panel" role="dialog" aria-label="장소 등록">
        <header className="map-life-info-sheet__head map-search-draft-sheet__head">
          <span className="map-life-info-sheet__type">
            <span aria-hidden="true">{getPlaceTypeIcon(preferredType)}</span>
            {isEdit ? "장소 수정" : "장소 등록"}
          </span>
          <button type="button" className="map-life-info-sheet__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        {loading ? (
          <p className="place-register-sheet__status" role="status">
            주소와 장소를 찾는 중…
          </p>
        ) : null}

        {!loading && canQuickRegister ? (
          <div className="place-register-sheet__auto">
            <p className="place-register-sheet__auto-label">자동으로 찾았어요</p>
            {item.title || item.placeName ? (
              <h3 className="place-register-sheet__auto-title">{item.title || item.placeName}</h3>
            ) : null}
            {roadAddress ? <p className="map-search-draft-sheet__address">{roadAddress}</p> : null}
            {jibunAddress && jibunAddress !== roadAddress ? (
              <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">{jibunAddress}</p>
            ) : null}
            {item.nearestDistanceM != null ? (
              <p className="place-register-sheet__distance">약 {Math.round(item.nearestDistanceM)}m 거리</p>
            ) : null}
            <div className="place-register-sheet__map-links">
              {item.kakaoMapLink ? (
                <a
                  className="place-detail-card__map-btn place-detail-card__map-btn--kakao"
                  href={item.kakaoMapLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  카카오맵
                </a>
              ) : null}
              {item.naverMapLink ? (
                <a
                  className="place-detail-card__map-btn place-detail-card__map-btn--naver"
                  href={item.naverMapLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  네이버지도
                </a>
              ) : null}
            </div>
            <button
              type="button"
              className="place-register-sheet__primary"
              onClick={() => handleRegister(quickRegisterType)}
            >
              {quickConfig.registerLabel || "등록하기"}
            </button>
            <p className="map-search-draft-sheet__hint">지도를 움직이면 핀 위치가 바뀌고 정보가 다시 찾아집니다.</p>
          </div>
        ) : null}

        {!loading && showManualFields ? (
          <div className="place-register-sheet__manual">
            <p className="place-register-sheet__manual-lead">
              {manualRequired ? "근처 장소를 찾지 못했어요. 직접 입력해 주세요." : "장소 정보를 수정할 수 있어요."}
            </p>
            <input
              className="map-search-draft-sheet__name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config?.label ? `${config.label} 이름` : "장소 이름"}
              aria-label="장소 이름"
            />
            <textarea
              className="place-register-sheet__desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명 (선택)"
              rows={2}
              aria-label="설명"
            />
            {roadAddress ? <p className="map-search-draft-sheet__address">{roadAddress}</p> : null}
            {jibunAddress && jibunAddress !== roadAddress ? (
              <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">{jibunAddress}</p>
            ) : null}
            <div className="place-register-sheet__map-links">
              {item.kakaoMapLink ? (
                <a className="place-detail-card__map-btn place-detail-card__map-btn--kakao" href={item.kakaoMapLink} target="_blank" rel="noreferrer">
                  카카오맵
                </a>
              ) : null}
              {item.naverMapLink ? (
                <a className="place-detail-card__map-btn place-detail-card__map-btn--naver" href={item.naverMapLink} target="_blank" rel="noreferrer">
                  네이버지도
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading && (showManualFields || !item.preferredType) ? (
          <>
            <p className="map-search-draft-sheet__hint">카테고리를 선택해 등록하세요.</p>
            <div className="map-search-draft-sheet__actions" aria-label="일당맵에 등록">
              {REGISTER_CATEGORIES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  className={`map-search-draft-sheet__register${preferredType === type ? " is-active" : ""}`}
                  onClick={() => {
                    handleTypeSelect(type);
                    if (showManualFields) handleRegister(type);
                  }}
                  aria-label={`${label}로 등록`}
                >
                  <span className="map-search-draft-sheet__register-icon" aria-hidden="true">
                    {getPlaceTypeIcon(type)}
                  </span>
                  <span className="map-search-draft-sheet__register-label">{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {!loading && showManualFields ? (
          <button
            type="button"
            className="place-register-sheet__primary"
            disabled={!title.trim()}
            onClick={() => handleRegister(preferredType)}
          >
            {PLACE_REGISTER_CONFIG[preferredType]?.registerLabel || "저장"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
