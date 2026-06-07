import React, { useCallback, useEffect, useState } from "react";
import { createScheduleBriefingPost, fetchScheduleBriefingPosts } from "../../api/scheduleBriefingApi";
import { addBoardComment, listBoardComments } from "../../utils/fieldBoardComments";
import { compressImageFileToDataUrl } from "../../utils/briefingImageCompress";
import BriefingPostAuthorRow from "../briefing/BriefingPostAuthorRow";

const POST_TYPES = [
  { value: "general", label: "공지" },
  { value: "question", label: "질문" },
  { value: "worklog", label: "작업내용" },
  { value: "photo", label: "작업사진" },
];

function badgeForType(type) {
  if (type === "question") return { label: "질문", className: "field-board__badge--question" };
  if (type === "worklog") return { label: "작업내용", className: "field-board__badge--worklog" };
  if (type === "photo") return { label: "작업사진", className: "field-board__badge--photo" };
  if (type === "change") return { label: "변경", className: "field-board__badge--change" };
  return { label: "공지", className: "field-board__badge--notice" };
}

export default function FieldScheduleNoticeBoard({ briefingId, onToast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("general");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});

  const refresh = useCallback(async () => {
    if (!briefingId) return;
    setLoading(true);
    try {
      const rows = await fetchScheduleBriefingPosts(briefingId);
      setPosts(Array.isArray(rows) ? rows : []);
      const commentMap = {};
      (Array.isArray(rows) ? rows : []).forEach((p) => {
        commentMap[p.id] = listBoardComments(briefingId, p.id);
      });
      setCommentsByPost(commentMap);
    } catch (_) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [briefingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canSubmit = Boolean(briefingId) && (body.trim() || (postType === "photo" && imageDataUrl));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!canSubmit) return;
    try {
      await createScheduleBriefingPost(briefingId, {
        body: text || (postType === "photo" ? "작업사진" : text),
        postType,
        imageDataUrl: imageDataUrl || undefined,
      });
      setBody("");
      setImageDataUrl("");
      onToast?.("게시했습니다");
      refresh();
    } catch (err) {
      onToast?.(err?.message || "게시에 실패했습니다");
    }
  };

  const handleComment = (postId) => {
    const text = String(commentDrafts[postId] || "").trim();
    if (!text) return;
    addBoardComment(briefingId, postId, { body: text });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: listBoardComments(briefingId, postId),
    }));
  };

  return (
    <section className="field-board app-card" aria-label="현장 게시판">
      <h2 className="field-board__title">현장 게시판</h2>
      <p className="field-board__sub">공지 · 질문 · 작업내용 · 작업사진을 남기고 댓글로 이어갑니다.</p>

      <form className="field-board__composer" onSubmit={handleSubmit}>
        <div className="field-board__type-row">
          {POST_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`field-board__type-btn${postType === opt.value ? " is-active" : ""}`}
              onClick={() => setPostType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          className="field-board__textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="현장 공지나 질문을 입력하세요"
          rows={3}
        />
        <label className="field-board__photo">
          <span>사진 첨부</span>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const data = await compressImageFileToDataUrl(file);
                setImageDataUrl(data);
              } catch (_) {
                onToast?.("이미지를 불러올 수 없습니다");
              }
            }}
          />
          {imageDataUrl ? <small>사진 첨부됨</small> : null}
        </label>
        <button type="submit" className="field-board__submit" disabled={!canSubmit}>
          게시하기
        </button>
      </form>

      {loading ? <p className="field-board__loading">불러오는 중…</p> : null}
      <ul className="field-board__list">
        {posts.map((post) => {
          const badge = badgeForType(post.postType);
          const comments = commentsByPost[post.id] || [];
          return (
            <li key={post.id} className="field-board__item">
              <div className="field-board__item-head">
                <span className={`field-board__badge ${badge.className}`}>{badge.label}</span>
                <BriefingPostAuthorRow post={post} />
              </div>
              <p className="field-board__body">{post.body}</p>
              {post.imageDataUrl ? (
                <img className="field-board__image" src={post.imageDataUrl} alt="" />
              ) : null}
              {comments.length ? (
                <ul className="field-board__comments">
                  {comments.map((c) => (
                    <li key={c.id}>
                      <strong>{c.authorName}</strong> {c.body}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="field-board__comment-form">
                <input
                  value={commentDrafts[post.id] || ""}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  placeholder="댓글"
                />
                <button type="button" onClick={() => handleComment(post.id)}>
                  등록
                </button>
              </div>
            </li>
          );
        })}
        {!loading && !posts.length ? <li className="field-board__empty">아직 글이 없습니다.</li> : null}
      </ul>
    </section>
  );
}
