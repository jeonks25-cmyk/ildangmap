import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchBriefingPosts } from "../api/briefingApi";
import { fetchScheduleBriefingPosts } from "../api/scheduleBriefingApi";
import { useJobs } from "../context/JobsContext";
import { useSchedules } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { useViewerApplicantUserId } from "../hooks/useJobOwnership";
import { isLiveHelpJob } from "../utils/jobModel";
import {
  canViewPrivateScheduleInfo,
  getPrivateJobFieldsForViewer,
  getPublicJobLocation,
  maskAddressDetail,
} from "../utils/jobPrivacyPolicy";
import { countOpsPostsToday, hasEntryInfo } from "../utils/todayFieldHelpers";
import BriefingPostAuthorRow from "../components/briefing/BriefingPostAuthorRow";

const POST_TYPE_BADGE = {
  general: { label: "공지", className: "briefing-feed-card__badge--general" },
  change: { label: "변경", className: "briefing-feed-card__badge--change" },
  help_request: { label: "도움요청", className: "briefing-feed-card__badge--help" },
};

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeRange(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match;
  return {
    start: Number(sh) * 60 + Number(sm),
    end: Number(eh) * 60 + Number(em),
  };
}

function minutesNow() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

function buildNaverMapUrl(addr, lat, lng) {
  if (addr && String(addr).trim()) {
    return `https://map.naver.com/v5/search/${encodeURIComponent(String(addr).trim())}`;
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://map.naver.com/v5/?c=${lng},${lat},18,0,0,0,dh`;
  }
  return null;
}

function crewLabel(schedule) {
  const n = Number(schedule?.crewCount);
  if (Number.isFinite(n) && n > 0) return `${n}명`;
  const inv = Array.isArray(schedule?.scheduleInvites) ? schedule.scheduleInvites.length : 0;
  return `${Math.max(1, 1 + inv)}명`;
}

export default function TodayFieldWorkPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { schedules } = useSchedules();
  const { jobs } = useJobs();
  const { authReady, isAuthenticated } = useAuth();
  const viewerApplicantUserId = useViewerApplicantUserId();
  const [posts, setPosts] = useState([]);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const jobById = useMemo(() => {
    const m = new Map();
    for (const j of Array.isArray(jobs) ? jobs : []) {
      if (j?.id != null) m.set(Number(j.id), j);
    }
    return m;
  }, [jobs]);

  const schedule = useMemo(() => {
    const list = Array.isArray(schedules) ? schedules : [];
    return list.find((s) => s && s.id === scheduleId) || null;
  }, [schedules, scheduleId]);

  const job = useMemo(() => {
    if (!schedule) return null;
    const jid = schedule.jobId == null ? NaN : Number(schedule.jobId);
    return Number.isFinite(jid) ? jobById.get(jid) || null : null;
  }, [schedule, jobById]);

  const title = useMemo(() => schedule?.title || job?.title || "오늘 현장", [schedule, job]);
  const canViewPrivate = useMemo(
    () => canViewPrivateScheduleInfo(schedule, viewerApplicantUserId, job),
    [job, schedule, viewerApplicantUserId]
  );
  const privateFields = useMemo(
    () => getPrivateJobFieldsForViewer(job || schedule, canViewPrivate ? viewerApplicantUserId : null),
    [canViewPrivate, job, schedule, viewerApplicantUserId]
  );
  const address = useMemo(() => {
    if (canViewPrivate) {
      return String(schedule?.fullAddress || privateFields.fullAddress || schedule?.shortRegion || job?.shortRegion || "").trim();
    }
    const publicLocation = getPublicJobLocation(job || schedule);
    return publicLocation.address || maskAddressDetail(schedule?.fullAddress || schedule?.shortRegion || job?.shortRegion || "");
  }, [canViewPrivate, job, privateFields.fullAddress, schedule]);
  const urgent = Boolean(job && isLiveHelpJob(job));

  const remainingLabel = useMemo(() => {
    if (!schedule) return "-";
    const end = parseTimeRange(schedule.workTime)?.end ?? 17 * 60;
    const now = minutesNow();
    const rem = end - now;
    if (rem <= 0) return "종료 예정 시각 지남";
    const h = Math.floor(rem / 60);
    const m = rem % 60;
    return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
  }, [schedule]);

  const navUrl = useMemo(() => {
    if (!canViewPrivate) return null;
    return buildNaverMapUrl(schedule?.fullAddress || privateFields.fullAddress || schedule?.shortRegion, schedule?.lat, schedule?.lng);
  }, [canViewPrivate, privateFields.fullAddress, schedule]);

  const briefingPath = useMemo(() => {
    if (!schedule) return null;
    if (String(schedule.briefingId || "").trim()) {
      return `/briefing-room/${encodeURIComponent(String(schedule.briefingId))}`;
    }
    if (schedule.jobId != null && jobById.has(Number(schedule.jobId))) {
      return `/jobs/${Number(schedule.jobId)}/briefing`;
    }
    return null;
  }, [schedule, jobById]);

  const loadPosts = useCallback(async () => {
    if (!schedule) return;
    if (!canViewPrivate) {
      setPosts([]);
      return;
    }
    try {
      if (String(schedule.briefingId || "").trim()) {
        const list = await fetchScheduleBriefingPosts(String(schedule.briefingId));
        setPosts(Array.isArray(list) ? list.slice(0, 12) : []);
        return;
      }
      if (schedule.jobId != null) {
        const list = await fetchBriefingPosts(String(schedule.jobId));
        setPosts(Array.isArray(list) ? list.slice(0, 12) : []);
      }
    } catch (_) {
      setPosts([]);
    }
  }, [canViewPrivate, schedule]);

  useEffect(() => {
    loadPosts();
    const t = window.setInterval(loadPosts, 24000);
    return () => window.clearInterval(t);
  }, [loadPosts]);

  if (!authReady) {
    return (
      <div className="today-field-work-page">
        <p className="today-field-work-page__center">잠시만요…</p>
      </div>
    );
  }

  if (!isAuthenticated || !schedule) {
    return (
      <div className="today-field-work-page">
        <header className="today-field-work-page__top">
          <button type="button" className="today-field-work-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="today-field-work-page__title">오늘 작업</h1>
          <span className="today-field-work-page__spacer" />
        </header>
        <p className="today-field-work-page__center">일정을 찾을 수 없어요.</p>
        <button type="button" className="today-field-work-page__ghost" onClick={() => navigate("/schedule")}>
          캘린더로
        </button>
      </div>
    );
  }

  const entryOk = hasEntryInfo(schedule, job);
  const parkingText = String(schedule?.parkingInfo || schedule?.parkingNote || job?.parkingNote || "").trim() || "미등록";
  const prepText = String(schedule?.requiredItems || "").trim() || "미등록";
  const opsToday = countOpsPostsToday(schedule, todayKey);
  const entryText = canViewPrivate
    ? String(schedule.entryInfo || schedule.accessPassword || privateFields.accessPassword || "").trim() || "등록 전 · 운영 로그에 남겨 주세요."
    : "승인 후 출입정보 공개";

  return (
    <div className="today-field-work-page">
      <header className="today-field-work-page__top">
        <button type="button" className="today-field-work-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <h1 className="today-field-work-page__title">오늘 작업</h1>
        <span className="today-field-work-page__spacer" />
      </header>

      <div className="today-field-work-page__scroll">
        <section className="today-field-work-page__hero" aria-label="현장 요약">
          <div className="today-field-work-page__hero-row">
            <h2 className="today-field-work-page__site-name">{title}</h2>
            {urgent ? <span className="today-field-work-page__pill today-field-work-page__pill--urgent">긴급</span> : null}
          </div>
          <p className="today-field-work-page__remain">{remainingLabel}</p>
          <p className="today-field-work-page__sub">{schedule.workTime || "08:00~17:00"}</p>
        </section>

        <section className="today-field-work-page__panel" aria-label="현장 정보">
          <article className="today-field-work-page__tile">
            <h3>출입</h3>
            <p>{entryText}</p>
            <span className={`today-field-work-page__badge${entryOk ? " is-on" : ""}`}>
              {canViewPrivate ? (entryOk ? "안내 있음" : "안내 없음") : "승인 후 공개"}
            </span>
          </article>
          <article className="today-field-work-page__tile">
            <h3>주차</h3>
            <p>{parkingText}</p>
          </article>
          <article className="today-field-work-page__tile">
            <h3>준비물</h3>
            <p>{prepText}</p>
          </article>
          <article className="today-field-work-page__tile">
            <h3>참여 인원</h3>
            <p>{crewLabel(schedule)}</p>
          </article>
          {address ? (
            <article className="today-field-work-page__tile today-field-work-page__tile--wide">
              <h3>주소</h3>
              <p>{address}</p>
            </article>
          ) : null}
        </section>

        {canViewPrivate ? (
        <section className="today-field-work-page__ops" id="today-field-ops-log" aria-label="운영 기록">
          <div className="today-field-work-page__ops-head">
            <h2>운영 기록</h2>
            <span className="today-field-work-page__ops-meta">오늘 로그 {opsToday}건 · 아래는 최근 기록</span>
          </div>
          <p className="today-field-work-page__ops-lead">채팅이 아니라 현장에서 바뀐 내용만 짧게 남긴 로그예요.</p>
          <div className="today-field-work-page__log-list" role="list">
            {posts.length === 0 ? (
              <p className="today-field-work-page__empty">아직 기록이 없어요. 후문 주차·자재 이동 등 필요한 것만 올려 주세요.</p>
            ) : (
              posts.map((post) => {
                const meta = POST_TYPE_BADGE[post.postType] || POST_TYPE_BADGE.general;
                return (
                  <article key={post.id} className="briefing-feed-card briefing-feed-card--ops briefing-feed-card--log" role="listitem">
                    <div className="briefing-feed-card__head">
                      <span className={`briefing-feed-card__badge ${meta.className}`}>{meta.label}</span>
                      <BriefingPostAuthorRow post={post} timeLine={formatWhen(post.createdAt)} />
                    </div>
                    <p className="briefing-feed-card__body">{post.body}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>
        ) : (
          <section className="today-field-work-page__ops" aria-label="운영 기록 제한">
            <div className="today-field-work-page__ops-head">
              <h2>운영 기록</h2>
              <span className="today-field-work-page__ops-meta">승인 후 공개</span>
            </div>
            <p className="today-field-work-page__ops-lead">상세 브리핑과 운영 기록은 참여 승인 후 볼 수 있습니다.</p>
          </section>
        )}
      </div>

      <footer className="today-field-work-page__dock" aria-label="빠른 작업">
        {briefingPath && canViewPrivate ? (
          <button type="button" className="today-field-work-page__dock-btn" onClick={() => navigate(briefingPath)}>
            현장 알림
          </button>
        ) : (
          <span className="today-field-work-page__dock-muted">브리핑 없음</span>
        )}
        {briefingPath && canViewPrivate ? (
          <button type="button" className="today-field-work-page__dock-btn" onClick={() => navigate(`${briefingPath}?preset=help`)}>
            도움요청
          </button>
        ) : null}
        {canViewPrivate && privateFields.contactPhone ? (
          <a className="today-field-work-page__dock-btn" href={`tel:${String(privateFields.contactPhone).replace(/[^\d+]/g, "")}`}>
            전화
          </a>
        ) : null}
        {navUrl ? (
          <a className="today-field-work-page__dock-btn today-field-work-page__dock-btn--accent" href={navUrl} target="_blank" rel="noopener noreferrer">
            네비
          </a>
        ) : (
          <span className="today-field-work-page__dock-muted">네비</span>
        )}
      </footer>
    </div>
  );
}
