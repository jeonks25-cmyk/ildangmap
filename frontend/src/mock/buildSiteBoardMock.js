import { generateAutoNickname } from "../utils/displayNickname";

const SAMPLE_AUTHORS = ["박준기공", "오야지홍길동", "필름기공87", "도배오야지82", "타일기공93"];

const DEFAULT_POSTS = [
  { author: "박준기공", text: "지하3층 주차 가능", helpfulCount: 12, helpfulByMe: false },
  { author: "오야지홍길동", text: "경비실 호출 필요", helpfulCount: 8, helpfulByMe: false },
  { author: "필름기공87", text: "후문 출입 가능", helpfulCount: 21, helpfulByMe: true },
  { author: "도배오야지82", text: "아 주차 힘듦", helpfulCount: 15, helpfulByMe: false },
  { author: "타일기공93", text: "점심식당 괜찮음", helpfulCount: 9, helpfulByMe: false },
  { author: "최필름", text: "화물엘리 1호기만", helpfulCount: 6, helpfulByMe: false },
  { author: "정타일", text: "오전 9시 주차 혼잡", helpfulCount: 11, helpfulByMe: false },
  { author: "강오야지", text: "관리실 042-000-1234", helpfulCount: 4, helpfulByMe: false },
  { author: "이도배", text: "SUV 지하1 가능", helpfulCount: 7, helpfulByMe: false },
  { author: "전기기사90", text: "후문 출입", helpfulCount: 18, helpfulByMe: false },
  { author: "박준기공", text: "국밥집 도보 5분", helpfulCount: 5, helpfulByMe: false },
  { author: "필름기공87", text: "신분증 지참", helpfulCount: 3, helpfulByMe: false },
];

/** 지도 마커 → 현장 정보카드 + 게시판 Mock */
export function buildSiteBoardMock(item, { currentUserNickname = "현장기공", currentUserId = "" } = {}) {
  const source = item?.source || {};
  const siteKey = item?.id || source.id || item?.title || "demo-site";
  const siteTitle = String(item?.title || source.title || "현장").trim() || "현장";
  const address = String(item?.address || source.address || item?.meta || "주소 준비 중").trim() || "주소 준비 중";

  const myNick = String(currentUserNickname || "").trim() || generateAutoNickname(currentUserId);

  const rawComments = Array.isArray(item?.comments)
    ? item.comments
    : Array.isArray(source.comments)
      ? source.comments
      : null;

  const seedRows = rawComments?.length ? rawComments : DEFAULT_POSTS;

  const posts = seedRows
    .map((row, i) => {
      if (row && typeof row === "object" && (row.text || row.body || row.comment)) {
        const author = row.author || row.userName || SAMPLE_AUTHORS[i % SAMPLE_AUTHORS.length];
        return {
          id: row.id || `p-${siteKey}-${i}`,
          author,
          text: String(row.text || row.body || row.comment || "").trim(),
          helpfulCount: Number(row.helpfulCount) || 0,
          helpfulByMe: Boolean(row.helpfulByMe),
          isMine: author === myNick,
        };
      }
      const base = DEFAULT_POSTS[i % DEFAULT_POSTS.length];
      return {
        id: `p-${siteKey}-${i}`,
        author: base.author,
        text: typeof row === "string" ? row : base.text,
        helpfulCount: base.helpfulCount,
        helpfulByMe: base.helpfulByMe,
        isMine: base.author === myNick,
      };
    })
    .filter((p) => p.text);

  const hasMine = posts.some((p) => p.isMine);
  const withMine = hasMine
    ? posts
    : [
        {
          id: `p-${siteKey}-mine`,
          author: myNick,
          text: "오전 9시 이후 주차 혼잡",
          helpfulCount: 5,
          helpfulByMe: false,
          isMine: true,
        },
        ...posts,
      ];

  return {
    siteKey,
    siteTitle,
    address,
    currentUser: myNick,
    posts: withMine,
    reportReasons: ["정보가 틀림", "광고성", "욕설"],
  };
}

export function sortBoardPosts(posts) {
  return [...posts].sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
}
