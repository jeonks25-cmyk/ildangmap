import { useEffect, useMemo, useRef } from "react";
import { normalizeQuoteStatus } from "../constants/quoteStatus";
import { renderMapItemOverlay } from "../overlays/mapItemOverlay";
import {
  buildEstimateMarkerContentKey,
  buildEstimatesOverlaySignature,
} from "../utils/mapOverlaySignature";
import { bindMarkerPointerTarget } from "../utils/mapMarkerPointer";
import { applyMapOverlayPassthrough } from "../utils/mapOverlayPassthrough";
import { mapEstimateToMapItem } from "../utils/mapItemModel";

function detachOverlayEntry(entry) {
  if (!entry) return;
  entry.unbindPointer?.();
  entry.overlay?.setMap?.(null);
}

function mountMarkerInteraction(kakao, map, anchorEl, overlay, request, onMarkerClick) {
  const bubbleEl = anchorEl.querySelector(".geo-estimate-marker");
  if (!bubbleEl) {
    overlay.setMap(null);
    return null;
  }
  applyMapOverlayPassthrough(anchorEl, bubbleEl);
  const unbindPointer = bindMarkerPointerTarget(bubbleEl, () => onMarkerClick?.(request));
  return { bubbleEl, unbindPointer };
}

function createOverlayEntry(kakao, map, request, onMarkerClick) {
  const lat = Number(request.lat);
  const lng = Number(request.lng);
  const position = new kakao.maps.LatLng(lat, lng);
  const wrap = document.createElement("div");
  wrap.innerHTML = renderMapItemOverlay(mapEstimateToMapItem(request));
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

  const interaction = mountMarkerInteraction(kakao, map, anchorEl, overlay, request, onMarkerClick);
  if (!interaction) return null;

  const status = normalizeQuoteStatus(request);
  const zIndex = status === "quote_open" ? 16 : 12;

  if (typeof overlay.setZIndex === "function") {
    overlay.setZIndex(zIndex);
  }

  return {
    request,
    requestId: request.id,
    contentKey: buildEstimateMarkerContentKey(request),
    quoteStatus: status,
    lat,
    lng,
    overlay,
    anchorEl,
    bubbleEl: interaction.bubbleEl,
    unbindPointer: interaction.unbindPointer,
  };
}

function replaceOverlayContent(entry, kakao, map, request, onMarkerClick) {
  entry.unbindPointer?.();
  const wrap = document.createElement("div");
  wrap.innerHTML = renderMapItemOverlay(mapEstimateToMapItem(request));
  const nextAnchor = wrap.firstElementChild;
  if (!nextAnchor) return;

  if (typeof entry.overlay.setContent === "function") {
    entry.overlay.setContent(nextAnchor);
  }
  entry.anchorEl = nextAnchor;
  entry.quoteStatus = normalizeQuoteStatus(request);
  const interaction = mountMarkerInteraction(kakao, map, nextAnchor, entry.overlay, request, onMarkerClick);
  if (interaction) {
    entry.bubbleEl = interaction.bubbleEl;
    entry.unbindPointer = interaction.unbindPointer;
  }
}

export default function useEstimateMarkers({
  isReady,
  kakao,
  map,
  requests,
  requestsSignature: requestsSignatureProp,
  selectedEstimateId,
  onMarkerClick,
  overlaysEnabled = true,
}) {
  const overlayMapRef = useRef(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  const requestsRef = useRef(requests);

  const computedSignature = useMemo(() => buildEstimatesOverlaySignature(requests), [requests]);
  const requestsSignature = requestsSignatureProp ?? computedSignature;

  onMarkerClickRef.current = onMarkerClick;
  requestsRef.current = requests;

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) {
      overlayMapRef.current.forEach((entry) => detachOverlayEntry(entry));
      overlayMapRef.current.clear();
      return undefined;
    }

    const list = Array.isArray(requestsRef.current) ? requestsRef.current : [];
    const nextIds = new Set();

    list.forEach((request) => {
      if (!request || request.id == null) return;
      const lat = Number(request.lat);
      const lng = Number(request.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const id = request.id;
      nextIds.add(id);
      const nextStatus = normalizeQuoteStatus(request);

      const existing = overlayMapRef.current.get(id);
      if (existing) {
        if (existing.lat !== lat || existing.lng !== lng) {
          existing.overlay?.setPosition?.(new kakao.maps.LatLng(lat, lng));
          existing.lat = lat;
          existing.lng = lng;
        }
        if (existing.quoteStatus !== nextStatus) {
          replaceOverlayContent(existing, kakao, map, request, (r) => onMarkerClickRef.current?.(r));
        }
        existing.request = request;
        return;
      }

      const entry = createOverlayEntry(kakao, map, request, (r) => onMarkerClickRef.current?.(r));
      if (entry) overlayMapRef.current.set(id, entry);
    });

    overlayMapRef.current.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        detachOverlayEntry(entry);
        overlayMapRef.current.delete(id);
      }
    });

    return undefined;
  }, [isReady, kakao, map, requestsSignature, overlaysEnabled]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) return;

    overlayMapRef.current.forEach((it) => {
      const isSelected = selectedEstimateId != null && it.requestId === selectedEstimateId;
      it.anchorEl?.classList?.toggle?.("geo-estimate-marker-anchor--selected", isSelected);
      const status = it.quoteStatus || normalizeQuoteStatus(it.request);
      const z = isSelected ? 42 : status === "quote_open" ? 16 : 12;
      if (typeof it.overlay?.setZIndex === "function") {
        it.overlay.setZIndex(z);
      }
    });
  }, [isReady, kakao, map, selectedEstimateId, overlaysEnabled]);

  useEffect(() => {
    const overlayMap = overlayMapRef.current;
    return () => {
      overlayMap.forEach((entry) => detachOverlayEntry(entry));
      overlayMap.clear();
    };
  }, []);
}
