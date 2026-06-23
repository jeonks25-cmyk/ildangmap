import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractMePayload, getMe } from "../api/userApi";
import { useUserStore } from "../store/useUserStore";
import { useSettlementStore } from "../store/useSettlementStore";
import {
  buildSaveStatusSummary,
  computeOperatorDiagVerdict,
  formatDiagTimestamp,
  getOperatorDiagSnapshot,
  resolveLastApiCause,
  resolveOperatorDiagTone,
} from "../utils/operatorDiag";
import { hasVisibleIldangmapSessionCookie } from "../utils/sessionBootstrapFlow";
import "../styles/developer-diagnostics.css";

function DiagRow({ label, value, hint }) {
  return (
    <div className="dev-diag__row">
      <dt>{label}</dt>
      <dd>
        <span className="dev-diag__value">{value ?? "—"}</span>
        {hint ? <span className="dev-diag__hint">{hint}</span> : null}
      </dd>
    </div>
  );
}

function PhaseList({ phases }) {
  if (!phases?.length) {
    return <p className="dev-diag__empty">저장 시도 기록 없음</p>;
  }
  return (
    <ol className="dev-diag__phase-list">
      {phases.map((item, index) => (
        <li key={`${item.phase}-${item.at}-${index}`}>
          <code>{item.phase}</code>
          <span className="dev-diag__phase-meta">
            {formatDiagTimestamp(item.at)}
            {item.httpStatus != null ? ` · HTTP ${item.httpStatus}` : ""}
            {item.scheduleCount != null ? ` · ${item.scheduleCount}건` : ""}
            {item.reason ? ` · ${item.reason}` : ""}
            {item.code ? ` · ${item.code}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SaveStatusSummary({ summary, tone }) {
  if (!summary) return null;
  return (
    <div className={`dev-diag__save-summary dev-diag__save-summary--${tone}`}>
      <h3>서버 저장 상태</h3>
      <ul>
        {summary.lines.map((line) => (
          <li key={line.key}>
            <span>{line.key}</span>
            <strong>{line.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DeveloperDiagnosticsPage() {
  const navigate = useNavigate();
  const session = useUserStore((s) => s.session);
  const profile = useUserStore((s) => s.profile);
  const memoryScheduleCount = useSettlementStore((s) =>
    Array.isArray(s.schedules) ? s.schedules.length : 0
  );

  const [refreshing, setRefreshing] = useState(false);
  const [serverMeId, setServerMeId] = useState(null);
  const [meCheckedAt, setMeCheckedAt] = useState(null);
  const [meError, setMeError] = useState("");
  const [diagSnapshot, setDiagSnapshot] = useState(() => getOperatorDiagSnapshot());

  const zustandAuthenticated = Boolean(session?.isAuthenticated);
  const zustandUserId = session?.user?.id ?? profile?.id ?? null;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setMeError("");
    try {
      const raw = await getMe();
      const me = extractMePayload(raw);
      const id = me?.id ?? me?.userId ?? null;
      setServerMeId(id != null ? String(id) : null);
      setMeCheckedAt(new Date().toISOString());
    } catch (error) {
      setServerMeId(null);
      setMeCheckedAt(new Date().toISOString());
      setMeError(error?.message || "GET /api/users/me 실패");
    } finally {
      setDiagSnapshot(getOperatorDiagSnapshot());
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cookieVisible = hasVisibleIldangmapSessionCookie();
  const lastSave = diagSnapshot.lastSaveAttempt;
  const lastGet = diagSnapshot.lastGetSchedules;
  const verdict = computeOperatorDiagVerdict({
    zustandAuthenticated,
    serverUserId: serverMeId,
    lastSave,
    lastGet,
  });
  const tone = resolveOperatorDiagTone(verdict);
  const apiCause = resolveLastApiCause({ lastSave, lastGet, meError });
  const saveSummary = buildSaveStatusSummary(lastSave);

  return (
    <div className="dev-diag-page">
      <header className="dev-diag-page__header">
        <button type="button" className="dev-diag-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="dev-diag-page__eyebrow">운영 진단</p>
          <h1 className="dev-diag-page__title">개발자 진단</h1>
          <p className="dev-diag-page__lead">
            일정 서버 저장·세션 상태를 이 기기 메모리에서 확인합니다. 새로고침 후 일정을 한 번 저장해 보세요.
          </p>
        </div>
        <button type="button" className="dev-diag-page__refresh" onClick={refresh} disabled={refreshing}>
          {refreshing ? "확인 중…" : "새로고침"}
        </button>
      </header>

      <section className={`dev-diag__verdict dev-diag__verdict--${tone}`} aria-live="polite">
        <h2>진단 결과</h2>
        <p className="dev-diag__verdict-label">{verdict}</p>
        {apiCause ? <p className="dev-diag__api-cause">{apiCause}</p> : null}
      </section>

      <SaveStatusSummary summary={saveSummary} tone={tone} />

      <section className="dev-diag__card">
        <h2>1. 로그인 상태</h2>
        <dl className="dev-diag__dl">
          <DiagRow label="Zustand isAuthenticated" value={zustandAuthenticated ? "true" : "false"} />
          <DiagRow
            label="/api/users/me data.id"
            value={serverMeId ?? (meError ? "없음" : "—")}
            hint={meError || (meCheckedAt ? `확인: ${formatDiagTimestamp(meCheckedAt)}` : null)}
          />
          <DiagRow label="userId (Zustand)" value={zustandUserId != null ? String(zustandUserId) : "—"} />
          <DiagRow label="userId (서버 /me)" value={serverMeId ?? "—"} />
        </dl>
      </section>

      <section className="dev-diag__card">
        <h2>2. 세션 상태</h2>
        <dl className="dev-diag__dl">
          <DiagRow
            label="ILDANGMAPSESSION (document.cookie)"
            value={cookieVisible ? "보임" : "안 보임"}
            hint="HttpOnly 쿠키는 여기서 안 보일 수 있습니다. data.id로 서버 세션을 판단하세요."
          />
          <DiagRow label="서버 세션 추정" value={serverMeId ? "있음" : "없음"} />
          <DiagRow
            label="마지막 bootstrap 성공"
            value={formatDiagTimestamp(diagSnapshot.lastBootstrapOkAt)}
            hint={diagSnapshot.lastBootstrapSource ? `source: ${diagSnapshot.lastBootstrapSource}` : null}
          />
        </dl>
      </section>

      <section className="dev-diag__card">
        <h2>3. 일정 저장 상태 (최근 시도)</h2>
        <dl className="dev-diag__dl">
          <DiagRow label="시작 시각" value={formatDiagTimestamp(lastSave?.startedAt)} />
          <DiagRow label="HTTP Status" value={lastSave?.httpStatus ?? "—"} />
          <DiagRow label="저장 schedule 개수" value={lastSave?.scheduleCount ?? "—"} />
          <DiagRow
            label="saveSuccess"
            value={lastSave?.saveSuccess == null ? "—" : lastSave.saveSuccess ? "true" : "false"}
          />
          <DiagRow label="syncReason" value={lastSave?.syncReason ?? "—"} />
          <DiagRow label="API 원인" value={apiCause ?? "—"} />
        </dl>
        <PhaseList phases={lastSave?.phases} />
      </section>

      <section className="dev-diag__card">
        <h2>4. 최근 GET schedules</h2>
        <dl className="dev-diag__dl">
          <DiagRow label="scheduleCount" value={lastGet?.scheduleCount ?? "—"} />
          <DiagRow label="마지막 조회 시각" value={formatDiagTimestamp(lastGet?.at)} />
          <DiagRow label="성공 여부" value={lastGet ? (lastGet.ok ? "성공" : "실패") : "—"} />
          <DiagRow label="HTTP Status" value={lastGet?.status ?? "—"} />
          <DiagRow label="API 원인" value={lastGet?.failureLabel ?? "—"} />
          <DiagRow label="메모리 일정 수" value={String(memoryScheduleCount)} />
        </dl>
      </section>
    </div>
  );
}
