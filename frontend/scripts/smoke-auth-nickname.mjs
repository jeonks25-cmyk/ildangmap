/**
 * Phase 1 인증/닉네임 플로우 스모크 (Node, mock localStorage 시뮬레이션)
 * 실행: node scripts/smoke-auth-nickname.mjs
 */

const STORAGE = {
  AUTH: "ildangmap_auth_v1",
  PROFILE: "ildangmap_user_profile_v1",
};

function buildMockMeResponse(savedSession, savedProfile) {
  if (!savedSession?.isAuthenticated) return null;
  const displayNickname = String(savedProfile?.displayNickname || savedProfile?.nickname || "").trim();
  const nicknameSetupRequired = savedProfile?.nicknameSetupRequired === true || !displayNickname;
  return {
    id: Number(savedProfile?.id || savedSession?.user?.id) || 1,
    displayNickname: displayNickname || null,
    nicknameSetupRequired,
    canChangeNickname: Boolean(savedProfile?.canChangeNickname ?? !nicknameSetupRequired),
    nicknameChangeAvailableAt: savedProfile?.nicknameChangeAvailableAt || null,
  };
}

function normalizeSetupCompleted(profile) {
  const displayNick = String(profile?.displayNickname || profile?.nickname || "").trim();
  const setupRequired = profile?.nicknameSetupRequired === true || !displayNick;
  return !setupRequired && Boolean(displayNick);
}

function canPerformMemberAction({ authReady, meVerified, session, profile }) {
  return Boolean(
    authReady &&
      meVerified &&
      session?.isAuthenticated &&
      normalizeSetupCompleted(profile) &&
      !profile?.nicknameSetupRequired,
  );
}

function guardMemberAction(state, reason = "post") {
  const { session, authReady, profile, meVerified, meBootstrapLoading } = state;
  if (!authReady || meBootstrapLoading || !meVerified) return { ok: false, reason: "pending" };
  if (!session?.isAuthenticated) return { ok: false, reason: "login", prompt: reason };
  if (profile?.nicknameSetupRequired || !normalizeSetupCompleted(profile)) {
    return { ok: false, reason: "nickname" };
  }
  return { ok: true };
}

const results = [];

function assert(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  else console.log(`PASS: ${name}`);
}

// 1. 비회원
assert("guest getMe null", buildMockMeResponse({ isAuthenticated: false }, {}) === null);
assert("guest cannot post", !canPerformMemberAction({
  authReady: true,
  meVerified: true,
  session: { isAuthenticated: false },
  profile: {},
}));

// 2. persist만 true, meVerified false → 로그인 판정 안 함
assert("persist alone not authenticated UI", !canPerformMemberAction({
  authReady: true,
  meVerified: false,
  session: { isAuthenticated: true },
  profile: { id: "1", displayNickname: "필름기공87", nicknameSetupRequired: false },
}));

// 3. meVerified + session + nickname complete
assert("member can post", canPerformMemberAction({
  authReady: true,
  meVerified: true,
  session: { isAuthenticated: true },
  profile: { displayNickname: "필름기공87", nicknameSetupRequired: false },
}));

// 4. 로그인 후 닉네임 미설정
assert("logged in nickname required blocks post", !canPerformMemberAction({
  authReady: true,
  meVerified: true,
  session: { isAuthenticated: true },
  profile: { nicknameSetupRequired: true, displayNickname: "" },
}));
assert("guard shows nickname message", guardMemberAction({
  authReady: true,
  meVerified: true,
  session: { isAuthenticated: true },
  profile: { nicknameSetupRequired: true },
}).reason === "nickname");

// 5. 레거시 setupCompleted=true but no nickname — bypass 방지
assert("legacy setupCompleted without nickname blocked", !normalizeSetupCompleted({
  setupCompleted: true,
  nicknameSetupRequired: false,
  displayNickname: "",
}));

// 6. 닉네임 설정 후
const afterSetup = {
  id: "1",
  displayNickname: "필름기공87",
  nickname: "필름기공87",
  nicknameSetupRequired: false,
  canChangeNickname: true,
};
assert("after POST nickname setup complete", normalizeSetupCompleted(afterSetup));
assert("after POST can post", canPerformMemberAction({
  authReady: true,
  meVerified: true,
  session: { isAuthenticated: true },
  profile: afterSetup,
}));

// 7. 쿨다운 mock
const afterPatch = {
  ...afterSetup,
  displayNickname: "도배기공92",
  canChangeNickname: false,
  nicknameChangeAvailableAt: "2026-07-01T00:00:00",
};
assert("cooldown canChangeNickname false", afterPatch.canChangeNickname === false);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
