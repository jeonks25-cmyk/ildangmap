import React, { useEffect, useMemo, useState } from "react";
import { MAP_ITEM_TYPE_LABEL } from "../../constants/mapItemTypes";
import { buildSiteBoardMock, sortBoardPosts } from "../../mock/buildSiteBoardMock";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserStore } from "../../store/useUserStore";
import { useUiStore } from "../../store/useUiStore";
import { buildExternalMapLinks } from "../../utils/externalMapLinks";
import { getDisplayNickname } from "../../utils/displayNickname";
import { getPlaceRowDescription, getPlaceRowTitle, getPlaceTypeIcon } from "../../utils/placeDistance";
import { getPlaceInfoKey, needsPlaceReview } from "../../utils/placeInfoCard";
import SiteBoardComposeSheet from "./SiteBoardComposeSheet";
import SiteBoardPostDetailSheet from "./SiteBoardPostDetailSheet";
import "./map-place-detail-card.css";
import "./map-site-board.css";

function BoardPostRow({ post, onOpen }) {
  const likeLabel = post.helpfulCount > 0 ? `👍${post.helpfulCount}` : "👍0";
  return (
    <button type="button" className="place-detail-card__board-row" onClick={() => onOpen?.(post)} aria-label={`${post.author} ${post.text}`}>
      <span className="place-detail-card__board-author">{post.author}</span>
      <span className="place-detail-card__board-sep" aria-hidden>
        ·
      </span>
      <span className="place-detail-card__board-text">{post.text}</span>
      <span className="place-detail-card__board-sep" aria-hidden>
        ·
      </span>
      <span className="place-detail-card__board-like">{likeLabel}</span>
    </button>
  );
}

/**
 * 장소 상세 단일 카드 — 목록·마커·검색 등 모든 진입 경로 공통
 */
export default function PlaceDetailCard({ place, onToast, onEdit, showInfoMenu = false }) {
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const requireAuth = useRequireAuth("post");
  const authPromptOpen = useUiStore((s) => s.authPromptOpen);
  const myNickname = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);

  const boardSeed = useMemo(
    () =>
      place
        ? buildSiteBoardMock(place, {
            currentUserNickname: myNickname,
            currentUserId: profile?.id || sessionUser?.id || "",
          })
        : null,
    [myNickname, place, profile?.id, sessionUser?.id],
  );

  const [posts, setPosts] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [detailPost, setDetailPost] = useState(null);

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

  if (!place || !boardSeed) return null;

  const category = MAP_ITEM_TYPE_LABEL[place.layer || place.type] || "장소";
  const description = getPlaceRowDescription(place);
  const address = String(place.address || place.meta || boardSeed.address || "").trim() || boardSeed.address;
  const title = getPlaceRowTitle(place);
  const reviewNeeded = showInfoMenu && needsPlaceReview(getPlaceInfoKey(place));

  const savedMeta = place.source?.meta && typeof place.source.meta === "object" ? place.source.meta : {};
  const fallbackLinks = buildExternalMapLinks({
    lat: place.lat,
    lng: place.lng,
    title,
    address: boardSeed.address,
  });
  const links = {
    naver: savedMeta.naverMapLink || fallbackLinks.naver,
    kakao: savedMeta.kakaoMapLink || fallbackLinks.kakao,
  };

  const toast = (message) => {
    if (onToast) onToast(message);
  };

  const editingPost = posts.find((p) => p.id === editingId);

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
      setPosts((prev) => sortBoardPosts(prev.map((p) => (p.id === editingId ? { ...p, text } : p))));
      toast("글을 수정했습니다 (목업)");
      return;
    }
    const newPost = {
      id: `p-new-${Date.now()}`,
      author: boardSeed.currentUser,
      text,
      helpfulCount: 0,
      helpfulByMe: false,
      isMine: true,
    };
    setPosts((prev) => sortBoardPosts([newPost, ...prev]));
    toast("글을 등록했습니다 (목업)");
  };

  const handleDeletePost = (post) => {
    if (!post.isMine) return;
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setDetailPost(null);
    toast("글을 삭제했습니다 (목업)");
  };

  return (
    <>
      <div className="place-detail-card__scroll">
        <section className="place-detail-card__info" aria-label="장소 정보">
          <h3 className="place-detail-card__place-title">
            <span className="place-detail-card__place-icon" aria-hidden="true">
              {getPlaceTypeIcon(place.layer || place.type)}
            </span>
            <span className="place-detail-card__place-title-text">{title}</span>
            {reviewNeeded ? (
              <span className="place-detail-card__review-badge" aria-label="검토 필요">
                검토 필요
              </span>
            ) : null}
          </h3>
          <dl className="place-detail-card__meta">
            <div className="place-detail-card__meta-row">
              <dt>주소</dt>
              <dd>{address}</dd>
            </div>
            <div className="place-detail-card__meta-row">
              <dt>거리</dt>
              <dd className="place-detail-card__distance">{place.distanceLabel || "—"}</dd>
            </div>
            <div className="place-detail-card__meta-row">
              <dt>카테고리</dt>
              <dd>{category}</dd>
            </div>
            {description ? (
              <div className="place-detail-card__meta-row">
                <dt>설명</dt>
                <dd>{description}</dd>
              </div>
            ) : null}
          </dl>
          <div className="place-detail-card__maps">
            {links.naver ? (
              <a
                className="place-detail-card__map-btn place-detail-card__map-btn--naver"
                href={links.naver}
                target="_blank"
                rel="noreferrer"
              >
                네이버지도
              </a>
            ) : null}
            {links.kakao ? (
              <a
                className="place-detail-card__map-btn place-detail-card__map-btn--kakao"
                href={links.kakao}
                target="_blank"
                rel="noreferrer"
              >
                카카오맵
              </a>
            ) : null}
          </div>
          {!showInfoMenu ? (
            <button
              type="button"
              className="place-detail-card__edit"
              onClick={() => {
                if (!requireAuth()) return;
                onEdit?.(place);
                toast("현장명·주소 수정 (목업)");
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
              <p className="site-board__empty">아직 글이 없습니다. 짧은 현장 정보를 남겨 주세요.</p>
            )}
          </div>
        </section>
      </div>

      <SiteBoardPostDetailSheet
        open={Boolean(detailPost)}
        post={detailPost}
        reportReasons={boardSeed.reportReasons}
        onClose={() => setDetailPost(null)}
        onLike={() => {}}
        onEdit={openEditPost}
        onDelete={handleDeletePost}
        onReport={(p, reason) => toast(`신고 접수: ${reason} (목업)`)}
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
