import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { parseScheduleImport, SCHEDULE_IMPORT_SOURCE } from "../../utils/schedulePasteParser";
import { releaseScheduleOcrWorker, SCHEDULE_OCR_MODE } from "../../utils/scheduleOcr";
import {
  getScheduleOcrErrorMessage,
  runScheduleOcrImport,
  parseScheduleImportFromSiteCandidate,
  SCHEDULE_OCR_ERROR,
  SCHEDULE_OCR_STAGE,
} from "../../features/schedule-ocr";
import { formatOcrError } from "../../utils/scheduleOcr";
import SiteImportDebugPanel from "../map/SiteImportDebugPanel";
import ScheduleSiteCandidatePicker from "./ScheduleSiteCandidatePicker";
import { isStructureDebugEnabled } from "../../features/site-import/parser/siteImportStructureMetrics";

const EXAMPLE_TEXT = `성환부영 3차, 301동 105호.
공용현관:5623
세대비번:260403`;

function buildPasteStatusMessage(result) {
  if (result.ok) {
    const parts = ["제목·날짜·메모를 채웠습니다."];
    if (!result.filledFields.includes("dateDetected")) {
      parts.push("날짜는 내일로 넣었습니다.");
    }
    return { tone: "success", message: parts.join(" "), stage: "parse_success" };
  }
  if (result.filledFields.includes("dateKey")) {
    return {
      tone: "warn",
      message: result.warnings[0] || "제목만 확인해 주세요.",
      stage: "parse_partial",
    };
  }
  return {
    tone: "error",
    message: result.warnings[0] || "내용을 인식하지 못했습니다.",
    stage: "parse_failed",
  };
}

/** 일정 추가 — 1차 붙여넣기 · 2차 캡처 OCR */
export default function SchedulePasteImportPanel({
  open = true,
  onApply,
  onOcrReview,
  referenceDate,
}) {
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
  const [structureTrace, setStructureTrace] = useState(null);
  const [siteCandidates, setSiteCandidates] = useState([]);
  const [selectedSiteLineId, setSelectedSiteLineId] = useState(null);
  const [pendingOcrText, setPendingOcrText] = useState("");
  const [candidateBusy, setCandidateBusy] = useState(false);
  const showStructureDebug = isStructureDebugEnabled();

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
  }, []);

  const clearSiteCandidatePick = useCallback(() => {
    setSiteCandidates([]);
    setSelectedSiteLineId(null);
    setPendingOcrText("");
    setCandidateBusy(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setPasteText("");
    setStatus(null);
    setOcrBusy(false);
    setOcrProgress(0);
    setTableMode(false);
    setStructureTrace(null);
    clearSiteCandidatePick();
    clearPreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
    return () => {
      releaseScheduleOcrWorker();
    };
  }, [open, clearPreview, clearSiteCandidatePick]);

  const handleAutoFill = () => {
    const text = pasteText.trim();
    setPasteText(text);
    clearSiteCandidatePick();
    const result = parseScheduleImport({ source: SCHEDULE_IMPORT_SOURCE.PASTE, text }, { referenceDate });
    setStructureTrace(result.structureTrace || null);
    onApply?.(result);
    setStatus(buildPasteStatusMessage(result));
  };

  const applyFromSiteCandidate = async (candidate) => {
    if (!candidate?.text || !pendingOcrText) return;
    setCandidateBusy(true);
    try {
      const result = parseScheduleImportFromSiteCandidate(pendingOcrText, candidate.text, {
        referenceDate: referenceDate || new Date(),
      });
      setStructureTrace(result.structureTrace || null);
      onApply?.(result);
      clearSiteCandidatePick();
      const structureNote = result.structureOk
        ? "선택한 줄에서 현장명·동·호를 채웠습니다."
        : "제목을 확인해 주세요.";
      setStatus({
        tone: result.structureOk ? "success" : "warn",
        message: structureNote,
        stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
        ocrTextPreview: pendingOcrText.slice(0, 600),
        structureOk: result.structureOk,
      });
    } finally {
      setCandidateBusy(false);
    }
  };

  const runOcr = async (file) => {
    if (!file || ocrBusy) return;
    setOcrBusy(true);
    setOcrProgress(0);
    clearSiteCandidatePick();
    setStatus({ tone: "info", message: "캡처에서 글자를 읽는 중입니다…", stage: "ocr_running" });

    try {
      const result = await runScheduleOcrImport(file, {
        tableMode,
        mode: tableMode ? SCHEDULE_OCR_MODE.TABLE : SCHEDULE_OCR_MODE.AUTO,
        referenceDate: referenceDate || new Date(),
        onProgress: (progress) => setOcrProgress(Math.round((progress || 0) * 100)),
      });

      if (result.ocrResult?.text) {
        setPasteText(result.ocrResult.text);
      }

      if (result.errorCode) {
        setStatus({
          tone: "error",
          message: getScheduleOcrErrorMessage(result.errorCode),
          stage: result.errorCode,
          ocrTextPreview: result.ocrResult?.text?.slice(0, 400),
        });
        return;
      }

      if (
        result.stage === SCHEDULE_OCR_STAGE.TABLE_PARSED ||
        (result.drafts?.length > 1 && !result.useComposer)
      ) {
        onOcrReview?.(result.drafts, result);
        setStatus({
          tone: "success",
          message: `공정표에서 ${result.drafts.length}건 일정을 찾았습니다. 검토 화면에서 확인하세요.`,
          stage: SCHEDULE_OCR_STAGE.TABLE_PARSED,
        });
        return;
      }

      if (result.needsSiteCandidatePick && result.siteLineCandidates?.length) {
        setPendingOcrText(result.ocrResult?.text || "");
        setSiteCandidates(result.siteLineCandidates);
        setSelectedSiteLineId(result.selectedSiteLineId);
        setStatus({
          tone: "info",
          message: "현장 후보를 찾았습니다. 아래에서 일정에 넣을 줄을 선택하세요.",
          stage: SCHEDULE_OCR_STAGE.SITE_CANDIDATES,
          ocrTextPreview: result.ocrResult?.text?.slice(0, 600),
        });
        return;
      }

      if (result.useComposer && result.drafts?.length === 1 && result.chatResult) {
        setStructureTrace(result.chatResult.structureTrace || null);
        onApply?.(result.chatResult);
        const structureNote = result.chatResult.structureOk
          ? "현장명·동·호를 인식했습니다."
          : "제목을 확인해 주세요. (구조화 미완료)";
        setStatus({
          tone: result.chatResult.structureOk ? "success" : "warn",
          message: `캡처에서 일정 1건을 폼에 채웠습니다. ${structureNote}`,
          stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
          ocrTextPreview: result.ocrResult?.text?.slice(0, 600),
          structureOk: result.chatResult.structureOk,
        });
        return;
      }

      if (result.drafts?.length) {
        onOcrReview?.(result.drafts, result);
        setStatus({
          tone: "success",
          message: `${result.drafts.length}건 일정을 검토 화면으로 보냈습니다.`,
          stage: SCHEDULE_OCR_STAGE.REVIEW_REQUIRED,
        });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        message: getScheduleOcrErrorMessage(SCHEDULE_OCR_ERROR.ENGINE_FAILED) || formatOcrError(error),
        stage: SCHEDULE_OCR_ERROR.ENGINE_FAILED,
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
    <section className="schedule-paste-import" aria-label="카톡·문자·공정표 일정 가져오기">
      <div className="schedule-paste-import__head">
        <h3 className="schedule-paste-import__title">일정 가져오기</h3>
        <p className="schedule-paste-import__lead">카톡·문자 공지 또는 월간 공정표 캡처를 올려 일정을 만듭니다.</p>
      </div>

      <div className="schedule-paste-import__section">
        <p className="schedule-paste-import__section-label">1. 텍스트 붙여넣기</p>
        <textarea
          className="schedule-paste-import__textarea"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            if (status) setStatus(null);
            clearSiteCandidatePick();
          }}
          placeholder={EXAMPLE_TEXT}
          rows={4}
          aria-label="일정 공지 붙여넣기"
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
        <p className="schedule-paste-import__section-hint">공정표·캘린더는 아래 옵션을 켜면 인식률이 좋아집니다.</p>
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
          aria-label="캡처 이미지 선택"
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

      {siteCandidates.length > 0 ? (
        <ScheduleSiteCandidatePicker
          candidates={siteCandidates}
          selectedId={selectedSiteLineId}
          busy={candidateBusy}
          onConfirm={applyFromSiteCandidate}
          onCancel={clearSiteCandidatePick}
        />
      ) : null}

      {status ? (
        <div className="schedule-paste-import__status-wrap">
          <p className={`schedule-paste-import__status schedule-paste-import__status--${status.tone}`} role="status">
            {status.message}
          </p>
          {status.stage ? <p className="schedule-paste-import__status-meta">단계: {status.stage}</p> : null}
          {status.ocrTextPreview ? (
            <details className="schedule-paste-import__ocr-preview">
              <summary>OCR로 읽은 텍스트 미리보기</summary>
              <pre>{status.ocrTextPreview}</pre>
            </details>
          ) : null}
          {showStructureDebug && structureTrace ? (
            <SiteImportDebugPanel trace={structureTrace} title="구조화 파서 (일정 가져오기)" />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
