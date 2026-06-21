import { getPrimaryRegion } from "../constants/activityRegions";

const CRAFT_SUFFIX = {
  film: "필름",
  wallpaper: "도배",
  tile: "타일",
  electric: "전기",
  facility: "설비",
  paint: "도장",
};

const ROLE_SUFFIX = ["기공", "반장", "기사"];

function regionShort(region = "") {
  const r = String(region || "").trim();
  if (!r) return "대전";
  const parts = r.split(/\s+/);
  const city = parts[0] || "대전";
  return city.replace(/(특별시|광역시|특별자치시|특별자치도|도|시)$/u, "").slice(0, 4) || "대전";
}

function birthYearSuffix(birthYear) {
  const y = Number(birthYear);
  if (Number.isFinite(y) && y >= 1940 && y <= 2010) {
    return String(y).slice(-2);
  }
  return String(80 + (Math.abs(hashSeed(birthYear || "0")) % 15));
}

function hashSeed(seed) {
  const s = String(seed ?? "0");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function normalizeNicknameInput(value) {
  return String(value || "").trim().slice(0, 16);
}

export function validateNicknameInput(value) {
  const v = normalizeNicknameInput(value);
  if (v.length < 2) return { ok: false, message: "닉네임은 2자 이상이어주세요." };
  if (v.length > 16) return { ok: false, message: "닉네임은 16자까지 가능합니다." };
  if (/\s/.test(v)) return { ok: false, message: "띄어쓰기 없이 입력해주세요." };
  if (!/^[가-힣a-zA-Z0-9]+$/.test(v)) {
    return { ok: false, message: "한글·영문·숫자만 사용할 수 있습니다." };
  }
  return { ok: true, value: v };
}

export function getDisplayNickname(profile, sessionUser) {
  const stored = normalizeNicknameInput(profile?.displayNickname || profile?.nickname || sessionUser?.nickname);
  if (stored) return stored;
  return "현장기공";
}

/**
 * 직종 + 지역 + 출생년도 기반 활동명 추천
 * @returns {string[]}
 */
export function suggestNicknames({ craft = "film", region = "대전 서구", birthYear, count = 5, userId = "" } = {}) {
  const craftLabel = CRAFT_SUFFIX[craft] || "필름";
  const regionLabel = regionShort(region);
  const yy = birthYearSuffix(birthYear ?? userId);
  const h = hashSeed(`${craft}-${region}-${birthYear}-${userId}`);

  const pool = [
    `${craftLabel}기공${yy}`,
    `${craftLabel}${ROLE_SUFFIX[h % ROLE_SUFFIX.length]}${yy}`,
    `${regionLabel}${craftLabel}${yy}`,
    `${regionLabel}기공${String(Number(yy) + (h % 7)).slice(-2)}`,
    `${craftLabel}오야지${yy}`,
    `${regionLabel}${ROLE_SUFFIX[(h + 1) % ROLE_SUFFIX.length]}${yy}`,
  ];

  const unique = [];
  pool.forEach((item) => {
    if (!unique.includes(item)) unique.push(item);
  });
  return unique.slice(0, Math.max(3, count));
}

export function generateAutoNickname(userId, options = {}) {
  return suggestNicknames({ ...options, userId, count: 1 })[0] || "현장기공";
}

export function isKakaoPlaceholderNickname() {
  return false;
}

export function ensureDisplayNicknameForAuth(profile, sessionUser, userId, options = {}) {
  return suggestNicknames({
    craft: profile?.craft || options.craft || "film",
    region: getPrimaryRegion(profile?.regions, profile?.region || options.region || "대전"),
    birthYear: profile?.birthYear,
    userId,
    count: 1,
  })[0];
}
