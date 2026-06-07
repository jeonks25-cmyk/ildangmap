import { useEffect, useMemo, useRef } from "react";
import { renderMapItemOverlay } from "../overlays/mapItemOverlay";
import { buildJobMarkerContentKey, buildJobsOverlaySignature } from "../utils/mapOverlaySignature";
import { bindMarkerPointerTarget } from "../utils/mapMarkerPointer";
import { applyMapOverlayPassthrough } from "../utils/mapOverlayPassthrough";
import { mapJobToMapItem } from "../utils/mapItemModel";

/** @typedef {object} OverlayEntry */

function detachOverlayEntry(entry) {
  if (!entry) return;
  if (typeof entry.unbindPointer === "function") {
    entry.unbindPointer();
    entry.unbindPointer = null;
  }
  entry.overlay?.setMap?.(null);
}

/**
 * DOM + Kakao CustomOverlay 생성 (클릭 바인딩은 bindOverlayEntryClick에서)
 */
function resolveOverlayOptions(markerMode, overlayDensity) {
  if (markerMode === "pin") return { mode: "pin", density: "compact" };
  return { mode: "ops", density: overlayDensity === "minimal" ? "minimal" : "compact" };
}

function createOverlayEntry(kakao, map, job, markerMode, overlayDensity) {
  const lat = Number(job.lat);
  const lng = Number(job.lng);
  const position = new kakao.maps.LatLng(lat, lng);

  const wrap = document.createElement("div");
  const htmlOpts = resolveOverlayOptions(markerMode, overlayDensity);
  wrap.innerHTML = renderMapItemOverlay(mapJobToMapItem(job), htmlOpts);
  const anchorEl = wrap.firstElementChild;
  if (!anchorEl) return null;

  const overlay = new kakao.maps.CustomOverlay({
    map,
    position,
    content: anchorEl,
    yAnchor: 1,
    xAnchor: 0.5,
    clickable: false,
  });

  const bubbleEl = anchorEl.querySelector(
    ".geo-pin-marker, .geo-pay-marker, .geo-estimate-marker, .geo-hmarker, .geo-compact-marker, .geo-place-marker, .job-pin-marker"
  );
  if (!bubbleEl) {
    overlay.setMap(null);
    return null;
  }

  applyMapOverlayPassthrough(anchorEl, bubbleEl);

  return {
    job,
    jobId: job.id,
    lat,
    lng,
    overlay,
    anchorEl,
    bubbleEl,
    unbindPointer: null,
    markerMode,
    contentKey: buildJobMarkerContentKey(job, markerMode, overlayDensity),
    overlayDensity,
  };
}

function bindOverlayEntryClick(entry, job, onMarkerClickRef) {
  if (!entry?.bubbleEl) return;
  if (typeof entry.unbindPointer === "function") {
    entry.unbindPointer();
  }
  entry.unbindPointer = bindMarkerPointerTarget(entry.bubbleEl, () => onMarkerClickRef.current?.(job));
}

function replaceOverlayEntry(kakao, map, entry, job, markerMode, overlayDensity, onMarkerClickRef) {
  const z =
    typeof entry.overlay?.getZIndex === "function" ? entry.overlay.getZIndex() : 12;
  detachOverlayEntry(entry);
  const next = createOverlayEntry(kakao, map, job, markerMode, overlayDensity);
  if (!next) return null;
  bindOverlayEntryClick(next, job, onMarkerClickRef);
  if (typeof next.overlay?.setZIndex === "function") {
    next.overlay.setZIndex(z);
  }
  return next;
}

export function useJobsOverlaySignature(jobs, markerMode = "pin", overlayDensity = "compact") {
  return useMemo(
    () => buildJobsOverlaySignature(jobs, markerMode, overlayDensity),
    [jobs, markerMode, overlayDensity]
  );
}

export default function useJobMarkers({
  isReady,
  kakao,
  map,
  jobs,
  jobsSignature: jobsSignatureProp,
  selectedJobId,
  onMarkerClick,
  overlaysEnabled = true,
  markerMode = "pin",
  overlayDensity = "compact",
}) {
  const overlayMapRef = useRef(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  const jobsRef = useRef(jobs);
  const markerModeRef = useRef(markerMode);
  const overlayDensityRef = useRef(overlayDensity);

  const computedSignature = useJobsOverlaySignature(jobs, markerMode, overlayDensity);
  const jobsSignature = jobsSignatureProp ?? computedSignature;

  onMarkerClickRef.current = onMarkerClick;
  jobsRef.current = jobs;
  markerModeRef.current = markerMode;
  overlayDensityRef.current = overlayDensity;

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) {
      overlayMapRef.current.forEach((entry) => detachOverlayEntry(entry));
      overlayMapRef.current.clear();
      return undefined;
    }

    const list = Array.isArray(jobsRef.current) ? jobsRef.current : [];
    const mode = markerModeRef.current;
    const density = overlayDensityRef.current;
    const nextIds = new Set();

    list.forEach((job) => {
      if (!job || job.id == null) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const id = job.id;
      nextIds.add(id);
      const contentKey = buildJobMarkerContentKey(job, mode, density);

      const existing = overlayMapRef.current.get(id);
      if (existing) {
        const moved = existing.lat !== lat || existing.lng !== lng;
        const stale =
          existing.contentKey !== contentKey ||
          existing.markerMode !== mode ||
          existing.overlayDensity !== density;
        if (moved) {
          const position = new kakao.maps.LatLng(lat, lng);
          existing.overlay?.setPosition?.(position);
          existing.lat = lat;
          existing.lng = lng;
        }
        if (stale) {
          const replaced = replaceOverlayEntry(kakao, map, existing, job, mode, density, onMarkerClickRef);
          if (replaced) overlayMapRef.current.set(id, replaced);
        } else {
          existing.job = job;
        }
        return;
      }

      const entry = createOverlayEntry(kakao, map, job, mode, density);
      if (entry) {
        bindOverlayEntryClick(entry, job, onMarkerClickRef);
        overlayMapRef.current.set(id, entry);
      }
    });

    overlayMapRef.current.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        detachOverlayEntry(entry);
        overlayMapRef.current.delete(id);
      }
    });

    return undefined;
  }, [isReady, kakao, map, jobsSignature, overlaysEnabled]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) return;

    overlayMapRef.current.forEach((it) => {
      const isSelected = selectedJobId != null && it.jobId === selectedJobId;
      it.anchorEl?.classList?.toggle?.("geo-marker-anchor--selected", isSelected);
      it.anchorEl?.classList?.toggle?.("geo-place-marker-anchor--selected", isSelected);
      it.anchorEl?.classList?.toggle?.("job-pin-marker-anchor--selected", isSelected);
      if (typeof it.overlay?.setZIndex === "function") {
        it.overlay.setZIndex(isSelected ? 40 : 12);
      }
    });
  }, [isReady, kakao, map, selectedJobId, overlaysEnabled]);

  useEffect(() => {
    return () => {
      overlayMapRef.current.forEach((entry) => detachOverlayEntry(entry));
      overlayMapRef.current.clear();
    };
  }, []);
}
