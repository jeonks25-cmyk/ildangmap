/**
 * 공개 앱 URL (초대 링크·OG 등).
 * REACT_APP_PUBLIC_URL 우선, 없으면 런타임 origin, SSR/빌드 시 Vercel 기본값.
 */
export function getPublicAppOrigin() {
  const fromEnv = String(process.env.REACT_APP_PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, "");
  }
  return "https://ildangmap.vercel.app";
}

export function buildInviteLink({ ref, contactId, groupId } = {}) {
  const base = `${getPublicAppOrigin()}/invite`;
  const params = new URLSearchParams();
  if (ref != null && String(ref).trim() !== "") params.set("ref", String(ref));
  if (contactId != null && String(contactId).trim() !== "") params.set("contact", String(contactId));
  if (groupId) params.set("group", String(groupId));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function formatInviterName(name) {
  const trimmed = String(name || "").trim();
  return trimmed || "일당맵 회원";
}

/** 문자·클립보드용 본문 (링크 포함) */
export function buildInviteMessageBody({ inviterName, link, includeLink = true } = {}) {
  const name = formatInviterName(inviterName);
  const lines = [
    "[일당맵 초대]",
    "",
    `${name}님이`,
    "일당맵에 초대했습니다.",
    "",
    "일당맵은",
    "현장 위치, 주차장, 화장실,",
    "식당, 일정, 인원 정보를",
    "공유하는 현장 네트워크 서비스입니다.",
    "",
    "아래 링크를 통해 참여해주세요.",
  ];
  if (includeLink && link) {
    lines.push("", link);
  }
  return lines.join("\n");
}

/**
 * 문자/SNS/카카오톡/링크 복사 공통 — 동일 문구·동일 URL.
 * Web Share API는 text(링크 제외) + url 로 전달해 카카오톡 등에서 중복을 방지한다.
 */
export function buildInviteSharePayload({ link, inviterName, ref, contactId, groupId } = {}) {
  const resolvedLink = link || buildInviteLink({ ref, contactId, groupId });
  const text = buildInviteMessageBody({ inviterName, link: resolvedLink, includeLink: false });
  const fullText = buildInviteMessageBody({ inviterName, link: resolvedLink, includeLink: true });
  return {
    title: "[일당맵 초대]",
    text,
    url: resolvedLink,
    fullText,
    link: resolvedLink,
  };
}

/** @deprecated buildInviteSharePayload().fullText 사용 권장 */
export function buildInviteMessage({ link, inviterName, ref, contactId, groupId } = {}) {
  return buildInviteSharePayload({ link, inviterName, ref, contactId, groupId }).fullText;
}

/** sms: 스킴 href (번호 없으면 본문만) */
export function buildSmsHref({ phone, body } = {}) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  const encoded = encodeURIComponent(body || "");
  return digits ? `sms:${digits}?body=${encoded}` : `sms:?body=${encoded}`;
}
