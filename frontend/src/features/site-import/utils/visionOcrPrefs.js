import { useUiStore } from "../../../store/useUiStore";

/** 설정 기본 ON — importSettings.aiVisionOcr가 명시적으로 false일 때만 OFF */
export function isAiVisionOcrEnabled() {
  const settings = useUiStore.getState().importSettings;
  return settings?.aiVisionOcr !== false;
}
