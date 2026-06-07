import { QUOTE_MAP_DISPLAY } from "../constants/quoteMapDisplay";
import { QUOTE_STATUS } from "../constants/quoteStatus";
import { CRAFT_LABEL } from "./jobModel";

export const CONSUMER_REQUESTS_STORAGE_KEY = "consumer_requests_v1";

export function buildConsumerMockPhoto(seed, label = "시공 사진") {
  const safeSeed = String(seed || "consumer");
  const palette = [
    { bg: "#fff7ed", fg: "#9a3412" },
    { bg: "#eff6ff", fg: "#1d4ed8" },
    { bg: "#ecfdf5", fg: "#047857" },
  ];
  const picked = palette[Math.abs(safeSeed.length) % palette.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
      <rect width="160" height="120" rx="18" fill="${picked.bg}" />
      <text x="18" y="48" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="${picked.fg}">
        ${label}
      </text>
      <text x="18" y="76" font-size="12" font-family="Arial, sans-serif" fill="${picked.fg}" opacity="0.7">
        mock attachment
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

export const initialConsumerRequests = [
  {
    id: "estimate-101",
    type: "estimate",
    craft: "film",
    category: "필름",
    region: "대전 서구",
    shortRegion: "대전 서구 둔산동",
    area: "34평",
    requestDate: "2026-05-21",
    title: "아파트 필름 시공 견적 요청",
    description: "거실 + 주방 필름 시공 희망",
    lat: 36.3519,
    lng: 127.3848,
    photoCount: 0,
    photos: [],
    status: "open",
    quoteStatus: QUOTE_STATUS.OPEN,
    isNewToday: true,
    supporters: [],
    createdAt: "2026-05-13T10:20:00+09:00",
    customerName: "둔산동 고객",
  },
  {
    id: "estimate-102",
    type: "estimate",
    craft: "wallpaper",
    category: "도배",
    region: "대전 유성구",
    shortRegion: "대전 유성구 봉명동",
    area: "24평",
    requestDate: "2026-05-22",
    title: "도배 견적",
    description: "작은방 도배 교체 견적 부탁드립니다.",
    lat: 36.3582,
    lng: 127.3456,
    photoCount: 1,
    photos: [buildConsumerMockPhoto("consumer-wallpaper-1", "벽면 사진")],
    status: "open",
    quoteStatus: QUOTE_STATUS.OPEN,
    quoteMapDisplay: QUOTE_MAP_DISPLAY.NEGOTIATING,
    supporters: [
      { userId: "2", name: "박오야", supportedAt: "2026-05-14T09:00:00+09:00" },
      { userId: "3", name: "최오야", supportedAt: "2026-05-14T10:00:00+09:00" },
      { userId: "4", name: "정오야", supportedAt: "2026-05-14T11:00:00+09:00" },
    ],
    createdAt: "2026-05-13T11:05:00+09:00",
    customerName: "봉명동 고객",
  },
  {
    id: "estimate-103",
    type: "estimate",
    craft: "tile",
    category: "타일",
    region: "세종",
    shortRegion: "세종 나성동",
    area: "아파트",
    requestDate: "2026-05-23",
    title: "상가 인테리어 견적 요청",
    description: "상가 화장실·주방 타일 교체 견적 문의",
    lat: 36.4805,
    lng: 127.2892,
    photoCount: 0,
    photos: [],
    status: "visiting",
    quoteStatus: QUOTE_STATUS.VISITING,
    quoteMapDisplay: QUOTE_MAP_DISPLAY.VISIT,
    supporters: [
      { userId: "2", name: "박오야", supportedAt: "2026-05-14T08:00:00+09:00" },
      { userId: "5", name: "한오야", supportedAt: "2026-05-14T09:30:00+09:00" },
    ],
    createdAt: "2026-05-13T11:18:00+09:00",
    customerName: "나성동 고객",
  },
  {
    id: "estimate-104",
    type: "estimate",
    craft: "paint",
    category: "도장",
    region: "대전 중구",
    shortRegion: "대전 중구 대흥동",
    area: "18평",
    requestDate: "2026-04-10",
    title: "도장 견적 (선정 완료)",
    description: "최종 업체 선정 완료된 견적 — 지도 미표시",
    lat: 36.3255,
    lng: 127.421,
    photoCount: 0,
    photos: [],
    status: "closed",
    quoteStatus: QUOTE_STATUS.CLOSED,
    supporters: [],
    createdAt: "2026-04-01T09:00:00+09:00",
    customerName: "대흥동 고객",
  },
];

export function buildConsumerRequestTitle(request) {
  if (typeof request?.title === "string" && request.title.trim()) return request.title.trim();
  const craftLabel = CRAFT_LABEL[request?.craft] || "시공";
  return `${craftLabel} 시공 문의`;
}

export function buildConsumerRequestChatPayload(request) {
  return {
    id: `consumer-chat-${request.id}`,
    ownerName: request.customerName || "일반 고객",
    ownerAvatar: "고",
    jobTitle: buildConsumerRequestTitle(request),
    pay: "견적 문의",
    workTime: "상세 일정 협의",
    shortRegion: request.shortRegion,
    fullAddress: request.shortRegion,
    accessPassword: "",
    contactPhone: "",
    status: "chatting",
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    lastMessage: "견적 문의가 시작되었습니다.",
    kind: "consumer-request",
    messages: [
      {
        id: `consumer-system-${request.id}`,
        type: "system",
        sender: "system",
        text: "소비자 요청에 응답해 견적 상담 채팅이 열렸습니다.",
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
      {
        id: `consumer-owner-${request.id}`,
        sender: "owner",
        text: `${request.description || buildConsumerRequestTitle(request)} 문의드립니다.`,
        createdAt: new Date(Date.now() - 1000 * 60).toISOString(),
      },
    ],
  };
}

export function migrateConsumerRequest(request, index = 0) {
  if (!request || typeof request !== "object") return request;
  const photoCount = Number(request.photoCount);
  const normalizedPhotos = Array.isArray(request.photos) ? request.photos.filter(Boolean) : [];
  const craft = typeof request.craft === "string" ? request.craft : "film";
  const category =
    typeof request.category === "string" && request.category.trim()
      ? request.category.trim()
      : CRAFT_LABEL[craft] || "시공";
  const lat = Number(request.lat);
  const lng = Number(request.lng);
  const supporters = Array.isArray(request.supporters) ? request.supporters.filter(Boolean) : [];
  const type = request.type === "estimate" || request.area || request.requestDate ? "estimate" : request.type || "consumer";

  return {
    ...request,
    id: request.id || `consumer-${Date.now()}-${index}`,
    type,
    craft,
    category,
    region:
      typeof request.region === "string" && request.region.trim()
        ? request.region.trim()
        : typeof request.shortRegion === "string"
          ? request.shortRegion.trim()
          : "",
    area: typeof request.area === "string" ? request.area.trim() : "",
    requestDate: request.requestDate || request.preferredDate || "",
    shortRegion: typeof request.shortRegion === "string" ? request.shortRegion.trim() : "",
    title: buildConsumerRequestTitle(request),
    description: typeof request.description === "string" ? request.description.trim() : "",
    photos: normalizedPhotos,
    photoCount: Number.isFinite(photoCount) ? photoCount : normalizedPhotos.length,
    quoteStatus:
      request.quoteStatus ||
      (request.status === "quoted" || request.status === "visiting"
        ? QUOTE_STATUS.VISITING
        : request.status === "closed"
          ? QUOTE_STATUS.CLOSED
          : QUOTE_STATUS.OPEN),
    status:
      request.status === "quoted"
        ? "quoted"
        : request.status === "closed"
          ? "closed"
          : request.status === "visiting"
            ? "visiting"
            : "open",
    supporters,
    lat: Number.isFinite(lat) ? lat : request.lat,
    lng: Number.isFinite(lng) ? lng : request.lng,
    createdAt: request.createdAt || new Date().toISOString(),
    customerName: typeof request.customerName === "string" && request.customerName.trim() ? request.customerName.trim() : "일반 고객",
  };
}

export function mergeConsumerRequestsWithSeedData(list) {
  const parsed = Array.isArray(list) ? list.filter((item) => item && typeof item === "object") : [];
  const seedById = new Map(initialConsumerRequests.map((item) => [item.id, item]));
  const merged = parsed.map((item, index) => {
    const seed = item?.id ? seedById.get(item.id) : null;
    if (seed?.id) seedById.delete(seed.id);
    return migrateConsumerRequest({ ...(seed || {}), ...item }, index);
  });
  const missingSeeds = [...seedById.values()].map((item, index) => migrateConsumerRequest(item, merged.length + index));
  return [...merged, ...missingSeeds];
}

export function loadStoredConsumerRequests() {
  const fallback = initialConsumerRequests.map((item, index) => migrateConsumerRequest(item, index));
  try {
    const raw = localStorage.getItem(CONSUMER_REQUESTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return mergeConsumerRequestsWithSeedData(parsed);
  } catch (_) {
    return fallback;
  }
}
