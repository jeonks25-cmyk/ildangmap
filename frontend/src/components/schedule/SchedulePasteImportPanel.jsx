import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../utils/schedulePasteParser";
import { extractTextFromScheduleImage, releaseScheduleOcrWorker } from "../../utils/scheduleOcr";

const EXAMPLE_TEXT = `6월12일 둔산필름
08:00~17:00
기공 2명`;

function buildStatusMessage(result) {
  if (result.ok) {
    return { tone: "success", message: "날짜·시간·제목을 채웠습니다." };
  }
  if (result.filledFields.length) {
    return {
      tone: "warn",
      message: result.warnings[0] || "일부만 채웠습니다. 나머지는 확인해 주세요.",
    };
  }
  return {
    tone: "error",
    message: result.warnings[0] || "내용을 인식하지 못했습니다.",
  };
}

/** 일정 추가 — 1차 붙여넣기 · 2차 캡처 OCR */
export default function SchedulePasteImportPanel({ open = true, onApply, referenceDate }) {
  const fileInputId = useId();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState("");

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
      setStatus(buildStatusMessage(result));
      return result;
    },
    [onApply, referenceDate]
  );

  const handleAutoFill = () => {
    setPasteText((current) => current.trim());
    applyParsedText(pasteText.trim(), SCHEDULE_IMPORT_SOURCE.PASTE);
  };

  const runOcr = async (file) => {
    if (!file || ocrBusy) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setStatus({ tone: "info", message: "캡처에서 글자를 읽는 중입니다…" });

    try {
      const { text, confidence } = await extractTextFromScheduleImage(file, {
        onProgress: (progress) => setOcrProgress(Math.round((progress || 0) * 100)),
      });

      if (!text.trim()) {
        setStatus({ tone: "error", message: "이미지에서 일정 글자를 찾지 못했습니다." });
        return;
      }

      setPasteText(text);
      const result = applyParsedText(text, SCHEDULE_IMPORT_SOURCE.OCR);

      if (result.ok) {
        setStatus({
          tone: "success",
          message: `캡처에서 일정을 채웠습니다.${confidence > 0 ? ` (인식 ${Math.round(confidence)}%)` : ""}`,
        });
      }
    } catch (_) {
      setStatus({ tone: "error", message: "이미지 읽기에 실패했습니다. 다시 시도하거나 텍스트를 붙여넣어 주세요." });
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
        <p className="schedule-paste-import__section-hint">카톡·문자 화면을 캡처해 올리면 OCR로 읽어 자동 입력합니다.</p>
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
        <p
          className={`schedule-paste-import__status schedule-paste-import__status--${status.tone}`}
          role="status"
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
