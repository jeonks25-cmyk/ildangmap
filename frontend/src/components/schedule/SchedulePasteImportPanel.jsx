import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../utils/schedulePasteParser";
import {
  extractTextFromScheduleImage,
  formatOcrError,
  releaseScheduleOcrWorker,
  SCHEDULE_OCR_MODE,
  SCHEDULE_OCR_STAGE,
} from "../../utils/scheduleOcr";

const EXAMPLE_TEXT = `6월12일 둔산필름
08:00~17:00
기공 2명`;

function buildPasteStatusMessage(result) {
  if (result.ok) {
    return { tone: "success", message: "날짜·시간·제목을 채웠습니다.", stage: "parse_success" };
  }
  if (result.filledFields.length) {
    return {
      tone: "warn",
      message: result.warnings[0] || "일부만 채웠습니다. 나머지는 확인해 주세요.",
      stage: "parse_partial",
    };
  }
  return {
    tone: "error",
    message: result.warnings[0] || "내용을 인식하지 못했습니다.",
    stage: "parse_failed",
  };
}

function buildOcrParseStatus(ocrResult, parseResult) {
  const confLabel = ocrResult.confidence > 0 ? ` (인식 ${Math.round(ocrResult.confidence)}%)` : "";
  const sizeLabel = `${ocrResult.charCount}자`;

  if (parseResult.ok) {
    return {
      tone: "success",
      message: `캡처에서 일정을 채웠습니다.${confLabel}`,
      stage: "parse_success",
      ocrMode: ocrResult.mode,
    };
  }

  if (parseResult.filledFields.length) {
    return {
      tone: "warn",
      message: `OCR ${sizeLabel} 읽음${confLabel} — 일부만 자동 입력했습니다. 나머지는 확인해 주세요.`,
      stage: "parse_partial",
      ocrMode: ocrResult.mode,
      ocrTextPreview: ocrResult.text.slice(0, 400),
    };
  }

  return {
    tone: "warn",
    message: `OCR ${sizeLabel} 읽음${confLabel} — 일정 형식은 찾지 못했습니다. 아래 텍스트를 확인·수정 후 자동 입력을 눌러 주세요.`,
    stage: "parse_failed",
    ocrMode: ocrResult.mode,
    ocrTextPreview: ocrResult.text.slice(0, 400),
  };
}

/** 일정 추가 — 1차 붙여넣기 · 2차 캡처 OCR */
export default function SchedulePasteImportPanel({ open = true, onApply, referenceDate }) {
  const fileInputId = useId();
  const tableModeId = useId();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [tableMode, setTableMode] = useState(false);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setPasteText("");
    setStatus(null);
    setOcrBusy(false);
    setOcrProgress(0);
    setTableMode(false);
    clearPreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
    return () => {
      releaseScheduleOcrWorker();
    };
  }, [open, clearPreview]);

  const applyParsedText = useCallback(
    (text, source) => {
      const result = parseScheduleImport({ source, text }, { referenceDate });
      onApply?.(result);
      return result;
    },
    [onApply, referenceDate]
  );

  const handleAutoFill = () => {
    setPasteText((current) => current.trim());
    const result = applyParsedText(pasteText.trim(), SCHEDULE_IMPORT_SOURCE.PASTE);
    setStatus(buildPasteStatusMessage(result));
  };

  const runOcr = async (file) => {
    if (!file || ocrBusy) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setStatus({ tone: "info", message: "캡처에서 글자를 읽는 중입니다…", stage: "ocr_running" });

    try {
      const ocrResult = await extractTextFromScheduleImage(file, {
        mode: tableMode ? SCHEDULE_OCR_MODE.TABLE : SCHEDULE_OCR_MODE.AUTO,
        onProgress: (progress) => setOcrProgress(Math.round((progress || 0) * 100)),
      });

      if (ocrResult.stage === SCHEDULE_OCR_STAGE.EMPTY_TEXT || !ocrResult.text.trim()) {
        setStatus({
          tone: "error",
          message:
            "OCR은 완료했지만 텍스트를 찾지 못했습니다. 공정표·캘린더처럼 글자가 작은 이미지는 「공정표/캘린더 이미지」를 켜고 다시 시도해 주세요.",
          stage: SCHEDULE_OCR_STAGE.EMPTY_TEXT,
          ocrMode: ocrResult.mode,
          ocrAttempts: ocrResult.attempts,
        });
        return;
      }

      setPasteText(ocrResult.text);
      const parseResult = applyParsedText(ocrResult.text, SCHEDULE_IMPORT_SOURCE.OCR);
      setStatus(buildOcrParseStatus(ocrResult, parseResult));
    } catch (error) {
      setStatus({
        tone: "error",
        message: `이미지 OCR 실패: ${formatOcrError(error)}`,
        stage: error?.stage || SCHEDULE_OCR_STAGE.ENGINE_FAILED,
        ocrAttempts: error?.attempts,
      });
    } finally {
      setOcrBusy(false);
      setOcrProgress(0);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearPreview();
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setPreviewName(file.name);
    if (status?.tone !== "info") setStatus(null);

    await runOcr(file);
  };

  return (
    <section className="schedule-paste-import" aria-label="카톡·문자 일정 가져오기">
      <div className="schedule-paste-import__head">
        <h3 className="schedule-paste-import__title">카톡/문자 일정 가져오기</h3>
        <p className="schedule-paste-import__lead">공지를 붙여넣거나 캡처 이미지를 올리면 날짜·시간·제목을 채웁니다.</p>
      </div>

      <div className="schedule-paste-import__section">
        <p className="schedule-paste-import__section-label">1. 텍스트 붙여넣기</p>
        <textarea
          className="schedule-paste-import__textarea"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            if (status) setStatus(null);
          }}
          placeholder={EXAMPLE_TEXT}
          rows={4}
          aria-label="카톡 또는 문자 일정 공지 붙여넣기"
        />
        <div className="schedule-paste-import__actions">
          <button
            type="button"
            className="schedule-paste-import__apply"
            onClick={handleAutoFill}
            disabled={!pasteText.trim() || ocrBusy}
          >
            자동 입력
          </button>
        </div>
      </div>

      <div className="schedule-paste-import__divider" aria-hidden="true">
        <span>또는</span>
      </div>

      <div className="schedule-paste-import__section">
        <p className="schedule-paste-import__section-label">2. 캡처 이미지 업로드</p>
        <p className="schedule-paste-import__section-hint">
          카톡·문자 화면 또는 월간 공정표 캡처를 올리면 OCR로 읽어 자동 입력합니다.
        </p>
        <label className="schedule-paste-import__table-mode" htmlFor={tableModeId}>
          <input
            id={tableModeId}
            type="checkbox"
            checked={tableMode}
            onChange={(e) => setTableMode(e.target.checked)}
            disabled={ocrBusy}
          />
          <span>공정표/캘린더 이미지 (작은 글자·표 형식)</span>
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          className="schedule-paste-import__file-input"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={ocrBusy}
          aria-label="카톡 또는 문자 캡처 이미지 선택"
        />
        <label htmlFor={fileInputId} className={`schedule-paste-import__upload${ocrBusy ? " is-busy" : ""}`}>
          {ocrBusy ? "글자 읽는 중…" : "캡처 이미지 선택"}
        </label>

        {ocrBusy ? (
          <div className="schedule-paste-import__progress" role="progressbar" aria-valuenow={ocrProgress} aria-valuemin={0} aria-valuemax={100}>
            <span className="schedule-paste-import__progress-bar" style={{ width: `${Math.max(8, ocrProgress)}%` }} />
          </div>
        ) : null}

        {previewUrl ? (
          <div className="schedule-paste-import__preview">
            <img src={previewUrl} alt="" className="schedule-paste-import__preview-img" />
            {previewName ? <span className="schedule-paste-import__preview-name">{previewName}</span> : null}
          </div>
        ) : null}
      </div>

      {status ? (
        <div className="schedule-paste-import__status-wrap">
          <p
            className={`schedule-paste-import__status schedule-paste-import__status--${status.tone}`}
            role="status"
          >
            {status.message}
          </p>
          {status.stage ? (
            <p className="schedule-paste-import__status-meta">
              단계: {status.stage}
              {status.ocrMode ? ` · OCR 모드: ${status.ocrMode}` : ""}
            </p>
          ) : null}
          {status.ocrTextPreview ? (
            <details className="schedule-paste-import__ocr-preview">
              <summary>OCR로 읽은 텍스트 미리보기</summary>
              <pre>{status.ocrTextPreview}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
