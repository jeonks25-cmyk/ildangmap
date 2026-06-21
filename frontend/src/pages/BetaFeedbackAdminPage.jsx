import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_SEVERITIES,
  BETA_FEEDBACK_STATUSES,
} from "../constants/betaFeedback";
import {
  buildFeedbackAttachmentUrl,
  fetchBetaFeedbackAdminList,
  fetchFeedbackAdminAccess,
  updateBetaFeedbackStatus,
} from "../api/feedbackApi";
import { useUiStore } from "../store/useUiStore";
import "../styles/beta-feedback.css";

function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label || value;
}

export default function BetaFeedbackAdminPage() {
  const navigate = useNavigate();
  const showAppToast = useUiStore((s) => s.showAppToast);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchFeedbackAdminAccess()
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
      const result = await fetchBetaFeedbackAdminList({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err?.message || "목록을 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    if (!accessChecked || !hasAccess) return;
    load();
  }, [load, accessChecked, hasAccess]);

  const topGroups = useMemo(() => data?.topSimilarGroups || [], [data]);

  const handleStatusChange = async (feedbackId, nextStatus) => {
    setStatusBusyId(feedbackId);
    try {
      await updateBetaFeedbackStatus(feedbackId, nextStatus);
      showAppToast("상태를 변경했습니다.");
      await load();
    } catch (err) {
      showAppToast(err?.message || "상태 변경에 실패했습니다.");
    } finally {
      setStatusBusyId(null);
    }
  };

  return (
    <div className="beta-feedback-page beta-feedback-admin">
      <header className="beta-feedback-page__header">
        <button type="button" className="beta-feedback-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="beta-feedback-page__eyebrow">관리자</p>
          <h1 className="beta-feedback-page__title">베타 피드백</h1>
          <p className="beta-feedback-page__lead">동일·유사 의견 건수로 자주 나오는 문제를 파악할 수 있습니다.</p>
        </div>
      </header>

      {!accessChecked ? (
        <p className="beta-feedback-page__status">권한 확인 중…</p>
      ) : !hasAccess ? (
        <section className="beta-feedback-page__card">
          <p>관리자만 접근할 수 있습니다.</p>
          <button type="button" className="beta-feedback-form__submit" onClick={() => navigate("/settings")}>
            설정으로 돌아가기
          </button>
        </section>
      ) : (
        <>
      {topGroups.length > 0 ? (
        <section className="beta-feedback-page__card beta-feedback-admin__summary" aria-label="동일 의견 상위">
          <h2 className="beta-feedback-admin__summary-title">동일 의견 상위</h2>
          <ul className="beta-feedback-admin__summary-list">
            {topGroups.map((group) => (
              <li key={group.similarityGroupKey}>
                <span className="beta-feedback-admin__similar-badge">{group.count}건</span>
                <span className="beta-feedback-admin__similar-key">{group.similarityGroupKey}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="beta-feedback-page__card">
        <div className="beta-feedback-admin__filters">
          <label>
            상태
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">전체</option>
              {BETA_FEEDBACK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label>
            중요도
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="">전체</option>
              {BETA_FEEDBACK_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? <p className="beta-feedback-page__status">불러오는 중…</p> : null}
        {error ? <p className="beta-feedback-form__error" role="alert">{error}</p> : null}

        {!loading && !error && data?.items?.length === 0 ? (
          <p className="beta-feedback-page__status">조건에 맞는 피드백이 없습니다.</p>
        ) : null}

        <ul className="beta-feedback-admin__list">
          {(data?.items || []).map((item) => {
            const expanded = expandedId === item.id;
            return (
              <li key={item.id} className={`beta-feedback-admin__item severity-${item.severity.toLowerCase()}`}>
                <button
                  type="button"
                  className="beta-feedback-admin__item-head"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                >
                  <div className="beta-feedback-admin__item-meta">
                    <span className={`beta-feedback-admin__severity severity-${item.severity.toLowerCase()}`}>
                      {labelFor(BETA_FEEDBACK_SEVERITIES, item.severity)}
                    </span>
                    <span className="beta-feedback-admin__category">{labelFor(BETA_FEEDBACK_CATEGORIES, item.category)}</span>
                    <span className="beta-feedback-admin__status">{labelFor(BETA_FEEDBACK_STATUSES, item.status)}</span>
                  </div>
                  <p className="beta-feedback-admin__preview">
                    {item.inconvenient || item.featureRequest || item.otherComment || "(내용 없음)"}
                  </p>
                  <div className="beta-feedback-admin__item-foot">
                    <span>{item.displayNickname || `user#${item.userId}`}</span>
                    <span className="beta-feedback-admin__similar-count">동일 의견 {item.similarCount}건</span>
                    <span>{new Date(item.createdAt).toLocaleString("ko-KR")}</span>
                  </div>
                </button>

                {expanded ? (
                  <div className="beta-feedback-admin__detail">
                    {item.inconvenient ? <p><strong>불편함</strong> {item.inconvenient}</p> : null}
                    {item.featureRequest ? <p><strong>기능 요청</strong> {item.featureRequest}</p> : null}
                    {item.otherComment ? <p><strong>기타</strong> {item.otherComment}</p> : null}
                    <p className="beta-feedback-admin__group-key">그룹 키: {item.similarityGroupKey}</p>

                    {item.attachments?.length > 0 ? (
                      <div className="beta-feedback-admin__attachments">
                        {item.attachments.map((att) => (
                          <a key={att.id} href={buildFeedbackAttachmentUrl(att.url || att.id)} target="_blank" rel="noreferrer">
                            <img src={buildFeedbackAttachmentUrl(att.url || att.id)} alt={att.fileName} />
                          </a>
                        ))}
                      </div>
                    ) : null}

                    <label className="beta-feedback-admin__status-select">
                      상태 변경
                      <select
                        value={item.status}
                        disabled={statusBusyId === item.id}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      >
                        {BETA_FEEDBACK_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
        </>
      )}
    </div>
  );
}
