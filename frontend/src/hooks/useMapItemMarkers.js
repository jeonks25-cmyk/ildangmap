import { useEffect, useMemo, useRef } from "react";
import { renderMapItemOverlay } from "../overlays/mapItemOverlay";
import { bindMarkerPointerTarget } from "../utils/mapMarkerPointer";
import { applyMapOverlayPassthrough } from "../utils/mapOverlayPassthrough";
import { getMapItemKey } from "../utils/mapItemModel";

function detachOverlayEntry(entry) {
  if (!entry) return;
  entry.unbindPointer?.();
  entry.overlay?.setMap?.(null);
}

function buildMapItemSignature(items) {
  return (Array.isArray(items) ? items : [])
    .map(
      (item) =>
        `${getMapItemKey(item)}:${item?.lat}:${item?.lng}:${item?.title}:${item?.tone}:${
          item?.isArrivalRelevant ? "arrival" : ""
        }:${item?.isOperationDimmed ? "dim" : ""}:${item?.isOperationSticky ? "sticky" : ""}:${
          item?.operationPriority || ""
        }:${item?.arrivalRelevanceScore || 0}`
    )
    .sort()
    .join("|");
}

function createOverlayEntry(kakao, map, item, onMarkerClick) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const wrap = document.createElement("div");
  wrap.innerHTML = renderMapItemOverlay(item);
  const anchorEl = wrap.firstElementChild;
  if (!anchorEl) return null;

  const overlay = new kakao.maps.CustomOverlay({
    map,
    position: new kakao.maps.LatLng(lat, lng),
    content: anchorEl,
    yAnchor: 1,
    xAnchor: 0.5,
    clickable: false,
  });

  const bubbleEl = anchorEl.querySelector(".geo-life-marker");
  if (!bubbleEl) {
    overlay.setMap(null);
    return null;
  }
  applyMapOverlayPassthrough(anchorEl, bubbleEl);

  return {
    item,
    itemKey: getMapItemKey(item),
    contentKey: `${item?.title || ""}:${item?.meta || ""}:${item?.tone || ""}`,
    lat,
    lng,
    overlay,
    anchorEl,
    bubbleEl,
    unbindPointer: bindMarkerPointerTarget(bubbleEl, () => onMarkerClick?.(item)),
  };
}

export default function useMapItemMarkers({
  isReady,
  kakao,
  map,
  items,
  selectedItemKey,
  onMarkerClick,
  overlaysEnabled = true,
}) {
  const overlayMapRef = useRef(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  const itemsRef = useRef(items);
  const signature = useMemo(() => buildMapItemSignature(items), [items]);

  onMarkerClickRef.current = onMarkerClick;
  itemsRef.current = items;

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) {
      overlayMapRef.current.forEach((entry) => detachOverlayEntry(entry));
      overlayMapRef.current.clear();
      return undefined;
    }

    const nextKeys = new Set();
    (Array.isArray(itemsRef.current) ? itemsRef.current : []).forEach((item) => {
      const key = getMapItemKey(item);
      if (!key) return;
      nextKeys.add(key);
      const existing = overlayMapRef.current.get(key);
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      if (existing) {
        if (existing.lat !== lat || existing.lng !== lng) {
          existing.overlay?.setPosition?.(new kakao.maps.LatLng(lat, lng));
          existing.lat = lat;
          existing.lng = lng;
        }
        existing.item = item;
        existing.unbindPointer?.();
        existing.unbindPointer = bindMarkerPointerTarget(existing.bubbleEl, () => onMarkerClickRef.current?.(item));
        return;
      }
      const entry = createOverlayEntry(kakao, map, item, (next) => onMarkerClickRef.current?.(next));
      if (entry) overlayMapRef.current.set(key, entry);
    });

    overlayMapRef.current.forEach((entry, key) => {
      if (!nextKeys.has(key)) {
        detachOverlayEntry(entry);
        overlayMapRef.current.delete(key);
      }
    });
    return undefined;
  }, [isReady, kakao, map, overlaysEnabled, signature]);

  useEffect(() => {
    if (!isReady || !kakao || !map || !overlaysEnabled) return;
    overlayMapRef.current.forEach((entry) => {
      const isSelected = selectedItemKey && entry.itemKey === selectedItemKey;
      const isArrival = Boolean(entry.item?.isArrivalRelevant);
      const isDimmed = Boolean(entry.item?.isOperationDimmed);
      const isSticky = Boolean(entry.item?.isOperationSticky);
      entry.anchorEl?.classList?.toggle?.("geo-life-marker-anchor--selected", Boolean(isSelected));
      entry.anchorEl?.classList?.toggle?.("geo-life-marker-anchor--arrival", isArrival);
      entry.bubbleEl?.classList?.toggle?.("geo-life-marker--arrival", isArrival);
      entry.bubbleEl?.classList?.toggle?.("geo-life-marker--dimmed", isDimmed);
      entry.bubbleEl?.classList?.toggle?.("geo-life-marker--sticky", isSticky);
      entry.bubbleEl?.dataset && (entry.bubbleEl.dataset.priority = entry.item?.operationPriority || "optional");
      entry.overlay?.setZIndex?.(isSelected ? 42 : isSticky ? 30 : isArrival ? 24 : isDimmed ? 10 : 14);
    });
  }, [isReady, kakao, map, overlaysEnabled, selectedItemKey, signature]);

  useEffect(() => {
    const overlayMap = overlayMapRef.current;
    return () => {
      overlayMap.forEach((entry) => detachOverlayEntry(entry));
      overlayMap.clear();
    };
  }, []);
}
