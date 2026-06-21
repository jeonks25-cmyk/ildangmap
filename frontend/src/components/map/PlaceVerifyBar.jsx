import React, { useCallback, useMemo } from "react";
import { getMapItemKey } from "../../utils/mapItemModel";
import { usePlaceModerationStore } from "../../store/usePlaceModerationStore";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { getPlaceRowTitle } from "../../utils/placeDistance";
import "./place-verify-bar.css";

export default function PlaceVerifyBar({ place, onModerationChange }) {
  const requireAuth = useRequireAuth("post");
  const placeKey = useMemo(() => getMapItemKey(place), [place]);
  const revision = usePlaceModerationStore((s) => s.revision);
  const getRecord = usePlaceModerationStore((s) => s.getRecord);
  const submitVerifyVote = usePlaceModerationStore((s) => s.submitVerifyVote);
  const record = getRecord(placeKey);
  void revision;

  const correct = record?.verify?.correct || 0;
  const wrong = record?.verify?.wrong || 0;
  const myVote = record?.verify?.myVote || null;
  const title = getPlaceRowTitle(place);
  const mapItemId = place?.source?.id || place?.sourceId || place?.id || "";

  const handleVote = useCallback(
    (vote) => {
      if (!requireAuth()) return;
      const next = submitVerifyVote(placeKey, vote, { title, mapItemId });
      onModerationChange?.(place, next);
    },
    [mapItemId, onModerationChange, place, placeKey, requireAuth, submitVerifyVote, title],
  );

  return (
    <section className="place-verify-bar" aria-label="장소 정보 검증">
      <p className="place-verify-bar__lead">이 장소 정보가 맞나요?</p>
      <div className="place-verify-bar__counts">
        <span className="place-verify-bar__count place-verify-bar__count--correct">정보 맞음 {correct}</span>
        <span className="place-verify-bar__count place-verify-bar__count--wrong">정보 틀림 {wrong}</span>
      </div>
      <div className="place-verify-bar__actions">
        <button
          type="button"
          className={`place-verify-bar__btn place-verify-bar__btn--correct${myVote === "correct" ? " is-active" : ""}`}
          onClick={() => handleVote("correct")}
        >
          ✅ 정보 맞음
        </button>
        <button
          type="button"
          className={`place-verify-bar__btn place-verify-bar__btn--wrong${myVote === "wrong" ? " is-active" : ""}`}
          onClick={() => handleVote("wrong")}
        >
          🚨 정보 틀림
        </button>
      </div>
    </section>
  );
}
