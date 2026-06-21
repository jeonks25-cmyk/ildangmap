import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ScheduleAvailabilityCalendar from "../components/schedule/ScheduleAvailabilityCalendar";
import FloatingActionButton from "../components/ui/FloatingActionButton";
import ScheduleEditSheet from "../components/schedule/ScheduleEditSheet";
import CalendarSyncSheet from "../components/schedule/CalendarSyncSheet";
import QuickSiteImportSheet from "../components/map/QuickSiteImportSheet";
import FieldTeamRecommendSheet from "../components/map/FieldTeamRecommendSheet";
import CalendarSaveButton from "../components/schedule/CalendarSaveButton";
import ScheduleOcrReviewSheet from "../components/schedule/ScheduleOcrReviewSheet";
import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";
import { toDateKey } from "../utils/fieldScheduleModel";
import { useScheduleFieldOps } from "../hooks/useScheduleFieldOps";
import ScheduleEntryComposerSheet from "../components/schedule/ScheduleEntryComposerSheet";
import ScheduleShareSheet from "../components/schedule/ScheduleShareSheet";
import { getScheduleColorOption } from "../constants/scheduleColors";
import { personalEventToIcsInput } from "../features/calendar-export";
import "../styles/schedule-page-mobile.css";

function parseDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

function formatListHeader(dateKey) {
  const d = parseDateKey(dateKey);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 일정`;
}

/** 일정 탭 — 큰 월간 캘린더(현장·개인) + 선택일 목록 */
export default function ScheduleMonthPage() {
  const location = useLocation();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [ocrReviewOpen, setOcrReviewOpen] = useState(false);
  const [ocrReviewDrafts, setOcrReviewDrafts] = useState([]);
  const [ocrReviewSaving, setOcrReviewSaving] = useState(false);
  const [shareEntry, setShareEntry] = useState(null);
  const [calendarExportEvents, setCalendarExportEvents] = useState(null);
  const ops = useScheduleFieldOps(selectedDateKey);

  useEffect(() => {
    const compose = location.state?.composeField;
    if (!compose?.dateKey) return;
    setSelectedDateKey(compose.dateKey);
  }, [location.state]);

  const onSelectDate = useCallback((dateKey) => {
    setSelectedDateKey(dateKey);
  }, []);

  const handleOcrReview = useCallback((drafts) => {
    setOcrReviewDrafts(Array.isArray(drafts) ? drafts : []);
    setOcrReviewOpen(true);
  }, []);

  const handleOcrReviewConfirm = useCallback(
    async (drafts) => {
      setOcrReviewSaving(true);
      try {
        const created = await ops.handleBulkPersonalEntries(drafts);
        if (created.length) {
          setCalendarExportEvents(created.map((e) => personalEventToIcsInput(e)).filter(Boolean));
          ops.closeComposer();
        }
        setOcrReviewOpen(false);
        setOcrReviewDrafts([]);
      } finally {
        setOcrReviewSaving(false);
      }
    },
    [ops]
  );

  const handlePersonalSubmit = useCallback(
    async (payload) => {
      const result = await ops.handleSubmitPersonalEntry(payload);
      if (result?.events?.length) {
        setCalendarExportEvents(result.events.map((e) => personalEventToIcsInput(e)).filter(Boolean));
      }
    },
    [ops]
  );

  const handleSiteSubmit = useCallback(
    async (payload) => {
      await ops.handleSubmitSiteEntry(payload);
      ops.closeComposer();
    },
    [ops]
  );

  return (
    <div className="schedule-page schedule-page--oyaji-split schedule-desktop-split">
      <div className="schedule-page__calendar-zone schedule-page__calendar-zone--oyaji">
        <ScheduleAvailabilityCalendar
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          selectDateOnGoToday
        />
      </div>

      <section className="schedule-oyaji-list" aria-label={formatListHeader(selectedDateKey)}>
        <h2 className="schedule-oyaji-list__title">{formatListHeader(selectedDateKey)}</h2>
        <div className="schedule-oyaji-list__scroll">
          {ops.dayEntries.length === 0 ? (
            <p className="schedule-oyaji-list__empty">등록된 일정이 없습니다.</p>
          ) : (
            <ul className="schedule-oyaji-list__items">
              {ops.dayEntries.map((entry) => {
                const tone = getScheduleColorOption(entry.colorId);
                const isPersonal = entry.kind === "personal";
                return (
                  <li key={entry.id} className="schedule-oyaji-list__item">
                    <button
                      type="button"
                      className="schedule-oyaji-list__row"
                      onClick={() =>
                        isPersonal
                          ? ops.openPersonalComposer(entry.personalEvent)
                          : ops.navigateToFieldDetail(entry.schedule)
                      }
                    >
                      <strong
                        className="schedule-oyaji-list__name"
                        style={{ borderLeftColor: tone.text, borderLeftWidth: 4, borderLeftStyle: "solid", paddingLeft: 8 }}
                      >
                        {entry.shortTitle || entry.title}
                      </strong>
                      <span className="schedule-oyaji-list__time">{entry.time}</span>
                      {!isPersonal && entry.address ? (
                        <span className="schedule-oyaji-list__addr">{entry.address}</span>
                      ) : null}
                      {isPersonal && entry.memo ? (
                        <span className="schedule-oyaji-list__memo">{entry.memo}</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="schedule-oyaji-list__share"
                      aria-label={`${entry.title} 공유하기`}
                      onClick={() => setShareEntry(entry)}
                    >
                      공유
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <ScheduleEntryComposerSheet
        key={ops.composerInitial?.id ? `edit-${ops.composerInitial.id}` : `add-${selectedDateKey}`}
        open={ops.composerOpen}
        dateKey={selectedDateKey}
        initial={ops.composerInitial}
        onClose={ops.closeComposer}
        onSubmitSite={handleSiteSubmit}
        onSubmitPersonal={handlePersonalSubmit}
        onOcrReview={handleOcrReview}
      />
      <ScheduleOcrReviewSheet
        open={ocrReviewOpen}
        drafts={ocrReviewDrafts}
        saving={ocrReviewSaving}
        onClose={() => setOcrReviewOpen(false)}
        onConfirm={handleOcrReviewConfirm}
      />
      {calendarExportEvents?.length ? (
        <div className="schedule-calendar-export-banner" role="status">
          <p>일정이 저장되었습니다. 캘린더 앱으로 보낼 수 있어요.</p>
          <CalendarSaveButton
            events={calendarExportEvents}
            label="캘린더 저장"
            onDone={(result) => {
              if (result.ok) {
                ops.showAppToast?.("캘린더 파일을 열었습니다 · 앱에서 일정을 추가하세요");
                setCalendarExportEvents(null);
              } else if (result.error !== "cancelled") {
                ops.showAppToast?.("캘린더 저장에 실패했습니다");
              }
            }}
          />
          <button type="button" className="schedule-calendar-export-banner__dismiss" onClick={() => setCalendarExportEvents(null)}>
            닫기
          </button>
        </div>
      ) : null}
      <QuickSiteImportSheet
        open={ops.quickImportOpen}
        type={MAP_ITEM_TYPE.FIELD}
        selectedDateKey={selectedDateKey}
        dateLabel={formatListHeader(selectedDateKey)}
        profileCraft={ops.profile?.craft || "film"}
        defaultCrewCount={ops.composeCrewSeed}
        composeDefaultCraft={ops.composeCraftSeed}
        recentAddressOptions={ops.addressOptions}
        onClose={() => {
          ops.setQuickImportOpen(false);
          ops.setComposeCrewSeed(null);
          ops.setComposeCraftSeed(null);
        }}
        onSubmitField={ops.handleCreateFieldFromDraft}
        onSubmitMapItem={ops.handleSubmitMapItem}
      />
      <ScheduleEditSheet
        open={Boolean(ops.editSchedule)}
        schedule={ops.editSchedule}
        onClose={() => ops.setEditSchedule(null)}
        onSave={(_patch, form) => ops.editSchedule && ops.saveScheduleForm(ops.editSchedule, form, { notifyTeam: false })}
      />
      <ScheduleEditSheet
        open={Boolean(ops.changeSchedule)}
        schedule={ops.changeSchedule}
        onClose={() => ops.setChangeSchedule(null)}
        onSave={(_patch, form) =>
          ops.changeSchedule && ops.saveScheduleForm(ops.changeSchedule, form, { notifyTeam: true })
        }
      />
      <CalendarSyncSheet open={ops.syncOpen} onClose={() => ops.setSyncOpen(false)} onToast={ops.showAppToast} />
      <FieldTeamRecommendSheet
        open={Boolean(ops.teamInviteContext?.job)}
        job={ops.teamInviteContext?.job}
        scheduleId={ops.teamInviteContext?.scheduleId}
        workDateStart={ops.teamInviteContext?.workDateStart}
        workDateEnd={ops.teamInviteContext?.workDateEnd}
        onClose={() => ops.setTeamInviteContext(null)}
      />
      <ScheduleShareSheet
        open={Boolean(shareEntry)}
        scheduleInput={shareEntry}
        onClose={() => setShareEntry(null)}
        onToast={ops.showAppToast}
      />
      <FloatingActionButton label="일정" aria-label="일정 추가" onClick={ops.openFieldScheduleComposer} />
    </div>
  );
}
