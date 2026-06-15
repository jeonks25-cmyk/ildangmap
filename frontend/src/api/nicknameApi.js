import { USER_PROFILE_STORAGE_KEY } from "../constants/authStorage";
import { isMockApiEnabled, runApiRequest } from "./client";

function readProfileStorage() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProfilePatch(patch) {
  try {
    const prev = readProfileStorage();
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* noop */
  }
}

export async function checkNicknameAvailability(nickname) {
  const q = encodeURIComponent(String(nickname || "").trim());
  return runApiRequest({
    path: `/api/users/nickname/availability?nickname=${q}`,
    useMock: isMockApiEnabled(),
    mock: () => ({ nickname: String(nickname || "").trim(), available: true, reason: null }),
  });
}

export async function setInitialNickname(nickname) {
  const value = String(nickname || "").trim();
  return runApiRequest({
    path: "/api/users/me/nickname",
    method: "POST",
    body: { nickname: value },
    useMock: isMockApiEnabled(),
    mock: () => {
      writeProfilePatch({
        displayNickname: value,
        nickname: value,
        nicknameSetupRequired: false,
        setupCompleted: true,
        canChangeNickname: true,
        nicknameChangeAvailableAt: "",
      });
      const saved = readProfileStorage();
      return {
        id: Number(saved?.id) || 1,
        displayNickname: value,
        profileImageUrl: saved?.profileImage || "",
        nicknameSetupRequired: false,
        userType: (saved?.userType || "worker").toUpperCase(),
        canChangeNickname: true,
        nicknameChangeAvailableAt: null,
      };
    },
  });
}

export async function changeNickname(nickname) {
  const value = String(nickname || "").trim();
  return runApiRequest({
    path: "/api/users/me/nickname",
    method: "PATCH",
    body: { nickname: value },
    useMock: isMockApiEnabled(),
    mock: () => {
      const availableAt = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 19);
      writeProfilePatch({
        displayNickname: value,
        nickname: value,
        nicknameSetupRequired: false,
        setupCompleted: true,
        canChangeNickname: false,
        nicknameChangeAvailableAt: availableAt,
      });
      const saved = readProfileStorage();
      return {
        id: Number(saved?.id) || 1,
        displayNickname: value,
        profileImageUrl: saved?.profileImage || "",
        nicknameSetupRequired: false,
        userType: (saved?.userType || "worker").toUpperCase(),
        canChangeNickname: false,
        nicknameChangeAvailableAt: availableAt,
      };
    },
  });
}
