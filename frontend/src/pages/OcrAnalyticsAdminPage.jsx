import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchOcrAnalyticsAdminAccess,
  fetchOcrAnalyticsSummary,
} from "../api/ocrAnalyticsApi";
import { useUiStore } from "../store/useUiStore";
import "../styles/beta-feedback.css";

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function StatCard({ label, value, hint }) {
  return (
    <div className="beta-feedback-admin__stat-card">
      <p className="beta-feedback-admin__stat-label">{label}</p>
      <p className="beta-feedback-admin__stat-value">{value}</p>
      {hint ? <p className="beta-feedback-admin__stat-hint">{hint}</p> : null}
    </div>
  );
}

export default function OcrAnalyticsAdminPage() {
  const navigate = useNavigate();
  const showAppToast = useUiStore((s) => s.showAppToast);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOcrAnalyticsAdminAccess()
      .then((result) => {
        if (!cancelled) {
          setHasAccess(Boolean(result?.admin));
          setAccessChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasAccess(false);
          setAccessChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOcrAnalyticsSummary(days);
      setData(result);
    } catch (err) {
      setError(err?.message || "통계를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!accessChecked || !hasAccess) return;
    load();
  }, [load, accessChecked, hasAccess]);

  if (!accessChecked) {
    return <div className="beta-feedback-admin beta-feedback-admin--loading">권한 확인 중…</div>;
  }

  if (!hasAccess) {
    return (
      <div className="beta-feedback-admin">
        <header className="beta-feedback-admin__head">
          <button type="button" className="beta-feedback-admin__back" onClick={() => navigate("/settings")}>
            ← 설정
          </button>
          <h1>OCR Analytics</h1>
        </header>
        <p className="beta-feedback-admin__denied">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="beta-feedback-admin">
      <header className="beta-feedback-admin__head">
        <button type="button" className="beta-feedback-admin__back" onClick={() => navigate("/settings")}>
          ← 설정
        </button>
        <h1>OCR KPI</h1>
        <label className="beta-feedback-admin__filter">
          <span>기간</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
        </label>
      </header>

      {loading ? <p className="beta-feedback-admin__loading">불러오는 중…</p> : null}
      {error ? (
        <p className="beta-feedback-admin__error" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <section className="beta-feedback-admin__stats" aria-label="OCR KPI">
            <StatCard label="Vision 사용" value={data.visionCount ?? 0} hint="gemini-vision" />
            <StatCard label="Tesseract Fallback" value={data.tesseractFallbackCount ?? 0} />
            <StatCard label="OCR 성공률" value={pct(data.ocrSuccessRate)} hint={`${data.ocrSuccessCount ?? 0} / ${data.ocrAttemptCount ?? 0}`} />
            <StatCard label="사용자 수정률" value={pct(data.userEditRate)} hint={`수정 ${data.ocrEditCount ?? 0}건`} />
          </section>

          <section className="beta-feedback-admin__section">
            <h2>TOP 현장명</h2>
            {(data.topSiteNames || []).length ? (
              <ul className="beta-feedback-admin__group-list">
                {data.topSiteNames.map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="beta-feedback-admin__empty">데이터 없음</p>
            )}
          </section>

          <section className="beta-feedback-admin__section">
            <h2>TOP 실패 패턴</h2>
            {(data.topFailurePatterns || []).length ? (
              <ul className="beta-feedback-admin__group-list">
                {data.topFailurePatterns.map((row) => (
                  <li key={row.pattern}>
                    <span>{row.label || row.pattern}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="beta-feedback-admin__empty">데이터 없음</p>
            )}
          </section>

          <section className="beta-feedback-admin__section">
            <h2>제목 수정 패턴 (익명 집계)</h2>
            {(data.topTitleCorrections || []).length ? (
              <ul className="beta-feedback-admin__correction-list">
                {data.topTitleCorrections.map((row) => (
                  <li key={`${row.ocrTitle}-${row.correctedTitle}`}>
                    <p>
                      <span className="beta-feedback-admin__correction-label">OCR</span> {row.ocrTitle}
                    </p>
                    <p>
                      <span className="beta-feedback-admin__correction-label">수정</span> {row.correctedTitle}
                    </p>
                    <strong>{row.count}건</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="beta-feedback-admin__empty">아직 수집된 수정 사례가 없습니다.</p>
            )}
          </section>
        </>
      ) : null}

      <button
        type="button"
        className="beta-feedback-admin__refresh"
        onClick={() => {
          load().catch(() => showAppToast("새로고침에 실패했습니다."));
        }}
      >
        새로고침
      </button>
    </div>
  );
}
