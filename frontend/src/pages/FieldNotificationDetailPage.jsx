import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FIELD_AUTHOR_ROLE_META,
  FIELD_NOTIF_TYPE_META,
  formatFieldNotifListTime,
  getFieldNotificationDetailLogs,
  getFieldNotificationSiteDetail,
  getFieldNotificationThread,
  getThreadBriefingHref,
} from "../utils/fieldNotificationFeedMock";

export default function FieldNotificationDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const decodedId = decodeURIComponent(threadId || "");

  const thread = useMemo(() => getFieldNotificationThread(decodedId), [decodedId]);
  const logs = useMemo(() => getFieldNotificationDetailLogs(decodedId), [decodedId]);
  const site = useMemo(() => getFieldNotificationSiteDetail(decodedId), [decodedId]);

  if (!thread) {
    return (
      <div className="field-notif-detail field-notif-detail--empty">
        <button type="button" className="field-notif-detail__back" onClick={() => navigate("/notifications")} aria-label="뒤로">
          ←
        </button>
        <p>알림을 찾을 수 없습니다.</p>
        <button type="button" className="field-notif-detail__ghost" onClick={() => navigate("/notifications")}>
          목록으로
        </button>
      </div>
    );
  }

  const briefingHref = getThreadBriefingHref(thread);
  const todayHref = thread.scheduleId ? `/today-field/${encodeURIComponent(thread.scheduleId)}` : null;

  return (
    <div className="field-notif-detail">
      <header className="field-notif-detail__head">
        <button type="button" className="field-notif-detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div className="field-notif-detail__head-copy">
          <p className="field-notif-detail__eyebrow">현장 운영 로그</p>
          <h1 className="field-notif-detail__title">{thread.siteTitle}</h1>
        </div>
      </header>

      <div className="field-notif-detail__brief-strip">
        <button type="button" className="field-notif-detail__brief-btn" onClick={() => navigate(briefingHref)}>
          브리핑룸 입장
        </button>
        <p className="field-notif-detail__brief-hint">현장 브리핑 · 출입 · 주차 · 준비물 · 안전 · 사진 · 운영로그</p>
      </div>

      <section className="field-notif-detail__panel" aria-labelledby="fn-site-info">
        <h2 id="fn-site-info" className="field-notif-detail__panel-title">
          출입 · 주차
        </h2>
        <p className="field-notif-detail__line">
          <span className="field-notif-detail__k">출입</span>
          {site.entryLine}
        </p>
        <p className="field-notif-detail__line">
          <span className="field-notif-detail__k">주차</span>
          {site.parkingLine}
        </p>
        <p className="field-notif-detail__line field-notif-detail__line--soft">
          <span className="field-notif-detail__k">사진</span>
          {site.photoHint}
        </p>
      </section>

      <section className="field-notif-detail__panel" aria-labelledby="fn-timeline">
        <h2 id="fn-timeline" className="field-notif-detail__panel-title">
          운영 타임라인
        </h2>
        <ul className="field-notif-timeline">
          {logs.length === 0 ? (
            <li className="field-notif-timeline__empty">등록된 로그가 없습니다.</li>
          ) : (
            logs.map((row) => {
              const typeMeta = FIELD_NOTIF_TYPE_META[row.type] || FIELD_NOTIF_TYPE_META.notice;
              const roleMeta = FIELD_AUTHOR_ROLE_META[row.authorRole] || FIELD_AUTHOR_ROLE_META.worker;
              return (
                <li key={row.id} className="field-notif-timeline__item" aria-label={`${row.authorName} ${typeMeta.label} 기록`}>
                  <div className="field-notif-timeline__feed">
                    <div className="field-notif-timeline__avatar-wrap">
                      {row.avatarUrl ? (
                        <img className="field-notif-timeline__avatar-img" src={row.avatarUrl} alt={`${row.authorName} 프로필`} />
                      ) : (
                        <span className={`field-notif-timeline__avatar-init field-notif-timeline__avatar-init--${roleMeta.tone}`}>
                          {row.authorInitial}
                        </span>
                      )}
                    </div>
                    <div className="field-notif-timeline__content">
                      <div className="field-notif-timeline__byline">
                        <strong className="field-notif-timeline__name">{row.authorName}</strong>
                        <span className={`field-notif-role-badge field-notif-role-badge--${roleMeta.tone}`}>{roleMeta.label}</span>
                        <span className={`field-notif-badge field-notif-badge--${typeMeta.tone}`}>
                          <span className="field-notif-badge__dot" aria-hidden="true" />
                          {typeMeta.label}
                        </span>
                      </div>
                      <time className="field-notif-timeline__when" dateTime={row.at}>
                        {formatFieldNotifListTime(row.at)}
                      </time>
                      <p className="field-notif-timeline__body">{row.body}</p>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <footer className="field-notif-detail__foot">
        {todayHref ? (
          <button type="button" className="field-notif-detail__primary" onClick={() => navigate(todayHref)}>
            오늘 작업 화면
          </button>
        ) : null}
        {!todayHref ? (
          <p className="field-notif-detail__hint">연결된 작업 화면이 없으면 일정 탭에서 현장을 확인해 주세요.</p>
        ) : null}
      </footer>
    </div>
  );
}
