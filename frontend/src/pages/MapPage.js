import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../App.css";
import useKakaoMap from "../hooks/useKakaoMap";
import MapCanvas from "../components/MapCanvas";
import useJobMarkers from "../hooks/useJobMarkers";
import useJobMapClusterer from "../hooks/useJobMapClusterer";
import JobList from "../components/Jobs/JobList";
import { TRADE_KEYS } from "../overlays/jobSpeechBubbleOverlay";
import { TRADE_SET } from "../utils/jobsStorage";
import { useJobs } from "../context/JobsContext";

export default function MapPage() {
  const mapRef = useRef(null);
  const markerClickAtRef = useRef(0);
  const { jobs, setJobs } = useJobs();
  const [roleMode, setRoleMode] = useState("tech");
  const [selectedJob, setSelectedJob] = useState(null);
  const [zoomFar, setZoomFar] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    pay: "",
    trade: "조공",
    addressQuery: "",
    address: "",
    shortAddress: "",
    lat: null,
    lng: null,
  });
  const [addressResults, setAddressResults] = useState([]);

  const mapOption = useMemo(
    () => ({
      center: { lat: 36.3504, lng: 127.3845 },
      level: 7,
    }),
    []
  );

  const { kakao, map, isReady } = useKakaoMap(mapRef, mapOption);

  const relayoutMap = useCallback(() => {
    if (map && typeof map.relayout === "function") {
      requestAnimationFrame(() => map.relayout());
    }
  }, [map]);

  const handleMarkerClick = (job) => {
    markerClickAtRef.current = Date.now();
    setSelectedJob(job);
  };

  useJobMarkers({
    isReady,
    kakao,
    map,
    jobs,
    selectedJob,
    onMarkerClick: handleMarkerClick,
    overlaysEnabled: !zoomFar,
  });

  useJobMapClusterer({
    isReady,
    kakao,
    map,
    jobs,
    enabled: zoomFar,
  });

  useEffect(() => {
    if (!isReady || !kakao || !map) return;

    const handleMapClick = () => {
      if (Date.now() - markerClickAtRef.current < 220) return;
      setSelectedJob(null);
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
        setZoomFar(lv >= 9);
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
  }, [isReady, kakao, map, relayoutMap]);

  useEffect(() => {
    if (!map || typeof map.relayout !== "function") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onVv = () => {
      requestAnimationFrame(() => map.relayout());
    };
    vv.addEventListener("resize", onVv);
    vv.addEventListener("scroll", onVv);
    return () => {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    };
  }, [map]);

  const handleJobCardClick = (job) => {
    if (!job) return;
    setSelectedJob(job);
    const lat = Number(job?.lat);
    const lng = Number(job?.lng);
    if (isReady && kakao && map && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.panTo(new kakao.maps.LatLng(lat, lng));
    }
  };

  const handleApplyJob = (job) => {
    if (!job || job.id == null) return;
    setJobs((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => {
        if (!item || item.id !== job.id) return item;
        return { ...item, applicants: (item.applicants || 0) + 1 };
      })
    );
    setSelectedJob((prev) => {
      if (!prev || prev.id !== job.id) return prev;
      return { ...prev, applicants: (prev.applicants || 0) + 1 };
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setJobForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressSearch = () => {
    const query = jobForm.addressQuery.trim();
    const GeocoderCtor = kakao?.maps?.services?.Geocoder;
    if (!query || !isReady || !kakao || typeof GeocoderCtor !== "function") {
      setAddressResults([]);
      return;
    }
    try {
      const geocoder = new GeocoderCtor();
      geocoder.addressSearch(query, (results, status) => {
        const ok = status === kakao.maps?.services?.Status?.OK;
        const list = Array.isArray(results) ? results : [];
        setAddressResults(ok ? list.slice(0, 5) : []);
      });
    } catch (e) {
      setAddressResults([]);
    }
  };

  const handleAddressSelect = (item) => {
    if (!item) return;
    const raw = item?.road_address?.address_name || item?.address_name || "";
    const lat = Number(item?.y);
    const lng = Number(item?.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const parts = String(raw).split(" ").filter(Boolean);
    const shortAddress = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : raw;

    setJobForm((prev) => ({
      ...prev,
      addressQuery: raw,
      address: raw,
      shortAddress,
      lat,
      lng,
    }));
    setAddressResults([]);
  };

  const handleJobSubmit = (e) => {
    e.preventDefault();
    const { title, pay, trade, address, shortAddress, lat, lng } = jobForm;
    if (!title || !pay || !address || lat == null || lng == null) return;

    const newJob = {
      id: Date.now(),
      title,
      pay,
      trade: TRADE_SET.has(trade) ? trade : "조공",
      lat,
      lng,
      address,
      shortAddress,
      applicants: 0,
    };

    setJobs((prev) => [...(Array.isArray(prev) ? prev : []), newJob]);
    setSelectedJob(newJob);
    if (isReady && kakao && map && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      map.panTo(new kakao.maps.LatLng(Number(lat), Number(lng)));
    }

    setJobForm({
      title: "",
      pay: "",
      trade: "조공",
      addressQuery: "",
      address: "",
      shortAddress: "",
      lat: null,
      lng: null,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: "6px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "12px",
    outline: "none",
    background: "#fff",
  };

  const renderJobForm = () => (
    <div className="bottom-sheet-job-form jobs-panel__form">
      <div className="bottom-sheet-job-form-title">공고 등록</div>
      <form onSubmit={handleJobSubmit} className="jobs-panel__form-grid">
        <input
          name="title"
          value={jobForm.title}
          onChange={handleFormChange}
          placeholder="공고 제목"
          style={inputStyle}
        />
        <select
          name="trade"
          value={jobForm.trade}
          onChange={handleFormChange}
          className="jobs-panel__trade-select"
          style={{ ...inputStyle, marginBottom: "6px", cursor: "pointer" }}
          aria-label="직종"
        >
          {TRADE_KEYS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          name="pay"
          value={jobForm.pay}
          onChange={handleFormChange}
          placeholder="급여"
          style={inputStyle}
        />
        <div className="jobs-panel__address-row" style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <input
            name="addressQuery"
            value={jobForm.addressQuery}
            onChange={handleFormChange}
            placeholder="주소 검색"
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          />
          <button type="button" className="filter-btn filter-btn--compact" onClick={handleAddressSearch}>
            검색
          </button>
        </div>
        {addressResults.map((r, i) => (
          <div
            key={`${r?.x ?? ""}-${r?.y ?? ""}-${i}`}
            role="button"
            tabIndex={0}
            className="bottom-sheet-address-hit"
            onClick={() => handleAddressSelect(r)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") handleAddressSelect(r);
            }}
          >
            {r?.road_address?.address_name || r?.address_name || ""}
          </div>
        ))}
        <button type="submit" className="main-btn main-btn--compact jobs-panel__submit">
          등록
        </button>
      </form>
    </div>
  );

  return (
    <div className="map-tab-page">
      <header className="map-tab-page__header">
        <h1 className="map-tab-page__title">지도</h1>
        <div className="map-tab-page__modes" role="group" aria-label="모드">
          <button
            type="button"
            className={`map-tab-page__mode${roleMode === "boss" ? " map-tab-page__mode--active" : ""}`}
            onClick={() => setRoleMode("boss")}
          >
            오야지
          </button>
          <button
            type="button"
            className={`map-tab-page__mode${roleMode === "tech" ? " map-tab-page__mode--active" : ""}`}
            onClick={() => setRoleMode("tech")}
          >
            기술자
          </button>
        </div>
        <p className="map-tab-page__hint">
          {zoomFar ? "멀리서 보는 중 · 마커가 모여 표시됩니다. 확대하면 말풍선으로 바뀝니다." : "근처 공고를 말풍선으로 확인하세요."}
        </p>
      </header>

      <div className="map-tab-page__map">
        <MapCanvas containerRef={mapRef} />
      </div>

      <section className="map-tab-page__panel">
        <div className="map-tab-page__panel-title">근처 공고 · {jobs.length}건</div>

        <div className={`bottom-sheet-selected-card jobs-panel__selected ${!selectedJob ? "is-hidden" : ""}`}>
          {selectedJob && (
            <>
              <button type="button" className="bottom-sheet-selected-close" onClick={() => setSelectedJob(null)}>
                ✕
              </button>
              <div className="bottom-sheet-selected-label">선택</div>
              <strong>{selectedJob.title}</strong>
              <p className="bottom-sheet-selected-pay">{selectedJob.pay}</p>
              <p className="bottom-sheet-selected-meta">📍 {selectedJob.shortAddress || selectedJob.address}</p>
              <p className="bottom-sheet-selected-meta">👥 지원 {(selectedJob.applicants || 0)}명</p>
              <button type="button" className="main-btn bottom-sheet-apply-btn" onClick={() => handleApplyJob(selectedJob)}>
                지원하기
              </button>
            </>
          )}
        </div>

        <div className="bottom-sheet-list-area jobs-panel__list" style={{ maxHeight: "none", flex: "none" }}>
          <JobList
            jobs={jobs}
            selectedJob={selectedJob}
            onJobClick={handleJobCardClick}
            onApplyJob={handleApplyJob}
            idSuffix="-map"
            listClassName="job-list--geo"
          />
        </div>

        {renderJobForm()}
      </section>
    </div>
  );
}
