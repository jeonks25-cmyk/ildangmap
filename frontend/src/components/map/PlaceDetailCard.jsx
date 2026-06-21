import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MAP_ITEM_TYPE_LABEL } from "../../constants/mapItemTypes";
import { buildSiteBoardMock, postsToComments, sortBoardPosts } from "../../mock/buildSiteBoardMock";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserStore } from "../../store/useUserStore";
import { useUiStore } from "../../store/useUiStore";
import { buildMapNavigationOptions, hasMapNavigationOptions } from "../../utils/mapNavigation";
import MapDirectionsSheet from "./MapDirectionsSheet";
import { getDisplayNickname } from "../../utils/displayNickname";
import { getPlaceRowDescription, getPlaceRowTitle, getPlaceTypeIcon } from "../../utils/placeDistance";
import { buildReportFeedbackMessage, getPlaceInfoKey, needsPlaceReview, submitPlaceReport } from "../../utils/placeInfoCard";
import SiteBoardComposeSheet from "./SiteBoardComposeSheet";
import SiteBoardPostDetailSheet from "./SiteBoardPostDetailSheet";
import PlaceVerifyBar from "./PlaceVerifyBar";
import "./map-place-detail-card.css";
import "./map-site-board.css";

function formatVerifySummary(correctCount, wrongCount) {
  const correct = Number(correctCount) || 0;
  const wrong = Number(wrongCount) || 0;
  if (!correct && !wrong) return null;
  return `맞음 ${correct} · 틀림 ${wrong}`;
}

function BoardPostRow({ post, onOpen }) {
  const verifyLabel = formatVerifySummary(post.correctCount, post.wrongCount);
  return (
    <button type="button" className="place-detail-card__board-row" onClick={() => onOpen?.(post)} aria-label={`${post.author} ${post.text}`}>
      <span className="place-detail-card__board-author">{post.author}</span>
      <span className="place-detail-card__board-sep" aria-hidden>
        ·
      </span>
      <span className="place-detail-card__board-text">{post.text}</span>
      {verifyLabel ? (
        <>
          <span className="place-detail-card__board-sep" aria-hidden>
            ·
          </span>
          <span className="place-detail-card__board-verify">{verifyLabel}</span>
        </>
      ) : null}
    </button>
  );
}

/**
 * 장소 상세 단일 카드 — 목록·마커·검색 등 모든 진입 경로 공통
 */
export default function PlaceDetailCard({ place, onToast, onEdit, onUpdatePlace, showInfoMenu = false }) {
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const requireAuth = useRequireAuth("post");
  const authPromptOpen = useUiStore((s) => s.authPromptOpen);
  const myNickname = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);
  const myUserId = String(profile?.id || sessionUser?.id || myNickname || "guest");

  const placeKey = useMemo(() => (place ? getPlaceInfoKey(place) : ""), [place]);

  const boardSeed = useMemo(
    () =>
      place
        ? buildSiteBoardMock(place, {
            currentUserNickname: myNickname,
            currentUserId: myUserId,
          })
        : null,
    [myNickname, myUserId, place],
  );

  const [posts, setPosts] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [detailPost, setDetailPost] = useState(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);

  useEffect(() => {
    if (!boardSeed) return;
    setPosts(sortBoardPosts(boardSeed.posts));
    setDetailPost(null);
  }, [boardSeed]);

  useEffect(() => {
    if (!authPromptOpen) return;
    setComposeOpen(false);
    setDetailPost(null);
  }, [authPromptOpen]);

  const persistComments = useCallback(
    (nextPosts) => {
      if (!onUpdatePlace || !place) return;
      onUpdatePlace(place, { comments: postsToComments(nextPosts) });
    },
    [onUpdatePlace, place],
  );

  const handleModerationSync = useCallback(
    (_place, record) => {
      if (!record) return;
      onUpdatePlace?.(_place, {
        sourceMeta: {
          ...(_place.sourceMeta || {}),
          correctCount: record.correctCount,
          wrongCount: record.wrongCount,
          moderationStatus: record.moderationStatus,
        },
      });
    },
    [onUpdatePlace],
  );

  if (!place || !boardSeed) return null;

  const category = MAP_ITEM_TYPE_LABEL[place.layer || place.type] || "장소";
  const description = getPlaceRowDescription(place);
  const address = String(place.address || place.meta || boardSeed.address || "").trim() || boardSeed.address;
  const title = getPlaceRowTitle(place);
  const reviewNeeded = showInfoMenu && needsPlaceReview(placeKey);

  const savedMeta = place.source?.meta && typeof place.source.meta === "object" ? place.source.meta : {};
  const navigationOptions = buildMapNavigationOptions({
    lat: place.lat,
    lng: place.lng,
    title,
    address: boardSeed.address,
    savedLinks: savedMeta,
  });
  const canNavigate = hasMapNavigationOptions(navigationOptions);
  const distanceLabel = place.distanceLabel || "—";
  const summaryLine = [distanceLabel !== "—" ? distanceLabel : null, category].filter(Boolean).join(" · ");

  const toast = (message) => {
    if (onToast) onToast(message);
  };

  const editingPost = posts.find((p) => p.id === editingId);
  const mapItemId = place?.source?.id || place?.sourceId || place?.id || "";

  const handleReport = async (post, reason) => {
    if (!requireAuth()) return;
    try {
      const result = await submitPlaceReport(placeKey, reason, {
        title,
        mapItemId,
        source: post ? `board:${post.id}` : "place",
      });
      toast(buildReportFeedbackMessage(result.reportCount, result.moderationStatus));
      onUpdatePlace?.(place, {
        sourceMeta: {
          ...(place.sourceMeta || {}),
          reportCount: result.reportCount,
          moderationStatus: result.moderationStatus,
        },
      });
    } catch (error) {
      toast(error?.message || "신고 접수에 실패했습니다.");
    }
  };

  const openWrite = () => {
    if (!requireAuth()) return;
    setComposeMode("create");
    setEditingId(null);
    setComposeOpen(true);
  };

  const openEditPost = (post) => {
    if (!requireAuth()) return;
    setDetailPost(null);
    setComposeMode("edit");
    setEditingId(post.id);
    setComposeOpen(true);
  };

  const handleSavePost = (text) => {
    if (composeMode === "edit" && editingId) {
      setPosts((prev) => {
        const next = sortBoardPosts(prev.map((p) => (p.id === editingId ? { ...p, text } : p)));
        persistComments(next);
        return next;
      });
      toast("글을 수정했습니다");
      return;
    }
    const newPost = {
      id: `p-new-${Date.now()}`,
      author: boardSeed.currentUser,
      text,
      correctCount: 0,
      wrongCount: 0,
      myVerifyVote: null,
      isMine: true,
    };
    setPosts((prev) => {
      const next = sortBoardPosts([newPost, ...prev]);
      persistComments(next);
      return next;
    });
    toast("글을 등록했습니다");
  };

  const handleDeletePost = (post) => {
    if (!post.isMine) return;
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== post.id);
      persistComments(next);
      return next;
    });
    setDetailPost(null);
    toast("글을 삭제했습니다");
  };

  const handlePostVerify = (post, vote, counts) => {
    setPosts((prev) => {
      const next = sortBoardPosts(
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                correctCount: counts.correctCount,
                wrongCount: counts.wrongCount,
                myVerifyVote: counts.myVerifyVote,
              }
            : p,
        ),
      );
      persistComments(next);
      return next;
    });
  };

  return (
    <>
      <div className="place-detail-card__scroll">
        <section className="place-detail-card__info" aria-label="장소 정보">
          <div className="place-detail-card__head">
            <h3 className="place-detail-card__place-title">
              <span className="place-detail-card__place-icon" aria-hidden="true">
                {getPlaceTypeIcon(place.layer || place.type)}
              </span>
              <span className="place-detail-card__place-title-text">{title}</span>
              {reviewNeeded ? (
                <span className="place-detail-card__review-badge" aria-label="검수 필요">
                  검수 필요
                </span>
              ) : null}
            </h3>
            {canNavigate ? (
              <button
                type="button"
                className="place-detail-card__nav-btn"
                onClick={() => setDirectionsOpen(true)}
                aria-haspopup="dialog"
              >
                길찾기
              </button>
            ) : null}
          </div>

          <p className="place-detail-card__address">{address}</p>
          {summaryLine ? <p className="place-detail-card__summary">{summaryLine}</p> : null}
          {description ? <p className="place-detail-card__desc">{description}</p> : null}

          <PlaceVerifyBar place={place} onModerationChange={handleModerationSync} />

          {!showInfoMenu ? (
            <button
              type="button"
              className="place-detail-card__edit"
              onClick={() => {
                if (!requireAuth()) return;
                onEdit?.(place);
              }}
            >
              수정
            </button>
          ) : null}
        </section>

        <section className="place-detail-card__board site-board site-board--compact" aria-label="현장 자유게시판">
          <div className="site-board__head">
            <h3 className="site-board__title">현장 자유게시판</h3>
            <button type="button" className="site-board__write" onClick={openWrite}>
              글쓰기
            </button>
          </div>
          <div className="site-board__list">
            {posts.length ? (
              posts.map((post) => <BoardPostRow key={post.id} post={post} onOpen={setDetailPost} />)
            ) : (
              <div className="site-board__empty">
                <p className="site-board__empty-title">아직 등록된 글이 없습니다.</p>
                <p className="site-board__empty-hint">첫 번째 현장 정보를 남겨보세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <MapDirectionsSheet
        open={directionsOpen}
        title="길찾기"
        options={navigationOptions}
        onClose={() => setDirectionsOpen(false)}
      />

      <SiteBoardPostDetailSheet
        open={Boolean(detailPost)}
        post={detailPost}
        reportReasons={boardSeed.reportReasons}
        onClose={() => setDetailPost(null)}
        onVerify={handlePostVerify}
        onEdit={openEditPost}
        onDelete={handleDeletePost}
        onReport={handleReport}
      />

      <SiteBoardComposeSheet
        open={composeOpen}
        mode={composeMode}
        initialText={editingPost?.text || ""}
        siteTitle={boardSeed.siteTitle}
        onClose={() => setComposeOpen(false)}
        onSave={handleSavePost}
      />
    </>
  );
}
