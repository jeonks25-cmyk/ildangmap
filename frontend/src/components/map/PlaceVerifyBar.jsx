import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMapItemKey } from "../../utils/mapItemModel";
import { usePlaceModerationStore } from "../../store/usePlaceModerationStore";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserStore } from "../../store/useUserStore";
import { getPlaceRowTitle } from "../../utils/placeDistance";
import {
  buildVerifyCorrectFeedbackMessage,
  buildVerifyWrongFeedbackMessage,
} from "../../utils/placeModeration";
import "./place-verify-bar.css";

export default function PlaceVerifyBar({ place, onModerationChange, onToast }) {
  const requireAuth = useRequireAuth("post");
  const [wrongConfirmOpen, setWrongConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const placeKey = useMemo(() => getMapItemKey(place), [place]);
  const revision = usePlaceModerationStore((s) => s.revision);
  const getRecord = usePlaceModerationStore((s) => s.getRecord);
  const submitVerifyVote = usePlaceModerationStore((s) => s.submitVerifyVote);
  const syncFromServer = usePlaceModerationStore((s) => s.syncFromServer);
  const record = getRecord(placeKey);
  void revision;

  const correct = record?.verify?.correct || 0;
  const wrong = record?.verify?.wrong || 0;
  const myVote = record?.verify?.myVote || null;
  const title = getPlaceRowTitle(place);
  const mapItemId = place?.source?.id || place?.sourceId || place?.id || "";

  useEffect(() => {
    syncFromServer(placeKey, { title, mapItemId });
  }, [mapItemId, placeKey, syncFromServer, title]);

  useEffect(() => {
    if (!placeKey) {
      setWrongConfirmOpen(false);
    }
  }, [placeKey]);

  const ensureAuth = useCallback(() => {
    if (requireAuth()) return true;
    const { authReady, meVerified, meBootstrapLoading, session } = useUserStore.getState();
    if (!authReady || meBootstrapLoading || !meVerified) {
      onToast?.("잠시 후 다시 시도해 주세요.");
      return false;
    }
    if (!session?.isAuthenticated) {
      return false;
    }
    onToast?.("활동명 설정을 먼저 완료해주세요.");
    return false;
  }, [onToast, requireAuth]);

  const applyVoteResult = useCallback(
    (next) => {
      if (!next) return;
      onModerationChange?.(place, next);
    },
    [onModerationChange, place],
  );

  const handleCorrectVote = useCallback(async () => {
    if (!ensureAuth() || submitting) return;
    setSubmitting(true);
    try {
      const next = await submitVerifyVote(placeKey, "correct", { title, mapItemId });
      applyVoteResult(next);
      onToast?.(buildVerifyCorrectFeedbackMessage(next));
    } catch (error) {
      console.error("[PlaceVerifyBar] correct vote failed", error);
      onToast?.(error?.message || "표시에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [applyVoteResult, ensureAuth, mapItemId, onToast, placeKey, submitVerifyVote, submitting, title]);

  const handleWrongClick = useCallback(() => {
    if (!ensureAuth() || submitting) return;
    setWrongConfirmOpen(true);
  }, [ensureAuth, submitting]);

  const handleWrongConfirm = useCallback(async () => {
    if (!placeKey || submitting) return;
    setWrongConfirmOpen(false);
    setSubmitting(true);
    try {
      const next = await submitVerifyVote(placeKey, "wrong", { title, mapItemId });
      applyVoteResult(next);
      onToast?.(buildVerifyWrongFeedbackMessage(next));
    } catch (error) {
      console.error("[PlaceVerifyBar] wrong vote failed", error);
      onToast?.(error?.message || "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [applyVoteResult, mapItemId, onToast, placeKey, submitVerifyVote, submitting, title]);

  return (
    <>
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
            onClick={handleCorrectVote}
            disabled={submitting}
          >
            ✅ 정보 맞음
          </button>
          <button
            type="button"
            className={`place-verify-bar__btn place-verify-bar__btn--wrong${myVote === "wrong" ? " is-active" : ""}`}
            onClick={handleWrongClick}
            disabled={submitting}
          >
            🚨 정보 틀림
          </button>
        </div>
      </section>

      {wrongConfirmOpen ? (
        <div className="place-verify-confirm" role="presentation">
          <button
            type="button"
            className="place-verify-confirm__backdrop"
            aria-label="닫기"
            onClick={() => setWrongConfirmOpen(false)}
          />
          <section className="place-verify-confirm__panel" role="dialog" aria-modal="true" aria-label="정보 틀림 확인">
            <h3 className="place-verify-confirm__title">이 장소 정보가 잘못되었나요?</h3>
            <p className="place-verify-confirm__lead">확인 시 틀림 표시가 기록되며, 누적 시 검수 대상이 될 수 있습니다.</p>
            <div className="place-verify-confirm__actions">
              <button type="button" className="place-verify-confirm__btn" onClick={() => setWrongConfirmOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="place-verify-confirm__btn place-verify-confirm__btn--primary"
                onClick={handleWrongConfirm}
                disabled={submitting}
              >
                신고
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
