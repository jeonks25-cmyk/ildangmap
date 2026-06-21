import { generateAutoNickname } from "../utils/displayNickname";

function normalizePost(row, siteKey, index, myNick) {
  if (!row || typeof row !== "object") return null;
  const text = String(row.text || row.body || row.comment || "").trim();
  if (!text) return null;
  const author = String(row.author || row.userName || myNick || "익명").trim() || "익명";
  return {
    id: row.id || `p-${siteKey}-${index}`,
    author,
    text,
    helpfulCount: Number(row.helpfulCount) || 0,
    helpfulByMe: Boolean(row.helpfulByMe),
    isMine: author === myNick,
  };
}

/** 장소 comments → 현장 자유게시판 (실제 데이터만, 샘플 없음) */
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
    reportReasons: ["정보가 틀림", "광고성", "욕설"],
  };
}

export function sortBoardPosts(posts) {
  return [...posts].sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
}
