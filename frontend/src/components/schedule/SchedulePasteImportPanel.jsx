import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { releaseScheduleOcrWorker, SCHEDULE_OCR_MODE } from "../../utils/scheduleOcr";
import {
  getScheduleOcrErrorMessage,
  runScheduleOcrImport,
  parseScheduleImportFromSiteCandidate,
  parseSchedulePastePipeline,
  SCHEDULE_OCR_ERROR,
  SCHEDULE_OCR_STAGE,
} from "../../features/schedule-ocr";
import { formatOcrError } from "../../utils/scheduleOcr";
import SiteImportDebugPanel from "../map/SiteImportDebugPanel";
import VisionOcrDiagPanel from "../ocr/VisionOcrDiagPanel";
import VisionOcrConfirmPanel from "../ocr/VisionOcrConfirmPanel";
import ScheduleSiteCandidatePicker from "./ScheduleSiteCandidatePicker";
import { isStructureDebugEnabled } from "../../features/site-import/parser/siteImportStructureMetrics";
import { isAiVisionOcrEnabled } from "../../features/site-import/utils/visionOcrPrefs";
import { buildVisionOcrDiagFromTesseract } from "../../features/site-import/utils/visionOcrDiagModel";
import { visionDataToScheduleImport } from "../../features/site-import/utils/visionImportMapper";
import { reportOcrAttemptFromVisionDiag } from "../../features/site-import/utils/ocrAnalyticsReporter";
import { useUserStore } from "../../store/useUserStore";
import { useSettlementStore } from "../../store/useSettlementStore";

const EXAMPLE_TEXT = `수요일 쌍용동1303
더본인테리어
공동비번 1234
세대비번 5678`;

function buildPasteStatusMessage(result) {
  if (result.structureOk && result.title) {
    const parts = ["현장명·동·호를 채웠습니다."];
    if (!result.filledFields.includes("dateDetected")) {
      parts.push("날짜는 내일(또는 요일 기준)로 넣었습니다.");
    }
    return { tone: "success", message: parts.join(" "), stage: "parse_success" };
  }
  if (result.title || result.filledFields.includes("dateKey")) {
    return {
      tone: "warn",
      message: result.warnings[0] || "제목을 확인한 뒤 저장해 주세요.",
      stage: "parse_partial",
    };
  }
  return {
    tone: "error",
    message: result.warnings[0] || "내용을 인식하지 못했습니다.",
    stage: "parse_failed",
  };
}

/** 일정 추가 — 카톡 붙여넣기 우선 · OCR은 실험 기능 */
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
  const userId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? "me");
  const schedules = useSettlementStore((s) => s.schedules);

  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState(null);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [tableMode, setTableMode] = useState(false);
  const [structureTrace, setStructureTrace] = useState(null);
  const [visionOcrDiag, setVisionOcrDiag] = useState(null);
  const [pendingVisionData, setPendingVisionData] = useState(null);
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
    setPasteBusy(false);
    setOcrBusy(false);
    setOcrProgress(0);
    setTableMode(false);
    setStructureTrace(null);
    setVisionOcrDiag(null);
    setPendingVisionData(null);
    clearSiteCandidatePick();
    clearPreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
    return () => {
      releaseScheduleOcrWorker();
    };
  }, [open, clearPreview, clearSiteCandidatePick]);

  const handleAutoFill = async () => {
    const text = pasteText.trim();
    if (!text || pasteBusy) return;
    setPasteText(text);
    clearSiteCandidatePick();
    setPasteBusy(true);
    setStatus({ tone: "info", message: "카톡 내용을 분석하는 중입니다…", stage: "paste_running" });

    try {
      const result = await parseSchedulePastePipeline(text, {
        referenceDate: referenceDate || new Date(),
        userId,
        schedules,
      });
      setStructureTrace(result.structureTrace || null);
      onApply?.(result);
      setStatus(buildPasteStatusMessage(result));
    } catch (error) {
      setStatus({
        tone: "error",
        message: error?.message || "붙여넣기 분석에 실패했습니다.",
        stage: "parse_failed",
      });
    } finally {
      setPasteBusy(false);
    }
  };

  const applyFromSiteCandidate = async (candidate) => {
    if (!candidate?.text || !pendingOcrText) return;
    setCandidateBusy(true);
    try {
      const result = parseScheduleImportFromSiteCandidate(pendingOcrText, candidate.text, {
        referenceDate: referenceDate || new Date(),
      });
      setStructureTrace(result.structureTrace || null);
      setVisionOcrDiag(buildVisionOcrDiagFromTesseract(result, { visionAttempted: true }));
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

  const clearVisionReview = useCallback(() => {
    setPendingVisionData(null);
  }, []);

  const applyVisionReview = useCallback(
    (visionData) => {
      const chatResult = visionDataToScheduleImport(visionData, {
        referenceDate: referenceDate || new Date(),
      });
      if (visionOcrDiag) reportOcrAttemptFromVisionDiag(visionOcrDiag);
      setStructureTrace(chatResult.structureTrace || null);
      setPendingVisionData(null);
      onApply?.(chatResult);
      const structureNote = chatResult.title
        ? "AI Vision 결과를 폼에 넣었습니다."
        : "제목이 비어 있습니다. 직접 입력해 주세요.";
      setStatus({
        tone: chatResult.title ? "success" : "warn",
        message: structureNote,
        stage: SCHEDULE_OCR_STAGE.CHAT_PARSED,
        structureOk: chatResult.structureOk,
      });
    },
    [onApply, referenceDate, visionOcrDiag]
  );

  const runOcr = async (file) => {
    if (!file || ocrBusy) return;
    setOcrBusy(true);
    setOcrProgress(0);
    clearSiteCandidatePick();
    setVisionOcrDiag(null);
    setPendingVisionData(null);
    setStatus({
      tone: "info",
      message:
        tableMode || !isAiVisionOcrEnabled()
          ? "캡처에서 글자를 읽는 중입니다…"
          : "AI Vision으로 현장 정보를 읽는 중입니다…",
      stage: "ocr_running",
    });

    try {
      const result = await runScheduleOcrImport(file, {
        tableMode,
        mode: tableMode ? SCHEDULE_OCR_MODE.TABLE : SCHEDULE_OCR_MODE.AUTO,
        referenceDate: referenceDate || new Date(),
        onProgress: (progress) => setOcrProgress(Math.round((progress || 0) * 100)),
      });

      if (result.stage === SCHEDULE_OCR_STAGE.VISION_REVIEW && result.visionData) {
        setVisionOcrDiag(result.visionOcrDiag || null);
        setPendingVisionData(result.visionData);
        setStatus({
          tone: "info",
          message: "AI Vision 결과를 확인한 뒤 [적용]을 눌러 주세요.",
          stage: SCHEDULE_OCR_STAGE.VISION_REVIEW,
        });
        return;
      }

      if (result.ocrResult?.text) {
        setPasteText(result.ocrResult.text);
      }

      if (result.errorCode) {
        setVisionOcrDiag(result.visionOcrDiag || null);
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
        setVisionOcrDiag(result.visionOcrDiag || null);
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
        setVisionOcrDiag(result.visionOcrDiag || null);
        setStructureTrace(result.chatResult.structureTrace || null);
        onApply?.(result.chatResult);
        const structureNote = result.chatResult.structureOk
          ? "현장명·동·호를 인식했습니다."
          : "제목을 확인해 주세요.";
        setStatus({
          tone: result.chatResult.structureOk ? "success" : "warn",
          message: `캡처 인식 결과를 폼에 넣었습니다. ${structureNote}`,
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

  const busy = pasteBusy || ocrBusy;

  return (
    <section className="schedule-paste-import" aria-label="카톡 일정 가져오기">
      <div className="schedule-paste-import__head">
        <h3 className="schedule-paste-import__title">카카오톡 일정 가져오기</h3>
        <p className="schedule-paste-import__lead">
          카톡 메시지를 복사해 붙여넣으면 10초 안에 일정 초안을 만듭니다.
        </p>
      </div>

      <div className="schedule-paste-import__section schedule-paste-import__section--primary">
        <p className="schedule-paste-import__section-label">카카오톡 내용 붙여넣기</p>
        <textarea
          className="schedule-paste-import__textarea schedule-paste-import__textarea--primary"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            if (status) setStatus(null);
            clearSiteCandidatePick();
          }}
          placeholder={EXAMPLE_TEXT}
          rows={6}
          aria-label="카카오톡 일정 공지 붙여넣기"
          autoFocus
        />
        <div className="schedule-paste-import__actions">
          <button
            type="button"
            className="schedule-paste-import__apply schedule-paste-import__apply--primary"
            onClick={() => void handleAutoFill()}
            disabled={!pasteText.trim() || busy}
          >
            {pasteBusy ? "분석 중…" : "일정 만들기"}
          </button>
        </div>
      </div>

      <details className="schedule-paste-import__experimental">
        <summary className="schedule-paste-import__experimental-summary">이미지 인식 (Beta)</summary>
        <p className="schedule-paste-import__section-hint">
          캡처 이미지 OCR은 실험 기능입니다. 정확도 향상 작업은 이후 단계입니다.
        </p>
        <label className="schedule-paste-import__table-mode" htmlFor={tableModeId}>
          <input
            id={tableModeId}
            type="checkbox"
            checked={tableMode}
            onChange={(e) => setTableMode(e.target.checked)}
            disabled={busy}
          />
          <span>공정표/캘린더 이미지 (표 형식)</span>
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          className="schedule-paste-import__file-input"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={busy}
          aria-label="캡처 이미지 선택"
        />
        <label htmlFor={fileInputId} className={`schedule-paste-import__upload schedule-paste-import__upload--beta${ocrBusy ? " is-busy" : ""}`}>
          {ocrBusy ? "이미지 분석 중…" : "캡처 가져오기 (실험)"}
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
      </details>

      {siteCandidates.length > 0 ? (
        <ScheduleSiteCandidatePicker
          candidates={siteCandidates}
          selectedId={selectedSiteLineId}
          busy={candidateBusy}
          onConfirm={applyFromSiteCandidate}
          onCancel={clearSiteCandidatePick}
        />
      ) : null}

      {pendingVisionData ? (
        <VisionOcrConfirmPanel
          visionData={pendingVisionData}
          visionOcrDiag={visionOcrDiag}
          onApply={applyVisionReview}
          onCancel={clearVisionReview}
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
          <VisionOcrDiagPanel diag={visionOcrDiag} />
          {showStructureDebug && structureTrace ? (
            <SiteImportDebugPanel trace={structureTrace} title="구조화 파서 (일정 가져오기)" />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
