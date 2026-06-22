import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  appendScheduleChangeHistory,
  createScheduleChangeRequest,
  formatChangeSummary,
  resolveScheduleBriefingId,
  scheduleToEditForm,
  editFormToSchedulePatch,
} from "../utils/scheduleFieldOpsStorage";
import { MAP_ITEM_TYPE_LABEL } from "../constants/mapItemTypes";
import {
  getMyScheduleOwnerId,
  selectPersonalEventsForOwner,
  useFieldScheduleStore,
} from "../store/useFieldScheduleStore";
import { useSettlementStore } from "../store/useSettlementStore";
import { buildUnifiedDayEntries } from "../utils/scheduleDayEntries";
import { useJobStore } from "../store/useJobStore";
import { useUserProfile } from "../context/UserProfileContext";
import { useUserStore } from "../store/useUserStore";
import { useMapItemStore } from "../store/useMapItemStore";
import { useUiStore } from "../store/useUiStore";
import { buildContactsList, useContactsStore } from "../store/useContactsStore";
import { contactStableUserId, getContactDisplayName } from "../utils/fieldContactsMock";
import { getDisplayNickname } from "../utils/displayNickname";
import { createFieldJobFromDraft } from "../utils/fieldJobDraftAdapter";
import { SCHEDULE_DEFAULT_END_TIME, SCHEDULE_DEFAULT_START_TIME } from "../constants/scheduleDefaults";
import { scheduleDateKeyFromWorkDate, toDateKey } from "../utils/fieldScheduleModel";
import { getScheduleDurationDays, scheduleCoversDate } from "../utils/scheduleModel";
import {
  entryToComposerInitial,
  entryToCopyComposerInitial,
  scheduleInvitesToParticipantIds,
} from "../utils/scheduleEntryHelpers";
import {
  fieldMemorySiteKeyFromAddress,
  fieldMemorySiteKeyFromJobId,
  saveFieldMemoryItem,
  saveFieldTimelineEvent,
  saveFieldVisitMemory,
} from "../utils/fieldMemoryStorage";
import { getFieldProfileFamilyKey, getFieldProfileKey } from "../utils/fieldHistoryModel";
import { recordSiteMemoryFromRegistration } from "../features/site-import/memory";
import { scheduleDiagSaveResult, scheduleDiagCurrentUser } from "../utils/scheduleSyncDiag";
import { hasVisibleIldangmapSessionCookie } from "../utils/sessionBootstrapFlow";

function parseDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  const dt = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

export function formatScheduleDayLabel(dateKey) {
  const d = parseDateKey(dateKey);
  const todayKey = toDateKey(new Date());
  if (dateKey === todayKey) return "오늘";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

function formatDateKeyForShare(dateKey) {
  const d = parseDateKey(dateKey);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getScheduleMemoryKeys(schedule, sourceJob) {
  const seed = { ...(sourceJob || {}), ...(schedule || {}) };
  return [
    getFieldProfileKey(seed),
    getFieldProfileFamilyKey(seed),
    fieldMemorySiteKeyFromJobId(schedule?.jobId),
    fieldMemorySiteKeyFromAddress(
      schedule?.fullAddress || sourceJob?.privateFields?.fullAddress || sourceJob?.fullAddress || schedule?.shortRegion
    ),
  ].filter(Boolean);
}

function createVisitMemoryFromSchedule(schedule, job) {
  return {
    id: `visit:${schedule?.id || job?.id || Date.now()}`,
    date: schedule?.workDate || job?.workDate || job?.date || "",
    title: schedule?.title || job?.title || "",
    teamName: schedule?.teamName || schedule?.assignedWorker || "",
    craft: schedule?.craft || job?.craft || "",
    durationDays: getScheduleDurationDays(schedule || job),
    requiredItems: schedule?.requiredItems || job?.requiredItems || "",
    materialNote: schedule?.materialNote || job?.materialNote || "",
    parkingNote: schedule?.parkingNote || job?.parkingNote || "",
    mealNote: schedule?.mealNote || job?.mealNote || "",
  };
}

function saveScheduleTimeline(schedule, sourceJob, event) {
  getScheduleMemoryKeys(schedule, sourceJob).forEach((key) => {
    saveFieldTimelineEvent(key, event);
  });
}

function toAddressOption(item, index) {
  const fullAddress = item?.fullAddress || item?.addressDetail || item?.address || "";
  const shortRegion = item?.shortRegion || item?.shortAddress || fullAddress.split(/\s+/).slice(0, 2).join(" ");
  if (!fullAddress && !shortRegion) return null;
  return {
    id: `schedule-address-${item?.id || index}`,
    label: item?.title || item?.siteLabel || shortRegion || "현장 위치",
    shortRegion,
    fullAddress: fullAddress || shortRegion,
    lat: Number.isFinite(Number(item?.lat)) ? Number(item.lat) : 36.3504,
    lng: Number.isFinite(Number(item?.lng)) ? Number(item.lng) : 127.3845,
    siteKind: item?.siteKind || (/아파트/.test(fullAddress) ? "아파트" : "현장"),
  };
}

/** 일정 탭 — 현장 생성·수정·이동·시트 상태 */
export function useScheduleFieldOps(selectedDateKey) {
  const navigate = useNavigate();
  const location = useLocation();
  const [quickImportOpen, setQuickImportOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState(null);
  const [composeCrewSeed, setComposeCrewSeed] = useState(null);
  const [composeCraftSeed, setComposeCraftSeed] = useState(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [teamInviteContext, setTeamInviteContext] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [changeSchedule, setChangeSchedule] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const ownerId = getMyScheduleOwnerId();
  const schedules = useSettlementStore((s) => s.schedules);
  const personalEvents = useFieldScheduleStore((s) => selectPersonalEventsForOwner(s, ownerId));
  const personalRevision = useFieldScheduleStore((s) => s.revisionsByOwner[ownerId]);
  const addPersonalEvent = useFieldScheduleStore((s) => s.addPersonalEvent);
  const updatePersonalEvent = useFieldScheduleStore((s) => s.updatePersonalEvent);
  const removePersonalEvent = useFieldScheduleStore((s) => s.removePersonalEvent);
  const addScheduleFromJobMatch = useSettlementStore((s) => s.addScheduleFromJobMatch);
  const updateSchedule = useSettlementStore((s) => s.updateSchedule);
  const deleteSchedule = useSettlementStore((s) => s.deleteSchedule);
  const inviteContactsToSchedule = useSettlementStore((s) => s.inviteContactsToSchedule);
  const syncScheduleParticipants = useSettlementStore((s) => s.syncScheduleParticipants);
  const createJobPost = useJobStore((s) => s.createJobPost);
  const updateJobLocal = useJobStore((s) => s.updateJobLocal);
  const jobs = useJobStore((s) => s.jobs);
  const addMapItemDraft = useMapItemStore((s) => s.addMapItemDraft);
  const updateItemsForScheduleMove = useMapItemStore((s) => s.updateItemsForScheduleMove);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const { profile } = useUserProfile();
  const favoriteById = useContactsStore((s) => s.favoriteById);
  const memoById = useContactsStore((s) => s.memoById);
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const contactOverridesById = useContactsStore((s) => s.contactOverridesById);
  const removedContactIds = useContactsStore((s) => s.removedContactIds);
  const myUserId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);

  const fieldOnDay = useMemo(
    () =>
      (Array.isArray(schedules) ? schedules : []).filter((s) => scheduleCoversDate(s, selectedDateKey)),
    [schedules, selectedDateKey]
  );

  const dayEntries = useMemo(
    () => {
      void personalRevision;
      return buildUnifiedDayEntries({
        schedules,
        personalEvents,
        dateKey: selectedDateKey,
      });
    },
    [personalEvents, personalRevision, schedules, selectedDateKey]
  );

  const jobById = useMemo(
    () => new Map((Array.isArray(jobs) ? jobs : []).map((job) => [String(job?.id), job])),
    [jobs]
  );

  const openFieldScheduleComposer = useCallback(() => {
    setComposeCrewSeed(null);
    setComposeCraftSeed(null);
    setComposerInitial(null);
    setComposerOpen(true);
  }, []);

  const openPersonalComposer = useCallback((personalEvent) => {
    if (!personalEvent) return;
    setComposerInitial({
      id: personalEvent.id,
      entryType: "personal",
      title: personalEvent.title,
      dateKey: personalEvent.dateKey,
      startTime: personalEvent.startTime || SCHEDULE_DEFAULT_START_TIME,
      endTime: personalEvent.endTime || SCHEDULE_DEFAULT_END_TIME,
      color: personalEvent.color || "gray",
      memo: personalEvent.memo || "",
    });
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setComposerInitial(null);
  }, []);

  useEffect(() => {
    const compose = location.state?.composeField;
    if (!compose) return;
    setComposeCrewSeed(
      Number.isFinite(Number(compose.crewCount)) && Number(compose.crewCount) > 0 ? Number(compose.crewCount) : null
    );
    setComposeCraftSeed(typeof compose.defaultCraft === "string" && compose.defaultCraft.trim() ? compose.defaultCraft : null);
    setQuickImportOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const syncLinkedJobFromSchedule = useCallback(
    (before, after) => {
      if (!after?.jobId) return;
      updateJobLocal?.(after.jobId, {
        date: after.workDate,
        workDate: after.workDate,
        durationDays: after.durationDays,
        endDate: after.endDate,
        workEndDate: after.workEndDate,
        workTime: after.workTime,
        workType: after.workType,
        shiftType: after.shiftType,
        operationNotice: after.operationNotice || null,
        connectionNotice: after.connectionNotice || null,
      });
      if (before && scheduleDateKeyFromWorkDate(before.workDate) !== scheduleDateKeyFromWorkDate(after.workDate)) {
        updateItemsForScheduleMove?.({
          scheduleId: after.id,
          fieldId: after.jobId,
          nextDateKey: scheduleDateKeyFromWorkDate(after.workDate),
        });
      }
    },
    [updateItemsForScheduleMove, updateJobLocal]
  );

  const applySchedulePatch = useCallback(
    (schedule, patch, toastMessage, noticeText = "") => {
      if (!schedule?.id) return null;
      const notice = noticeText
        ? {
            text: noticeText,
            updatedAt: new Date().toISOString(),
          }
        : null;
      const updated = updateSchedule?.(schedule.id, {
        ...patch,
        ...(notice
          ? {
              operationNotice: notice,
              connectionNotice: {
                ...notice,
                state: "changed",
              },
            }
          : {}),
      });
      if (!updated) return null;
      syncLinkedJobFromSchedule(schedule, updated);
      const sourceJob = schedule?.jobId != null ? jobById.get(String(schedule.jobId)) : null;
      if (noticeText) {
        saveScheduleTimeline(updated, sourceJob, {
          type: "schedule_change",
          tone: "change",
          icon: "변경",
          text: noticeText,
          detail: updated.workTime || "",
          source: "schedule_card",
        });
      }
      if (toastMessage) showAppToast?.(toastMessage);
      return updated;
    },
    [jobById, showAppToast, syncLinkedJobFromSchedule, updateSchedule]
  );

  const handleMoveScheduleToDate = useCallback(
    (scheduleOrId, nextDateKey) => {
      const schedule =
        typeof scheduleOrId === "object"
          ? scheduleOrId
          : (Array.isArray(schedules) ? schedules : []).find((item) => String(item?.id) === String(scheduleOrId));
      if (!schedule || !nextDateKey) return;
      const currentKey = scheduleDateKeyFromWorkDate(schedule.workDate);
      if (currentKey === nextDateKey) return;
      applySchedulePatch(
        schedule,
        {
          workDate: nextDateKey,
          date: nextDateKey,
        },
        "현장 일정을 이동했습니다",
        `${formatDateKeyForShare(currentKey)} → ${formatDateKeyForShare(nextDateKey)} 변경`
      );
    },
    [applySchedulePatch, schedules]
  );

  const navigateToFieldDetail = useCallback(
    (schedule, action) => {
      if (!schedule?.id) return;
      navigate(`/schedule/field/${encodeURIComponent(schedule.id)}`, action ? { state: { action } } : undefined);
    },
    [navigate]
  );

  const openScheduleFromCalendar = useCallback(
    (scheduleId) => {
      const schedule = (Array.isArray(schedules) ? schedules : []).find(
        (item) => String(item?.id) === String(scheduleId)
      );
      if (schedule) navigateToFieldDetail(schedule);
    },
    [navigateToFieldDetail, schedules]
  );

  const saveScheduleForm = useCallback(
    (schedule, form, { notifyTeam }) => {
      const patch = editFormToSchedulePatch(form);
      const briefingId = resolveScheduleBriefingId(schedule);
      const before = scheduleToEditForm(schedule);
      const updated = applySchedulePatch(
        schedule,
        { ...patch, briefingId },
        notifyTeam ? "일정 변경을 알렸습니다" : "일정을 저장했습니다",
        notifyTeam ? "일정 변경" : ""
      );
      if (!updated) return;
      const after = scheduleToEditForm(updated);
      const summary = formatChangeSummary(
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
      appendScheduleChangeHistory(schedule.id, { summary, actor: "owner" });
      if (notifyTeam) createScheduleChangeRequest(updated, { summary, patch });
    },
    [applySchedulePatch]
  );

  const addressOptions = useMemo(() => {
    const combined = [...(Array.isArray(schedules) ? schedules : []), ...(Array.isArray(jobs) ? jobs : [])]
      .map(toAddressOption)
      .filter(Boolean);
    const seen = new Set();
    const unique = combined.filter((item) => {
      const key = `${item.fullAddress}_${item.shortRegion}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.length
      ? unique.slice(0, 8)
      : [
          {
            id: "schedule-default-location",
            label: "대전 현장",
            shortRegion: "대전 현장",
            fullAddress: "대전 현장",
            lat: 36.3504,
            lng: 127.3845,
            siteKind: "현장",
          },
        ];
  }, [jobs, schedules]);

  const fallbackLocation = addressOptions[0] || null;

  const handleSubmitPersonalEntry = useCallback(
    async ({ id, title, dateKey, startTime, endTime, color, memo }) => {
      try {
        if (id) {
          updatePersonalEvent(ownerId, id, { title, dateKey, startTime, endTime, color, memo });
          showAppToast?.("개인 일정을 수정했습니다");
          return { updated: true, events: [{ id, title, dateKey, startTime, endTime, color, memo }] };
        }
        const created = addPersonalEvent(ownerId, { title, dateKey, startTime, endTime, color, memo });
        if (!created) {
          throw new Error("개인 일정 저장에 실패했습니다");
        }
        scheduleDiagSaveResult({
          id: created.id,
          createdByUserId: myUserId,
          workDate: dateKey,
          title: created.title,
          scheduleInvites: [],
        });
        showAppToast?.("개인 일정을 추가했습니다");
        return { updated: false, events: [created] };
      } catch (error) {
        console.error("[useScheduleFieldOps] handleSubmitPersonalEntry failed", error);
        throw error instanceof Error ? error : new Error("개인 일정 저장에 실패했습니다");
      }
    },
    [addPersonalEvent, myUserId, ownerId, showAppToast, updatePersonalEvent]
  );

  const handleBulkPersonalEntries = useCallback(
    async (drafts) => {
      const list = Array.isArray(drafts) ? drafts : [];
      const created = [];
      list.forEach((draft) => {
        const event = addPersonalEvent(ownerId, {
          title: draft.title,
          dateKey: draft.dateKey,
          startTime: draft.startTime,
          endTime: draft.endTime,
          color: draft.color,
          memo: draft.memo,
        });
        if (event) created.push(event);
      });
      if (created.length) {
        showAppToast?.(`개인 일정 ${created.length}건을 저장했습니다`);
      }
      return created;
    },
    [addPersonalEvent, ownerId, showAppToast]
  );

  const openEntryDetail = useCallback((entry) => {
    if (!entry) return;
    setDetailEntry(entry);
  }, []);

  const closeEntryDetail = useCallback(() => {
    setDetailEntry(null);
  }, []);

  const openEntryEdit = useCallback(
    (entry) => {
      const initial = entryToComposerInitial(entry);
      if (!initial) return;
      if (entry.kind === "site" && initial.schedule) {
        const contacts = buildContactsList(
          favoriteById,
          memoById,
          addedContacts,
          contactOverridesById,
          removedContactIds
        );
        initial.participantIds = scheduleInvitesToParticipantIds(initial.schedule, contacts);
      }
      setDetailEntry(null);
      setComposerInitial(initial);
      setComposerOpen(true);
    },
    [addedContacts, contactOverridesById, favoriteById, memoById, removedContactIds]
  );

  const openEntryCopy = useCallback((entry) => {
    const initial = entryToCopyComposerInitial(entry);
    if (!initial) return;
    setDetailEntry(null);
    setComposerInitial(initial);
    setComposerOpen(true);
  }, []);

  const handleDeleteEntry = useCallback(
    (entry) => {
      if (!entry) return;
      if (entry.kind === "personal" && entry.personalEvent?.id) {
        removePersonalEvent(ownerId, entry.personalEvent.id);
        showAppToast?.("일정을 삭제했습니다");
      } else if (entry.kind === "site" && entry.schedule?.id) {
        deleteSchedule?.(entry.schedule.id);
        showAppToast?.("일정을 삭제했습니다");
      }
      setDetailEntry(null);
    },
    [deleteSchedule, ownerId, removePersonalEvent, showAppToast]
  );

  const handleUpdateSiteEntry = useCallback(
    async ({ id, title, dateKey, endDateKey, workDateStart, workDateEnd, startTime, endTime, color, memo, participantIds = [] }) => {
      const schedule = (Array.isArray(schedules) ? schedules : []).find((s) => String(s?.id) === String(id));
      if (!schedule) return;

      const startKey = workDateStart || dateKey;
      const endKey = workDateEnd || endDateKey || startKey;
      const startDate = parseDateKey(startKey);
      const endDateParsed = parseDateKey(endKey);
      const durationDays =
        startDate && endDateParsed && endDateParsed >= startDate
          ? Math.max(1, Math.round((endDateParsed - startDate) / 86400000) + 1)
          : 1;
      const workTime = `${startTime}~${endTime}`;

      const updated = applySchedulePatch(
        schedule,
        {
          title: title.trim(),
          workDate: startKey,
          date: startKey,
          endDate: endKey,
          workDateEnd: endKey,
          durationDays,
          workTime,
          calendarColor: color,
          calendarMemo: memo,
        },
        "일정을 수정했습니다"
      );

      if (updated?.jobId) {
        updateJobLocal?.(updated.jobId, {
          title: title.trim(),
          date: startKey,
          workDate: startKey,
          durationDays,
          endDate: endKey,
          workEndDate: endKey,
          workTime,
        });
      }

      const contacts = buildContactsList(
        favoriteById,
        memoById,
        addedContacts,
        contactOverridesById,
        removedContactIds
      );
      const selectedSet = new Set((participantIds || []).map(String));
      const selectedContacts = contacts.filter((c) => selectedSet.has(String(c.id)));
      if (updated?.id) {
        syncScheduleParticipants({
          scheduleId: updated.id,
          fromUserId: myUserId,
          fromName: getDisplayNickname(profile) || profile?.name || "현장 소장",
          invitees: selectedContacts.map((c) => ({
            userId: contactStableUserId(c),
            name: getContactDisplayName(c),
            birthYear: c.birthYear ?? null,
            residence: c.homeRegion || "",
          })),
        });
      }
    },
    [
      addedContacts,
      applySchedulePatch,
      contactOverridesById,
      favoriteById,
      memoById,
      myUserId,
      profile,
      removedContactIds,
      schedules,
      syncScheduleParticipants,
      updateJobLocal,
    ]
  );

  const handleSubmitSiteEntry = useCallback(
    async ({ id, title, dateKey, endDateKey, workDateStart, workDateEnd, startTime, endTime, color, memo, participantIds = [] }) => {
      const session = useUserStore.getState().session;
      const profile = useUserStore.getState().profile;
      scheduleDiagCurrentUser({
        userId: session?.user?.id ?? profile?.id ?? myUserId,
        isAuthenticated: session?.isAuthenticated,
        schedulesUserId: useSettlementStore.getState().schedulesUserId,
        hasSessionCookie: hasVisibleIldangmapSessionCookie(),
      });

      try {
        if (id) {
          await handleUpdateSiteEntry({
            id,
            title,
            dateKey,
            endDateKey,
            workDateStart,
            workDateEnd,
            startTime,
            endTime,
            color,
            memo,
            participantIds,
          });
          showAppToast?.("현장 일정을 수정했습니다");
          return;
        }

        const startKey = workDateStart || dateKey;
        const endKey = workDateEnd || endDateKey || startKey;
        const workTime = `${startTime}~${endTime}`;
        const startDate = parseDateKey(startKey);
        const endDateParsed = parseDateKey(endKey);
        const durationDays =
          startDate && endDateParsed && endDateParsed >= startDate
            ? Math.max(1, Math.round((endDateParsed - startDate) / 86400000) + 1)
            : 1;
        const job = createFieldJobFromDraft({
          draft: {
            title,
            workDate: startKey,
            workDateEnd: endKey,
            durationDays,
            workTime,
            craft: composeCraftSeed || profile?.craft || "film",
            location: fallbackLocation,
            mode: "post",
          },
          selectedDateKey: startKey,
          fallbackLocation,
        });
        let persisted;
        try {
          persisted = await createJobPost(job);
        } catch (postError) {
          console.warn("[useScheduleFieldOps] createJobPost failed, saving schedule locally", postError);
          persisted = {
            ...(job || {}),
            id: job?.id || Date.now(),
            createdAt: job?.createdAt || new Date().toISOString(),
          };
        }
        const scheduleDate = scheduleDateKeyFromWorkDate((persisted || job)?.workDate) || startKey;
        const saved = persisted || job;
        const endDate = scheduleDateKeyFromWorkDate(saved?.workEndDate || saved?.endDate) || endKey;
        const createdSchedule = addScheduleFromJobMatch(saved, {
          title: String(title || "").trim(),
          workDate: scheduleDate,
          endDate,
          workDateEnd: endDate,
          durationDays: saved?.durationDays || durationDays,
          fieldId: `field-${saved?.id || Date.now()}`,
          source: "schedule-entry-composer",
          briefingId: `briefing-sched-pending-${saved?.id || Date.now()}`,
          calendarMemo: memo,
        });
        if (createdSchedule?.id) {
          updateSchedule?.(createdSchedule.id, {
            briefingId: resolveScheduleBriefingId(createdSchedule),
            calendarColor: color,
            calendarMemo: memo,
          });
        }

        const latestSchedule =
          createdSchedule?.id && updateSchedule
            ? useSettlementStore.getState().schedules.find((s) => String(s?.id) === String(createdSchedule.id)) ||
              createdSchedule
            : createdSchedule;
        scheduleDiagSaveResult(latestSchedule);

        const contacts = buildContactsList(
          favoriteById,
          memoById,
          addedContacts,
          contactOverridesById,
          removedContactIds
        );
        const selectedSet = new Set((participantIds || []).map(String));
        const selectedContacts = contacts.filter((c) => selectedSet.has(String(c.id)));
        if (createdSchedule?.id && selectedContacts.length) {
          const invitees = selectedContacts.map((c) => ({
            userId: contactStableUserId(c),
            name: getContactDisplayName(c),
            birthYear: c.birthYear ?? null,
            residence: c.homeRegion || "",
          }));
          inviteContactsToSchedule({
            scheduleId: createdSchedule.id,
            fromUserId: myUserId,
            fromName: getDisplayNickname(profile) || profile?.name || "현장 소장",
            invitees,
          });
          updateSchedule?.(createdSchedule.id, { crewCount: Math.max(selectedContacts.length, 1) });
        }

        getScheduleMemoryKeys(createdSchedule || job, persisted || job).forEach((key) => {
          saveFieldVisitMemory(key, createVisitMemoryFromSchedule(createdSchedule || job, persisted || job));
          saveFieldTimelineEvent(key, {
            type: "field_created",
            tone: "start",
            icon: "시작",
            text: "현장 일정 생성",
            detail: (persisted || job)?.title || "",
            source: "schedule_registration",
          });
        });
        setTeamInviteContext(
          selectedContacts?.length
            ? null
            : {
                job: saved,
                scheduleId: createdSchedule?.id || null,
                title: saved?.title || "새 현장",
                workDateStart: scheduleDate,
                workDateEnd: endDate,
              }
        );

        try {
          await useSettlementStore.getState().syncSchedulesToServer();
        } catch (syncError) {
          if (syncError?.status === 401 || syncError?.code === "SESSION_REQUIRED") {
            showAppToast?.("로그인이 완료되지 않았습니다");
            throw syncError;
          }
        }

        showAppToast?.(
          selectedContacts.length
            ? `현장 일정을 저장했습니다 · ${selectedContacts.length}명 배정`
            : "현장 일정을 저장했습니다"
        );
      } catch (error) {
        console.error("[useScheduleFieldOps] handleSubmitSiteEntry failed", error);
        throw error instanceof Error ? error : new Error("현장 일정 저장에 실패했습니다");
      }
    },
    [
      addScheduleFromJobMatch,
      addedContacts,
      composeCraftSeed,
      contactOverridesById,
      createJobPost,
      fallbackLocation,
      favoriteById,
      handleUpdateSiteEntry,
      inviteContactsToSchedule,
      memoById,
      myUserId,
      removedContactIds,
      showAppToast,
      updateSchedule,
    ]
  );

  const handleCreateFieldFromDraft = useCallback(
    async ({ draft, ocrText = "" }) => {
      const job = createFieldJobFromDraft({
        draft,
        selectedDateKey,
        fallbackLocation,
      });
      const persisted = await createJobPost(job);
      const scheduleDate = scheduleDateKeyFromWorkDate((persisted || job)?.workDate) || selectedDateKey;
      const saved = persisted || job;
      const endDate = scheduleDateKeyFromWorkDate(saved?.workEndDate || saved?.endDate) || scheduleDate;
      const createdSchedule = addScheduleFromJobMatch(saved, {
        workDate: scheduleDate,
        endDate,
        durationDays: saved?.durationDays || 1,
        source: "calendar-map-item-registration",
        briefingId: `briefing-sched-pending-${saved?.id || Date.now()}`,
        calendarColor: draft?.calendarColor,
      });
      if (createdSchedule?.id) {
        updateSchedule?.(createdSchedule.id, {
          briefingId: resolveScheduleBriefingId(createdSchedule),
        });
      }
      getScheduleMemoryKeys(createdSchedule || job, persisted || job).forEach((key) => {
        saveFieldVisitMemory(key, createVisitMemoryFromSchedule(createdSchedule || job, persisted || job));
        saveFieldTimelineEvent(key, {
          type: "field_created",
          tone: "start",
          icon: "시작",
          text: "현장 일정 생성",
          detail: (persisted || job)?.title || "",
          source: "schedule_registration",
        });
      });
      recordSiteMemoryFromRegistration({
        userId: myUserId,
        draft,
        schedule: createdSchedule,
        job: saved,
        ocrText,
      });
      setTeamInviteContext({
        job: saved,
        scheduleId: createdSchedule?.id || null,
        title: saved?.title || "새 현장",
        workDateStart: scheduleDate,
        workDateEnd: endDate,
      });
      showAppToast?.("현장 일정을 저장했습니다 · 팀원을 불러보세요");
      return persisted || job;
    },
    [addScheduleFromJobMatch, createJobPost, fallbackLocation, myUserId, selectedDateKey, showAppToast, updateSchedule]
  );

  const handleSubmitMapItem = useCallback(
    (item) => {
      const anchorSchedule = fieldOnDay[0] || null;
      const created = addMapItemDraft({
        ...item,
        scheduleDate: selectedDateKey,
        relatedScheduleId: anchorSchedule?.id,
        relatedFieldId: anchorSchedule?.jobId,
        source: {
          ...(item.source || {}),
          relatedScheduleId: anchorSchedule?.id,
          relatedFieldId: anchorSchedule?.jobId,
        },
      });
      if (anchorSchedule) {
        const sourceJob = anchorSchedule?.jobId != null ? jobById.get(String(anchorSchedule.jobId)) : null;
        getScheduleMemoryKeys(anchorSchedule, sourceJob).forEach((key) => {
          saveFieldMemoryItem(key, created);
          saveFieldTimelineEvent(key, {
            type: created.type === "sos" ? "sos" : "map_memo",
            tone: created.type === "sos" ? "urgent" : "memory",
            icon: created.type === "sos" ? "SOS" : "메모",
            text: `${MAP_ITEM_TYPE_LABEL[created.type] || "현장 메모"} 추가`,
            detail: created.title || "",
            source: "life_map",
          });
        });
      }
      showAppToast?.(`${MAP_ITEM_TYPE_LABEL[created.type] || "현장 정보"}를 일정에 등록했습니다`);
      return created;
    },
    [addMapItemDraft, fieldOnDay, jobById, selectedDateKey, showAppToast]
  );

  return {
    profile,
    showAppToast,
    fieldOnDay,
    dayEntries,
    composerOpen,
    composerInitial,
    closeComposer,
    openPersonalComposer,
    handleSubmitPersonalEntry,
    handleBulkPersonalEntries,
    handleSubmitSiteEntry,
    quickImportOpen,
    setQuickImportOpen,
    composeCrewSeed,
    setComposeCrewSeed,
    composeCraftSeed,
    setComposeCraftSeed,
    syncOpen,
    setSyncOpen,
    teamInviteContext,
    setTeamInviteContext,
    detailEntry,
    openEntryDetail,
    closeEntryDetail,
    openEntryEdit,
    openEntryCopy,
    handleDeleteEntry,
    editSchedule,
    setEditSchedule,
    changeSchedule,
    setChangeSchedule,
    openFieldScheduleComposer,
    handleMoveScheduleToDate,
    navigateToFieldDetail,
    openScheduleFromCalendar,
    saveScheduleForm,
    addressOptions,
    handleCreateFieldFromDraft,
    handleSubmitMapItem,
    formatSelectedLabel: () => formatScheduleDayLabel(selectedDateKey),
  };
}
