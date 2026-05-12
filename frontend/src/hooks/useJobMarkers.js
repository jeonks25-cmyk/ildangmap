import { useEffect, useRef } from "react";
import { getJobSpeechBubbleHtml } from "../overlays/jobSpeechBubbleOverlay";

function isSameJob(a, b) {
  if (!a || !b) return false;
  if (a.id != null && b.id != null) return a.id === b.id;
  return a.title === b.title && a.lat === b.lat && a.lng === b.lng && a.pay === b.pay;
}

export default function useJobMarkers({
  isReady,
  kakao,
  map,
  jobs,
  selectedJob,
  onMarkerClick,
  overlaysEnabled = true,
}) {
  const itemsRef = useRef([]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) {
      itemsRef.current.forEach((it) => {
        if (it?.bubbleEl && it.stopMap && it.onClick) {
          it.bubbleEl.removeEventListener("mousedown", it.stopMap, true);
          it.bubbleEl.removeEventListener("touchstart", it.stopMap, { capture: true });
          it.bubbleEl.removeEventListener("click", it.onClick, true);
        }
        it?.overlay?.setMap?.(null);
      });
      itemsRef.current = [];
      return undefined;
    }

    const items = [];
    const list = Array.isArray(jobs) ? jobs : [];

    list.forEach((job) => {
      if (!job) return;
      const lat = Number(job.lat);
      const lng = Number(job.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const position = new kakao.maps.LatLng(lat, lng);

      const wrap = document.createElement("div");
      wrap.innerHTML = getJobSpeechBubbleHtml(job);
      const anchorEl = wrap.firstElementChild;
      if (!anchorEl) return;

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: anchorEl,
        yAnchor: 1,
        xAnchor: 0.5,
        clickable: true,
      });

      const bubbleEl = anchorEl.querySelector(".job-pin-marker");
      if (!bubbleEl) {
        overlay.setMap(null);
        return;
      }

      const stopMap = (e) => {
        e.stopPropagation();
      };

      const onClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onMarkerClick?.(job);
      };

      bubbleEl.addEventListener("mousedown", stopMap, true);
      bubbleEl.addEventListener("touchstart", stopMap, { capture: true, passive: true });
      bubbleEl.addEventListener("click", onClick, true);

      items.push({
        job,
        overlay,
        anchorEl,
        bubbleEl,
        stopMap,
        onClick,
      });
    });

    itemsRef.current = items;

    return () => {
      itemsRef.current.forEach((it) => {
        if (it?.bubbleEl && it.stopMap && it.onClick) {
          it.bubbleEl.removeEventListener("mousedown", it.stopMap, true);
          it.bubbleEl.removeEventListener("touchstart", it.stopMap, { capture: true });
          it.bubbleEl.removeEventListener("click", it.onClick, true);
        }
        it?.overlay?.setMap?.(null);
      });
      itemsRef.current = [];
    };
  }, [isReady, kakao, map, jobs, onMarkerClick, overlaysEnabled]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) return;
    if (!itemsRef.current.length) return;

    itemsRef.current.forEach((it) => {
      const isSelected = isSameJob(selectedJob, it.job);
      it.anchorEl?.classList?.toggle?.("job-pin-marker-anchor--selected", isSelected);
      if (typeof it.overlay?.setZIndex === "function") {
        it.overlay.setZIndex(isSelected ? 40 : 12);
      }
    });
  }, [isReady, kakao, map, selectedJob, overlaysEnabled]);
}
