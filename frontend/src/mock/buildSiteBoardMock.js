import { generateAutoNickname } from "../utils/displayNickname";
import { BOARD_POST_REPORT_REASONS } from "../constants/placeModeration";

function normalizePost(row, siteKey, index, myNick) {
  if (!row || typeof row !== "object") return null;
  const text = String(row.text || row.body || row.comment || "").trim();
  if (!text) return null;
  const author = String(row.author || row.userName || myNick || "익명").trim() || "익명";
  return {
    id: row.id || `p-${siteKey}-${index}`,
    author,
    text,
    correctCount: Number(row.correctCount) || 0,
    wrongCount: Number(row.wrongCount) || 0,
    myVerifyVote: row.myVerifyVote || null,
    isMine: author === myNick,
  };
}

/** 장소 comments → 현장 자유게시판 (실제 데이터만) */
export function buildSiteBoardMock(item, { currentUserNickname = "", currentUserId = "" } = {}) {
  const source = item?.source || {};
  const siteKey = item?.id || source.id || item?.title || "site";
  const siteTitle = String(item?.title || source.title || "현장").trim() || "현장";
  const address = String(item?.address || source.address || item?.meta || "주소 준비 중").trim() || "주소 준비 중";

  const myNick = String(currentUserNickname || "").trim() || generateAutoNickname(currentUserId);

  const rawComments = Array.isArray(item?.comments)
    ? item.comments
    : Array.isArray(source.comments)
      ? source.comments
      : [];

  const posts = rawComments
    .map((row, i) => normalizePost(row, siteKey, i, myNick))
    .filter(Boolean);

  return {
    siteKey,
    siteTitle,
    address,
    currentUser: myNick,
    posts,
    reportReasons: BOARD_POST_REPORT_REASONS,
  };
}

export function sortBoardPosts(posts) {
  return [...posts].sort((a, b) => {
    const scoreA = (Number(a.correctCount) || 0) - (Number(a.wrongCount) || 0);
    const scoreB = (Number(b.correctCount) || 0) - (Number(b.wrongCount) || 0);
    return scoreB - scoreA;
  });
}

export function postsToComments(posts) {
  return (Array.isArray(posts) ? posts : []).map((post) => ({
    id: post.id,
    author: post.author,
    text: post.text,
    correctCount: post.correctCount || 0,
    wrongCount: post.wrongCount || 0,
  }));
}
