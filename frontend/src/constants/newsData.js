/** 📢 일당맵 소식 — 정적 데이터 (MVP, CMS/DB 없음) */

export const NEWS_CATEGORIES = {
  update: {
    key: "update",
    emoji: "🚀",
    label: "업데이트",
  },
  feedback: {
    key: "feedback",
    emoji: "💡",
    label: "사용자 의견 반영",
  },
  inProgress: {
    key: "inProgress",
    emoji: "🔨",
    label: "개발중",
  },
  fieldStory: {
    key: "fieldStory",
    emoji: "📍",
    label: "현장 이야기",
  },
};

export const PINNED_NEWS_ID = 1;

/** 이 일수 이내 게시물에 NEW 뱃지 (isNew 미지정 시) */
export const NEW_BADGE_DAYS = 14;

export const RECENT_CHANGES = [
  { label: "카카오 로그인 추가", date: "2026-06-10" },
  { label: "초대 링크 수정", date: "2026-06-12" },
  { label: "닉네임 설정 개선", date: "2026-06-11" },
  { label: "베타 의견 보내기 추가", date: "2026-06-14" },
];

export const BETA_BANNER = {
  title: "천안 베타 테스트 진행중",
  description: "사용자 의견을 바탕으로 서비스를 개선하고 있습니다.",
  ctaLabel: "의견 보내기",
  ctaPath: "/settings/beta-feedback",
};

export const NEWS_ITEMS = [
  {
    id: 1,
    category: "fieldStory",
    title: "천안 지역 베타 테스트 시작",
    date: "2026-05-20",
    pinned: true,
    isNew: false,
    summary: "천안 지역에서 베타 테스트를 시작했어요. 현장에서 써 보시고 편한 점·불편한 점을 알려주세요.",
    content: [
      "천안 지역 오야지·기술자분들과 함께 베타 테스트를 시작했어요.",
      "지도, 일정, 인원 관리를 실제 현장에서 써 보시면서 의견을 남겨 주시면 바로 반영해 나갈게요.",
      "홈 화면에 추가해 두시면 주소 입력 없이 앱처럼 바로 실행할 수 있어요.",
    ].join("\n\n"),
  },
  {
    id: 2,
    category: "update",
    title: "카카오 로그인 추가",
    date: "2026-06-10",
    summary: "카카오 계정으로 간편하게 로그인할 수 있어요.",
    content: [
      "설정 탭에서 카카오 로그인을 누르면 바로 시작할 수 있어요.",
      "처음 로그인할 때만 활동명을 설정하면 됩니다.",
      "여러분 의견 덕분에 로그인 과정을 더 단순하게 개선했어요.",
    ].join("\n\n"),
  },
  {
    id: 3,
    category: "update",
    title: "초대 링크 수정",
    date: "2026-06-12",
    summary: "인원 초대 링크가 정상적으로 동작하도록 개선했어요.",
    content: [
      "문자·카카오톡으로 보내는 초대 링크 주소를 수정했어요.",
      "초대받은 분이 링크를 누르면 누가 초대했는지 안내 화면이 나오고, 가입 후에도 추천인 정보가 유지됩니다.",
      "미가입 인원 명함에서 「문자 초대」「카카오톡 초대」「링크 복사」 모두 같은 링크를 사용해요.",
    ].join("\n\n"),
  },
  {
    id: 4,
    category: "update",
    title: "베타 의견 보내기 기능 추가",
    date: "2026-06-14",
    isNew: true,
    summary: "설정에서 바로 불편한 점과 개선 아이디어를 보낼 수 있어요.",
    content: [
      "설정 → 베타 의견 보내기에서 현장에서 겪은 불편함을 남길 수 있어요.",
      "스크린샷도 함께 보낼 수 있고, 비슷한 의견은 자동으로 묶여 우선순위 파악에 도움이 됩니다.",
      "여러분이 보내 주신 의견으로 일당맵이 더 좋아지고 있어요.",
    ].join("\n\n"),
  },
  {
    id: 5,
    category: "inProgress",
    title: "공정표 OCR 개발중",
    date: "2026-06-01",
    summary: "공정표 사진을 올리면 일정으로 변환하는 기능을 만들고 있어요. 예상 오픈 7월.",
    content: [
      "현장에서 받은 공정표 사진을 올리면 일정 등록을 돕는 OCR 기능을 개발 중이에요.",
      "베타 사용자분들 의견을 반영해 정확도와 속도를 함께 잡고 있습니다.",
      "오픈 시기는 7월을 목표로 하고 있어요. 준비되면 소식에서 먼저 알려드릴게요.",
    ].join("\n\n"),
  },
  {
    id: 6,
    category: "fieldStory",
    title: "천안 지역 사용자들이 가장 많이 찾는 정보",
    date: "2026-05-28",
    summary: "천안 지역 신축 현장에서 기술자분들이 가장 많이 찾으신 건 주차장과 화장실 위치였어요.",
    content: [
      "천안 지역 신축 현장을 방문하며 베타 사용자분들과 이야기를 나눴어요.",
      "현장 지도에서 가장 먼저 찾으시는 정보는 주차장 위치와 화장실이었습니다.",
      "이런 현장 이야기를 바탕으로 지도·장소 등록 기능을 계속 개선하고 있어요.",
    ].join("\n\n"),
  },
];

export function getNewsById(newsId) {
  const id = Number(newsId);
  return NEWS_ITEMS.find((item) => item.id === id) || null;
}

export function formatNewsDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return dateStr;
  return `${y}.${m}.${d}`;
}

export function getCategoryMeta(categoryKey) {
  return NEWS_CATEGORIES[categoryKey] || NEWS_CATEGORIES.update;
}

function parseNewsDate(dateStr) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function isNewsNew(item, now = new Date()) {
  if (!item) return false;
  if (item.isNew === true) return true;
  if (item.isNew === false) return false;
  const published = parseNewsDate(item.date);
  if (!published) return false;
  const diffMs = now.getTime() - published.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= NEW_BADGE_DAYS;
}

/** 고정 글을 맨 위, 나머지는 날짜 내림차순 */
export function sortNewsItems(items, { pinnedId = PINNED_NEWS_ID } = {}) {
  const list = Array.isArray(items) ? [...items] : [];
  const pinned = list.find((item) => item.id === pinnedId);
  const rest = list
    .filter((item) => item.id !== pinnedId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return pinned ? [pinned, ...rest] : rest;
}
