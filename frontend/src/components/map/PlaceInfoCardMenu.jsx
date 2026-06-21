import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  buildReportFeedbackMessage,
  copyPlaceAddress,
  getPlaceInfoKey,
  needsPlaceReview,
  sharePlaceInfo,
  submitPlaceReport,
} from "../../utils/placeInfoCard";
import { getPlaceRowTitle } from "../../utils/placeDistance";
import PlaceInfoChangeHistorySheet from "./PlaceInfoChangeHistorySheet";
import PlaceInfoReportSheet from "./PlaceInfoReportSheet";
import "./place-info-card-menu.css";

const MENU_ITEMS = [
  { key: "history", label: "변경이력" },
  { key: "edit", label: "정보수정" },
  { key: "report", label: "신고하기" },
  { key: "share", label: "공유하기" },
  { key: "copy", label: "주소복사" },
];

export default function PlaceInfoCardMenu({ place, address = "", onEdit, onToast }) {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewFlag, setReviewFlag] = useState(false);
  const rootRef = useRef(null);
  const placeKey = getPlaceInfoKey(place);
  const title = getPlaceRowTitle(place);
  const resolvedAddress = String(address || place?.address || place?.meta || "").trim();

  useEffect(() => {
    setReviewFlag(needsPlaceReview(placeKey));
  }, [placeKey, reportOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("touchstart", onDoc, { capture: true });
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("touchstart", onDoc, { capture: true });
    };
  }, [open]);

  const toast = useCallback((message) => onToast?.(message), [onToast]);

  const handleMenuSelect = useCallback(
    async (key) => {
      setOpen(false);
      if (key === "history") {
        setHistoryOpen(true);
        return;
      }
      if (key === "edit") {
        onEdit?.(place);
        return;
      }
      if (key === "report") {
        setReportOpen(true);
        return;
      }
      if (key === "share") {
        const result = await sharePlaceInfo({ title, address: resolvedAddress });
        if (result.cancelled) return;
        if (result.ok) {
          toast(result.method === "share" ? "공유 메뉴를 열었습니다." : "링크를 복사했습니다.");
        } else {
          toast("공유할 수 없어요.");
        }
        return;
      }
      if (key === "copy") {
        const ok = await copyPlaceAddress(resolvedAddress);
        toast(ok ? "주소를 복사했습니다." : "복사할 주소가 없어요.");
      }
    },
    [onEdit, place, resolvedAddress, title, toast],
  );

  const handleReport = useCallback(
    (reason) => {
      const mapItemId = place?.source?.id || place?.sourceId || place?.id || "";
      const result = submitPlaceReport(placeKey, reason, { title, mapItemId, source: "menu" });
      setReportOpen(false);
      setReviewFlag(needsPlaceReview(placeKey));
      toast(buildReportFeedbackMessage(result.reportCount, result.moderationStatus));
    },
    [place, placeKey, title, toast],
  );

  return (
    <>
      {reviewFlag ? (
        <span className="place-info-card-menu__review" aria-label="검토 필요">
          검토 필요
        </span>
      ) : null}
      <div className="place-info-card-menu" ref={rootRef}>
        <button
          type="button"
          className="place-info-card-menu__trigger"
          aria-label="장소 메뉴"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        >
          ···
        </button>
        {open ? (
          <div className="place-info-card-menu__dropdown" role="menu">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className="place-info-card-menu__item"
                onClick={() => handleMenuSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <PlaceInfoChangeHistorySheet open={historyOpen} place={place} onClose={() => setHistoryOpen(false)} />
      <PlaceInfoReportSheet open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />
    </>
  );
}
