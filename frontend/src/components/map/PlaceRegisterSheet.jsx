import React, { useCallback, useEffect, useRef, useState } from "react";
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

const HANDLE_DRAG_THRESHOLD_PX = 28;

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
 * 장소 등록 시트 — 카테고리별 UX + 핀 조정용 축소/확장.
 */
export default function PlaceRegisterSheet({
  item,
  open,
  onClose,
  onRegister,
  onPreferredTypeChange,
  centerPinMoving = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [activeType, setActiveType] = useState(MAP_ITEM_TYPE.RESTAURANT);
  const [forceManualEntry, setForceManualEntry] = useState(false);
  const [userExpanded, setUserExpanded] = useState(false);
  const handleDragStartYRef = useRef(null);

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
    const nextType = item.preferredType || MAP_ITEM_TYPE.RESTAURANT;
    setActiveType(nextType);
    setForceManualEntry(false);
    const nextConfig = getPlaceRegisterConfig(nextType);
    setUserExpanded(isEdit || nextConfig?.mode === PLACE_REGISTER_MODE.MANUAL_FIRST);
  }, [item, open, isEdit]);

  useEffect(() => {
    if (centerPinMoving) {
      setUserExpanded(false);
    }
  }, [centerPinMoving]);

  const quickRegisterType = item?.preferredType;
  const quickConfig = quickRegisterType ? getPlaceRegisterConfig(quickRegisterType) : null;

  const handleExpand = useCallback(() => setUserExpanded(true), []);
  const handleCollapse = useCallback(() => setUserExpanded(false), []);

  const handleHandlePointerDown = useCallback((event) => {
    handleDragStartYRef.current = event.clientY;
  }, []);

  const handleHandlePointerMove = useCallback(
    (event) => {
      if (handleDragStartYRef.current == null) return;
      const deltaY = event.clientY - handleDragStartYRef.current;
      if (deltaY <= -HANDLE_DRAG_THRESHOLD_PX) {
        handleExpand();
        handleDragStartYRef.current = null;
      } else if (deltaY >= HANDLE_DRAG_THRESHOLD_PX) {
        handleCollapse();
        handleDragStartYRef.current = null;
      }
    },
    [handleCollapse, handleExpand]
  );

  const handleHandlePointerUp = useCallback(() => {
    handleDragStartYRef.current = null;
  }, []);

  if (!open || !item) return null;

  const roadAddress = item.roadAddress || item.address || "";
  const jibunAddress = item.jibunAddress || "";
  const canQuickRegister =
    Boolean(quickRegisterType) &&
    !forceManualEntry &&
    canQuickRegisterPlace(item, quickConfig, { isEdit, loading });
  const showManualFields = shouldShowManualForm(item, config, { isEdit, loading, canQuickRegister });
  const showFailHint =
    Boolean(item.showAutoSearchFailHint) &&
    !loading &&
    !isManualFirst &&
    showManualFields &&
    !isEdit;

  const displayTitle = String(title || item.title || item.placeName || "장소 이름").trim();
  const registerLabel =
    quickConfig?.registerLabel ||
    PLACE_REGISTER_CONFIG[preferredType]?.registerLabel ||
    "등록하기";
  const isCollapsed = !userExpanded || centerPinMoving;
  const showMovingStatus = centerPinMoving || (loading && isCollapsed);
  const showCompactRegister = isCollapsed && canQuickRegister && !showMovingStatus && !loading;

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

  const panelClassName = [
    "map-life-info-sheet__panel",
    "map-search-draft-sheet__panel",
    "place-register-sheet__panel",
    isCollapsed ? "is-collapsed" : "is-expanded",
    centerPinMoving ? "is-map-moving" : "",
    showMovingStatus ? "is-status-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="map-life-info-sheet map-life-info-sheet--pass-through map-search-draft-sheet place-register-sheet"
      role="presentation"
    >
      <section className={panelClassName} role="dialog" aria-label="장소 등록">
        <div
          className="place-register-sheet__handle"
          role="button"
          tabIndex={0}
          aria-label={isCollapsed ? "카드 펼치기" : "카드 접기"}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (isCollapsed) handleExpand();
              else handleCollapse();
            }
          }}
        >
          <span className="place-register-sheet__handle-bar" aria-hidden="true" />
        </div>

        {isCollapsed ? (
          <div className="place-register-sheet__compact">
            <div className="place-register-sheet__compact-head">
              {showMovingStatus ? (
                <p className="place-register-sheet__moving-status" role="status">
                  {loading && !centerPinMoving
                    ? isManualFirst
                      ? "주소를 확인하는 중…"
                      : "주소와 장소를 찾는 중…"
                    : "지도를 움직이는 중…"}
                </p>
              ) : (
                <>
                  <p className="place-register-sheet__compact-title">
                    <span className="place-register-sheet__compact-icon" aria-hidden="true">
                      {getPlaceTypeIcon(preferredType)}
                    </span>
                    <span className="place-register-sheet__compact-name">{displayTitle}</span>
                  </p>
                  <button
                    type="button"
                    className="place-register-sheet__expand-btn"
                    aria-label="카드 펼치기"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleExpand();
                    }}
                  >
                    ▲
                  </button>
                </>
              )}
              <button
                type="button"
                className="place-register-sheet__compact-close"
                onClick={onClose}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            {showCompactRegister ? (
              <button
                type="button"
                className="place-register-sheet__primary place-register-sheet__primary--compact"
                onClick={() => handleRegister(quickRegisterType)}
              >
                {registerLabel}
              </button>
            ) : null}
          </div>
        ) : (
          <>
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
                  <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">
                    {jibunAddress}
                  </p>
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
                  {registerLabel}
                </button>
                {quickRegisterType === MAP_ITEM_TYPE.PARKING ? (
                  <button
                    type="button"
                    className="place-register-sheet__secondary"
                    onClick={() => {
                      setForceManualEntry(true);
                      setUserExpanded(true);
                    }}
                  >
                    직접 입력하기
                  </button>
                ) : null}
                <p className="map-search-draft-sheet__hint">
                  지도를 움직이면 핀 위치가 바뀌고 정보가 다시 찾아집니다.
                </p>
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
                  <p className="map-search-draft-sheet__address map-search-draft-sheet__address--sub">
                    {jibunAddress}
                  </p>
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
          </>
        )}
      </section>
    </div>
  );
}
