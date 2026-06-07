import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createBriefingPost, fetchBriefingPosts, fetchBriefingRoom } from "../api/briefingApi";
import { getApiErrorMessage, isAuthError, isMockApiEnabled, isPermissionError } from "../api/client";
import { useJobs } from "../context/JobsContext";
import { useViewerApplicantUserId } from "../hooks/useJobOwnership";
import { useUiStore } from "../store/useUiStore";
import { useUserStore } from "../store/useUserStore";
import { compressImageFileToDataUrl } from "../utils/briefingImageCompress";
import { canAccessJobBriefing } from "../utils/jobModel";
import { fieldMemorySiteKeyFromJobId } from "../utils/fieldMemoryStorage";
import FieldMemorySection from "../components/field/FieldMemorySection";
import BriefingPostAuthorRow from "../components/briefing/BriefingPostAuthorRow";
import { useWorkTimelineStore } from "../store/useWorkTimelineStore";

const POST_TYPE_OPTIONS = [
  { value: "general", label: "공지" },
  { value: "change", label: "변경" },
  { value: "help_request", label: "도움요청" },
];

const POST_TYPE_BADGE = {
  general: { label: "공지", className: "briefing-feed-card__badge--general" },
  change: { label: "변경", className: "briefing-feed-card__badge--change" },
  help_request: { label: "도움요청", className: "briefing-feed-card__badge--help" },
};

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

function formatWorkDateLine(workDate, startTime, endTime) {
  if (!workDate) return "일정 미정";
  const parts = String(workDate).split("-");
  const label =
    parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(workDate);
  const st = startTime ? String(startTime).slice(0, 5) : "";
  const et = endTime ? String(endTime).slice(0, 5) : "";
  if (st && et) return `${label} · ${st}–${et}`;
  if (st) return `${label} · ${st}~`;
  return label;
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

function entryDisplay(room) {
  const t = String(room?.entryInfo || room?.locationText || "").trim();
  if (t) return t;
  return "등록된 출입·집결 안내가 없어요. 아래 운영 기록에 올려 주세요.";
}

function parkingDisplay(room) {
  const t = String(room?.parkingInfo || "").trim();
  if (t) return t;
  return room?.parkingAvailable
    ? "주차 가능으로 표시된 현장이에요. 상세 위치는 운영 기록으로 공유해 주세요."
    : "주차 불가 또는 미표시예요. 운영 기록으로 안내해 주세요.";
}

function workDisplay(room) {
  const t = String(room?.workSummary || "").trim();
  if (t) return t;
  const tr = String(room?.trade || "").trim();
  const ro = String(room?.role || "").trim();
  const pair = `${tr} ${ro}`.trim();
  return pair || "작업 요약이 없어요. 운영 기록으로 위치·변경을 남겨 주세요.";
}

export default function BriefingRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { jobs } = useJobs();
  const viewerId = useViewerApplicantUserId();
  const authReady = useUserStore((s) => s.authReady);
  const isAuthenticated = useUserStore((s) => s.session?.isAuthenticated);

  const job = useMemo(() => {
    const nid = Number(id);
    const list = Array.isArray(jobs) ? jobs : [];
    return list.find((j) => j && Number(j.id) === nid) || null;
  }, [id, jobs]);

  const canTryServer = useMemo(() => {
    if (!authReady || !isAuthenticated) return false;
    if (!job) return !isMockApiEnabled();
    return canAccessJobBriefing(job, viewerId);
  }, [authReady, isAuthenticated, job, viewerId]);

  const blockedLocal = useMemo(() => {
    if (!authReady || !isAuthenticated) return false;
    if (!job) return isMockApiEnabled();
    return !canAccessJobBriefing(job, viewerId);
  }, [authReady, isAuthenticated, job, viewerId]);

  const [room, setRoom] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composerBody, setComposerBody] = useState("");
  const [composerType, setComposerType] = useState("general");
  const [composerImage, setComposerImage] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageLocalError, setImageLocalError] = useState("");
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("preset") === "help") {
      setComposerType("help_request");
    }
  }, [searchParams]);

  const reloadFeed = useCallback(async () => {
    if (!id) return;
    const list = await fetchBriefingPosts(id);
    setPosts(Array.isArray(list) ? list : []);
  }, [id]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      useUiStore.getState().openAuthPrompt("briefing");
      setLoading(false);
      return;
    }
    if (!canTryServer) {
      setLoadError("");
      setBlocked(blockedLocal);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      setBlocked(false);
      try {
        const [r, p] = await Promise.all([fetchBriefingRoom(id), fetchBriefingPosts(id)]);
        if (cancelled) return;
        setRoom(r);
        setPosts(Array.isArray(p) ? p : []);
      } catch (e) {
        if (cancelled) return;
        if (isAuthError(e)) {
          useUiStore.getState().openAuthPrompt("briefing");
        }
        setLoadError(getApiErrorMessage(e));
        if (isPermissionError(e)) {
          setBlocked(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, canTryServer, blockedLocal, id]);

  const navUrl = useMemo(() => {
    if (!room) return null;
    return buildNaverMapUrl(room.fullAddress || room.shortAddress, room.lat, room.lng);
  }, [room]);

  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setImageLocalError("");
    setImageBusy(true);
    try {
      const url = await compressImageFileToDataUrl(file);
      setComposerImage(url);
    } catch (err) {
      setImageLocalError(err instanceof Error ? err.message : "이미지를 처리하지 못했어요.");
    } finally {
      setImageBusy(false);
    }
  };

  const onSubmit = async () => {
    if (!id || submitting || !composerBody.trim()) return;
    setSubmitting(true);
    try {
      await createBriefingPost(id, {
        body: composerBody,
        postType: composerType,
        imageDataUrl: composerImage || undefined,
      });
      useWorkTimelineStore.getState().recordBriefingPostEvent({ siteKey: `job:${id}`, body: composerBody });
      setComposerBody("");
      setComposerType("general");
      setComposerImage(null);
      setImageLocalError("");
      await reloadFeed();
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <div className="briefing-room-page">
        <header className="briefing-room-page__top">
          <button type="button" className="briefing-room-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="briefing-room-page__title">현장 운영 기록</h1>
          <span className="briefing-room-page__spacer" />
        </header>
        <p className="briefing-room-page__center-msg">잠시만요…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="briefing-room-page">
        <header className="briefing-room-page__top">
          <button type="button" className="briefing-room-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="briefing-room-page__title">현장 운영 기록</h1>
          <span className="briefing-room-page__spacer" />
        </header>
        <section className="briefing-room-page__card">
          <p className="briefing-room-page__lead">이 현장의 운영 기록은 로그인한 확정 참여자만 볼 수 있어요.</p>
          <button type="button" className="briefing-room-page__primary" onClick={() => useUiStore.getState().openAuthPrompt("briefing")}>
            로그인하기
          </button>
        </section>
      </div>
    );
  }

  if (blocked || blockedLocal) {
    return (
      <div className="briefing-room-page">
        <header className="briefing-room-page__top">
          <button type="button" className="briefing-room-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="briefing-room-page__title">현장 운영 기록</h1>
          <span className="briefing-room-page__spacer" />
        </header>
        <section className="briefing-room-page__card">
          <p className="briefing-room-page__lead">
            이 현장 운영 기록은 확정된 오야지·기술자만 이용할 수 있어요. 현장 참여 승인 상태를 확인해 주세요.
          </p>
          {job ? (
            <button type="button" className="briefing-room-page__secondary" onClick={() => navigate(`/jobs/${job.id}`)}>
              현장으로 돌아가기
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  if (loading || !room) {
    return (
      <div className="briefing-room-page">
        <header className="briefing-room-page__top">
          <button type="button" className="briefing-room-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
            ←
          </button>
          <h1 className="briefing-room-page__title">현장 운영 기록</h1>
          <span className="briefing-room-page__spacer" />
        </header>
        <p className="briefing-room-page__center-msg">{loadError || "불러오는 중…"}</p>
      </div>
    );
  }

  return (
    <div className="briefing-room-page">
      <header className="briefing-room-page__top">
        <button type="button" className="briefing-room-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <h1 className="briefing-room-page__title">현장 운영 기록</h1>
        <span className="briefing-room-page__spacer" />
      </header>

      <div className="briefing-room-page__scroll">
        <section className="briefing-room-page__hero-card" aria-label="현장 요약">
          <div className="briefing-room-page__eyebrow">현장 단위 · Job</div>
          <h2 className="briefing-room-page__site-title">{room.title}</h2>
          <p className="briefing-room-page__when">{formatWorkDateLine(room.workDate, room.startTime, room.endTime)}</p>
          <p className="briefing-room-page__addr">{room.shortAddress || room.fullAddress || "주소 정보 없음"}</p>
          {navUrl ? (
            <a className="briefing-room-page__nav-btn" href={navUrl} target="_blank" rel="noopener noreferrer">
              네이버 지도로 길찾기
            </a>
          ) : null}
        </section>

        <section className="briefing-room-page__grid" aria-label="현장 정보">
          <article className="briefing-room-page__info-tile">
            <h3>출입·집결</h3>
            <p>{entryDisplay(room)}</p>
          </article>
          <article className="briefing-room-page__info-tile">
            <h3>주차</h3>
            <p>{parkingDisplay(room)}</p>
          </article>
          <article className="briefing-room-page__info-tile">
            <h3>작업</h3>
            <p>{workDisplay(room)}</p>
          </article>
        </section>

        <FieldMemorySection siteKey={fieldMemorySiteKeyFromJobId(id)} />

        <section className="briefing-room-page__card" aria-labelledby="briefing-participants">
          <h2 id="briefing-participants" className="briefing-room-page__section-title">
            현장 참여 인원
          </h2>
          <div className="briefing-room-page__chips" role="list">
            {(Array.isArray(room.participants) ? room.participants : []).map((p) => (
              <span key={`${p.userId}-${p.roleTag}`} className="briefing-room-page__chip" role="listitem">
                <strong>{p.displayName}</strong>
                <span>{p.roleTag}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="briefing-room-page__card" aria-labelledby="briefing-feed-title">
          <h2 id="briefing-feed-title" className="briefing-room-page__section-title">
            운영 기록
          </h2>
          <p className="briefing-room-page__hint">
            대화방이 아니라, 당일 현장 운영용 공지·변경·도움 요청만 남기는 기록입니다. 짧게 적어 주세요.
          </p>
          <p className="briefing-room-page__attach-hint">텍스트 중심 · 글당 사진은 최대 1장(선택).</p>
          {loadError ? <p className="briefing-room-page__error">{loadError}</p> : null}

          <div className="briefing-feed-list" role="list">
            {posts.length === 0 ? (
              <p className="briefing-room-page__empty">등록된 운영 기록이 없어요. 후문·주차·층 변경 등 필요한 정보만 남겨 주세요.</p>
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
                    {post.imageDataUrl && String(post.imageDataUrl).startsWith("data:image/") ? (
                      <figure className="briefing-feed-card__figure">
                        <img className="briefing-feed-card__img" src={post.imageDataUrl} alt="" loading="lazy" />
                      </figure>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <footer className="briefing-room-page__composer" aria-label="운영 기록 작성">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="briefing-room-page__hidden-file"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onPickImage}
        />
        <div className="briefing-room-page__composer-row">
          {POST_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`briefing-room-page__type-chip${composerType === opt.value ? " is-active" : ""}`}
              onClick={() => setComposerType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          className="briefing-room-page__textarea"
          rows={2}
          placeholder="예: 후문 출입 / 엘베 2번만 사용 / 3층 작업으로 변경"
          value={composerBody}
          onChange={(e) => setComposerBody(e.target.value)}
          maxLength={2000}
        />
        <div className="briefing-room-page__composer-attach">
          <button
            type="button"
            className="briefing-room-page__pic-btn"
            disabled={imageBusy || submitting}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageBusy ? "처리 중…" : composerImage ? "사진 바꾸기" : "사진 1장"}
          </button>
          {composerImage ? (
            <div className="briefing-room-page__pic-preview-wrap">
              <img className="briefing-room-page__pic-preview" src={composerImage} alt="" />
              <button
                type="button"
                className="briefing-room-page__pic-remove"
                aria-label="첨부 사진 제거"
                onClick={() => {
                  setComposerImage(null);
                  setImageLocalError("");
                }}
              >
                ×
              </button>
            </div>
          ) : null}
          {imageLocalError ? <p className="briefing-room-page__attach-error">{imageLocalError}</p> : null}
        </div>
        <button type="button" className="briefing-room-page__submit" disabled={submitting || !composerBody.trim()} onClick={onSubmit}>
          {submitting ? "등록 중…" : "운영 기록에 등록"}
        </button>
      </footer>
    </div>
  );
}
