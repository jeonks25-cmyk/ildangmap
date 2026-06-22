import React from "react";
import { useUiStore } from "../../store/useUiStore";

export default function SettingsImportSection() {
  const aiVisionOcr = useUiStore((state) => state.importSettings?.aiVisionOcr !== false);
  const toggleImportSetting = useUiStore((state) => state.toggleImportSetting);

  return (
    <section className="settings-import-section" aria-label="가져오기 설정">
      <h2 className="settings-import-section__title">가져오기</h2>
      <label className="settings-import-section__row">
        <span className="settings-import-section__label">AI Vision OCR 사용</span>
        <input
          type="checkbox"
          className="settings-import-section__toggle"
          checked={aiVisionOcr}
          onChange={() => toggleImportSetting("aiVisionOcr")}
          aria-label="AI Vision OCR 사용"
        />
      </label>
      <p className="settings-import-section__hint">
        카카오톡 캡처를 Gemini Vision으로 먼저 분석합니다. 실패 시 기존 OCR로 자동 전환됩니다.
      </p>
    </section>
  );
}
