import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFeedbackAdminAccess } from "../api/feedbackApi";
import { isMockApiEnabled } from "../api/client";
import { PLACE_MODERATION_STATUS } from "../constants/placeModeration";
import { useMapItemStore } from "../store/useMapItemStore";
import { usePlaceModerationStore } from "../store/usePlaceModerationStore";
import { useUiStore } from "../store/useUiStore";
import { formatChangeHistoryWhen } from "../utils/placeInfoCard";
import { formatModerationStatusLabel } from "../utils/placeModeration";
import "../styles/place-moderation-admin.css";

const SORT_OPTIONS = [
  { value: "recent", label: "최근 신고 순" },
  { value: "reports", label: "신고 많은 순" },
];

export default function PlaceReportAdminPage() {
  const navigate = useNavigate();
  const showAppToast = useUiStore((s) => s.showAppToast);
  const removeMapItem = useMapItemStore((s) => s.removeMapItem);
  const updateMapItem = useMapItemStore((s) => s.updateMapItem);
  const fetchAdminList = usePlaceModerationStore((s) => s.fetchAdminList);
  const adminSetStatus = usePlaceModerationStore((s) => s.adminSetStatus);
  const adminDeletePlace = usePlaceModerationStore((s) => s.adminDeletePlace);
  const mapItems = useMapItemStore((s) => s.items);

  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [sort, setSort] = useState("reports");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminList(sort);
      setRows(result.items || []);
      setStats(result.stats);
    } catch (error) {
      showAppToast(error?.message || "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchAdminList, showAppToast, sort]);

  useEffect(() => {
    if (isMockApiEnabled()) {
      setHasAccess(true);
      setAccessChecked(true);
      return;
    }
    let cancelled = false;
    fetchFeedbackAdminAccess()
      .then((result) => {
        if (!cancelled) {
          setHasAccess(Boolean(result?.admin));
          setAccessChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasAccess(false);
          setAccessChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    refresh();
  }, [hasAccess, refresh, mapItems]);

  const summary = useMemo(() => {
    if (stats) {
      return {
        total: stats.totalPlaces ?? 0,
        pending: stats.pendingReview ?? 0,
        hidden: stats.hidden ?? 0,
        deleteCandidate: stats.deleteCandidate ?? 0,
      };
    }
    const pending = rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.PENDING_REVIEW).length;
    const hidden = rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.HIDDEN).length;
    const deleteCandidate = rows.filter((r) => r.moderationStatus === PLACE_MODERATION_STATUS.DELETE_CANDIDATE).length;
    return { pending, hidden, deleteCandidate, total: rows.length };
  }, [rows, stats]);

  const resolveMapItemId = (row) => {
    if (row.mapItemId) return row.mapItemId;
    const match = mapItems.find((item) => {
      const key = item.sourceMeta?.placeKey || `${item.type}:${item.sourceId || item.id}`;
      return key === row.placeKey;
    });
    return match?.source?.id || match?.sourceId || match?.id || "";
  };

  const syncMapItemStatus = (mapItemId, status, reportCount) => {
    if (!mapItemId) return;
    updateMapItem(mapItemId, {
      sourceMeta: {
        moderationStatus: status,
        reportCount,
      },
    });
  };

  const runAction = async (row, action) => {
    setBusyKey(`${row.placeKey}:${action}`);
    try {
      if (action === "edit") {
        showAppToast("지도에서 해당 장소를 선택해 정보 수정을 진행해 주세요.");
        navigate("/map");
        return;
      }
      const mapItemId = resolveMapItemId(row);
      if (action === "hide") {
        const record = await adminSetStatus(row.placeKey, PLACE_MODERATION_STATUS.HIDDEN);
        syncMapItemStatus(mapItemId, record.moderationStatus, record.reportCount);
        showAppToast("장소를 숨김 처리했습니다.");
      }
      if (action === "delete") {
        await adminDeletePlace(row.placeKey);
        if (mapItemId) removeMapItem(mapItemId);
        showAppToast("장소를 삭제 처리했습니다.");
      }
      await refresh();
    } catch (error) {
      showAppToast(error?.message || "처리에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="place-moderation-admin">
      <header className="place-moderation-admin__header">
        <button type="button" className="place-moderation-admin__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="place-moderation-admin__eyebrow">관리자</p>
          <h1 className="place-moderation-admin__title">장소 신고 검수</h1>
          <p className="place-moderation-admin__lead">
            신고 3회 → 검수 대기 · 5회 → 지도 숨김 · 10회 → 삭제 후보
          </p>
        </div>
      </header>

      {!accessChecked ? (
        <p className="place-moderation-admin__status">권한 확인 중…</p>
      ) : !hasAccess ? (
        <section className="place-moderation-admin__card">
          <p>관리자만 접근할 수 있습니다.</p>
          <button type="button" className="place-moderation-admin__primary" onClick={() => navigate("/settings")}>
            설정으로 돌아가기
          </button>
        </section>
      ) : (
        <>
          <section className="place-moderation-admin__summary" aria-label="검수 현황">
            <span>전체 {summary.total}개</span>
            <span>검수대기 {summary.pending}개</span>
            <span>숨김 {summary.hidden}개</span>
            <span>삭제후보 {summary.deleteCandidate}개</span>
          </section>

          <div className="place-moderation-admin__toolbar">
            <label className="place-moderation-admin__sort-label" htmlFor="place-report-sort">
              정렬
            </label>
            <select
              id="place-report-sort"
              className="place-moderation-admin__sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="place-moderation-admin__status">목록 불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="place-moderation-admin__status">신고·검수 대상 장소가 없습니다.</p>
          ) : (
            <ul className="place-moderation-admin__list">
              {rows.map((row) => (
                <li key={row.placeKey} className={`place-moderation-admin__item status-${row.moderationStatus}`}>
                  <div className="place-moderation-admin__item-head">
                    <strong>{row.title || row.placeKey}</strong>
                    <span className="place-moderation-admin__badge">{formatModerationStatusLabel(row.moderationStatus)}</span>
                  </div>
                  <dl className="place-moderation-admin__meta">
                    <div>
                      <dt>신고</dt>
                      <dd>{row.reportCount}건</dd>
                    </div>
                    <div>
                      <dt>검증</dt>
                      <dd>
                        ✅ {row.correctCount || 0} · 🚨 {row.wrongCount || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>최근 사유</dt>
                      <dd>{row.latestReason}</dd>
                    </div>
                    <div>
                      <dt>최근 신고</dt>
                      <dd>{formatChangeHistoryWhen(row.lastReportAt)}</dd>
                    </div>
                  </dl>
                  <div className="place-moderation-admin__actions">
                    <button
                      type="button"
                      className="place-moderation-admin__action"
                      disabled={busyKey.startsWith(row.placeKey)}
                      onClick={() => runAction(row, "edit")}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="place-moderation-admin__action"
                      disabled={busyKey.startsWith(row.placeKey)}
                      onClick={() => runAction(row, "hide")}
                    >
                      숨김
                    </button>
                    <button
                      type="button"
                      className="place-moderation-admin__action place-moderation-admin__action--danger"
                      disabled={busyKey.startsWith(row.placeKey)}
                      onClick={() => runAction(row, "delete")}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
