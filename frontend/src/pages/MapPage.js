import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import useKakaoMap from "../hooks/useKakaoMap";
import MapCanvas from "../components/MapCanvas";
import useJobMarkers from "../hooks/useJobMarkers";
import useJobMapClusterer from "../hooks/useJobMapClusterer";
import BottomSheet from "../components/BottomSheet/BottomSheet";
import JobDetailModal from "../components/map/JobDetailModal";
import MapJobCompactList from "../components/map/MapJobCompactList";
import MiniCalendarModal from "../components/map/MiniCalendarModal";
import ApplicantsSheet from "../components/map/ApplicantsSheet";
import { useJobs } from "../context/JobsContext";
import {
  formatPreferenceSummary,
  jobMatchesRegionPref,
  useUserMapPreferences,
} from "../context/UserMapPreferencesContext";
import { normalizeJobTrade } from "../utils/jobTrade";
import {
  CRAFT_LABEL,
  JOB_STATUS,
  canApplyToJob,
  createSelfApplicant,
  getApplicantsArray,
  getJobCraft,
  isUrgentJob,
} from "../utils/jobModel";

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getJobDateKey(job) {
  const raw = job?.workDate || job?.date || job?.jobDate || "";
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateKey(parsed);
}

function matchesSelectedDate(job, selectedDateKey) {
  if (!job || !selectedDateKey) return true;
  const todayKey = toDateKey(new Date());
  const jobDateKey = getJobDateKey(job);
  if (!jobDateKey) return selectedDateKey === todayKey;
  return jobDateKey === selectedDateKey;
}

const EXPLORE_CRAFT_KEYS = ["film", "tile", "wallpaper", "electric", "paint"];

export default function MapPage() {
  const mapRef = useRef(null);
  const sheetListRef = useRef(null);
  const markerClickAtRef = useRef(0);
  const myLocationMarkerRef = useRef(null);
  const locationToastTimerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { prefs, setPrefs } = useUserMapPreferences();
  const { jobs, setJobs } = useJobs();
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [zoomFar, setZoomFar] = useState(false);
  const [sheetExpandSignal, setSheetExpandSignal] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationToast, setLocationToast] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [listTime, setListTime] = useState(() => Date.now());
  const [applicantsSheetJob, setApplicantsSheetJob] = useState(null);

  const sheetSnapPoints = useMemo(() => [20, 50, 88], []);
  const [sheetVh, setSheetVh] = useState(20);

  const mapOption = useMemo(
    () => ({
      center: { lat: 36.3504, lng: 127.3845 },
      level: 7,
    }),
    []
  );

  const { kakao, map, isReady } = useKakaoMap(mapRef, mapOption);

  useEffect(() => {
    const id = window.setInterval(() => setListTime(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setDetailJob((prev) => {
      if (!prev?.id) return prev;
      const fresh = jobs.find((j) => j && j.id === prev.id);
      return fresh || prev;
    });
  }, [jobs]);

  useEffect(() => {
    const key = location.state?.fabMenu;
    if (key == null) return;
    if (key === "sheet" || key === "post" || key === "help" || key === "urgent") {
      setSheetExpandSignal((n) => n + 1);
    }
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  const prefSummary = useMemo(() => formatPreferenceSummary(prefs), [prefs]);

  const filteredJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    if (!selectedDateKey) return list;
    return list.filter((job) => {
      if (!job) return false;
      if (isUrgentJob(job)) return true;
      return matchesSelectedDate(job, selectedDateKey);
    });
  }, [jobs, selectedDateKey]);

  const jobsForMap = useMemo(() => {
    let list = filteredJobs.filter((job) => job && jobMatchesRegionPref(job, prefs.regionLabel));
    if (prefs.trade !== "전체") {
      list = list.filter((job) => job && normalizeJobTrade(job) === prefs.trade);
    }
    if (prefs.craft) {
      list = list.filter((job) => job && getJobCraft(job) === prefs.craft);
    }
    return list;
  }, [filteredJobs, prefs.regionLabel, prefs.trade, prefs.craft]);

  const jobsInBounds = useMemo(() => {
    if (!mapBounds) return jobsForMap;
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    return jobsForMap.filter((job) => {
      const lat = Number(job?.lat);
      const lng = Number(job?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
  }, [jobsForMap, mapBounds]);

  const relayoutMap = useCallback(() => {
    if (map && typeof map.relayout === "function") {
      requestAnimationFrame(() => map.relayout());
    }
  }, [map]);

  useEffect(() => {
    document.documentElement.classList.add("map-explore-ui");
    return () => {
      document.documentElement.classList.remove("map-explore-ui");
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--map-sheet-vh", String(sheetVh));
    return () => {
      document.documentElement.style.removeProperty("--map-sheet-vh");
    };
  }, [sheetVh]);

  const onSheetVhChange = useCallback((vh) => {
    setSheetVh(vh);
  }, []);

  const openJobDetail = useCallback((job) => {
    if (!job || job.id == null) return;
    markerClickAtRef.current = Date.now();
    setSelectedJob(job);
    setDetailJob(job);
  }, []);

  const panMapToJob = useCallback(
    (job) => {
      if (!isReady || !kakao || !map || !job) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try {
        const lv = map.getLevel();
        if (Number.isFinite(lv) && lv > 6) map.setLevel(6);
      } catch (_) {
        /* noop */
      }
      map.panTo(new kakao.maps.LatLng(lat, lng));
    },
    [isReady, kakao, map]
  );

  const activateJobFromList = useCallback(
    (job) => {
      if (!job) return;
      panMapToJob(job);
      openJobDetail(job);
    },
    [panMapToJob, openJobDetail]
  );

  const mapListProps = useMemo(
    () => ({
      jobs: jobsInBounds,
      selectedJob,
      onRowClick: activateJobFromList,
    }),
    [jobsInBounds, selectedJob, activateJobFromList]
  );

  const handleMarkerClick = useCallback(
    (job) => {
      openJobDetail(job);
    },
    [openJobDetail]
  );

  useJobMarkers({
    isReady,
    kakao,
    map,
    jobs: jobsInBounds,
    selectedJob,
    onMarkerClick: handleMarkerClick,
    overlaysEnabled: !zoomFar,
  });

  useJobMapClusterer({
    isReady,
    kakao,
    map,
    jobs: jobsInBounds,
    enabled: zoomFar,
  });

  useEffect(() => {
    if (!isReady || !kakao || !map) return;
    const handleMapClick = () => {
      if (Date.now() - markerClickAtRef.current < 220) return;
      setSelectedJob(null);
      setDetailJob(null);
    };
    kakao.maps?.event?.addListener?.(map, "click", handleMapClick);
    return () => {
      kakao.maps?.event?.removeListener?.(map, "click", handleMapClick);
    };
  }, [isReady, kakao, map]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !kakao.maps?.event) return;

    const onIdle = () => {
      try {
        const lv = map.getLevel();
        setZoomFar(lv >= 8);
      } catch (_) {
        /* noop */
      }

      try {
        const b = map.getBounds?.();
        const sw = b?.getSouthWest?.();
        const ne = b?.getNorthEast?.();
        if (sw && ne) {
          const minLat = sw.getLat();
          const maxLat = ne.getLat();
          const minLng = sw.getLng();
          const maxLng = ne.getLng();
          setMapBounds({ minLat, maxLat, minLng, maxLng });
        }
      } catch (_) {
        /* noop */
      }

      relayoutMap();
    };

    onIdle();
    kakao.maps.event.addListener(map, "idle", onIdle);
    return () => {
      kakao.maps.event.removeListener(map, "idle", onIdle);
    };
  }, [isReady, kakao, map, jobsForMap, relayoutMap]);

  useEffect(() => {
    if (!selectedJob?.id) return;
    const id = selectedJob.id;
    const t = window.setTimeout(() => {
      const root = sheetListRef.current;
      if (!root) return;
      const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(String(id)) : String(id);
      const el = root.querySelector(`[data-job-id="${esc}"]`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [selectedJob?.id]);

  useEffect(() => {
    if (!map || typeof map.relayout !== "function") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onVv = () => requestAnimationFrame(() => map.relayout());
    vv.addEventListener("resize", onVv);
    vv.addEventListener("scroll", onVv);
    return () => {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    };
  }, [map]);

  useEffect(() => {
    return () => {
      if (myLocationMarkerRef.current && typeof myLocationMarkerRef.current.setMap === "function") {
        myLocationMarkerRef.current.setMap(null);
      }
      if (locationToastTimerRef.current) clearTimeout(locationToastTimerRef.current);
    };
  }, []);

  const showLocationToast = useCallback((message) => {
    setLocationToast(message);
    if (locationToastTimerRef.current) clearTimeout(locationToastTimerRef.current);
    locationToastTimerRef.current = setTimeout(() => setLocationToast(""), 2200);
  }, []);

  const placeMyLocationMarker = useCallback(
    (latLng) => {
      if (!kakao || !map) return;
      if (!myLocationMarkerRef.current) {
        myLocationMarkerRef.current = new kakao.maps.Marker({ map, position: latLng, zIndex: 120 });
      } else {
        myLocationMarkerRef.current.setPosition(latLng);
        myLocationMarkerRef.current.setMap(map);
      }
    },
    [kakao, map]
  );

  const handleMoveToMyLocation = useCallback(() => {
    if (locating) return;
    if (!isReady || !kakao || !map || !navigator.geolocation) {
      showLocationToast("위치 기능을 사용할 수 없어요.");
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
        map.panTo(latLng);
        placeMyLocationMarker(latLng);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        if (error?.code === 1) {
          showLocationToast("위치 권한이 거부되었습니다.");
        } else {
          showLocationToast("위치를 가져오지 못했어요.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isReady, kakao, map, locating, placeMyLocationMarker, showLocationToast]);

  const handleApplyJob = useCallback(
    (job) => {
      if (!job || job.id == null || !canApplyToJob(job)) return;
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          if (!item || item.id !== job.id || !canApplyToJob(item)) return item;
          return { ...item, applicants: [...getApplicantsArray(item), createSelfApplicant(item)] };
        })
      );
    },
    [setJobs]
  );

  const handleConfirmApplicant = useCallback(
    (jobId, applicantId) => {
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((j) => {
          if (!j || j.id !== jobId) return j;
          const applicants = getApplicantsArray(j).map((a) =>
            a.id === applicantId ? { ...a, status: "confirmed" } : a
          );
          return { ...j, status: JOB_STATUS.PENDING, applicants };
        })
      );
    },
    [setJobs]
  );

  const handleRejectApplicant = useCallback(
    (jobId, applicantId) => {
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((j) => {
          if (!j || j.id !== jobId) return j;
          const applicants = getApplicantsArray(j).map((a) =>
            a.id === applicantId ? { ...a, status: "rejected" } : a
          );
          return { ...j, applicants };
        })
      );
    },
    [setJobs]
  );

  const applicantsSheetResolved = useMemo(
    () =>
      applicantsSheetJob ? jobs.find((j) => j && j.id === applicantsSheetJob.id) || applicantsSheetJob : null,
    [jobs, applicantsSheetJob]
  );

  const mapSheetListProps = useMemo(
    () => ({
      ...mapListProps,
      variant: "feed",
    }),
    [mapListProps]
  );

  const sheetMainTitle = useMemo(
    () => `현재 위치 기준 공고 ${jobsInBounds.length}개`,
    [jobsInBounds.length]
  );

  const sheetHeaderRight = useMemo(
    () => (
      <button
        type="button"
        className="map-job-sheet-header-refresh"
        aria-label="새로고침"
        onClick={(e) => {
          e.stopPropagation();
          setListTime(Date.now());
        }}
      >
        ↻
      </button>
    ),
    []
  );

  const detailListIndex = useMemo(() => {
    if (!detailJob) return -1;
    let i = jobsInBounds.findIndex((j) => j && j.id === detailJob.id);
    if (i >= 0) return i;
    i = jobsForMap.findIndex((j) => j && j.id === detailJob.id);
    if (i >= 0) return i;
    return filteredJobs.findIndex((j) => j && j.id === detailJob.id);
  }, [detailJob, jobsInBounds, jobsForMap, filteredJobs]);

  const detailIndexForModal = detailListIndex >= 0 ? detailListIndex : 0;

  return (
    <div className="map-tab-page map-tab-page--map-first map-tab-page--explore">
      <aside className="map-desktop-sidebar" aria-label="지도 범위 공고">
        <div className="map-desktop-sidebar__head">
          <span className="map-desktop-sidebar__title">공고 목록</span>
          <span className="map-desktop-sidebar__meta">
            현재 위치 기준 · {jobsForMap.length}개 공고
          </span>
        </div>
        <div className="map-desktop-sidebar__list">
          <MapJobCompactList {...mapListProps} />
        </div>
      </aside>

      <div className="map-desktop-map-wrap">
        <header className="map-tool-header">
          <div className="map-tool-header__left">
            <p className="map-tool-header__brand">일당맵</p>
            <button
              type="button"
              className="map-tool-header__region"
              onClick={() => navigate("/my#map-prefs")}
              aria-label="지역·맞춤 설정은 내 정보에서 변경"
            >
              <span className="map-tool-header__region-text">{prefs.regionLabel}</span>
              <span className="map-tool-header__region-chev" aria-hidden="true">
                ▼
              </span>
            </button>
            <p className="map-tool-header__prefs">{prefSummary}</p>
          </div>
          <div className="map-tool-header__actions">
            <button type="button" className="map-tool-header__action" onClick={() => setCalendarOpen(true)}>
              <span className="map-tool-header__action-icon" aria-hidden="true">
                📅
              </span>
              <span className="map-tool-header__action-label">일정</span>
            </button>
            <button
              type="button"
              className={`map-tool-header__action${locating ? " is-busy" : ""}`}
              onClick={handleMoveToMyLocation}
            >
              <span className="map-tool-header__action-icon" aria-hidden="true">
                📍
              </span>
              <span className="map-tool-header__action-label">내위치</span>
            </button>
          </div>
        </header>

        <div className="map-explore-chrome" aria-label="검색·공정 필터">
          <div className="map-explore-search-row">
            <button
              type="button"
              className="map-explore-search"
              onClick={() => navigate("/my#map-prefs")}
              aria-label="지역·주소 검색 — 내 정보에서 설정"
            >
              <span className="map-explore-search__icon" aria-hidden="true">
                🔍
              </span>
              <span className="map-explore-search__placeholder">주소 또는 지역 검색</span>
            </button>
            <button
              type="button"
              className="map-explore-profile"
              onClick={() => navigate("/my")}
              aria-label="내 정보"
            >
              <span aria-hidden="true">👤</span>
            </button>
          </div>
          <div className="map-explore-chips" role="list">
            <button
              type="button"
              role="listitem"
              className={`map-explore-chip${prefs.craft == null ? " is-active" : ""}`}
              onClick={() => setPrefs({ craft: null })}
            >
              전체
            </button>
            {EXPLORE_CRAFT_KEYS.map((ck) => (
              <button
                key={ck}
                type="button"
                role="listitem"
                className={`map-explore-chip${prefs.craft === ck ? " is-active" : ""}`}
                onClick={() => setPrefs({ craft: ck })}
              >
                {CRAFT_LABEL[ck] || ck}
              </button>
            ))}
          </div>
        </div>

        <div className="map-explore-body">
          <div className="map-tab-page__map map-tab-page__map--full map-explore-map-slot">
            <MapCanvas containerRef={mapRef} />

            <div className="map-explore-left-fabs" aria-label="지도 도구">
              <button
                type="button"
                className="map-explore-left-fabs__btn"
                onClick={() => setCalendarOpen(true)}
                aria-label="일정"
              >
                <span aria-hidden="true">📅</span>
              </button>
              <button
                type="button"
                className="map-explore-left-fabs__btn"
                onClick={() => navigate("/my")}
                aria-label="즐겨찾기"
              >
                <span aria-hidden="true">♡</span>
              </button>
              <button
                type="button"
                className={`map-explore-left-fabs__btn${locating ? " is-busy" : ""}`}
                onClick={handleMoveToMyLocation}
                aria-label="내 위치"
              >
                <span aria-hidden="true">📍</span>
              </button>
            </div>

            {locationToast ? <div className="map-location-toast">{locationToast}</div> : null}
          </div>
        </div>
      </div>

      <MiniCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
      />

      <JobDetailModal
        job={detailJob}
        open={Boolean(detailJob)}
        onClose={() => setDetailJob(null)}
        onApply={handleApplyJob}
        onShowApplicants={() => detailJob && setApplicantsSheetJob(detailJob)}
        listIndex={detailIndexForModal}
        listTime={listTime}
      />

      {applicantsSheetResolved ? (
        <ApplicantsSheet
          job={applicantsSheetResolved}
          onClose={() => setApplicantsSheetJob(null)}
          onConfirm={(applicantId) => handleConfirmApplicant(applicantsSheetResolved.id, applicantId)}
          onReject={(applicantId) => handleRejectApplicant(applicantsSheetResolved.id, applicantId)}
        />
      ) : null}

      <BottomSheet
        title={sheetMainTitle}
        headerRight={sheetHeaderRight}
        minVh={18}
        defaultVh={20}
        maxVh={92}
        snapPointsVh={sheetSnapPoints}
        expandSignal={sheetExpandSignal}
        onHeightVhChange={onSheetVhChange}
        className="map-job-list-sheet map-job-list-sheet--mobile"
      >
        <div className="map-job-sheet-stack">
          <section className="map-sheet-promo" aria-label="추천">
            <div className="map-sheet-promo__art" aria-hidden="true" />
            <div className="map-sheet-promo__text">
              <strong className="map-sheet-promo__title">오늘 급구 공고 모음</strong>
              <span className="map-sheet-promo__sub">근처 인기 현장 · 빠른 스캔</span>
            </div>
          </section>
          <div ref={sheetListRef} className="map-job-sheet-list map-job-sheet-list--feed">
            <MapJobCompactList {...mapSheetListProps} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
