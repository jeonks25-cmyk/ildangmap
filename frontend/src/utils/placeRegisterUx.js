import { PLACE_REGISTER_MODE } from "../constants/placeRegisterConfig";

/**
 * 카테고리별 자동채우기 결과 → UI 모드 (quick / manual).
 */
export function resolvePlaceRegisterOutcome(placeType, config, { hasAddress, hasPlaceName, autoSearchAttempted }) {
  const mode = config?.mode || PLACE_REGISTER_MODE.AUTO_OPTIONAL;

  if (mode === PLACE_REGISTER_MODE.MANUAL_FIRST || mode === PLACE_REGISTER_MODE.ADDRESS_ONLY) {
    return {
      manualRequired: true,
      autoFillReady: false,
      autoFillFailed: false,
      showAutoSearchFailHint: false,
    };
  }

  if (mode === PLACE_REGISTER_MODE.AUTO_REQUIRED) {
    const autoFillReady = Boolean(hasPlaceName);
    return {
      manualRequired: !autoFillReady,
      autoFillReady,
      autoFillFailed: autoSearchAttempted && !hasPlaceName,
      showAutoSearchFailHint: autoSearchAttempted && !hasPlaceName,
    };
  }

  // AUTO_OPTIONAL — 주차 등: POI 이름 있으면 빠른 등록, 없으면 수동
  const autoFillReady = Boolean(hasPlaceName);
  return {
    manualRequired: !autoFillReady,
    autoFillReady,
    autoFillFailed: autoSearchAttempted && !hasPlaceName,
    showAutoSearchFailHint: autoSearchAttempted && !hasPlaceName,
  };
}

export function canQuickRegisterPlace(item, config, { isEdit, loading }) {
  if (isEdit || loading || !item || !config) return false;
  if (config.mode === PLACE_REGISTER_MODE.MANUAL_FIRST) return false;
  if (config.mode === PLACE_REGISTER_MODE.ADDRESS_ONLY) return false;
  return Boolean(item.autoFillReady && (item.placeName || item.title));
}

export function shouldShowManualForm(item, config, { isEdit, loading, canQuickRegister }) {
  if (loading) return false;
  if (isEdit) return true;
  if (config?.mode === PLACE_REGISTER_MODE.MANUAL_FIRST) return true;
  if (config?.mode === PLACE_REGISTER_MODE.ADDRESS_ONLY) return true;
  return !canQuickRegister;
}
