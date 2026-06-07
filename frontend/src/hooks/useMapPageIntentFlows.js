import { useCallback } from "react";
import { guardMemberAction } from "./useRequireAuth";
import { useUserStore } from "../store/useUserStore";
import useMapSearchActions from "./useMapSearchActions";
import useMapSelectionActions from "./useMapSelectionActions";
import { resolveViewerApplicantUserId } from "../utils/jobOwnership";
import {
  buildFieldJobTitle,
  CRAFT_LABEL,
  canApplyToJob,
  getCurrentWorkingCount,
  getTodayAttendanceCount,
  getWorkerStage,
  JOB_STATUS,
  migrateJob,
  WORKER_STAGE,
} from "../utils/jobModel";
import { distanceKmBetween } from "../utils/geoDistance";
import {
  getGeolocationErrorMessage,
  isKakaoInAppBrowser,
  MAP_GEOLOCATION_OPTIONS,
  MAP_MY_LOCATION_LEVEL,
} from "../utils/mapGeolocation";

function openLoginPromptUnlessAuthed(reason) {
  return guardMemberAction(reason);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function useMapPageIntentFlows({
  navigate,
  isReady,
  kakao,
  map,
  locating,
  setLocating,
  markerClickAtRef,
  myLocationMarkerRef,
  setUserLocation,
  openRoomForJob,
  openRoomForConsumerRequest,
  addRequest,
  markRequestQuoted,
  supportEstimateRequest,
  rememberRecentSearch,
  searchQuery,
  setSearchQuery,
  sheetDispatch,
  setJobBoardFilter,
  setSearchCraftFilter,
  setSearchTradeFilter,
  setSearchWorkFilter,
  setSearchDistanceKm,
  setCalendarOpen,
  setSelectedJobId,
  setApplyCompleteState,
  setRecentSearches,
  toggleJobBookmark,
  toggleJobPreparationChecklist,
  applyToJob,
  confirmJobApplicant,
  rejectJobApplicant,
  createJobPost,
  setPrefs,
  selectedDateKey,
  prefs,
  mapCenterOption,
  mapOption,
  refreshListTime,
  showLocationToast,
  setJobs,
  promoteJobToUrgent,
  detailJobId,
  openJobListPanel,
}) {
  const {
    handleSubmitSearch,
    handlePickSuggestedSearch,
    handleOpenSearchPanel,
    handleOpenFilterSheet,
    handleCloseSearchPanel,
    handleResetSearchFilters,
    handleClearRecentSearches,
  } = useMapSearchActions({
    rememberRecentSearch,
    searchQuery,
    setSearchQuery,
    setRecentSearches,
    setSearchCraftFilter,
    setSearchTradeFilter,
    setSearchWorkFilter,
    setSearchDistanceKm,
    sheetDispatch,
  });

  const { panMapToJob, activateJobFromList, handleMarkerClick } = useMapSelectionActions({
    isReady,
    kakao,
    map,
    markerClickAtRef,
    setSelectedJobId,
    sheetDispatch,
    rememberRecentSearch,
    searchQuery,
  });

  const handleOpenCalendar = useCallback(() => {
    setCalendarOpen(true);
  }, [setCalendarOpen]);

  const handleOpenMapPrefs = useCallback(() => {
    navigate("/map", { state: { fabMenu: "filter" } });
  }, [navigate]);

  const handleOpenMyPage = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  const handleOpenBriefingPage = useCallback(() => {
    navigate("/schedule", { state: { focusMarketBriefing: true } });
  }, [navigate]);

  const handleSelectBoardFilter = useCallback(
    (key) => {
      setJobBoardFilter(key);
    },
    [setJobBoardFilter]
  );

  const handleChatJob = useCallback(
    (job) => {
      if (!job?.id) return;
      const room = openRoomForJob(job, { kind: "chat" });
      if (!room?.id) return;
      setApplyCompleteState(null);
      navigate(`/chat/${room.id}`);
    },
    [navigate, openRoomForJob, setApplyCompleteState]
  );

  const handleCreateConsumerRequest = useCallback(
    (payload) => {
      if (!openLoginPromptUnlessAuthed("consumer")) return null;
      const created = addRequest(payload);
      showLocationToast("시공 요청을 등록했습니다.");
      return created;
    },
    [addRequest, showLocationToast]
  );

  const handleQuoteConsumerRequest = useCallback(
    (request) => {
      if (!request?.id) return;
      const nextRequest = markRequestQuoted(request.id) || { ...request, status: "quoted" };
      const room = openRoomForConsumerRequest(nextRequest);
      if (!room?.id) return;
      navigate(`/chat/${room.id}`);
    },
    [markRequestQuoted, navigate, openRoomForConsumerRequest]
  );

  const handleSupportEstimate = useCallback(
    (request) => {
      if (!request?.id) return;
      if (!openLoginPromptUnlessAuthed("post")) return;
      const { session, profile } = useUserStore.getState();
      const userId = session?.user?.id || profile?.id || "demo-oyaji";
      const name = session?.user?.nickname || profile?.name || "오야지";
      const updated = supportEstimateRequest?.(request.id, { userId, name });
      if (!updated) {
        showLocationToast("견적 지원을 처리하지 못했어요.");
        return;
      }
      showLocationToast("견적 응답이 접수되었습니다.");
      return updated;
    },
    [showLocationToast, supportEstimateRequest]
  );

  const handleToggleBookmark = useCallback(
    (job) => {
      if (!job?.id) return;
      const nextBookmarked = toggleJobBookmark(job.id);
      showLocationToast(nextBookmarked ? "찜한 현장에 추가했습니다." : "찜을 해제했습니다.");
    },
    [showLocationToast, toggleJobBookmark]
  );

  const handleToggleJobPreparationChecklist = useCallback(
    (job, checklistId) => {
      if (!job?.id || !checklistId) return;
      toggleJobPreparationChecklist(job.id, checklistId);
    },
    [toggleJobPreparationChecklist]
  );

  const handleMoveToMyLocation = useCallback(() => {
    if (locating) return;

    const kakaoInApp = isKakaoInAppBrowser();

    if (!isReady || !kakao || !map) {
      showLocationToast("지도를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (kakaoInApp) {
        showLocationToast("카카오톡에서는 위치 기능이 제한될 수 있어요. Chrome 또는 Safari에서 열어주세요.");
      } else {
        showLocationToast("이 브라우저에서는 위치 기능을 사용할 수 없어요.");
      }
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      showLocationToast("HTTPS 연결에서만 위치를 사용할 수 있어요.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position?.coords?.latitude;
        const lng = position?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setLocating(false);
          showLocationToast("현재 위치를 찾지 못했어요.");
          return;
        }

        const latLng = new kakao.maps.LatLng(lat, lng);

        try {
          map.setCenter(latLng);
          map.setLevel(MAP_MY_LOCATION_LEVEL);
          if (typeof map.relayout === "function") map.relayout();
        } catch (_) {
          map.panTo(latLng);
        }

        if (!myLocationMarkerRef.current) {
          myLocationMarkerRef.current = new kakao.maps.Marker({ map, position: latLng, zIndex: 120 });
        } else {
          myLocationMarkerRef.current.setPosition(latLng);
          myLocationMarkerRef.current.setMap(map);
        }

        setUserLocation?.({ lat, lng });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        showLocationToast(getGeolocationErrorMessage(error, { kakaoInApp }));
      },
      MAP_GEOLOCATION_OPTIONS
    );
  }, [isReady, kakao, locating, map, myLocationMarkerRef, setLocating, setUserLocation, showLocationToast]);

  const handleConfirmApplyJob = useCallback(
    async (job) => {
      if (!openLoginPromptUnlessAuthed("apply")) return;
      if (!job || job.id == null || !canApplyToJob(job, resolveViewerApplicantUserId(useUserStore.getState()))) return;
      try {
        const result = await applyToJob(job.id);
        const updatedJob = result?.job || job;
        setSelectedJobId(updatedJob.id);
        sheetDispatch({ type: "SHEET_CLOSE_JOB_DETAIL" });
        const room = openRoomForJob(updatedJob, { kind: "apply" });
        setApplyCompleteState({ job: updatedJob, roomId: room?.id || null });
        if (result?.autoClosed) {
          showLocationToast("긴급헬프 인원을 확보해 자동 마감했습니다.");
        }
      } catch (error) {
        showLocationToast(error?.message || "참여 요청 처리 중 오류가 발생했습니다.");
      }
    },
    [applyToJob, openRoomForJob, setApplyCompleteState, sheetDispatch, setSelectedJobId, showLocationToast]
  );

  const handleApplyJob = useCallback(
    (job) => {
      handleConfirmApplyJob(job);
    },
    [handleConfirmApplyJob]
  );

  const handleConfirmApplicant = useCallback(
    async (jobId, applicantId) => {
      if (!openLoginPromptUnlessAuthed("applicants")) return;
      try {
        await confirmJobApplicant(jobId, applicantId);
      } catch (error) {
        showLocationToast(error?.message || "승인 처리에 실패했습니다.");
      }
    },
    [confirmJobApplicant, showLocationToast]
  );

  const handleRejectApplicant = useCallback(
    async (jobId, applicantId) => {
      if (!openLoginPromptUnlessAuthed("applicants")) return;
      try {
        await rejectJobApplicant(jobId, applicantId);
      } catch (error) {
        showLocationToast(error?.message || "거절 처리에 실패했습니다.");
      }
    },
    [rejectJobApplicant, showLocationToast]
  );

  const handleCreateJob = useCallback(
    async ({ draft }) => {
      if (!openLoginPromptUnlessAuthed("post")) return undefined;
      const nextDraft = draft || {};
      const picked =
        nextDraft.location && (nextDraft.location.fullAddress || nextDraft.location.shortRegion)
          ? nextDraft.location
          : mapCenterOption;
      const rawLat = Number(picked?.lat);
      const rawLng = Number(picked?.lng);
      const fallbackLat = mapCenterOption?.lat ?? mapOption.center.lat;
      const fallbackLng = mapCenterOption?.lng ?? mapOption.center.lng;
      const lat = Number.isFinite(rawLat) ? rawLat : fallbackLat;
      const lng = Number.isFinite(rawLng) ? rawLng : fallbackLng;
      const modeKey = nextDraft.mode || "post";
      const isHelp = modeKey === "help";
      const isUrgent = modeKey === "urgent" || isHelp;
      const shortRegion = picked?.shortRegion || prefs.regionLabel;
      const fullAddress = picked?.fullAddress || shortRegion;
      const siteKind = String(picked?.siteKind || "").trim() || "상가";
      const workDate = nextDraft.workDate || selectedDateKey || toDateKey(new Date());
      const workType = isHelp ? "shortHelp" : "fullDay";
      const workTime =
        nextDraft.workTime || (isHelp ? "13:00~17:00" : isUrgent ? "07:00~17:00" : "08:00~17:00");
      const payTerms = nextDraft.details?.payTerms || (isHelp || isUrgent ? "당일지급" : "협의");
      const craft = nextDraft.craft || "wallpaper";
      const trade = nextDraft.trade || "조공";
      const crewCount = Number(nextDraft.details?.crewCount);
      const helpDurationMinutes = getTimeRangeDurationMinutes(workTime);
      const craftLabel = CRAFT_LABEL[craft] || "현장";
      const title =
        nextDraft.title ||
        buildFieldJobTitle({
          shortRegion,
          shortAddress: shortRegion,
          address: fullAddress,
          siteKind,
          craft,
          trade,
        });
      const helpTitle = `${shortRegion.split(" ").slice(-1)[0] || shortRegion} ${siteKind} ${craftLabel} 보조 급구`;
      const distanceKm =
        Number.isFinite(Number(picked?.distanceKm)) && Number(picked.distanceKm) >= 0
          ? Number(picked.distanceKm)
          : distanceKmBetween(mapCenterOption?.lat, mapCenterOption?.lng, lat, lng) ?? 0.1;

      const createdJob = migrateJob({
        id: Date.now(),
        title,
        trade,
        craft,
        siteKind,
        date: workDate,
        workDate,
        lat,
        lng,
        pay: `${Number(nextDraft.payAmount || 0).toLocaleString()}원`,
        status: JOB_STATUS.RECRUITING,
        isUrgent,
        workType,
        workTime,
        distanceKm: Math.max(0.1, distanceKm),
        address: shortRegion,
        addressDetail: shortRegion,
        shortRegion,
        shortAddress: shortRegion,
        fullAddress: shortRegion,
        privateFields: {
          contactPhone: nextDraft.details?.contactPhone || "",
          fullAddress,
          accessPassword: nextDraft.details?.accessPassword || "",
          navigationLink: "",
          lat,
          lng,
        },
        visibility: {
          phone: "approved_only",
          addressDetail: "approved_only",
          accessInfo: "approved_only",
          exactLocation: "approved_only",
        },
        payTerms,
        postedAt: new Date().toISOString(),
        beginnerOk: trade === "조공" || trade === "준기공",
        longTerm: false,
        memo: nextDraft.details?.description || (isHelp ? "근처에서 바로 와주실 분 찾습니다." : undefined),
        description:
          nextDraft.details?.description ||
          (isUrgent
            ? "오늘 바로 투입 가능한 기사님 우선 연락 부탁드립니다."
            : isHelp
              ? "짧은 헬프 요청으로 빠르게 등록했습니다."
              : "지도에서 빠르게 등록한 현장입니다."),
        accessPassword: "",
        parkingNote: nextDraft.details?.parkingNote || "",
        requiredItems: nextDraft.details?.requiredItems || "",
        mealNote: nextDraft.details?.mealNote || "",
        specialNote: nextDraft.details?.specialNote || "",
        materialNote: nextDraft.details?.materialNote || "",
        contactPhone: nextDraft.details?.contactPhone
          ? nextDraft.details.contactPhone.replace(/\d(?=\d{4})/g, "*")
          : "",
        ocrSourceKind: nextDraft.source?.kind || "manual",
        ocrStatus: nextDraft.source?.ocrStatus || "idle",
        ocrAttachmentName: nextDraft.source?.attachmentName || "",
        extractedFields: nextDraft.extracted || null,
        liveHelp: isHelp,
        helpTime: isHelp ? workTime : "",
        helpTitle: isHelp ? helpTitle : "",
        helpDescription: isHelp ? nextDraft.details?.description || "2~3시간 보조 가능하신분" : "",
        helpDurationMinutes: isHelp ? helpDurationMinutes : 0,
        helpExpiresAt: isHelp ? new Date(Date.now() + 60 * 60000).toISOString() : "",
        helpAtmosphere: isHelp ? `${siteKind} 현장에서 지금 바로 손이 부족한 상태입니다.` : "",
        crewCount: Number.isFinite(crewCount) && crewCount > 0 ? Math.round(crewCount) : 1,
        participants: [],
        briefing: [],
        alerts: [],
      });
      try {
        const persistedJob = await createJobPost(createdJob);
        if (prefs.craft != null && prefs.craft !== craft) setPrefs({ craft });
        if (prefs.trade !== "전체" && prefs.trade !== trade) setPrefs({ trade });
        setSelectedJobId(persistedJob.id);
        sheetDispatch({ type: "SHEET_CLEAR_DETAIL_AND_APPLICANTS" });
        panMapToJob(persistedJob);
        refreshListTime();
        openJobListPanel?.();
        return persistedJob;
      } catch (error) {
        showLocationToast(error?.message || "현장 등록 중 오류가 발생했습니다.");
        throw error;
      }
    },
    [
      createJobPost,
      mapCenterOption,
      mapOption.center.lat,
      mapOption.center.lng,
      panMapToJob,
      prefs.craft,
      prefs.regionLabel,
      prefs.trade,
      refreshListTime,
      selectedDateKey,
      sheetDispatch,
      setPrefs,
      setSelectedJobId,
      showLocationToast,
      openJobListPanel,
    ]
  );

  const handleWorkerStageChange = useCallback(
    (job, nextStage) => {
      if (!job?.id || !Object.values(WORKER_STAGE).includes(nextStage) || nextStage === WORKER_STAGE.NONE) return;
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          if (!item || item.id !== job.id) return item;
          const attendanceCount = getTodayAttendanceCount(item);
          const currentWorking = getCurrentWorkingCount(item);
          const prevStage = getWorkerStage(item);
          let activeWorkersCount = currentWorking;
          if (nextStage === WORKER_STAGE.DEPARTED) {
            activeWorkersCount = prevStage === WORKER_STAGE.ARRIVED ? Math.max(0, currentWorking - 1) : currentWorking;
          }
          if (nextStage === WORKER_STAGE.ARRIVED && prevStage !== WORKER_STAGE.ARRIVED) {
            activeWorkersCount = Math.min(attendanceCount, Math.max(1, currentWorking + 1));
          }
          if (nextStage === WORKER_STAGE.DONE) {
            activeWorkersCount = Math.max(0, currentWorking - 1);
          }
          return { ...item, workerStage: nextStage, activeWorkersCount };
        })
      );
      if (nextStage === WORKER_STAGE.DEPARTED) showLocationToast("출발 상태로 변경했습니다.");
      if (nextStage === WORKER_STAGE.ARRIVED) showLocationToast("도착 상태로 변경했습니다.");
      if (nextStage === WORKER_STAGE.DONE) showLocationToast("작업완료로 변경했습니다.");
    },
    [setJobs, showLocationToast]
  );

  const handlePromoteUrgentJob = useCallback(
    (job) => {
      if (!job?.id) return;
      promoteJobToUrgent(job.id);
    },
    [promoteJobToUrgent]
  );

  const handleShowApplicants = useCallback(() => {
    if (!openLoginPromptUnlessAuthed("applicants")) return;
    if (detailJobId == null) return;
    sheetDispatch({ type: "SHEET_OPEN_APPLICANTS", jobId: detailJobId });
  }, [detailJobId, sheetDispatch]);

  return {
    handleSubmitSearch,
    handlePickSuggestedSearch,
    handleOpenSearchPanel,
    handleOpenFilterSheet,
    handleCloseSearchPanel,
    handleResetSearchFilters,
    handleClearRecentSearches,
    handleOpenCalendar,
    handleOpenMapPrefs,
    handleOpenMyPage,
    handleOpenBriefingPage,
    handleSelectBoardFilter,
    activateJobFromList,
    handleMarkerClick,
    handleChatJob,
    handleCreateConsumerRequest,
    handleQuoteConsumerRequest,
    handleSupportEstimate,
    handleToggleBookmark,
    handleToggleJobPreparationChecklist,
    handleMoveToMyLocation,
    handleApplyJob,
    handleConfirmApplicant,
    handleRejectApplicant,
    handleCreateJob,
    handleWorkerStageChange,
    handlePromoteUrgentJob,
    handleShowApplicants,
  };
}

function getTimeRangeDurationMinutes(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
  if (!match) return 180;
  const [, sh, sm, eh, em] = match;
  const start = Number(sh) * 60 + Number(sm);
  const end = Number(eh) * 60 + Number(em);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 180;
  return end - start;
}
