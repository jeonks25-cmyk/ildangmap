import React, { useEffect, useState } from "react";

/** 게시글 상세 — 수정·삭제·신고·정보 검증 */
export default function SiteBoardPostDetailSheet({
  open,
  post,
  reportReasons = [],
  onClose,
  onVerify,
  onEdit,
  onDelete,
  onReport,
}) {
  const [myVote, setMyVote] = useState(post?.myVerifyVote || null);
  const [correctCount, setCorrectCount] = useState(post?.correctCount || 0);
  const [wrongCount, setWrongCount] = useState(post?.wrongCount || 0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!post) return;
    setMyVote(post.myVerifyVote || null);
    setCorrectCount(post.correctCount || 0);
    setWrongCount(post.wrongCount || 0);
    setReportOpen(false);
  }, [post]);

  if (!open || !post) return null;

  const toggleVerify = (vote) => {
    let nextCorrect = correctCount;
    let nextWrong = wrongCount;
    const prev = myVote;
    if (prev === vote) return;
    if (prev === "correct") nextCorrect = Math.max(0, nextCorrect - 1);
    if (prev === "wrong") nextWrong = Math.max(0, nextWrong - 1);
    if (vote === "correct") nextCorrect += 1;
    if (vote === "wrong") nextWrong += 1;
    setMyVote(vote);
    setCorrectCount(nextCorrect);
    setWrongCount(nextWrong);
    onVerify?.(post, vote, { correctCount: nextCorrect, wrongCount: nextWrong, myVerifyVote: vote });
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
        <div className="site-board-detail__verify">
          <button
            type="button"
            className={`site-board-detail__verify-btn${myVote === "correct" ? " is-active-correct" : ""}`}
            onClick={() => toggleVerify("correct")}
          >
            ✅ 정보 맞음 {correctCount}
          </button>
          <button
            type="button"
            className={`site-board-detail__verify-btn${myVote === "wrong" ? " is-active-wrong" : ""}`}
            onClick={() => toggleVerify("wrong")}
          >
            🚨 정보 틀림 {wrongCount}
          </button>
        </div>
        <div className="site-board-detail__actions">
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
