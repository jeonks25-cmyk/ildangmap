/**
 * 미가입자 초대 링크/문구 생성 (P1).
 * 현재는 mock 도메인. 가입 후 ref(=초대한 오야지 userId)로 내 팀 연결을 잇기 위한 파라미터만 담는다.
 * 신규 데이터 모델 없음 — 순수 함수.
 */
const INVITE_BASE_URL = "https://app.ildangmap.com/invite";

export function buildInviteLink({ ref, contactId, groupId } = {}) {
  const params = new URLSearchParams();
  if (ref != null && String(ref).trim() !== "") params.set("ref", String(ref));
  if (contactId != null && String(contactId).trim() !== "") params.set("contact", String(contactId));
  if (groupId) params.set("group", String(groupId));
  const qs = params.toString();
  return qs ? `${INVITE_BASE_URL}?${qs}` : INVITE_BASE_URL;
}

/** 문자/공유 본문 — 40~60대 오야지 말투, 끝에 가입 링크 */
export function buildInviteMessage({ link } = {}) {
  return `형님 일당맵 한번 써보세요.\n제가 현장 일정 공유하려고 합니다.\n${link || buildInviteLink()}`;
}

/** sms: 스킴 href (번호 없으면 본문만) */
export function buildSmsHref({ phone, body } = {}) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  const encoded = encodeURIComponent(body || "");
  return digits ? `sms:${digits}?body=${encoded}` : `sms:?body=${encoded}`;
}
