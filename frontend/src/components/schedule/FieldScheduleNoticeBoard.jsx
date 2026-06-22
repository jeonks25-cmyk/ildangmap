import React, { useCallback, useEffect, useState } from "react";
import {
  createScheduleBriefingComment,
  createScheduleBriefingPost,
  fetchScheduleBriefingComments,
  fetchScheduleBriefingPosts,
  mapBoardApiErrorMessage,
} from "../../api/scheduleBriefingApi";
import { buildBriefingAuthorFromViewer } from "../../utils/briefingAuthor";
import { BOARD_ACCESS_ROLE } from "../../utils/scheduleBoardAccess";
import FieldScheduleBoardComposeSheet from "./FieldScheduleBoardComposeSheet";
import "../map/map-site-board.css";

const POST_TYPES = [
  { value: "general", label: "공지" },
  { value: "question", label: "질문" },
  { value: "worklog", label: "작업일지" },
  { value: "photo", label: "작업사진" },
];

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

function badgeForType(type) {
  if (type === "question") return { label: "질문", className: "site-board__card-type--question" };
  if (type === "worklog") return { label: "작업일지", className: "site-board__card-type--worklog" };
  if (type === "photo") return { label: "작업사진", className: "site-board__card-type--photo" };
  if (type === "change") return { label: "변경", className: "site-board__card-type--change" };
  return { label: "공지", className: "site-board__card-type--notice" };
}

function BoardPostCard({ post, comments, commentDraft, onCommentDraft, onSubmitComment, canComment }) {
  const badge = badgeForType(post.postType);
  const author = String(post.authorName || "작성자").trim() || "작성자";
  const commentList = Array.isArray(comments) ? comments : [];

  return (
    <article className="site-board__card" role="listitem">
      <div className="site-board__card-head">
        <span className="site-board__card-author">{author}</span>
        <span className={`site-board__card-type ${badge.className}`}>{badge.label}</span>
      </div>
      {post.body ? <p className="site-board__card-body">{post.body}</p> : null}
      {post.imageDataUrl ? <img className="site-board__card-image" src={post.imageDataUrl} alt="" /> : null}
      <time className="site-board__card-time" dateTime={post.createdAt || undefined}>
        {formatWhen(post.createdAt)}
        {post.updatedAt && post.updatedAt !== post.createdAt ? ` · 수정 ${formatWhen(post.updatedAt)}` : ""}
      </time>

      {commentList.length ? (
        <ul className="site-board__card-comments">
          {commentList.map((c) => (
            <li key={c.id} className="site-board__card-comment">
              <strong>{c.authorName || "작성자"}</strong> {c.body}
              <time dateTime={c.createdAt}>{formatWhen(c.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : null}

      {canComment ? (
        <form
          className="site-board__card-comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitComment?.();
          }}
        >
          <input
            type="text"
            value={commentDraft || ""}
            onChange={(e) => onCommentDraft?.(e.target.value)}
            placeholder="댓글"
            maxLength={500}
          />
          <button type="submit" disabled={!String(commentDraft || "").trim()}>
            등록
          </button>
        </form>
      ) : null}
    </article>
  );
}

export default function FieldScheduleNoticeBoard({
  briefingId,
  scheduleId,
  siteTitle = "현장 게시판",
  canWrite = false,
  canRead = true,
  accessRole = BOARD_ACCESS_ROLE.NONE,
  onToast,
}) {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!briefingId || !canRead) {
      setPosts([]);
      setCommentsByPost({});
      if (!canRead && briefingId) {
        setLoadError("이 일정에 접근 권한이 없습니다.");
      } else {
        setLoadError("");
      }
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchScheduleBriefingPosts(briefingId, scheduleId);
      const list = Array.isArray(rows) ? rows : [];
      setPosts(list);
      const commentMap = {};
      await Promise.all(
        list.map(async (p) => {
          commentMap[p.id] = await fetchScheduleBriefingComments(briefingId, p.id, scheduleId);
        })
      );
      setCommentsByPost(commentMap);
    } catch (error) {
      setPosts([]);
      setCommentsByPost({});
      setLoadError(mapBoardApiErrorMessage(error, "게시판을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [briefingId, canRead, scheduleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async ({ body, postType, imageDataUrl }) => {
    if (!briefingId) throw new Error("일정을 찾을 수 없습니다.");
    if (!canWrite) throw new Error("이 일정에 접근 권한이 없습니다.");
    await createScheduleBriefingPost(briefingId, { body, postType, imageDataUrl, scheduleId });
    onToast?.("게시했습니다");
    await refresh();
  };

  const handleComment = async (postId) => {
    const text = String(commentDrafts[postId] || "").trim();
    if (!text || !briefingId || !canWrite) return;
    try {
      await createScheduleBriefingComment(briefingId, postId, {
        body: text,
        authorName: buildBriefingAuthorFromViewer().authorName,
        scheduleId,
      });
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      const next = await fetchScheduleBriefingComments(briefingId, postId, scheduleId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: next }));
    } catch (error) {
      onToast?.(mapBoardApiErrorMessage(error, "댓글 등록에 실패했습니다."));
    }
  };

  const handleOpenCompose = () => {
    if (!canWrite) {
      if (accessRole === BOARD_ACCESS_ROLE.PENDING) {
        onToast?.("초대 수락 후 글을 작성할 수 있습니다.");
      } else {
        onToast?.("이 일정에 접근 권한이 없습니다.");
      }
      return;
    }
    setComposeOpen(true);
  };

  if (!briefingId) {
    return (
      <section className="site-board site-board--schedule" aria-label="현장 게시판">
        <div className="site-board__empty">
          <p className="site-board__empty-title">게시판을 열 수 없습니다</p>
          <p className="site-board__empty-hint">일정 정보가 없어 게시판을 표시할 수 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="site-board site-board--schedule" aria-label="현장 게시판">
        <div className="site-board__head">
          <h2 className="site-board__title">현장 게시판</h2>
          {canWrite ? (
            <button type="button" className="site-board__write" onClick={handleOpenCompose}>
              글쓰기
            </button>
          ) : accessRole === BOARD_ACCESS_ROLE.PENDING ? (
            <span className="site-board__read-only-hint">읽기 전용 · 초대 수락 후 작성</span>
          ) : null}
        </div>

        {loadError ? <p className="site-board__error">{loadError}</p> : null}
        {loading ? <p className="site-board__loading">불러오는 중…</p> : null}

        <div className="site-board__list" role="list">
          {posts.length ? (
            posts.map((post) => (
              <BoardPostCard
                key={post.id}
                post={post}
                comments={commentsByPost[post.id]}
                commentDraft={commentDrafts[post.id]}
                onCommentDraft={(value) => setCommentDrafts((prev) => ({ ...prev, [post.id]: value }))}
                onSubmitComment={() => handleComment(post.id)}
                canComment={canWrite}
              />
            ))
          ) : !loading && canRead ? (
            <div className="site-board__empty">
              <p className="site-board__empty-title">아직 등록된 글이 없습니다.</p>
              <p className="site-board__empty-hint">
                {canWrite ? "첫 번째 현장 정보를 남겨보세요." : "게시글이 등록되면 여기에 표시됩니다."}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <FieldScheduleBoardComposeSheet
        open={composeOpen}
        siteTitle={siteTitle}
        onClose={() => setComposeOpen(false)}
        onSubmit={handleSubmit}
        onToast={onToast}
      />
    </>
  );
}

export { POST_TYPES, badgeForType, formatWhen };
