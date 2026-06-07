import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/geo-map-mobile.css";
import "../styles/geo-map-market.css";
import "../styles/map-touch-passthrough.css";
import "../styles/map-overlay-passthrough.css";
import "../styles/schedule-page-mobile.css";
import useKakaoMap from "../hooks/useKakaoMap";
import { useViewerApplicantUserId } from "../hooks/useJobOwnership";
import useMapChromeData from "../hooks/useMapChromeData";
import useMapViewportData from "../hooks/useMapViewportData";
import useMapPageIntentFlows from "../hooks/useMapPageIntentFlows";
import { enrichPlacesWithDistance } from "../hooks/usePlaceDistance";
import { PLACE_SORT_DISTANCE, isPlaceOverlayEligible, sortPlaces } from "../utils/placeDistance";
import { MAP_ACTIVE_PANEL } from "../constants/mapActivePanel";
import {
  useKakaoMapSelectionReset,
  useKakaoMapViewportSync,
  useMapTransientCleanup,
  useSelectedJobSheetSync,
  useVisualViewportMapRelayout,
} from "../hooks/useMapPageMapEffects";
import {
  useMapPageFabRouteStateFlow,
  useMapPageListRefreshSignal,
  useMapPageLocationToast,
  useMapPageOverlayFlowState,
} from "../hooks/useMapPageUiFlows";
import useMapSheetController from "../hooks/useMapSheetController";
import useMapKakaoPassthrough from "../hooks/useMapKakaoPassthrough";
import MapCanvas from "../components/MapCanvas";
import useJobMarkers from "../hooks/useJobMarkers";
import useEstimateMarkers from "../hooks/useEstimateMarkers";
import useMapItemMarkers from "../hooks/useMapItemMarkers";
import MapSearchMarkerPin from "../components/map/MapSearchMarkerPin";
import useJobMapClusterer from "../hooks/useJobMapClusterer";
import MapFloatingChrome from "../components/map/MapFloatingChrome";
import MapSelectionOverlaySection from "../components/map/MapSelectionOverlaySection";
import MapTopBar from "../components/map/MapTopBar";
import MapLayerChips, { MAP_LAYER_MVP_CATEGORIES } from "../components/map/MapLayerChips";
import MapPlaceOverlay from "../components/map/MapPlaceOverlay";
import MapPlaceTools from "../components/map/MapPlaceTools";
import MapNotificationOverlay from "../components/map/MapNotificationOverlay";
import useMapQuickAddDismiss from "../hooks/useMapQuickAddDismiss";
import MapOperationContextCard from "../components/map/MapOperationContextCard";
import MapFloatingActionLayer from "../components/map/MapFloatingActionLayer";
import MapSearchPanel from "../components/map/MapSearchPanel";
import "../components/map/map-search-panel-card.css";
import MapSearchDraftSheet from "../components/map/MapSearchDraftSheet";
import MapSearchMarkerInfo from "../components/map/MapSearchMarkerInfo";
import FieldFlowStrip from "../components/field/FieldFlowStrip";
import MapWriteMenuSheet from "../components/map/MapWriteMenuSheet";
import ConsumerRequestComposerModal from "../components/consumer/ConsumerRequestComposerModal";
import ApplicantsSheet from "../components/map/ApplicantsSheet";
import { useChat } from "../context/ChatContext";
import { useConsumerRequests } from "../context/ConsumerRequestContext";
import { useJobs } from "../context/JobsContext";
import { useSchedules } from "../context/ScheduleContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useJobStore } from "../store/useJobStore";
import { useFieldExperienceStore } from "../store/useFieldExperienceStore";
import { useFieldCheckInStore } from "../store/useFieldCheckInStore";
import { useMapLayerStore } from "../store/useMapLayerStore";
import { useMapItemStore } from "../store/useMapItemStore";
import { useUiStore } from "../store/useUiStore";
import { deriveViewerJobState } from "../utils/jobModel";
import {
  buildEstimatesOverlaySignature,
  buildJobsOverlaySignature,
  resolveMapOverlayDensity,
} from "../utils/mapOverlaySignature";
import { deriveFieldFlowEvents } from "../utils/fieldFlowModel";
import { useNotifications } from "../context/NotificationContext";
import { useUserMapPreferences } from "../context/UserMapPreferencesContext";
import {
  DEFAULT_EXPERIENCE_MAP_LAYERS,
  DEFAULT_LIFE_MAP_LAYERS,
  MAP_ITEM_TYPE,
  MAP_ITEM_TYPE_LABEL,
} from "../constants/mapItemTypes";
import { guardMemberAction } from "../hooks/useRequireAuth";
import { createMapItemFromLifeInfo, filterMapItemsByLayers, findMapItemBySource, getMapItemKey } from "../utils/mapItemModel";
import { filterLifeInfoItemsByMapContext } from "../utils/mapItemVisibility";
import { getDisplayNickname } from "../utils/displayNickname";
import { appendChangeHistory, getPlaceInfoKey } from "../utils/placeInfoCard";
import { useUserStore } from "../store/useUserStore";
import { applyViewerLocationToJob } from "../utils/jobPrivacyPolicy";
import { getCompletionExperiencePrompts } from "../utils/fieldExperienceModel";
import { buildExperienceContextSummary, buildFieldTimeline, summarizeRecentCheckIns } from "../utils/fieldCheckInModel";
import { getFieldProfileFamilyKey, getFieldProfileKey } from "../utils/fieldHistoryModel";
import {
  fieldMemorySiteKeyFromAddress,
  fieldMemorySiteKeyFromJobId,
  loadFieldMemoryRecord,
  saveFieldTimelineEvent,
  saveFieldVisitMemory,
} from "../utils/fieldMemoryStorage";
import { createFieldJobFromDraft } from "../utils/fieldJobDraftAdapter";
import { scheduleDateKeyFromWorkDate } from "../utils/fieldScheduleModel";
import { useSettlementStore } from "../store/useSettlementStore";
import { getScheduleDurationDays } from "../utils/scheduleModel";
import { searchKakaoPlaces } from "../utils/mapPlaceSearch";
import { reverseGeocodeLatLngDetailed } from "../utils/mapReverseGeocode";
import {
  installMapPinchTouchDebug,
  isMapMinimalUiEnabled,
  isMapTouchDebugEnabled,
  logMapDraggableState,
  logPointerHitTarget,
} from "../utils/mapTouchDiagnostics";

const LazyJobPostComposerModal = lazy(() => import("../components/map/JobPostComposerModal"));
const LazyQuickSiteImportSheet = lazy(() => import("../components/map/QuickSiteImportSheet"));
const LazyFieldTeamRecommendSheet = lazy(() => import("../components/map/FieldTeamRecommendSheet"));
const LazyMapExperienceQuickSaveSheet = lazy(() => import("../components/map/MapExperienceQuickSaveSheet"));
const LazyFieldShareSheet = lazy(() => import("../components/field/FieldShareSheet"));

const SEARCH_BAR_PLACEHOLDER = "주소 · 아파트 · 식당 검색";
const SEARCH_CRAFT_FILTERS = [
  { key: null, label: "전체" },
  { key: "film", label: "필름" },
  { key: "tile", label: "타일" },
  { key: "wallpaper", label: "도배" },
  { key: "electric", label: "전기" },
];
const SEARCH_TRADE_FILTERS = [
  { key: null, label: "전체" },
  { key: "조공", label: "조공" },
  { key: "준기공", label: "준기공" },
  { key: "기공", label: "기공" },
];
const SEARCH_WORK_FILTERS = [
  { key: null, label: "전체" },
  { key: "night", label: "야간" },
  { key: "urgent", label: "긴급" },
  { key: "long", label: "장기" },
  { key: "half", label: "반일" },
];
const SEARCH_DISTANCE_FILTERS = [
  { key: null, label: "전체" },
  { key: 1, label: "1km" },
  { key: 3, label: "3km" },
  { key: 5, label: "5km" },
];

function formatMapDateLabel(dateKey) {
  if (!dateKey) return "";
  const [, m, d] = String(dateKey).split("-").map(Number);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (dateKey === todayKey) return "오늘";
  if (Number.isFinite(m) && Number.isFinite(d)) return `${m}월 ${d}일`;
  return dateKey;
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

function getMapFieldMemoryKey(fieldItem) {
  try {
    if (!fieldItem) return "";
    return getFieldProfileKey(fieldItem?.source || fieldItem) || "";
  } catch (_) {
    return "";
  }
}

function getMapFieldMemoryKeys(fieldItem) {
  try {
    if (!fieldItem) return [];
    const seed = fieldItem?.source || fieldItem;
    return [getFieldProfileKey(seed), getFieldProfileFamilyKey(seed)].filter(Boolean);
  } catch (_) {
    return [];
  }
}
const DEFAULT_EXPERIENCE_LAYER_SET = new Set(DEFAULT_EXPERIENCE_MAP_LAYERS);
const QUICK_ADD_TYPE_BY_ACTION = {
  apartment_save: MAP_ITEM_TYPE.ACCESS_INFO,
  restroom_save: MAP_ITEM_TYPE.RESTROOM,
  meeting_place_save: MAP_ITEM_TYPE.MEETING_PLACE,
  parking_save: MAP_ITEM_TYPE.PARKING,
  restaurant_save: MAP_ITEM_TYPE.RESTAURANT,
};

// 오야지(40~60대) 단순화: 지도가 주인공이 되도록 부가 UI는 기본 숨김(코드는 유지, 플래그만 끔).
const SHOW_MAP_FIELD_FLOW_STRIP = false; // 상단 "주변 현장 소식" 스트립
const SHOW_MAP_OPERATION_CONTEXT_CARD = false; // 마커 선택 시 체크인/타임라인/경험 카드

export default function MapPage() {
  const mapRef = useRef(null);
  const geoStageRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const mapChipAnchorRef = useRef(null);
  const sheetListRef = useRef(null);
  const markerClickAtRef = useRef(0);
  const centerGeocodeTimerRef = useRef(null);
  const centerGeocodeSeqRef = useRef(0);
  const tempSearchItemRef = useRef(null);
  const myLocationMarkerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const sessionUser = useUserStore((state) => state.session?.user);
  const { prefs, setPrefs } = useUserMapPreferences();
  const { jobs, setJobs, loading: jobsLoading, error: jobsError } = useJobs();
  const { briefingData } = useSchedules();
  const applyToJob = useJobStore((state) => state.applyToJob);
  const createJobPost = useJobStore((state) => state.createJobPost);
  const addScheduleFromJobMatch = useSettlementStore((state) => state.addScheduleFromJobMatch);
  const toggleJobBookmark = useJobStore((state) => state.toggleJobBookmark);
  const toggleJobPreparationChecklist = useJobStore((state) => state.toggleJobPreparationChecklist);
  const promoteJobToUrgent = useJobStore((state) => state.promoteJobToUrgent);
  const confirmJobApplicant = useJobStore((state) => state.confirmJobApplicant);
  const rejectJobApplicant = useJobStore((state) => state.rejectJobApplicant);
  const selectedJobId = useJobStore((state) => state.selectedJobId);
  const setSelectedJobId = useJobStore((state) => state.setSelectedJobId);
  const selectedDateKey = useJobStore((state) => state.filters.selectedDateKey);
  const setSelectedDateKey = useJobStore((state) => state.setSelectedDateKey);
  const jobBoardFilter = useJobStore((state) => state.filters.jobBoardFilter);
  const setJobBoardFilter = useJobStore((state) => state.setJobBoardFilter);
  const searchQuery = useJobStore((state) => state.filters.searchQuery);
  const setSearchQuery = useJobStore((state) => state.setSearchQuery);
  const searchCraftFilter = useJobStore((state) => state.filters.searchCraftFilter);
  const setSearchCraftFilter = useJobStore((state) => state.setSearchCraftFilter);
  const searchTradeFilter = useJobStore((state) => state.filters.searchTradeFilter);
  const setSearchTradeFilter = useJobStore((state) => state.setSearchTradeFilter);
  const searchWorkFilter = useJobStore((state) => state.filters.searchWorkFilter);
  const setSearchWorkFilter = useJobStore((state) => state.setSearchWorkFilter);
  const searchDistanceKm = useJobStore((state) => state.filters.searchDistanceKm);
  const setSearchDistanceKm = useJobStore((state) => state.setSearchDistanceKm);
  const recentSearches = useJobStore((state) => state.filters.recentSearches);
  const setRecentSearches = useJobStore((state) => state.setRecentSearches);
  const rememberRecentSearch = useJobStore((state) => state.rememberRecentSearch);
  const zoomFar = useUiStore((state) => state.mapZoomFar);
  const setZoomFar = useUiStore((state) => state.setMapZoomFar);
  const mapLevel = useUiStore((state) => state.mapLevel);
  const setMapLevel = useUiStore((state) => state.setMapLevel);
  const { requests, addRequest, markRequestQuoted, supportEstimateRequest } = useConsumerRequests();
  const { openRoomForJob, openRoomForConsumerRequest } = useChat();
  const {
    sheetDispatch,
    detailJobId,
    applicantsSheetJobId,
    postComposerMode,
    consumerComposerOpen,
    searchPanelOpen,
    filterSheetOpen,
    setDetailJobId,
    setApplicantsSheetJobId,
    setPostComposerMode,
    setConsumerComposerOpen,
    setFilterSheetOpen,
  } = useMapSheetController();
  const [selectedEstimateId, setSelectedEstimateId] = useState(null);
  const [writeMenuOpen, setWriteMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fieldImportOpen, setFieldImportOpen] = useState(false);
  const [fieldImportResume, setFieldImportResume] = useState(null);
  const [teamInviteContext, setTeamInviteContext] = useState(null);
  const [experienceSaveContext, setExperienceSaveContext] = useState(null);
  const [lifeInfoItem, setLifeInfoItem] = useState(null);
  const [tempSearchItem, setTempSearchItem] = useState(null);
  const [centerPinMoving, setCenterPinMoving] = useState(false);
  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const [searchMarkerInfoOpen, setSearchMarkerInfoOpen] = useState(false);
  const [shareField, setShareField] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [placeOverlayDetail, setPlaceOverlayDetail] = useState(null);
  const [placeListSortMode, setPlaceListSortMode] = useState(PLACE_SORT_DISTANCE);
  const [placeListFocusItem, setPlaceListFocusItem] = useState(null);
  const placeOverlayOpen =
    activePanel === MAP_ACTIVE_PANEL.LIST || activePanel === MAP_ACTIVE_PANEL.DETAIL;
  const placeOverlayMode = activePanel === MAP_ACTIVE_PANEL.DETAIL ? "detail" : "list";
  const activePlaceContextItem = placeOverlayDetail || lifeInfoItem;
  const [mapBounds, setMapBounds] = useState(null);
  const noopSheetExpand = useCallback(() => {}, []);
  const { setApplyCompleteState } = useMapPageOverlayFlowState();
  const { refreshListTime } = useMapPageListRefreshSignal();
  const { locationToast, showLocationToast, locationToastTimerRef } = useMapPageLocationToast();
  const hasTempSearchItem = Boolean(tempSearchItem);
  const placeRegisterOpen =
    activePanel === MAP_ACTIVE_PANEL.DRAFT_PIN &&
    Boolean(tempSearchItem && tempSearchItem.mode !== "field_location_pick");

  const closeMapActivePanel = useCallback(() => {
    setActivePanel(null);
    setTempSearchItem(null);
    setPlaceOverlayDetail(null);
    setPlaceListFocusItem(null);
    setLifeInfoItem(null);
  }, []);

  const openMapListPanel = useCallback(() => {
    setTempSearchItem(null);
    setPlaceOverlayDetail(null);
    setPlaceListFocusItem(null);
    setLifeInfoItem(null);
    setActivePanel(MAP_ACTIVE_PANEL.LIST);
  }, []);

  const openMapDraftPinPanel = useCallback((draft) => {
    if (!draft) return;
    setPlaceOverlayDetail(null);
    setPlaceListFocusItem(null);
    setLifeInfoItem(null);
    setTempSearchItem(draft);
    setActivePanel(draft.mode === "field_location_pick" ? null : MAP_ACTIVE_PANEL.DRAFT_PIN);
  }, []);

  const openMapDetailPanel = useCallback((detail, focusItem) => {
    setTempSearchItem(null);
    setPlaceOverlayDetail(detail);
    if (focusItem !== undefined) setPlaceListFocusItem(focusItem);
    setActivePanel(MAP_ACTIVE_PANEL.DETAIL);
  }, []);

  const backMapPanelToList = useCallback(() => {
    setPlaceOverlayDetail(null);
    setActivePanel(MAP_ACTIVE_PANEL.LIST);
  }, []);

  const mapOption = useMemo(
    () => ({
      center: { lat: 36.3504, lng: 127.3845 },
      level: 7,
    }),
    []
  );

  const { kakao, map, isReady } = useKakaoMap(mapRef, mapOption);
  const mapMinimalUi = isMapMinimalUiEnabled();
  const mapTouchDebug = isMapTouchDebugEnabled();
  useMapKakaoPassthrough(mapRef, isReady);

  useEffect(() => {
    if (!mapTouchDebug) return undefined;
    const root = mapCanvasRef.current || mapRef.current;
    return installMapPinchTouchDebug(root);
  }, [mapTouchDebug, isReady]);

  const ensureMapGestures = useCallback(() => {
    if (!map) return;
    if (typeof map.setDraggable === "function") map.setDraggable(true);
    if (typeof map.setZoomable === "function") map.setZoomable(true);
    if (typeof map.setScrollwheel === "function") map.setScrollwheel(true);
    if (mapTouchDebug) logMapDraggableState(map, "MapPage gestures");
  }, [map, mapTouchDebug]);

  useEffect(() => {
    ensureMapGestures();
  }, [activePanel, ensureMapGestures, placeOverlayMode, placeOverlayOpen]);

  useEffect(() => {
    if (activePanel === MAP_ACTIVE_PANEL.DRAFT_PIN && !tempSearchItem) {
      setActivePanel(null);
    }
    if (activePanel === MAP_ACTIVE_PANEL.DETAIL && !placeOverlayDetail) {
      setActivePanel(MAP_ACTIVE_PANEL.LIST);
    }
    if (activePanel === MAP_ACTIVE_PANEL.LIST && placeOverlayDetail) {
      setPlaceOverlayDetail(null);
    }
  }, [activePanel, placeOverlayDetail, tempSearchItem]);

  useEffect(() => {
    if (!mapTouchDebug) return;
    const onPointer = (event) => logPointerHitTarget(event, event.type);
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [mapTouchDebug]);
  const visibleLayers = useMapLayerStore((state) => state.visibleLayers);


  const toggleCategoryLayers = useMapLayerStore((state) => state.toggleCategoryLayers);
  const setLayerVisible = useMapLayerStore((state) => state.setLayerVisible);
  const setLayersVisible = useMapLayerStore((state) => state.setLayersVisible);
  const customLifeItems = useMapItemStore((state) => state.items);
  const addMapItemDraft = useMapItemStore((state) => state.addMapItemDraft);
  const experienceRecords = useFieldExperienceStore((state) => state.records);
  const quickSaveExperience = useFieldExperienceStore((state) => state.quickSaveExperience);
  const checkInRecords = useFieldCheckInStore((state) => state.records);
  const checkInField = useFieldCheckInStore((state) => state.checkIn);
  const checkOutField = useFieldCheckInStore((state) => state.checkOut);
  const attachExperienceToCheckIn = useFieldCheckInStore((state) => state.attachExperienceToCheckIn);
  const markerMode = "ops";
  const overlayDensity = useMemo(() => resolveMapOverlayDensity(mapLevel), [mapLevel]);
  const showAppToast = useUiStore((state) => state.showAppToast);

  const applicantsSheetResolved = useMemo(
    () =>
      applicantsSheetJobId == null
        ? null
        : jobs.find((job) => job && job.id === applicantsSheetJobId) || null,
    [applicantsSheetJobId, jobs]
  );
  const viewerApplicantUserId = useViewerApplicantUserId();
  const applicantsSheetCanManage = useMemo(() => {
    if (!applicantsSheetResolved) return false;
    return deriveViewerJobState(applicantsSheetResolved, viewerApplicantUserId).canApproveApplicants;
  }, [applicantsSheetResolved, viewerApplicantUserId]);
  const viewport = useMapViewportData({
    jobs,
    prefs,
    selectedDateKey,
    jobBoardFilter,
    searchQuery,
    searchCraftFilter,
    searchTradeFilter,
    searchWorkFilter,
    searchDistanceKm,
    mapBounds,
    requests,
  });
  const { jobsForMap, jobsInBounds, mapItemsInBounds, jobsForMapViewportKey } = viewport;
  const visibleMapItems = useMemo(
    () =>
      filterMapItemsByLayers(
        mapItemsInBounds,
        DEFAULT_LIFE_MAP_LAYERS.filter((key) => visibleLayers[key] !== false)
      ),
    [mapItemsInBounds, visibleLayers]
  );
  const visibleJobsInBounds = useMemo(
    () =>
      visibleMapItems.filter((item) => item.type === MAP_ITEM_TYPE.FIELD).map((item) => item.source).filter(Boolean),
    [visibleMapItems]
  );
  const visibleJobsForMarkers = useMemo(
    () => (Array.isArray(visibleJobsInBounds) ? visibleJobsInBounds : []).map((job) => applyViewerLocationToJob(job, viewerApplicantUserId)),
    [viewerApplicantUserId, visibleJobsInBounds]
  );
  const visibleEstimatesInBounds = useMemo(() => [], []);
  const selectedFieldMapItem = useMemo(
    () =>
      selectedJobId != null
        ? findMapItemBySource(mapItemsInBounds, MAP_ITEM_TYPE.FIELD, selectedJobId)
        : null,
    [mapItemsInBounds, selectedJobId]
  );
  const customMapItemsInBounds = useMemo(() => {
    const items = customLifeItems.map(createMapItemFromLifeInfo).filter(Boolean);
    if (!mapBounds) return items;
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    return items.filter((item) => {
      const lat = Number(item?.lat);
      const lng = Number(item?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
  }, [customLifeItems, mapBounds]);
  const visibleLifeInfoItems = useMemo(
    () => {
      const activeLifeLayers = new Set(
        DEFAULT_LIFE_MAP_LAYERS.filter(
          (key) =>
            key !== MAP_ITEM_TYPE.FIELD &&
            key !== MAP_ITEM_TYPE.ESTIMATE &&
            DEFAULT_EXPERIENCE_LAYER_SET.has(key) &&
            visibleLayers[key] !== false
        )
      );
      const lifeItems = mapItemsInBounds.filter(
        (item) => item.type !== MAP_ITEM_TYPE.FIELD && item.type !== MAP_ITEM_TYPE.ESTIMATE
      );
      const candidates = [...lifeItems, ...customMapItemsInBounds].filter((item) => {
        const layer = item.layer || item.type;
        return activeLifeLayers.has(layer);
      });
      return filterLifeInfoItemsByMapContext(candidates, {
        mapLevel,
        selectedFieldItem: selectedFieldMapItem,
      });
    },
    [customMapItemsInBounds, mapItemsInBounds, mapLevel, selectedFieldMapItem, visibleLayers]
  );
  const activeFieldCheckIn = useMemo(
    () =>
      selectedFieldMapItem
        ? checkInRecords.find(
            (record) =>
              record?.fieldId != null &&
              String(record.fieldId) === String(selectedFieldMapItem.sourceId) &&
              !record.checkedOutAt
          ) || null
        : null,
    [checkInRecords, selectedFieldMapItem]
  );
  const fieldTimeline = useMemo(
    () =>
      selectedFieldMapItem
        ? buildFieldTimeline({
            checkIns: checkInRecords,
            experiences: experienceRecords,
            fieldItem: selectedFieldMapItem,
          })
        : [],
    [checkInRecords, experienceRecords, selectedFieldMapItem]
  );
  const operationTimeline = useMemo(() => {
    return getMapFieldMemoryKeys(selectedFieldMapItem)
      .flatMap((key) => {
        const record = loadFieldMemoryRecord(key);
        return Array.isArray(record?.timeline) ? record.timeline : [];
      })
      .slice(0, 5);
  }, [selectedFieldMapItem]);
  const recentFieldCheckIns = useMemo(
    () => summarizeRecentCheckIns({ checkIns: checkInRecords, fieldItem: selectedFieldMapItem }),
    [checkInRecords, selectedFieldMapItem]
  );
  const fieldExperienceContext = useMemo(
    () =>
      buildExperienceContextSummary({
        checkIns: checkInRecords,
        experiences: experienceRecords,
        fieldItem: selectedFieldMapItem,
      }),
    [checkInRecords, experienceRecords, selectedFieldMapItem]
  );

  const jobsInBoundsSignature = useMemo(
    () =>
      `${selectedDateKey || ""}:${mapLevel}:${buildJobsOverlaySignature(
        visibleJobsForMarkers,
        markerMode,
        overlayDensity
      )}`,
    [visibleJobsForMarkers, selectedDateKey, markerMode, overlayDensity, mapLevel]
  );

  const fieldFlowEvents = useMemo(
    () => deriveFieldFlowEvents(jobs, prefs?.regionLabel),
    [jobs, prefs?.regionLabel]
  );
  const estimatesInBoundsSignature = useMemo(
    () => buildEstimatesOverlaySignature(visibleEstimatesInBounds),
    [visibleEstimatesInBounds]
  );

  const { activeSearchFilterCount, composerAddressOptions, mapCenterOption } = useMapChromeData({
    jobs,
    briefingData,
    prefs,
    jobBoardFilter,
    searchQuery,
    searchCraftFilter,
    searchTradeFilter,
    searchWorkFilter,
    searchDistanceKm,
    map,
    mapOption,
    detailJobId,
    filteredJobs: viewport.filteredJobs,
    jobsForMap,
    jobsInBounds,
    estimatesForMap: viewport.estimatesForMap,
  });

  const placeListOrigin = useMemo(() => {
    const uLat = Number(userLocation?.lat);
    const uLng = Number(userLocation?.lng);
    if (Number.isFinite(uLat) && Number.isFinite(uLng)) {
      return { lat: uLat, lng: uLng };
    }
    const lat = Number(mapCenterOption?.lat);
    const lng = Number(mapCenterOption?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return { lat: mapOption.center.lat, lng: mapOption.center.lng };
  }, [userLocation?.lat, userLocation?.lng, mapCenterOption?.lat, mapCenterOption?.lng, mapOption.center.lat, mapOption.center.lng]);

  const {
    open: notificationOverlayOpen,
    openCenter,
    closeCenter,
    notifications: notificationItems,
    toggleRead: toggleNotificationRead,
    unreadCount,
  } = useNotifications();
  const [notificationOverlayMode, setNotificationOverlayMode] = useState("list");
  const [notificationOverlayDetail, setNotificationOverlayDetail] = useState(null);

  useMapPageFabRouteStateFlow({
    location,
    navigate,
    triggerSheetExpand: noopSheetExpand,
    sheetDispatch,
  });

  const {
    handleSubmitSearch,
    handlePickSuggestedSearch,
    handleOpenSearchPanel,
    handleOpenFilterSheet,
    handleCloseSearchPanel,
    handleResetSearchFilters,
    handleClearRecentSearches,
    handleCreateConsumerRequest,
    handleMoveToMyLocation,
    handleConfirmApplicant,
    handleRejectApplicant,
    handleCreateJob,
  } = useMapPageIntentFlows({
    navigate,
    isReady,
    kakao,
    map,
    locating,
    setLocating,
    setUserLocation,
    markerClickAtRef,
    myLocationMarkerRef,
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
  });

  const panMapToPlace = useCallback(
    (item) => {
      const lat = Number(item?.lat);
      const lng = Number(item?.lng);
      if (isReady && kakao && map && Number.isFinite(lat) && Number.isFinite(lng)) {
        map.panTo(new kakao.maps.LatLng(lat, lng));
        try {
          if (typeof map.getLevel === "function" && map.getLevel() > 5) map.setLevel(5);
        } catch (_) {
          /* noop */
        }
      }
    },
    [isReady, kakao, map],
  );

  const enrichPlaceItem = useCallback(
    (item) => {
      if (!item) return null;
      return enrichPlacesWithDistance([item], placeListOrigin.lat, placeListOrigin.lng)[0] || item;
    },
    [placeListOrigin.lat, placeListOrigin.lng],
  );

  const focusPlaceOnMap = useCallback(
    (item) => {
      if (!item) return;
      setPlaceListFocusItem(item);
      markerClickAtRef.current = Date.now();
      panMapToPlace(item);
      setActivePanel((prev) => (prev === MAP_ACTIVE_PANEL.DRAFT_PIN ? null : prev));
      setTempSearchItem(null);
      setSelectedEstimateId(null);
      setDetailJobId(null);
      setLifeInfoItem(null);
      if (item.type === MAP_ITEM_TYPE.FIELD && item.source) {
        setSelectedJobId(item.source?.id ?? null);
        return;
      }
      setSelectedJobId(null);
    },
    [panMapToPlace, setDetailJobId, setSelectedJobId],
  );

  const openPlaceOverlayDetail = useCallback(
    (item) => {
      if (!item) return;
      const enriched = enrichPlaceItem(item);
      markerClickAtRef.current = Date.now();
      setPlaceListFocusItem(enriched);
      panMapToPlace(enriched);
      setSelectedEstimateId(null);
      setDetailJobId(null);
      setSelectedJobId(null);
      openMapDetailPanel(enriched, enriched);
    },
    [enrichPlaceItem, openMapDetailPanel, panMapToPlace, setDetailJobId, setSelectedJobId],
  );

  const handleEditPlace = useCallback(
    (place) => {
      if (!place) return;
      if (!guardMemberAction("post")) return;
      appendChangeHistory(getPlaceInfoKey(place), {
        at: new Date().toISOString(),
        by: getDisplayNickname(profile, sessionUser),
        action: "edit_opened",
        detail: "정보 수정 화면을 열었습니다.",
      });
      showAppToast("장소 정보 수정 (목업)");
    },
    [profile, sessionUser, showAppToast],
  );

  const onJobMarkerClick = useCallback(
    (job) => {
      if (!job?.id) return;
      const mapItem =
        findMapItemBySource(visibleMapItems, MAP_ITEM_TYPE.FIELD, job.id) ||
        findMapItemBySource(mapItemsInBounds, MAP_ITEM_TYPE.FIELD, job.id);
      if (mapItem) {
        openPlaceOverlayDetail(mapItem);
        return;
      }
      markerClickAtRef.current = Date.now();
      setActivePanel((prev) => (prev === MAP_ACTIVE_PANEL.DRAFT_PIN ? null : prev));
      setTempSearchItem(null);
      setSelectedEstimateId(null);
      setSelectedJobId(job.id);
    },
    [mapItemsInBounds, openPlaceOverlayDetail, visibleMapItems, setSelectedJobId],
  );

  const handleFieldFlowEventClick = useCallback(
    (event) => {
      if (!event?.jobId) return;
      const job = jobs.find((j) => j && String(j.id) === String(event.jobId));
      if (!job) return;
      if (isReady && kakao && map) {
        const lat = Number(job.lat);
        const lng = Number(job.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          map.setCenter(new kakao.maps.LatLng(lat, lng));
          try {
            if (typeof map.getLevel === "function" && map.getLevel() > 5) map.setLevel(5);
          } catch (_) {
            /* noop */
          }
        }
      }
      onJobMarkerClick(job);
    },
    [isReady, jobs, kakao, map, onJobMarkerClick]
  );

  const handleEstimateMarkerClick = useCallback(
    (request) => {
      if (!request?.id) return;
      markerClickAtRef.current = Date.now();
      setActivePanel((prev) => (prev === MAP_ACTIVE_PANEL.DRAFT_PIN ? null : prev));
      setTempSearchItem(null);
      setLifeInfoItem(null);
      setDetailJobId(null);
      setSelectedJobId(null);
      setSelectedEstimateId((prev) => (prev === request.id ? null : request.id));
    },
    [setDetailJobId, setSelectedEstimateId, setSelectedJobId]
  );

  const handleLifeInfoMarkerClick = useCallback(
    (item) => {
      if (!item) return;
      markerClickAtRef.current = Date.now();
      setTempSearchItem(null);
      setSelectedEstimateId(null);
      setSelectedJobId(null);
      openPlaceOverlayDetail(item);
    },
    [openPlaceOverlayDetail, setSelectedEstimateId, setSelectedJobId],
  );

  const handleResetMapSelection = useCallback(() => {
    setSelectedEstimateId(null);
    setLifeInfoItem(null);
    setActivePanel((prev) => (prev === MAP_ACTIVE_PANEL.DRAFT_PIN ? null : prev));
    setTempSearchItem(null);
  }, []);

  const handleToggleCategory = useCallback(
    (layers) => {
      toggleCategoryLayers(layers);
    },
    [toggleCategoryLayers]
  );

  const handleShowAllMapLayers = useCallback(() => {
    const layers = [
      MAP_ITEM_TYPE.FIELD,
      ...MAP_LAYER_MVP_CATEGORIES.flatMap((category) => category.layers),
    ];
    setLayersVisible(layers, true);
  }, [setLayersVisible]);

  const handleToggleApartmentLayer = useCallback(() => {
    setLayerVisible(MAP_ITEM_TYPE.FIELD, visibleLayers[MAP_ITEM_TYPE.FIELD] === false);
  }, [setLayerVisible, visibleLayers]);

  const handleTopSearchQueryChange = useCallback(
    (nextQuery) => {
      setSearchQuery(nextQuery);
      handleOpenSearchPanel();
    },
    [handleOpenSearchPanel, setSearchQuery]
  );

  const clearSearchMarker = useCallback(() => {
    setSearchMarker(null);
    setSearchMarkerInfoOpen(false);
  }, []);

  const handleDismissSearchPanel = useCallback(() => {
    clearSearchMarker();
    handleCloseSearchPanel();
  }, [clearSearchMarker, handleCloseSearchPanel]);

  const handleCloseSearchPanelAfterPick = useCallback(() => {
    rememberRecentSearch(searchQuery);
    sheetDispatch({ type: "SHEET_CLOSE_SEARCH_PANEL" });
  }, [rememberRecentSearch, searchQuery, sheetDispatch]);

  const handlePickPlaceResult = useCallback(
    (place) => {
      if (!place || !isReady || !kakao || !map) return;
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setSearchMarker({
        id: place.id || `search:${Date.now()}`,
        title: place.title || "",
        lat,
        lng,
        address: place.address || "",
        roadAddress: place.roadAddress || "",
        jibunAddress: place.jibunAddress || "",
      });
      setSearchMarkerInfoOpen(false);
      const latLng = new kakao.maps.LatLng(lat, lng);
      try {
        if (typeof map.panTo === "function") {
          map.panTo(latLng);
        } else {
          map.setCenter(latLng);
        }
        if (typeof map.getLevel === "function" && map.getLevel() > 4) map.setLevel(4);
      } catch (_) {
        /* noop */
      }
      handleCloseSearchPanelAfterPick();
    },
    [handleCloseSearchPanelAfterPick, isReady, kakao, map]
  );

  const handleSearchMarkerClick = useCallback(() => {
    setSearchMarkerInfoOpen(true);
  }, []);

  const handleSubmitSearchPanel = useCallback(() => {
    clearSearchMarker();
    handleSubmitSearch();
  }, [clearSearchMarker, handleSubmitSearch]);

  const createDirectDraftAt = useCallback(
    async ({ lat, lng, preferredType = null, mode = null } = {}) => {
      if (!kakao || !map) return;
      let nextLat = Number(lat);
      let nextLng = Number(lng);
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
        const center = map.getCenter?.();
        nextLat = Number(center?.getLat?.());
        nextLng = Number(center?.getLng?.());
      }
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
      const addressInfo = await reverseGeocodeLatLngDetailed(kakao, nextLat, nextLng);
      const draft = {
        id: `search_draft:direct:${Date.now()}`,
        sourceId: `direct:${Date.now()}`,
        type: "search_draft",
        layer: "search_draft",
        label: "임시 핀",
        title: "",
        lat: nextLat,
        lng: nextLng,
        address: addressInfo.address,
        roadAddress: addressInfo.roadAddress,
        jibunAddress: addressInfo.jibunAddress,
        tone: "search-draft",
        preferredType,
        mode,
        comments: [],
        source: { savedFrom: "map_direct" },
      };
      markerClickAtRef.current = Date.now();
      openMapDraftPinPanel(draft);
      setSelectedEstimateId(null);
      setDetailJobId(null);
      map.setCenter(new kakao.maps.LatLng(nextLat, nextLng));
      setQuickAddOpen(false);
    },
    [kakao, map, openMapDraftPinPanel, setDetailJobId]
  );

  /** 장소 버튼(+) — 임시핀·등록 카드는 이 경로에서만 시작 */
  const handlePlaceAdd = useCallback(
    (options = {}) => createDirectDraftAt(options),
    [createDirectDraftAt]
  );

  const handleCreateFieldFromDraft = useCallback(
    async ({ draft }) => {
      const job = createFieldJobFromDraft({
        draft,
        selectedDateKey,
        fallbackLocation: mapCenterOption || composerAddressOptions?.[0] || {},
      });
      const persisted = await createJobPost(job);
      const scheduleDate = scheduleDateKeyFromWorkDate((persisted || job)?.workDate) || selectedDateKey;
      const saved = persisted || job;
      const endDate = scheduleDateKeyFromWorkDate(saved?.workDateEnd || saved?.endDate) || scheduleDate;
      const createdSchedule = addScheduleFromJobMatch(saved, {
        workDate: scheduleDate,
        endDate,
        durationDays: saved?.durationDays || 1,
        source: "map-field-paste-registration",
      });
      getScheduleMemoryKeys(createdSchedule || job, persisted || job).forEach((key) => {
        saveFieldVisitMemory(key, createVisitMemoryFromSchedule(createdSchedule || job, persisted || job));
        saveFieldTimelineEvent(key, {
          type: "field_created",
          tone: "start",
          icon: "시작",
          text: "현장 일정 생성",
          detail: (persisted || job)?.title || "",
          source: "map_registration",
        });
      });
      if (scheduleDate !== selectedDateKey) setSelectedDateKey(scheduleDate);
      setFieldImportResume(null);
      setTeamInviteContext({
        job: saved,
        scheduleId: createdSchedule?.id || null,
        title: saved?.title || "새 현장",
        workDateStart: scheduleDate,
        workDateEnd: endDate,
      });
      if (isReady && kakao && map && Number.isFinite(Number(saved?.lat)) && Number.isFinite(Number(saved?.lng))) {
        map.setCenter(new kakao.maps.LatLng(saved.lat, saved.lng));
      }
      setSelectedJobId(saved?.id ?? null);
      showAppToast("현장 일정을 저장했습니다");
      return persisted || job;
    },
    [
      addScheduleFromJobMatch,
      composerAddressOptions,
      createJobPost,
      isReady,
      kakao,
      map,
      mapCenterOption,
      selectedDateKey,
      setSelectedDateKey,
      setSelectedJobId,
      showAppToast,
    ]
  );

  const handleFieldAddressPick = useCallback(
    (location) => {
      if (!location || !isReady || !kakao || !map) return;
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      map.setCenter(new kakao.maps.LatLng(lat, lng));
      try {
        if (typeof map.getLevel === "function" && map.getLevel() > 4) map.setLevel(4);
      } catch (_) {
        /* noop */
      }
    },
    [isReady, kakao, map]
  );

  const handleFieldAdjustMapLocation = useCallback(
    (resume) => {
      if (!resume) return;
      setFieldImportResume(resume);
      setFieldImportOpen(false);
      const loc = resume?.draft?.location;
      createDirectDraftAt({
        lat: loc?.lat,
        lng: loc?.lng,
        mode: "field_location_pick",
      });
    },
    [createDirectDraftAt]
  );

  const handleApplyFieldLocationPick = useCallback(() => {
    if (!tempSearchItem || tempSearchItem.mode !== "field_location_pick") return;
    const picked = tempSearchItem;
    setFieldImportResume((prev) => {
      if (!prev) return prev;
      const shortRegion = picked.address || picked.roadAddress || prev.draft?.location?.shortRegion || "";
      const fullAddress = picked.roadAddress || picked.address || shortRegion;
      return {
        ...prev,
        locationPatch: {
          lat: picked.lat,
          lng: picked.lng,
          shortRegion,
          fullAddress,
        },
      };
    });
    closeMapActivePanel();
    setFieldImportOpen(true);
  }, [closeMapActivePanel, tempSearchItem]);

  const handleCancelFieldLocationPick = useCallback(() => {
    closeMapActivePanel();
    setFieldImportOpen(true);
  }, [closeMapActivePanel]);

  const handleRegisterSearchDraft = useCallback(
    (type, nextTitle) => {
      if (!tempSearchItem || !type) return;
      const now = new Date().toISOString();
      const title = String(nextTitle || tempSearchItem.title || MAP_ITEM_TYPE_LABEL[type] || "등록 위치").trim();
      const raw = {
        id: `${type}:custom:${Date.now()}`,
        type,
        title,
        lat: tempSearchItem.lat,
        lng: tempSearchItem.lng,
        address: tempSearchItem.address,
        roadAddress: tempSearchItem.roadAddress,
        jibunAddress: tempSearchItem.jibunAddress,
        comments: [],
        sourceMeta: {
          createdBy: "일당맵 사용자",
          updatedAt: now,
          trustScore: 0,
          reportCount: 0,
          verificationStatus: "editable",
          editHistory: [{ at: now, action: "created_from_search" }],
        },
      };
      const item = createMapItemFromLifeInfo(raw);
      addMapItemDraft(raw);
      const fieldKey = getMapFieldMemoryKey(selectedFieldMapItem);
      if (fieldKey) {
        saveFieldTimelineEvent(fieldKey, {
          type: type === MAP_ITEM_TYPE.SOS ? "sos" : "map_memo",
          tone: type === MAP_ITEM_TYPE.SOS ? "urgent" : "memory",
          icon: type === MAP_ITEM_TYPE.SOS ? "SOS" : "메모",
          text: `${MAP_ITEM_TYPE_LABEL[type] || "현장 메모"} 추가`,
          detail: raw.title || raw.address || "",
          source: "map_place_save",
        });
      }
      setLayerVisible(type, true);
      setSearchQuery("");
      openPlaceOverlayDetail(item);
      showAppToast(`${MAP_ITEM_TYPE_LABEL[type] || "일당맵"}으로 등록했습니다`);
    },
    [addMapItemDraft, openPlaceOverlayDetail, selectedFieldMapItem, setLayerVisible, setSearchQuery, showAppToast, tempSearchItem]
  );

  const handleQuickSaveExperience = useCallback(
    ({ tag, memo = "", item = activePlaceContextItem, fieldItem = selectedFieldMapItem, actionKey = "quick_save" }) => {
      const record = quickSaveExperience({
        tag,
        memo,
        item,
        fieldItem,
        actionKey,
      });
      if (activeFieldCheckIn?.id) {
        attachExperienceToCheckIn(activeFieldCheckIn.id, record.id);
      }
      const fieldKey = getMapFieldMemoryKey(fieldItem);
      if (fieldKey) {
        saveFieldTimelineEvent(fieldKey, {
          type: "field_atmosphere",
          tone: "memory",
          icon: "경험",
          text: record.label || "현장 분위기 기록",
          detail: memo || tag || "다음 작업에 도움되는 감각 저장",
          source: "experience_quick_save",
        });
      }
      showAppToast(`${record.label || "현장 경험"} 저장됨`);
      setExperienceSaveContext(null);
      return record;
    },
    [activeFieldCheckIn, activePlaceContextItem, attachExperienceToCheckIn, quickSaveExperience, selectedFieldMapItem, showAppToast]
  );

  const handleFieldCheckIn = useCallback(
    (fieldItem) => {
      const record = checkInField({ fieldItem, craftType: "필름팀" });
      const fieldKey = getMapFieldMemoryKey(fieldItem);
      if (fieldKey) {
        saveFieldTimelineEvent(fieldKey, {
          type: "check_in",
          tone: "start",
          icon: "작업",
          text: "현장 체크인",
          detail: "작업 시작 흐름 기록",
          source: "map_check_in",
        });
      }
      showAppToast("현장 체크인 기록됨");
      window.setTimeout(() => {
        setExperienceSaveContext({
          actionKey: "site_done",
          item: activePlaceContextItem,
          fieldItem,
        });
      }, 700);
      return record;
    },
    [activePlaceContextItem, checkInField, showAppToast]
  );

  const handleFieldCheckOut = useCallback(
    (record) => {
      if (!record?.id) return;
      checkOutField(record.id);
      const fieldKey = getMapFieldMemoryKey(selectedFieldMapItem);
      if (fieldKey) {
        saveFieldTimelineEvent(fieldKey, {
          type: "check_out",
          tone: "done",
          icon: "완료",
          text: "현장 작업 완료",
          detail: "체크아웃과 함께 작업 흐름 저장",
          source: "map_check_out",
        });
      }
      showAppToast("현장 작업 기록 완료");
      setExperienceSaveContext({
        actionKey: "site_done",
        item: activePlaceContextItem,
        fieldItem: selectedFieldMapItem,
      });
    },
    [activePlaceContextItem, checkOutField, selectedFieldMapItem, showAppToast]
  );

  useEffect(() => {
    tempSearchItemRef.current = tempSearchItem;
  }, [tempSearchItem]);

  useEffect(() => {
    const query = String(searchQuery || "").trim();
    if (!query) {
      setPlaceSearchResults([]);
      setPlaceSearchLoading(false);
      return undefined;
    }
    let cancelled = false;
    setPlaceSearchLoading(true);
    const timer = window.setTimeout(() => {
      searchKakaoPlaces(kakao, query).then((results) => {
        if (cancelled) return;
        setPlaceSearchResults(results);
        setPlaceSearchLoading(false);
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [kakao, searchQuery]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !hasTempSearchItem) {
      setCenterPinMoving(false);
      if (centerGeocodeTimerRef.current) {
        window.clearTimeout(centerGeocodeTimerRef.current);
        centerGeocodeTimerRef.current = null;
      }
      return undefined;
    }

    const readCenter = () => {
      const center = map.getCenter?.();
      const lat = Number(center?.getLat?.());
      const lng = Number(center?.getLng?.());
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    };

    const updateDraftCenter = ({ withAddress = false } = {}) => {
      markerClickAtRef.current = Date.now();
      const next = readCenter();
      if (!next || !tempSearchItemRef.current) return;
      if (!withAddress) {
        setTempSearchItem((prev) => (prev ? { ...prev, lat: next.lat, lng: next.lng } : prev));
        return;
      }
      const seq = ++centerGeocodeSeqRef.current;
      reverseGeocodeLatLngDetailed(kakao, next.lat, next.lng).then((addressInfo) => {
        if (seq !== centerGeocodeSeqRef.current) return;
        setCenterPinMoving(false);
        if (!tempSearchItemRef.current) return;
        setTempSearchItem((prev) =>
          prev
            ? {
                ...prev,
                lat: next.lat,
                lng: next.lng,
                address: addressInfo.address,
                roadAddress: addressInfo.roadAddress,
                jibunAddress: addressInfo.jibunAddress,
              }
            : prev
        );
      });
    };

    const scheduleAddressSync = (delay = 320) => {
      if (centerGeocodeTimerRef.current) window.clearTimeout(centerGeocodeTimerRef.current);
      centerGeocodeTimerRef.current = window.setTimeout(() => {
        centerGeocodeTimerRef.current = null;
        updateDraftCenter({ withAddress: true });
      }, delay);
    };

    const handleCenterChanged = () => {
      setCenterPinMoving(true);
      updateDraftCenter({ withAddress: false });
      scheduleAddressSync(360);
    };

    const handleIdle = () => {
      scheduleAddressSync(120);
    };

    kakao.maps.event.addListener(map, "center_changed", handleCenterChanged);
    kakao.maps.event.addListener(map, "idle", handleIdle);
    updateDraftCenter({ withAddress: false });
    scheduleAddressSync(80);

    return () => {
      kakao.maps.event.removeListener(map, "center_changed", handleCenterChanged);
      kakao.maps.event.removeListener(map, "idle", handleIdle);
      if (centerGeocodeTimerRef.current) {
        window.clearTimeout(centerGeocodeTimerRef.current);
        centerGeocodeTimerRef.current = null;
      }
    };
  }, [hasTempSearchItem, isReady, kakao, map]);

  const closeQuickAddMenu = useCallback(() => setQuickAddOpen(false), []);

  useMapQuickAddDismiss(quickAddOpen, closeQuickAddMenu);

  const handleQuickAddToggle = useCallback(() => {
    if (placeRegisterOpen) return;
    handlePlaceAdd();
  }, [handlePlaceAdd, placeRegisterOpen]);

  const handleQuickAddSelect = useCallback(
    (actionKey) => {
      setQuickAddOpen(false);
      if (actionKey === "direct_register" || QUICK_ADD_TYPE_BY_ACTION[actionKey]) {
        handlePlaceAdd({ preferredType: QUICK_ADD_TYPE_BY_ACTION[actionKey] || null });
        return;
      }
      if (actionKey === "estimate_request") {
        showAppToast("견적 요청은 현장 경험 데이터와 연결한 뒤 열 예정입니다");
        return;
      }
      if (actionKey === "urgent_help") {
        showAppToast("긴급헬프는 체크인·근처 작업 이력과 연결 후 열 예정입니다");
        return;
      }
    },
    [handlePlaceAdd, showAppToast]
  );

  useEffect(() => {
    if (visibleLayers[MAP_ITEM_TYPE.FIELD] === false) {
      setSelectedJobId(null);
    }
    if (visibleLayers[MAP_ITEM_TYPE.ESTIMATE] === false) {
      setSelectedEstimateId(null);
    }
    const hiddenLayerItem = placeOverlayDetail || lifeInfoItem;
    if (hiddenLayerItem && visibleLayers[hiddenLayerItem.layer || hiddenLayerItem.type] === false) {
      setLifeInfoItem(null);
      setPlaceOverlayDetail(null);
      setPlaceListFocusItem(null);
      setActivePanel((prev) => (prev === MAP_ACTIVE_PANEL.DETAIL ? MAP_ACTIVE_PANEL.LIST : prev));
    }
  }, [lifeInfoItem, placeOverlayDetail, setSelectedJobId, visibleLayers]);

  useEffect(() => {
    const focusMapItemId = location.state?.focusMapItemId;
    const focusMapItemType = location.state?.focusMapItemType;
    if (!focusMapItemId || focusMapItemType !== "field") return;
    const job = jobs.find((j) => j && String(j.id) === String(focusMapItemId));
    if (!job) return;

    if (isReady && kakao && map) {
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.setCenter(new kakao.maps.LatLng(lat, lng));
        try {
          if (typeof map.getLevel === "function" && map.getLevel() > 5) map.setLevel(5);
        } catch (_) {
          /* noop */
        }
      }
    }
    onJobMarkerClick(job);
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    isReady,
    jobs,
    kakao,
    location.pathname,
    location.state?.focusMapItemId,
    location.state?.focusMapItemType,
    map,
    navigate,
    onJobMarkerClick,
  ]);

  const selectedLifeMarkerKey = placeListFocusItem
    ? getMapItemKey(placeListFocusItem)
    : lifeInfoItem
      ? getMapItemKey(lifeInfoItem)
      : "";

  useJobMarkers({
    isReady,
    kakao,
    map,
    jobs: visibleJobsForMarkers,
    jobsSignature: jobsInBoundsSignature,
    selectedJobId,
    onMarkerClick: onJobMarkerClick,
    overlaysEnabled: !zoomFar,
    markerMode,
    overlayDensity: overlayDensity === "hidden" ? "compact" : overlayDensity,
  });

  useEstimateMarkers({
    isReady,
    kakao,
    map,
    requests: visibleEstimatesInBounds,
    requestsSignature: estimatesInBoundsSignature,
    selectedEstimateId,
    onMarkerClick: handleEstimateMarkerClick,
    overlaysEnabled: !zoomFar,
  });

  useMapItemMarkers({
    isReady,
    kakao,
    map,
    items: visibleLifeInfoItems,
    selectedItemKey: selectedLifeMarkerKey,
    onMarkerClick: handleLifeInfoMarkerClick,
    overlaysEnabled: true,
  });

  useJobMapClusterer({
    isReady,
    kakao,
    map,
    jobs: visibleJobsForMarkers,
    jobsSignature: jobsInBoundsSignature,
    enabled: zoomFar,
  });

  useKakaoMapSelectionReset({
    isReady,
    kakao,
    map,
    markerClickAtRef,
    setSelectedJobId,
    setDetailJobId,
    onResetSelection: handleResetMapSelection,
  });

  useKakaoMapViewportSync({
    isReady,
    kakao,
    map,
    refreshKey: jobsForMapViewportKey,
    setZoomFar,
    setMapLevel,
    setMapBounds,
    liveBoundsSync: false,
  });

  useSelectedJobSheetSync({
    selectedJobId,
    jobsForMap,
    sheetListRef,
    setSelectedJobId,
    setDetailJobId,
  });

  useVisualViewportMapRelayout(map);
  useMapTransientCleanup({ myLocationMarkerRef, locationToastTimerRef });

  const mapOpsToneClass = "";

  const filterChipLabel = useMemo(() => {
    if (searchDistanceKm) return `~${searchDistanceKm}km`;
    if (searchCraftFilter) {
      const craft = SEARCH_CRAFT_FILTERS.find((f) => f.key === searchCraftFilter);
      if (craft?.label) return craft.label;
    }
    if (searchWorkFilter) {
      const work = SEARCH_WORK_FILTERS.find((f) => f.key === searchWorkFilter);
      if (work?.label && work.key) return work.label;
    }
    return null;
  }, [searchCraftFilter, searchDistanceKm, searchWorkFilter]);

  const handleClearFilterChip = useCallback(() => {
    setSearchDistanceKm(null);
    setSearchCraftFilter(null);
    setSearchWorkFilter(null);
  }, [setSearchCraftFilter, setSearchDistanceKm, setSearchWorkFilter]);

  const selectedMapItem = useMemo(() => {
    if (placeOverlayOpen && placeOverlayDetail) return placeOverlayDetail;
    if (placeOverlayOpen && placeListFocusItem) return placeListFocusItem;
    if (selectedJobId != null) return findMapItemBySource(visibleMapItems, MAP_ITEM_TYPE.FIELD, selectedJobId);
    if (selectedEstimateId != null) {
      return findMapItemBySource(visibleMapItems, MAP_ITEM_TYPE.ESTIMATE, selectedEstimateId);
    }
    return null;
  }, [placeListFocusItem, placeOverlayDetail, placeOverlayOpen, selectedEstimateId, selectedJobId, visibleMapItems]);

  const overlayPlaceList = useMemo(() => {
    const eligible = visibleLifeInfoItems.filter(isPlaceOverlayEligible);
    return sortPlaces(
      enrichPlacesWithDistance(eligible, placeListOrigin.lat, placeListOrigin.lng),
      placeListSortMode,
    );
  }, [visibleLifeInfoItems, placeListOrigin.lat, placeListOrigin.lng, placeListSortMode]);

  const overlayPlaceEmptyMessage = useMemo(() => {
    const activeCount = Object.values(visibleLayers || {}).filter((v) => v !== false).length;
    if (!mapBounds) return "지도를 조금만 움직여 주세요.";
    if (activeCount === 0) return "표시할 카테고리를 선택해 주세요.";
    if (!overlayPlaceList.length) return "이 구역에 표시할 장소가 없습니다. 지도를 이동해 보세요.";
    return "표시할 장소가 없습니다.";
  }, [mapBounds, overlayPlaceList.length, visibleLayers]);

  const handleClosePlaceOverlay = useCallback(() => {
    closeMapActivePanel();
  }, [closeMapActivePanel]);

  const handlePlaceOverlayBack = useCallback(() => {
    backMapPanelToList();
  }, [backMapPanelToList]);

  const handlePlaceOverlaySelect = useCallback(
    (item) => {
      if (!item) return;
      const enriched = enrichPlaceItem(item);
      focusPlaceOnMap(enriched);
      openMapDetailPanel(enriched, enriched);
    },
    [enrichPlaceItem, focusPlaceOnMap, openMapDetailPanel],
  );

  const handleCloseNotificationOverlay = useCallback(() => {
    closeCenter();
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
  }, [closeCenter]);

  const handleOpenPlaceOverlayList = useCallback(() => {
    handleCloseNotificationOverlay();
    openMapListPanel();
  }, [handleCloseNotificationOverlay, openMapListPanel]);

  const handleOpenNotificationCenter = useCallback(() => {
    handleClosePlaceOverlay();
    handleCloseSearchPanel();
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
    openCenter();
  }, [handleClosePlaceOverlay, handleCloseSearchPanel, openCenter]);

  const handleNotificationOverlayBack = useCallback(() => {
    setNotificationOverlayMode("list");
    setNotificationOverlayDetail(null);
  }, []);

  const handleNotificationOverlaySelect = useCallback(
    (item) => {
      if (!item) return;
      if (!item.isRead) toggleNotificationRead(item.id);
      setNotificationOverlayDetail(item);
      setNotificationOverlayMode("detail");
    },
    [toggleNotificationRead]
  );

  useEffect(() => {
    if (!notificationOverlayOpen) {
      setNotificationOverlayMode("list");
      setNotificationOverlayDetail(null);
    }
  }, [notificationOverlayOpen]);

  const experienceCompletionPrompts = useMemo(
    () => getCompletionExperiencePrompts(selectedFieldMapItem),
    [selectedFieldMapItem]
  );

  const handleCalendarClose = useCallback(() => setCalendarOpen(false), []);

  const handleCloseFilterSheet = useCallback(() => setFilterSheetOpen(false), [setFilterSheetOpen]);

  const mapSearchPanelProps = useMemo(
    () => ({
      query: searchQuery,
      placeholder: SEARCH_BAR_PLACEHOLDER,
      recommendedKeywords: [],
      placeResults: placeSearchResults,
      loading: placeSearchLoading,
      showRecent: false,
      hideForm: true,
      recentSearches,
      onQueryChange: setSearchQuery,
      onPickKeyword: handlePickSuggestedSearch,
      onPickPlace: handlePickPlaceResult,
      onPickRecent: handlePickSuggestedSearch,
      onClearRecent: handleClearRecentSearches,
      onClose: handleDismissSearchPanel,
      onSubmit: handleSubmitSearchPanel,
    }),
    [
      searchQuery,
      placeSearchResults,
      placeSearchLoading,
      recentSearches,
      setSearchQuery,
      handlePickSuggestedSearch,
      handlePickPlaceResult,
      handleClearRecentSearches,
      handleDismissSearchPanel,
      handleSubmitSearchPanel,
    ]
  );

  const mapFilterSheetProps = useMemo(
    () => ({
      craftOptions: SEARCH_CRAFT_FILTERS,
      tradeOptions: SEARCH_TRADE_FILTERS,
      workOptions: SEARCH_WORK_FILTERS,
      distanceOptions: SEARCH_DISTANCE_FILTERS,
      selectedCraft: searchCraftFilter,
      selectedTrade: searchTradeFilter,
      selectedWork: searchWorkFilter,
      selectedDistance: searchDistanceKm,
      onSelectCraft: setSearchCraftFilter,
      onSelectTrade: setSearchTradeFilter,
      onSelectWork: setSearchWorkFilter,
      onSelectDistance: setSearchDistanceKm,
      onReset: handleResetSearchFilters,
      onClose: handleCloseFilterSheet,
    }),
    [
      searchCraftFilter,
      searchTradeFilter,
      searchWorkFilter,
      searchDistanceKm,
      setSearchCraftFilter,
      setSearchTradeFilter,
      setSearchWorkFilter,
      setSearchDistanceKm,
      handleResetSearchFilters,
      handleCloseFilterSheet,
    ]
  );

  return (
    <div
      className={`map-tab-page map-tab-page--geo map-tab-page--life map-tab-page--oyaji-ops map-tab-page--oyaji-quiet${mapOpsToneClass}${searchPanelOpen ? " map-tab-page--search-panel-open" : ""}${activePanel || searchPanelOpen || notificationOverlayOpen ? " map-tab-page--map-card-open" : ""}${activePanel ? ` map-tab-page--panel-${activePanel}` : ""}`}
    >
      <div className="map-desktop-split">
      <aside className="map-desktop-sidebar" aria-label="장소 패널">
        <div className="map-desktop-sidebar__idle">
          <p className="map-desktop-sidebar__idle-title">장소 · 검색</p>
          <p className="map-desktop-sidebar__idle-desc">
            상단에서 검색하거나
            <br />
            지도의 목록 버튼을 눌러주세요
          </p>
        </div>
      </aside>
      <div className="map-geo-stage map-desktop-map-wrap" ref={geoStageRef}>
        {mapMinimalUi ? null : (
        <div className="map-geo-stage__top">
          <MapTopBar
            onOpenFilter={handleOpenFilterSheet}
            filterActiveCount={activeSearchFilterCount}
            title="일당맵"
            searchLabel={SEARCH_BAR_PLACEHOLDER}
            filterLabel="카테고리"
            showFilter={false}
            searchAsInput
            searchQuery={searchQuery}
            searchPlaceholder={SEARCH_BAR_PLACEHOLDER}
            onSearchQueryChange={handleTopSearchQueryChange}
            onSearchSubmit={() => {
              if (placeSearchResults[0]) {
                handlePickPlaceResult(placeSearchResults[0]);
                return;
              }
              handleSubmitSearchPanel();
            }}
            onSearchFocus={handleOpenSearchPanel}
            onOpenNotifications={handleOpenNotificationCenter}
            unreadCount={unreadCount}
            categoryRowRef={mapChipAnchorRef}
            categoryRow={
              <MapLayerChips
                visibleLayers={visibleLayers}
                onToggleCategory={handleToggleCategory}
                onShowAllLayers={handleShowAllMapLayers}
                onToggleApartmentLayer={handleToggleApartmentLayer}
              />
            }
          />
          {SHOW_MAP_FIELD_FLOW_STRIP ? (
            <FieldFlowStrip
              className="field-flow-strip--map"
              events={fieldFlowEvents}
              onEventClick={handleFieldFlowEventClick}
              ariaLabel="주변 현장 소식"
            />
          ) : null}
        </div>
        )}

        <div className="map-geo-stage__map-column">
        <div className="map-geo-stage__canvas" ref={mapCanvasRef}>
          <div className="map-geo-stage__map-surface" aria-hidden={false}>
            <MapCanvas containerRef={mapRef} />
          </div>
          <div className="map-geo-stage__overlays">
          {tempSearchItem && tempSearchItem.mode !== "field_location_pick" ? (
            <div className={`map-center-draft-pin${centerPinMoving ? " is-moving" : ""}`} aria-hidden="true">
              <span className="map-center-draft-pin__pin" />
              <span className="map-center-draft-pin__hint">지도를 움직여 위치 맞추기</span>
            </div>
          ) : null}
          {tempSearchItem?.mode === "field_location_pick" ? (
            <div className={`map-center-draft-pin${centerPinMoving ? " is-moving" : ""}`} aria-hidden="true">
              <span className="map-center-draft-pin__pin" />
              <span className="map-center-draft-pin__hint">필요할 때만 위치 맞추기</span>
            </div>
          ) : null}
          {tempSearchItem?.mode === "field_location_pick" ? (
            <div className="map-field-location-pick-bar" role="toolbar" aria-label="현장 위치 수정">
              <button type="button" className="map-field-location-pick-bar__secondary" onClick={handleCancelFieldLocationPick}>
                취소
              </button>
              <button type="button" className="map-field-location-pick-bar__primary" onClick={handleApplyFieldLocationPick}>
                이 위치로 적용
              </button>
            </div>
          ) : null}
          {selectedMapItem ? (
            <span
              className="sr-only"
              aria-live="polite"
            >{`${selectedMapItem.label || "일당맵 정보"} ${selectedMapItem.title || ""} 선택됨`}</span>
          ) : null}

          {mapMinimalUi ? null : (
          <MapFloatingChrome
            filterChipLabel={filterChipLabel}
            onClearFilterChip={handleClearFilterChip}
            jobsLoading={jobsLoading}
            jobsError={jobsError}
            showLocationFab
            hideLocationFab
            locating={locating}
            onOpenLocation={handleMoveToMyLocation}
            filterSheetOpen={filterSheetOpen}
            filterSheetProps={mapFilterSheetProps}
          />
          )}

          {!mapMinimalUi && searchPanelOpen ? (
            <div className="map-search-panel-layer" aria-label="장소 검색">
              <MapSearchPanel open={searchPanelOpen} mapContainerRef={mapRef} {...mapSearchPanelProps} />
            </div>
          ) : null}

          {!mapMinimalUi && SHOW_MAP_OPERATION_CONTEXT_CARD ? (
            <MapOperationContextCard
              fieldItem={selectedFieldMapItem}
              items={visibleLifeInfoItems}
              activeCheckIn={activeFieldCheckIn}
              timeline={fieldTimeline}
              operationTimeline={operationTimeline}
              recentCheckIns={recentFieldCheckIns}
              experienceContext={fieldExperienceContext}
              onCheckIn={handleFieldCheckIn}
              onCheckOut={handleFieldCheckOut}
              onOpenItem={openPlaceOverlayDetail}
              onOpenExperienceSave={() =>
                setExperienceSaveContext({
                  actionKey: "site_done",
                  item: activePlaceContextItem,
                  fieldItem: selectedFieldMapItem,
                })
              }
            />
          ) : null}

          {!mapMinimalUi && !searchPanelOpen ? (
            <>
              <MapPlaceTools
                onOpenList={handleOpenPlaceOverlayList}
                onOpenLocation={handleMoveToMyLocation}
                locating={locating}
                listOpen={activePanel === MAP_ACTIVE_PANEL.LIST}
              />
              {!placeRegisterOpen ? (
                <MapFloatingActionLayer
                  quickAddOpen={quickAddOpen}
                  onQuickAddToggle={handleQuickAddToggle}
                  onQuickAddClose={closeQuickAddMenu}
                  onQuickAddSelect={handleQuickAddSelect}
                />
              ) : null}
            </>
          ) : null}

          {locationToast ? <div className="map-location-toast">{locationToast}</div> : null}
          <MapSearchMarkerPin
            marker={searchMarker}
            map={map}
            kakao={kakao}
            isReady={isReady}
            onClick={handleSearchMarkerClick}
          />
          <MapSearchMarkerInfo
            marker={searchMarker}
            open={searchMarkerInfoOpen}
            onClose={() => setSearchMarkerInfoOpen(false)}
          />
          </div>
        </div>

        {!mapMinimalUi ? (
          <MapPlaceOverlay
            open={placeOverlayOpen}
            mapContainerRef={mapRef}
            mode={placeOverlayMode}
            detailPlace={placeOverlayDetail}
            places={overlayPlaceList}
            sortMode={placeListSortMode}
            emptyMessage={overlayPlaceEmptyMessage}
            focusedItemKey={placeListFocusItem ? getMapItemKey(placeListFocusItem) : ""}
            onClose={handleClosePlaceOverlay}
            onBack={handlePlaceOverlayBack}
            onSortModeChange={setPlaceListSortMode}
            onSelectPlace={handlePlaceOverlaySelect}
            onToast={showAppToast}
            onEditPlace={handleEditPlace}
          />
        ) : null}

        {!mapMinimalUi ? (
          <MapNotificationOverlay
            open={notificationOverlayOpen}
            mapContainerRef={mapRef}
            mode={notificationOverlayMode}
            detailNotification={notificationOverlayDetail}
            notifications={notificationItems}
            onClose={handleCloseNotificationOverlay}
            onBack={handleNotificationOverlayBack}
            onSelectNotification={handleNotificationOverlaySelect}
          />
        ) : null}
        </div>
      </div>
      </div>

      <MapSelectionOverlaySection
        includePreview={false}
        includeCalendar={false}
        calendarOpen={calendarOpen}
        onCalendarClose={handleCalendarClose}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
      />

      {postComposerMode ? (
        <Suspense fallback={null}>
          <LazyJobPostComposerModal
            open
            mode={postComposerMode || "post"}
            onClose={() => setPostComposerMode(null)}
            onSubmit={handleCreateJob}
            addressOptions={composerAddressOptions}
            mapCenterOption={mapCenterOption}
            selectedDateKey={selectedDateKey}
          />
        </Suspense>
      ) : null}

      <ConsumerRequestComposerModal
        open={consumerComposerOpen}
        onClose={() => setConsumerComposerOpen(false)}
        onSubmit={handleCreateConsumerRequest}
      />

      {applicantsSheetResolved ? (
        <ApplicantsSheet
          job={applicantsSheetResolved}
          onClose={() => setApplicantsSheetJobId(null)}
          canManageApplicants={applicantsSheetCanManage}
          onConfirm={(applicantId) => handleConfirmApplicant(applicantsSheetResolved.id, applicantId)}
          onReject={(applicantId) => handleRejectApplicant(applicantsSheetResolved.id, applicantId)}
        />
      ) : null}

      <MapWriteMenuSheet open={writeMenuOpen} onClose={() => setWriteMenuOpen(false)} />

      {fieldImportOpen ? (
        <Suspense fallback={null}>
          <LazyQuickSiteImportSheet
            open
            type={MAP_ITEM_TYPE.FIELD}
            selectedDateKey={selectedDateKey}
            dateLabel={formatMapDateLabel(selectedDateKey)}
            isOyaji
            profileCraft={profile?.craft || "film"}
            recentAddressOptions={composerAddressOptions}
            kakao={kakao}
            resumeState={fieldImportResume}
            onClose={() => {
              setFieldImportOpen(false);
              setFieldImportResume(null);
            }}
            onSubmitField={handleCreateFieldFromDraft}
            onAdjustMapLocation={handleFieldAdjustMapLocation}
            onPickAddress={handleFieldAddressPick}
          />
        </Suspense>
      ) : null}

      {teamInviteContext?.job ? (
        <Suspense fallback={null}>
          <LazyFieldTeamRecommendSheet
            open
            job={teamInviteContext?.job}
            scheduleId={teamInviteContext?.scheduleId}
            workDateStart={teamInviteContext?.workDateStart}
            workDateEnd={teamInviteContext?.workDateEnd}
            onClose={() => setTeamInviteContext(null)}
          />
        </Suspense>
      ) : null}

      <MapSearchDraftSheet
        item={tempSearchItem}
        open={placeRegisterOpen}
        onClose={() => {
          closeMapActivePanel();
          setQuickAddOpen(false);
        }}
        onRegister={handleRegisterSearchDraft}
      />

      {experienceSaveContext ? (
        <Suspense fallback={null}>
          <LazyMapExperienceQuickSaveSheet
            open
            item={experienceSaveContext?.item}
            fieldItem={experienceSaveContext?.fieldItem || selectedFieldMapItem}
            actionKey={experienceSaveContext?.actionKey}
            prompts={experienceCompletionPrompts}
            onClose={() => setExperienceSaveContext(null)}
            onSave={handleQuickSaveExperience}
          />
        </Suspense>
      ) : null}

      {shareOpen ? (
        <Suspense fallback={null}>
          <LazyFieldShareSheet
            open
            field={shareField}
            onClose={() => {
              setShareOpen(false);
              setShareField(null);
            }}
            onShared={() => showAppToast("현장 정보를 공유했습니다")}
          />
        </Suspense>
      ) : null}

    </div>
  );
}
