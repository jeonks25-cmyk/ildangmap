import React, { useEffect, useMemo, useState } from "react";
import { MAP_ITEM_TYPE } from "../../constants/mapItemTypes";
import {
  getPlaceRegisterConfig,
  PLACE_AUTO_SEARCH_FAIL_MESSAGE,
  PLACE_REGISTER_CONFIG,
  PLACE_REGISTER_MODE,
} from "../../constants/placeRegisterConfig";
import { getPlaceTypeIcon } from "../../utils/placeDistance";
import { canQuickRegisterPlace, shouldShowManualForm } from "../../utils/placeRegisterUx";

const REGISTER_CATEGORIES = [
  { type: MAP_ITEM_TYPE.FIELD, label: "아파트" },
  { type: MAP_ITEM_TYPE.PARKING, label: "주차" },
  { type: MAP_ITEM_TYPE.RESTROOM, label: "화장실" },
  { type: MAP_ITEM_TYPE.RESTAURANT, label: "식당" },
];

function buildRegisterPayload(item, type, title, description, locationHint) {
  const resolvedDescription = String(
    locationHint || description || item?.description || ""
  ).trim();
  return {
    type,
    title: String(title || item?.title || item?.placeName || "").trim(),
    description: resolvedDescription,
    locationHint: String(locationHint || "").trim(),
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

function MapLinkButtons({ kakaoMapLink, naverMapLink }) {
  if (!kakaoMapLink && !naverMapLink) return null;
  return (
    <div className="place-register-sheet__map-links">
      {kakaoMapLink ? (
        <a
          className="place-detail-card__map-btn place-detail-card__map-btn--kakao"
          href={kakaoMapLink}
          target="_blank"
          rel="noreferrer"
        >
          카카오맵
        </a>
      ) : null}
      {naverMapLink ? (
        <a
          className="place-detail-card__map-btn place-detail-card__map-btn--naver"
          href={naverMapLink}
          target="_blank"
          rel="noreferrer"
        >
          네이버지도
        </a>
      ) : null}
    </div>
  );
}

/**
 * 장소 등록 시트 — 카테고리별 UX (식당 자동 / 주차 선택 / 화장실 수동).
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
  const [locationHint, setLocationHint] = useState("");
  const [activeType, setActiveType] = useState(MAP_ITEM_TYPE.RESTAURANT);
  const [forceManualEntry, setForceManualEntry] = useState(false);

  const isEdit = item?.mode === "edit_place";
  const loading = Boolean(item?.autoFillLoading);
  const preferredType = item?.preferredType || activeType;
  const config = getPlaceRegisterConfig(preferredType);
  const isManualFirst = config?.mode === PLACE_REGISTER_MODE.MANUAL_FIRST;
  const isRestroom = preferredType === MAP_ITEM_TYPE.RESTROOM;

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.title || item.placeName || "");
    setDescription(item.description || "");
    setLocationHint(item.locationHint || item.meta?.locationHint || "");
    setActiveType(item.preferredType || MAP_ITEM_TYPE.RESTAURANT);
    setForceManualEntry(false);
  }, [item, open]);

  const quickRegisterType = useMemo(() => {
    if (item?.preferredType) return item.preferredType;
    return MAP_ITEM_TYPE.RESTAURANT;
  }, [item?.preferredType]);

  const quickConfig = getPlaceRegisterConfig(quickRegisterType);

  if (!open || !item) return null;

  const roadAddress = item.roadAddress || item.address || "";
  const jibunAddress = item.jibunAddress || "";
  const canQuickRegister =
    !forceManualEntry && canQuickRegisterPlace(item, quickConfig, { isEdit, loading });
  const showManualFields = shouldShowManualForm(item, config, { isEdit, loading, canQuickRegister });
  const showFailHint =
    Boolean(item.showAutoSearchFailHint) &&
    !loading &&
    !isManualFirst &&
    showManualFields &&
    !isEdit;

  const handleTypeSelect = (type) => {
    setActiveType(type);
    onPreferredTypeChange?.(type);
  };

  const handleRegister = (type) => {
    const resolvedType = type || preferredType || activeType;
    onRegister?.(buildRegisterPayload(item, resolvedType, title, description, locationHint));
  };

  const titlePlaceholder =
    config?.titlePlaceholder || (config?.label ? `${config.label} 이름` : "장소 이름");
  const descPlaceholder =
    config?.locationHintPlaceholder ||
    config?.descriptionPlaceholder ||
    (isRestroom ? "위치 설명" : "설명 (선택)");

  const canSubmitManual = isRestroom
    ? Boolean(title.trim() || locationHint.trim())
    : Boolean(title.trim());

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
            {isManualFirst ? "주소를 확인하는 중…" : "주소와 장소를 찾는 중…"}
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
            <MapLinkButtons kakaoMapLink={item.kakaoMapLink} naverMapLink={item.naverMapLink} />
            <button
              type="button"
              className="place-register-sheet__primary"
              onClick={() => handleRegister(quickRegisterType)}
            >
              {quickConfig?.registerLabel || "등록하기"}
            </button>
            {quickRegisterType === MAP_ITEM_TYPE.PARKING ? (
              <button
                type="button"
                className="place-register-sheet__secondary"
                onClick={() => setForceManualEntry(true)}
              >
                직접 입력하기
              </button>
            ) : null}
            <p className="map-search-draft-sheet__hint">지도를 움직이면 핀 위치가 바뀌고 정보가 다시 찾아집니다.</p>
          </div>
        ) : null}

        {!loading && showManualFields ? (
          <div className="place-register-sheet__manual">
            {showFailHint ? (
              <p className="place-register-sheet__fail-hint" role="status">
                {PLACE_AUTO_SEARCH_FAIL_MESSAGE}
              </p>
            ) : null}
            {isManualFirst && !isEdit ? (
              <p className="place-register-sheet__manual-lead">
                화장실은 위치 설명을 직접 입력해 주세요. 주소는 핀 위치 기준으로 자동 채워집니다.
              </p>
            ) : null}
            {isEdit ? (
              <p className="place-register-sheet__manual-lead">장소 정보를 수정할 수 있어요.</p>
            ) : null}

            <input
              className="map-search-draft-sheet__name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              aria-label="장소 이름"
            />

            {config?.showLocationHint ? (
              <>
                <label className="place-register-sheet__field-label" htmlFor="place-location-hint">
                  위치 설명
                </label>
                <textarea
                  id="place-location-hint"
                  className="place-register-sheet__desc place-register-sheet__desc--hint"
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  placeholder={descPlaceholder}
                  rows={3}
                  aria-label="위치 설명"
                />
                {Array.isArray(config.locationHintExamples) && config.locationHintExamples.length ? (
                  <ul className="place-register-sheet__examples" aria-label="입력 예시">
                    {config.locationHintExamples.map((example) => (
                      <li key={example}>
                        <button
                          type="button"
                          className="place-register-sheet__example-btn"
                          onClick={() => setLocationHint(example)}
                        >
                          {example}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <textarea
                className="place-register-sheet__desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descPlaceholder}
                rows={2}
                aria-label="설명"
              />
            )}

            {roadAddress ? <p className="map-search-draft-sheet__address">{roadAddress}</p> : null}
            {jibunAddress && jibunAddress !== roadAddress ? (
              <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">{jibunAddress}</p>
            ) : null}
            <MapLinkButtons kakaoMapLink={item.kakaoMapLink} naverMapLink={item.naverMapLink} />
          </div>
        ) : null}

        {!loading && showManualFields ? (
          <>
            <p className="map-search-draft-sheet__hint">카테고리를 선택해 등록하세요.</p>
            <div className="map-search-draft-sheet__actions" aria-label="일당맵에 등록">
              {REGISTER_CATEGORIES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  className={`map-search-draft-sheet__register${preferredType === type ? " is-active" : ""}`}
                  onClick={() => handleTypeSelect(type)}
                  aria-label={`${label}로 등록`}
                  aria-pressed={preferredType === type}
                >
                  <span className="map-search-draft-sheet__register-icon" aria-hidden="true">
                    {getPlaceTypeIcon(type)}
                  </span>
                  <span className="map-search-draft-sheet__register-label">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="place-register-sheet__primary"
              disabled={!canSubmitManual}
              onClick={() => handleRegister(preferredType)}
            >
              {PLACE_REGISTER_CONFIG[preferredType]?.registerLabel || "저장"}
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}
