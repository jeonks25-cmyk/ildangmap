/**
 * 현장 운영 알림 — 채팅목록형 리스트용 mock (자유채팅 아님, 운영 로그 스레드)
 */

import { buildConsumerMockPhoto } from "./consumerRequestsStorage";

export const FIELD_NOTIF_TYPE_META = {
  notice: { label: "공지", tone: "notice" },
  change: { label: "변경", tone: "change" },
  help: { label: "도움요청", tone: "help" },
  urgent: { label: "긴급", tone: "urgent" },
  estimate: { label: "견적응답", tone: "estimate" },
  entry: { label: "출입", tone: "entry" },
  parking: { label: "주차", tone: "parking" },
  safety: { label: "안전", tone: "safety" },
  meal: { label: "식사", tone: "meal" },
  material: { label: "자재", tone: "material" },
};

/** 작성자 역할 (현장 운영 기록용) */
export const FIELD_AUTHOR_ROLE_META = {
  oyaji: { label: "오야지", tone: "oyaji" },
  foreman: { label: "반장", tone: "foreman" },
  worker: { label: "기사", tone: "worker" },
  admin: { label: "관리자", tone: "admin" },
};

function authorAvatarInitial(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  return s.slice(0, 1);
}

/** 로그 엔트리 정규화 (구 스키마 호환) */
export function normalizeFieldNotificationLogEntry(row) {
  if (!row || typeof row !== "object") return row;
  const roleKey = row.authorRole && FIELD_AUTHOR_ROLE_META[row.authorRole] ? row.authorRole : "worker";
  const typeKey = row.type && FIELD_NOTIF_TYPE_META[row.type] ? row.type : "notice";
  const authorName = typeof row.authorName === "string" && row.authorName.trim() ? row.authorName.trim() : "현장";
  return {
    ...row,
    type: typeKey,
    authorName,
    authorRole: roleKey,
    avatarUrl: row.avatarUrl && String(row.avatarUrl).trim() ? String(row.avatarUrl).trim() : null,
    authorInitial: authorAvatarInitial(authorName),
  };
}

const now = Date.now();

function iso(minsAgo) {
  return new Date(now - minsAgo * 60 * 1000).toISOString();
}

/** 데모: 브리핑룸 기본 진입 (연결된 현장이 있으면 그 job, 없으면 1) */
export function getDefaultBriefingRoomHref() {
  const t = FIELD_NOTIFICATION_THREADS.find((x) => x && x.jobId != null && !x.archived);
  const jid = t && t.jobId != null ? Number(t.jobId) : 1;
  return `/jobs/${Number.isFinite(jid) && jid > 0 ? jid : 1}/briefing`;
}

export function getThreadBriefingHref(thread) {
  if (thread && thread.jobId != null) return `/jobs/${Number(thread.jobId)}/briefing`;
  return getDefaultBriefingRoomHref();
}

/** 메인 리스트에 노출되는 스레드 (archived=true 는 종료 현장 → 리스트 제외) */
export const FIELD_NOTIFICATION_THREADS = [
  {
    id: "th-bongmyeong",
    siteTitle: "봉명동 학원 필름 현장",
    previewLine: "엘베 1호기 잠시 대기 중입니다. 3분 뒤 다시 열립니다.",
    lastAt: iso(5),
    unreadCount: 2,
    lastType: "notice",
    lastAuthorName: "김오야지",
    lastAuthorRole: "oyaji",
    lastAuthorAvatarUrl: null,
    mine: true,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "🎓",
    scheduleId: null,
    jobId: 1,
  },
  {
    id: "th-dunsan",
    siteTitle: "둔산동 상가 도배",
    previewLine: "1층 자재 이동 부탁드립니다. 통로 확보해 두었습니다.",
    lastAt: iso(3),
    unreadCount: 1,
    lastType: "help",
    lastAuthorName: "이기사",
    lastAuthorRole: "worker",
    lastAuthorAvatarUrl: null,
    mine: true,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "🏪",
    scheduleId: null,
    jobId: 2,
  },
  {
    id: "th-yuseong",
    siteTitle: "유성 궁동 상가 · 오후 차수",
    previewLine: "지하 주차 후 엘베 이용해 주세요. 뒷편만 열려 있습니다.",
    lastAt: iso(1),
    unreadCount: 0,
    lastType: "parking",
    lastAuthorName: "정오야지",
    lastAuthorRole: "oyaji",
    lastAuthorAvatarUrl: null,
    mine: false,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "🅿️",
    scheduleId: null,
    jobId: 5,
  },
  {
    id: "th-urgent-tile",
    siteTitle: "탄방동 긴급 타일 보수",
    previewLine: "오후 2시까지 조공 1명 추가 필요합니다.",
    lastAt: iso(12),
    unreadCount: 4,
    lastType: "urgent",
    lastAuthorName: "정오야지",
    lastAuthorRole: "oyaji",
    lastAuthorAvatarUrl: null,
    mine: true,
    urgent: true,
    estimate: false,
    archived: false,
    thumbEmoji: "⚡",
    scheduleId: null,
    jobId: 9,
  },
  {
    id: "th-estimate",
    siteTitle: "봉명동 고객 견적 문의",
    previewLine: "샤시 필름 견적 회신했습니다. 방문 일정 확인 부탁드려요",
    lastAt: iso(120),
    unreadCount: 0,
    lastType: "estimate",
    lastAuthorName: "한기사",
    lastAuthorRole: "worker",
    lastAuthorAvatarUrl: null,
    mine: true,
    urgent: false,
    estimate: true,
    archived: false,
    thumbEmoji: "📐",
    scheduleId: null,
    jobId: null,
  },
  {
    id: "th-sejong",
    siteTitle: "세종 나성동 전기",
    previewLine: "B동 화장실 비밀번호 2580 맞는지 한 번만 더 확인 부탁드려요.",
    lastAt: iso(15),
    unreadCount: 0,
    lastType: "entry",
    lastAuthorName: "운영관리자",
    lastAuthorRole: "admin",
    lastAuthorAvatarUrl: null,
    mine: false,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "💡",
    scheduleId: null,
    jobId: 14,
  },
  {
    id: "th-roof",
    siteTitle: "서구 둔산로 옥상 방수",
    previewLine: "사다리 사용 시 안전고리 필수입니다. 옥상 바람 많습니다.",
    lastAt: iso(2),
    unreadCount: 1,
    lastType: "safety",
    lastAuthorName: "김반장",
    lastAuthorRole: "foreman",
    lastAuthorAvatarUrl: buildConsumerMockPhoto("field-notif-avatar-kim", "김"),
    mine: true,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "🛠️",
    scheduleId: null,
    jobId: 11,
  },
  {
    id: "th-wolsong",
    siteTitle: "월성동 인테리어 · 목공",
    previewLine: "내일 오전 OSB 자재 들어옵니다. 1층 하역장 비워둘게요.",
    lastAt: iso(35),
    unreadCount: 0,
    lastType: "material",
    lastAuthorName: "박반장",
    lastAuthorRole: "foreman",
    lastAuthorAvatarUrl: null,
    mine: false,
    urgent: false,
    estimate: false,
    archived: false,
    thumbEmoji: "🪜",
    scheduleId: null,
    jobId: 3,
  },
  {
    id: "th-closed-archive",
    siteTitle: "(종료) 월평동 필름 마감",
    previewLine: "현장 정리 완료했습니다. 수고하셨습니다",
    lastAt: iso(60 * 24 * 3),
    unreadCount: 0,
    lastType: "notice",
    mine: true,
    urgent: false,
    estimate: false,
    archived: true,
    thumbEmoji: "✅",
    scheduleId: null,
    jobId: null,
  },
];

/** 스레드별 상세 타임라인 mock (작성자·역할·타입·시간·본문) */
export const FIELD_NOTIFICATION_DETAIL_LOGS = {
  "th-bongmyeong": [
    {
      id: "bm01",
      at: iso(480),
      type: "notice",
      authorName: "운영관리자",
      authorRole: "admin",
      avatarUrl: null,
      body: "다음 주 월요일 소방 점검 있습니다. 복도 비워두면 감사하겠습니다.",
    },
    {
      id: "bm02",
      at: iso(400),
      type: "safety",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "사다리 사용 시 안전고리 필수입니다.",
    },
    {
      id: "bm03",
      at: iso(360),
      type: "entry",
      authorName: "김오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "2층 화장실 비밀번호 2580 (외부 작업자용).",
    },
    {
      id: "bm04",
      at: iso(320),
      type: "help",
      authorName: "이기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "실리콘 투명 2통 부족합니다. 근처 자재상 아시는 분 있으면 알려주세요.",
    },
    {
      id: "bm05",
      at: iso(280),
      type: "urgent",
      authorName: "정오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "오후 팀 조공 1명 추가 연결이 필요합니다. 바로 연락 주세요.",
    },
    {
      id: "bm06",
      at: iso(240),
      type: "notice",
      authorName: "김오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "흡연구역은 건물 뒤편만 이용 부탁드립니다.",
    },
    {
      id: "bm07",
      at: iso(200),
      type: "material",
      authorName: "박반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "필름 재단은 2층 복도 테이블에서 진행합니다.",
    },
    {
      id: "bm08",
      at: iso(160),
      type: "change",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "우천으로 외부 창 작업 1시간 정도 지연 예정입니다.",
    },
    {
      id: "bm09",
      at: iso(130),
      type: "safety",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "안전교육 마쳤습니다. 현장 작업 시작하겠습니다.",
    },
    {
      id: "bm10",
      at: iso(90),
      type: "meal",
      authorName: "이기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "점심 12시 김밥집 단체 주문 받습니다. 수량만 여기에 적어주세요.",
    },
    {
      id: "bm11",
      at: iso(25),
      type: "parking",
      authorName: "박반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "지하 주차 후 엘베 이용해 주세요. 화물 엘리베이터 1호기만 씁니다.",
    },
    {
      id: "bm12",
      at: iso(5),
      type: "notice",
      authorName: "김오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "엘베 1호기 잠시 대기 중입니다. 3분 뒤 다시 열립니다.",
    },
  ],
  "th-dunsan": [
    {
      id: "l1",
      at: iso(3),
      type: "help",
      authorName: "이기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "1층 자재 이동 부탁드립니다. 통로 확보해 두었습니다.",
    },
    {
      id: "l2",
      at: iso(90),
      type: "notice",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "점심 12:30~1:20 엘베 정지 예정입니다.",
    },
  ],
  "th-yuseong": [
    {
      id: "y1",
      at: iso(45),
      type: "change",
      authorName: "최관리",
      authorRole: "admin",
      avatarUrl: null,
      body: "주차는 뒷편 지하 1층만 이용해 주세요.",
    },
    {
      id: "y2",
      at: iso(1),
      type: "parking",
      authorName: "정오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "지하 주차 후 엘베 이용해 주세요. 뒷편만 열려 있습니다.",
    },
  ],
  "th-urgent-tile": [
    {
      id: "l1",
      at: iso(12),
      type: "urgent",
      authorName: "정오야지",
      authorRole: "oyaji",
      avatarUrl: null,
      body: "오후 2시까지 조공 1명 추가 필요합니다.",
    },
    {
      id: "l2",
      at: iso(30),
      type: "notice",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "현장 소장 직통 010-****-1234",
    },
  ],
  "th-estimate": [
    {
      id: "l1",
      at: iso(120),
      type: "estimate",
      authorName: "한기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "샤시 필름 견적 회신했습니다. 방문 일정 확인 부탁드려요.",
    },
  ],
  "th-sejong": [
    {
      id: "s1",
      at: iso(200),
      type: "notice",
      authorName: "운영관리자",
      authorRole: "admin",
      avatarUrl: null,
      body: "본관 전기함 위치 사진 올려두었습니다.",
    },
    {
      id: "s2",
      at: iso(15),
      type: "entry",
      authorName: "운영관리자",
      authorRole: "admin",
      avatarUrl: null,
      body: "B동 화장실 비밀번호 2580 맞는지 한 번만 더 확인 부탁드려요.",
    },
  ],
  "th-roof": [
    {
      id: "r1",
      at: iso(90),
      type: "notice",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: buildConsumerMockPhoto("field-notif-avatar-kim", "김"),
      body: "옥상 출입은 A동 3호기만 사용합니다.",
    },
    {
      id: "r2",
      at: iso(50),
      type: "change",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "안전모 착용 재확인 부탁드립니다.",
    },
    {
      id: "r3",
      at: iso(8),
      type: "parking",
      authorName: "이기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "지하 주차 후 엘베 이용 부탁드립니다.",
    },
    {
      id: "r4",
      at: iso(2),
      type: "safety",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: buildConsumerMockPhoto("field-notif-avatar-kim", "김"),
      body: "사다리 사용 시 안전고리 필수입니다. 옥상 바람 많습니다.",
    },
  ],
  "th-wolsong": [
    {
      id: "w1",
      at: iso(180),
      type: "safety",
      authorName: "김반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "전동공구 사용 후 콘센트 꼭 빼두세요.",
    },
    {
      id: "w2",
      at: iso(80),
      type: "meal",
      authorName: "이기사",
      authorRole: "worker",
      avatarUrl: null,
      body: "저녁 6시 편의점 도시락 같이 살 분?",
    },
    {
      id: "w3",
      at: iso(35),
      type: "material",
      authorName: "박반장",
      authorRole: "foreman",
      avatarUrl: null,
      body: "내일 오전 OSB 자재 들어옵니다. 1층 하역장 비워둘게요.",
    },
  ],
};

export const FIELD_NOTIFICATION_DETAIL_SITE = {
  "th-bongmyeong": {
    entryLine: "정문 경비실 호출 후 2층 열쇠 수령",
    parkingLine: "지상 방문자 주차 B구역 3대까지",
    photoHint: "전기함·엘베 전경 2장",
  },
  "th-dunsan": {
    entryLine: "상가 후문 비번 8520* → 1층 집결",
    parkingLine: "건너편 공영 주차, 2시간 무료",
    photoHint: "자재 적치장 사진",
  },
  "th-yuseong": {
    entryLine: "궁동 상가 3번 출입구",
    parkingLine: "뒷편 지하 1층만 이용",
    photoHint: "주차 위치 안내 캡처",
  },
  "th-urgent-tile": {
    entryLine: "현장 소장에게 연락 후 투입",
    parkingLine: "인도변 임시 정차만 가능",
    photoHint: "파손 부위 클로즈업",
  },
  "th-estimate": {
    entryLine: "방문 시 부재 시 연락처로 회신",
    parkingLine: "단지 내 방문차량 등록 필요",
    photoHint: "견적서 PDF",
  },
  "th-sejong": {
    entryLine: "본관 1층 관리실",
    parkingLine: "후면 화물 적재장",
    photoHint: "전기함 위치",
  },
  "th-roof": {
    entryLine: "옥상은 A동 3호기 + 안전고리 착용",
    parkingLine: "지하 주차 후 엘베 이용",
    photoHint: "안전 교육 필참",
  },
  "th-wolsong": {
    entryLine: "현장 정문 경비에 성함 말씀 후 출입증",
    parkingLine: "건물 옆 공터 임시 주차 (좁음)",
    photoHint: "하역장·전기함 사진",
  },
};

export function getFieldNotificationSiteDetail(threadId) {
  return FIELD_NOTIFICATION_DETAIL_SITE[threadId] || {
    entryLine: "현장 소장 안내를 확인해 주세요.",
    parkingLine: "주변 공영 주차를 이용해 주세요.",
    photoHint: "현장 사진",
  };
}

export function getFieldNotificationThread(id) {
  return FIELD_NOTIFICATION_THREADS.find((t) => t.id === id) || null;
}

export function getFieldNotificationDetailLogs(threadId) {
  const raw = FIELD_NOTIFICATION_DETAIL_LOGS[threadId] || [];
  return raw
    .map((row) => normalizeFieldNotificationLogEntry(row))
    .sort((a, b) => {
      const tb = new Date(b.at).getTime();
      const ta = new Date(a.at).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });
}

export function formatFieldNotifListTime(isoStr) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 45 * 1000) return "방금";
  if (diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diffMs / 60000))}분 전`;
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hh = d.getHours();
    const ap = hh < 12 ? "오전" : "오후";
    const h12 = hh % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${ap} ${h12}:${mm}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
