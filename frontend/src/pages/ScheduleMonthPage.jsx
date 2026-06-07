import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ScheduleAvailabilityCalendar from "../components/schedule/ScheduleAvailabilityCalendar";
import FloatingActionButton from "../components/ui/FloatingActionButton";
import ScheduleEditSheet from "../components/schedule/ScheduleEditSheet";
import CalendarSyncSheet from "../components/schedule/CalendarSyncSheet";
import QuickSiteImportSheet from "../components/map/QuickSiteImportSheet";
import FieldTeamRecommendSheet from "../components/map/FieldTeamRecommendSheet";
import { MAP_ITEM_TYPE } from "../constants/mapItemTypes";
import { toDateKey } from "../utils/fieldScheduleModel";
import { useScheduleFieldOps } from "../hooks/useScheduleFieldOps";
import ScheduleEntryComposerSheet from "../components/schedule/ScheduleEntryComposerSheet";
import { getScheduleColorOption } from "../constants/scheduleColors";
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
  const ops = useScheduleFieldOps(selectedDateKey);

  useEffect(() => {
    const compose = location.state?.composeField;
    if (!compose?.dateKey) return;
    setSelectedDateKey(compose.dateKey);
  }, [location.state]);

  const onSelectDate = useCallback((dateKey) => {
    setSelectedDateKey(dateKey);
  }, []);

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
                  <li key={entry.id}>
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
        onSubmitSite={ops.handleSubmitSiteEntry}
        onSubmitPersonal={ops.handleSubmitPersonalEntry}
      />
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
      <FloatingActionButton label="일정" aria-label="일정 추가" onClick={ops.openFieldScheduleComposer} />
    </div>
  );
}
