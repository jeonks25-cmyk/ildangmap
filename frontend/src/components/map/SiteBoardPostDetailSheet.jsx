import React, { useEffect, useState } from "react";

/** 게시글 상세 — 수정·삭제·신고·추천 (목록에서는 미노출) */
export default function SiteBoardPostDetailSheet({
  open,
  post,
  reportReasons = [],
  onClose,
  onLike,
  onEdit,
  onDelete,
  onReport,
}) {
  const [liked, setLiked] = useState(post?.helpfulByMe);
  const [likeCount, setLikeCount] = useState(post?.helpfulCount || 0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!post) return;
    setLiked(post.helpfulByMe);
    setLikeCount(post.helpfulCount || 0);
    setReportOpen(false);
  }, [post]);

  if (!open || !post) return null;

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    onLike?.(post, next);
  };

  return (
    <div className="site-board-detail" role="presentation">
      <button type="button" className="site-board-detail__backdrop" aria-label="닫기" onClick={onClose} />
      <section className="site-board-detail__panel" role="dialog" aria-label="게시글 상세">
        <header className="site-board-detail__head">
          <strong className="site-board-detail__author">{post.author}</strong>
          <button type="button" className="site-board-detail__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <p className="site-board-detail__text">{post.text}</p>
        <div className="site-board-detail__actions">
          <button type="button" className={`site-board-detail__like${liked ? " is-active" : ""}`} onClick={toggleLike}>
            👍 <strong>{likeCount}</strong>
          </button>
          {post.isMine ? (
            <>
              <button type="button" className="site-board-detail__ghost" onClick={() => onEdit?.(post)}>
                수정
              </button>
              <button type="button" className="site-board-detail__ghost site-board-detail__ghost--danger" onClick={() => onDelete?.(post)}>
                삭제
              </button>
            </>
          ) : (
            <button type="button" className="site-board-detail__ghost" onClick={() => setReportOpen(true)}>
              신고
            </button>
          )}
        </div>
        {reportOpen ? (
          <div className="site-board-detail__report">
            <p className="site-board-detail__report-title">신고 사유</p>
            <div className="site-board-detail__report-reasons">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="site-board-detail__report-reason"
                  onClick={() => {
                    onReport?.(post, reason);
                    setReportOpen(false);
                    onClose?.();
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button type="button" className="site-board-detail__report-cancel" onClick={() => setReportOpen(false)}>
              취소
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
