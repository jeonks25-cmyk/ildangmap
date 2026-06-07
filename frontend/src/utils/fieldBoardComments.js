import { writeJsonStorage } from "../store/storeUtils";

const KEY = "ildangmap.fieldBoardComments.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function postKey(briefingId, postId) {
  return `${String(briefingId)}::${String(postId)}`;
}

export function listBoardComments(briefingId, postId) {
  const all = readAll();
  const list = all[postKey(briefingId, postId)];
  return Array.isArray(list) ? list : [];
}

export function addBoardComment(briefingId, postId, { body, authorName = "일당맵 사용자" }) {
  const text = String(body || "").trim();
  if (!text) return null;
  const all = readAll();
  const pk = postKey(briefingId, postId);
  const prev = Array.isArray(all[pk]) ? all[pk] : [];
  const row = {
    id: `fbc-${Date.now()}`,
    body: text,
    authorName,
    createdAt: new Date().toISOString(),
  };
  all[pk] = [...prev, row];
  writeJsonStorage(KEY, all);
  return row;
}
