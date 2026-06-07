import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSettlementStore } from "../store/useSettlementStore";
import { useJobStore } from "../store/useJobStore";
import { useUiStore } from "../store/useUiStore";
import { useUserStore } from "../store/useUserStore";
import { getScheduleEndDateKey } from "../utils/scheduleModel";
import {
  appendScheduleChangeHistory,
  createScheduleChangeRequest,
  formatChangeSummary,
  getLatestPendingChangeRequest,
  getParticipantResponse,
  getScheduleParticipants,
  listScheduleChangeHistory,
  respondToScheduleChangeRequest,
  resolveScheduleBriefingId,
  scheduleToEditForm,
  countUnavailableForRequest,
} from "../utils/scheduleFieldOpsStorage";
import { buildUrgentHelpJobFromSchedule } from "../utils/urgentHelpFromSchedule";
import ScheduleEditSheet from "../components/schedule/ScheduleEditSheet";
import FieldScheduleNoticeBoard from "../components/schedule/FieldScheduleNoticeBoard";
import FieldScheduleDailyRoster from "../components/schedule/FieldScheduleDailyRoster";
import FieldTeamRosterSheet from "../components/map/FieldTeamRosterSheet";
import { formatSchedulePeriodLabel } from "../utils/workerAssignmentModel";
import { CRAFT_LABEL } from "../utils/jobModel";
import { buildPersonLines } from "../utils/fieldProfileCard";
import { usePersonCard } from "../context/PersonCardContext";
import "../styles/field-schedule-detail.css";

const DETAIL_TABS = [
  { key: "info", label: "현장정보" },
  { key: "board", label: "현장게시판" },
  { key: "schedule", label: "일정" },
  { key: "history", label: "변경이력" },
];

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 작업일 기준 현장 상태 자동 판정: 모집중(예정) / 진행중 / 완료 */
function deriveSiteStatus(schedule) {
  if (!schedule) return { key: "recruiting", label: "모집중" };
  const start = String(schedule.workDate || "").slice(0, 10);
  const end = getScheduleEndDateKey(schedule) || start;
  const today = localDateKey();
  if (end && end < today) return { key: "done", label: "완료" };
  if (start && start <= today && today <= end) return { key: "ongoing", label: "진행중" };
  return { key: "recruiting", label: "모집중" };
}

function actorLabel(actor) {
  if (actor === "owner") return "현장 소장";
  if (actor === "member") return "팀원";
  return "변경";
}

export default function FieldScheduleDetailPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const schedules = useSettlementStore((s) => s.schedules);
  const updateSchedule = useSettlementStore((s) => s.updateSchedule);
  const createJobPost = useJobStore((s) => s.createJobPost);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const viewerId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);
  const { openPersonCard } = usePersonCard();

  const [editOpen, setEditOpen] = useState(location.state?.action === "edit");
  const [changeOpen, setChangeOpen] = useState(location.state?.action === "change");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.action === "notice" ? "board" : "info");
  const [refreshKey, setRefreshKey] = useState(0);

  const schedule = useMemo(() => {
    void refreshKey;
    return (Array.isArray(schedules) ? schedules : []).find((s) => String(s?.id) === String(scheduleId)) || null;
  }, [schedules, scheduleId, refreshKey]);

  const participants = useMemo(() => (schedule ? getScheduleParticipants(schedule) : []), [schedule]);
  const briefingId = useMemo(() => resolveScheduleBriefingId(schedule), [schedule]);
  const changeHistory = useMemo(
    () => (schedule ? listScheduleChangeHistory(schedule.id) : []),
    [schedule, refreshKey]
  );
  const pendingRequest = useMemo(
    () => (schedule ? getLatestPendingChangeRequest(schedule.id) : null),
    [schedule, refreshKey]
  );
  const siteStatus = useMemo(() => deriveSiteStatus(schedule), [schedule]);

  const participantStatus = useCallback(
    (p) => {
      if (p.role === "owner") return { label: "현장 소장", tone: "owner" };
      if (pendingRequest) {
        const res = getParticipantResponse(pendingRequest.id, schedule?.id, p.userId);
        if (res?.available === true) return { label: "참석 확정", tone: "yes" };
        if (res?.available === false) return { label: "참석 불가", tone: "no" };
        return { label: "응답 대기", tone: "wait" };
      }
      const st = String(p.inviteStatus || "").toLowerCase();
      if (st === "accepted") return { label: "참석 확정", tone: "yes" };
      if (st === "declined" || st === "rejected") return { label: "참석 불가", tone: "no" };
      return { label: "응답 대기", tone: "wait" };
    },
    [pendingRequest, schedule]
  );

  const isOwner = useMemo(() => {
    const ownerId = Number(schedule?.createdByUserId);
    return !Number.isFinite(ownerId) || ownerId <= 0 || ownerId === Number(viewerId);
  }, [schedule, viewerId]);

  const myResponse = pendingRequest
    ? getParticipantResponse(pendingRequest.id, schedule?.id, viewerId)
    : null;

  const shortageCount = pendingRequest
    ? countUnavailableForRequest(schedule.id, pendingRequest.id, participants)
    : 0;

  const applyPatch = useCallback(
    (patch, { notifyTeam = false, summary } = {}) => {
      if (!schedule?.id) return;
      const before = scheduleToEditForm(schedule);
      const updated = updateSchedule(schedule.id, {
        ...patch,
        briefingId: briefingId || resolveScheduleBriefingId({ ...schedule, ...patch }),
      });
      if (!updated) return;
      const after = scheduleToEditForm(updated);
      const changeSummary = summary || formatChangeSummary(
        {
          title: before.title,
          workDate: before.workDate,
          workDateEnd: before.workDateEnd,
          workTime: `${before.startTime}~${before.endTime}`,
          fullAddress: before.fullAddress,
          craft: before.craft,
          pay: before.payAmount,
          crewCount: before.crewCount,
        },
        {
          title: after.title,
          workDate: after.workDate,
          workDateEnd: after.workDateEnd,
          workTime: `${after.startTime}~${after.endTime}`,
          fullAddress: after.fullAddress,
          craft: after.craft,
          pay: after.payAmount,
          crewCount: after.crewCount,
        }
      );
      appendScheduleChangeHistory(schedule.id, {
        summary: changeSummary,
        actor: isOwner ? "owner" : "member",
      });
      if (notifyTeam) {
        createScheduleChangeRequest(updated, { summary: changeSummary, patch });
        showAppToast?.("참여 인원에게 일정 변경 알림을 보냈습니다");
      } else {
        showAppToast?.("일정을 저장했습니다");
      }
      setRefreshKey((k) => k + 1);
    },
    [briefingId, isOwner, schedule, showAppToast, updateSchedule]
  );

  const handleSaveEdit = useCallback(
    (patch) => {
      applyPatch(patch, { notifyTeam: false });
    },
    [applyPatch]
  );

  const handleSaveChangeRequest = useCallback(
    (patch) => {
      applyPatch(patch, { notifyTeam: true });
      setChangeOpen(false);
    },
    [applyPatch]
  );

  const handleRespond = useCallback(
    (available) => {
      if (!pendingRequest || !schedule) return;
      respondToScheduleChangeRequest({
        requestId: pendingRequest.id,
        scheduleId: schedule.id,
        userId: viewerId,
        available,
      });
      showAppToast?.(available ? "참석 가능으로 응답했습니다" : "참석 불가로 응답했습니다");
      setRefreshKey((k) => k + 1);
    },
    [pendingRequest, schedule, showAppToast, viewerId]
  );

  const handleUrgentRecruit = useCallback(async () => {
    if (!schedule) return;
    const job = buildUrgentHelpJobFromSchedule(schedule, { shortageCount: Math.max(1, shortageCount) });
    if (!job) return;
    await createJobPost(job);
    showAppToast?.("긴급헬프 공고를 생성했습니다 · 지도에서 확인하세요");
    navigate("/map", { state: { focusUrgent: true } });
  }, [createJobPost, navigate, schedule, shortageCount, showAppToast]);

  if (!schedule) {
    return (
      <div className="field-detail-page">
        <header className="field-detail-page__top">
          <button type="button" onClick={() => navigate(-1)}>
            ←
          </button>
          <h1>현장 상세</h1>
        </header>
        <p className="field-detail-page__empty">일정을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const endDate = getScheduleEndDateKey(schedule);
  const craftLabel = CRAFT_LABEL[schedule.craft] || schedule.craft || "공정";
  const dateLabel = formatSchedulePeriodLabel(schedule);

  return (
    <div className="field-detail-page field-detail-page--hub">
      <header className="field-detail-page__top">
        <button type="button" className="field-detail-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <h1 className="field-detail-page__top-title">현장 상세</h1>
        <span className={`field-detail-status field-detail-status--${siteStatus.key}`}>{siteStatus.label}</span>
      </header>

      <section className="field-detail-summary app-card" aria-label="현장 요약">
        <strong className="field-detail-summary__name">{schedule.title || "현장"}</strong>
        <p className="field-detail-summary__addr">{schedule.fullAddress || schedule.shortRegion || "주소 미정"}</p>
        <dl className="field-detail-summary__grid">
          <div>
            <dt>공정</dt>
            <dd>{craftLabel}</dd>
          </div>
          <div>
            <dt>일당</dt>
            <dd>{schedule.pay || "—"}</dd>
          </div>
          <div>
            <dt>인원</dt>
            <dd>{schedule.crewCount ? `${schedule.crewCount}명` : "—"}</dd>
          </div>
          <div>
            <dt>날짜</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div>
            <dt>시간</dt>
            <dd>{schedule.workTime || "—"}</dd>
          </div>
          <div>
            <dt>비밀번호</dt>
            <dd>{schedule.accessPassword || "—"}</dd>
          </div>
        </dl>
      </section>

      {pendingRequest && !isOwner ? (
        <section className="field-detail-page__respond app-card" aria-label="일정 변경 응답">
          <h2>일정 변경 안내</h2>
          <p>{pendingRequest.summary}</p>
          {myResponse ? (
            <p className="field-detail-page__respond-done">
              {myResponse.available ? "참석 가능으로 응답함" : "참석 불가로 응답함"}
            </p>
          ) : (
            <div className="field-detail-page__respond-btns">
              <button type="button" className="is-yes" onClick={() => handleRespond(true)}>
                참석 가능
              </button>
              <button type="button" className="is-no" onClick={() => handleRespond(false)}>
                참석 불가
              </button>
            </div>
          )}
        </section>
      ) : null}

      {shortageCount > 0 && isOwner ? (
        <section className="field-detail-page__urgent app-card">
          <p>참석 불가 {shortageCount}명 · 대체 인력이 필요합니다.</p>
          <button type="button" className="field-detail-page__urgent-btn" onClick={handleUrgentRecruit}>
            긴급헬프 공고 만들기
          </button>
        </section>
      ) : null}

      <nav className="field-detail-tabs" role="tablist" aria-label="현장 상세 탭">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={`field-detail-tabs__btn${activeTab === t.key ? " is-active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="field-detail-tabpanel" role="tabpanel">
        {activeTab === "info" ? (
          <section className="field-detail-page__info app-card">
            <h2>현장 정보</h2>
            <dl>
              <div>
                <dt>주소</dt>
                <dd>{schedule.fullAddress || schedule.shortRegion || "—"}</dd>
              </div>
              <div>
                <dt>기간</dt>
                <dd>{dateLabel}</dd>
              </div>
              <div>
                <dt>시간</dt>
                <dd>{schedule.workTime || "—"}</dd>
              </div>
              <div>
                <dt>공정</dt>
                <dd>{craftLabel}</dd>
              </div>
              <div>
                <dt>일당</dt>
                <dd>{schedule.pay || "—"}</dd>
              </div>
              <div>
                <dt>인원</dt>
                <dd>{schedule.crewCount ? `${schedule.crewCount}명` : "—"}</dd>
              </div>
              {schedule.accessPassword ? (
                <div>
                  <dt>비밀번호</dt>
                  <dd>{schedule.accessPassword}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <>
            <FieldScheduleDailyRoster schedule={schedule} assignments={schedule.workerAssignments} />
            <section className="field-detail-page__team app-card">
              <div className="field-detail-page__team-head">
                <h2>전체 팀원</h2>
                <span className="field-detail-page__team-count">{participants.length}명</span>
              </div>
              <ul>
                {participants.map((p) => {
                  const st = participantStatus(p);
                  const identityLine = p.role === "owner" ? "" : buildPersonLines(p, "participant").lines.join(" · ");
                  return (
                    <li key={`${p.userId}-${p.role}`}>
                      <div className="field-detail-page__team-who">
                        <button
                          type="button"
                          className="field-detail-page__team-name-btn"
                          onClick={() => openPersonCard(p)}
                        >
                          {p.name}
                        </button>
                        {p.assignmentPeriod ? (
                          <span className="field-detail-page__team-identity">{p.assignmentPeriod}</span>
                        ) : identityLine ? (
                          <span className="field-detail-page__team-identity">{identityLine}</span>
                        ) : (
                          <span>{p.role === "owner" ? "현장 소장" : "참여"}</span>
                        )}
                      </div>
                      <span className={`field-detail-attend field-detail-attend--${st.tone}`}>{st.label}</span>
                    </li>
                  );
                })}
                {!participants.length ? <li className="field-detail-page__team-empty">등록된 참여자가 없습니다.</li> : null}
              </ul>
              <div className="field-detail-page__team-actions">
                <button type="button" className="is-primary" onClick={() => setRosterOpen(true)}>
                  팀원 초대
                </button>
                <button type="button" onClick={() => setRosterOpen(true)}>
                  현장 연락망 보기
                </button>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "board" ? (
          <div id="field-board">
            <FieldScheduleNoticeBoard briefingId={briefingId} onToast={showAppToast} />
          </div>
        ) : null}

        {activeTab === "history" ? (
          <section className="field-detail-page__history app-card">
            <h2>변경 이력</h2>
            <ul>
              {changeHistory.map((row) => (
                <li key={row.id}>
                  <div className="field-detail-page__history-meta">
                    <span className="field-detail-page__history-actor">{actorLabel(row.actor)}</span>
                    <time>{formatWhen(row.at)}</time>
                  </div>
                  <p className="field-detail-page__history-summary">{row.summary}</p>
                </li>
              ))}
              {!changeHistory.length ? <li className="field-detail-page__history-empty">변경 이력이 없습니다.</li> : null}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="field-detail-actionbar" role="group" aria-label="현장 액션">
        <button type="button" className="field-detail-actionbar__btn" onClick={() => setEditOpen(true)}>
          일정 수정
        </button>
        <button type="button" className="field-detail-actionbar__btn" onClick={() => setChangeOpen(true)}>
          일정 변경
        </button>
        <button
          type="button"
          className="field-detail-actionbar__btn field-detail-actionbar__btn--alert"
          onClick={handleUrgentRecruit}
        >
          긴급 헬프
        </button>
      </div>

      <ScheduleEditSheet
        open={editOpen}
        schedule={schedule}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
      <ScheduleEditSheet
        open={changeOpen}
        schedule={schedule}
        onClose={() => setChangeOpen(false)}
        onSave={handleSaveChangeRequest}
      />
      <FieldTeamRosterSheet
        open={rosterOpen}
        job={schedule}
        scheduleId={schedule.id}
        workDateStart={schedule.workDate}
        workDateEnd={endDate || schedule.workDate}
        onClose={() => setRosterOpen(false)}
      />
    </div>
  );
}
