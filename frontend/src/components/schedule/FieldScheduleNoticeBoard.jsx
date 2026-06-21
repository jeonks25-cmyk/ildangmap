import React, { useCallback, useEffect, useState } from "react";
import { createScheduleBriefingPost, fetchScheduleBriefingPosts } from "../../api/scheduleBriefingApi";
import { getApiErrorMessage } from "../../api/client";
import FieldScheduleBoardComposeSheet from "./FieldScheduleBoardComposeSheet";
import "../map/map-site-board.css";

const POST_TYPES = [
  { value: "general", label: "공지" },
  { value: "question", label: "질문" },
  { value: "worklog", label: "작업내용" },
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
  if (type === "worklog") return { label: "작업내용", className: "site-board__card-type--worklog" };
  if (type === "photo") return { label: "작업사진", className: "site-board__card-type--photo" };
  if (type === "change") return { label: "변경", className: "site-board__card-type--change" };
  return { label: "공지", className: "site-board__card-type--notice" };
}

function BoardPostCard({ post }) {
  const badge = badgeForType(post.postType);
  const author = String(post.authorName || "작성자").trim() || "작성자";
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
      </time>
    </article>
  );
}

export default function FieldScheduleNoticeBoard({ briefingId, siteTitle = "현장 게시판", onToast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!briefingId) {
      setPosts([]);
      setLoadError("");
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchScheduleBriefingPosts(briefingId);
      setPosts(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setPosts([]);
      setLoadError(getApiErrorMessage(error, "게시판을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async ({ body, postType, imageDataUrl }) => {
    if (!briefingId) throw new Error("일정 정보가 없습니다.");
    await createScheduleBriefingPost(briefingId, { body, postType, imageDataUrl });
    onToast?.("게시했습니다");
    await refresh();
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
          <button type="button" className="site-board__write" onClick={() => setComposeOpen(true)}>
            글쓰기
          </button>
        </div>

        {loadError ? <p className="site-board__error">{loadError}</p> : null}
        {loading ? <p className="site-board__loading">불러오는 중…</p> : null}

        <div className="site-board__list" role="list">
          {posts.length ? (
            posts.map((post) => <BoardPostCard key={post.id} post={post} />)
          ) : !loading ? (
            <div className="site-board__empty">
              <p className="site-board__empty-title">아직 등록된 글이 없습니다.</p>
              <p className="site-board__empty-hint">첫 번째 현장 정보를 남겨보세요.</p>
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
