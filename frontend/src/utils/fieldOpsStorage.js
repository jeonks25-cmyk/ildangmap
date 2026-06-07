const STORAGE_KEY = "field_ops_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {
    /* noop */
  }
}

export function loadScheduleOverride(fieldId) {
  const all = readAll();
  const entry = all.scheduleByField?.[String(fieldId)];
  return entry && typeof entry === "object" ? entry : null;
}

export function saveScheduleOverride(fieldId, patch) {
  const all = readAll();
  const key = String(fieldId);
  const prev = all.scheduleByField?.[key] || {};
  all.scheduleByField = {
    ...(all.scheduleByField || {}),
    [key]: { ...prev, ...patch, updatedAt: new Date().toISOString() },
  };
  writeAll(all);
  return all.scheduleByField[key];
}

export function getParticipationMap(fieldId) {
  const all = readAll();
  return { ...(all.participationByField?.[String(fieldId)] || {}) };
}

export function setParticipationStatus(fieldId, personId, status) {
  const all = readAll();
  const fKey = String(fieldId);
  const prev = all.participationByField?.[fKey] || {};
  all.participationByField = {
    ...(all.participationByField || {}),
    [fKey]: { ...prev, [personId]: status },
  };
  writeAll(all);
}

export function loadFieldOpsInbox() {
  const all = readAll();
  return Array.isArray(all.inbox) ? all.inbox : [];
}

export function pushFieldOpsInbox(item) {
  const all = readAll();
  const inbox = Array.isArray(all.inbox) ? all.inbox : [];
  const next = {
    id: item.id || `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    responded: false,
    createdAt: new Date().toISOString(),
    ...item,
  };
  all.inbox = [next, ...inbox];
  writeAll(all);
  return next;
}

export function respondToInboxItem(inboxId, response) {
  const all = readAll();
  const inbox = Array.isArray(all.inbox) ? all.inbox : [];
  let resolved = null;
  all.inbox = inbox.map((item) => {
    if (item.id !== inboxId) return item;
    resolved = { ...item, responded: true, response, respondedAt: new Date().toISOString() };
    return resolved;
  });
  writeAll(all);
  return resolved;
}

export function loadSavedContacts() {
  const all = readAll();
  return Array.isArray(all.savedContacts) ? all.savedContacts : [];
}

export function toggleSavedContact(personId) {
  const all = readAll();
  const list = Array.isArray(all.savedContacts) ? all.savedContacts : [];
  const exists = list.find((c) => c.personId === personId);
  if (exists) {
    all.savedContacts = list.filter((c) => c.personId !== personId);
  } else {
    all.savedContacts = [{ personId, savedAt: new Date().toISOString() }, ...list];
  }
  writeAll(all);
  return !exists;
}

export function isContactSaved(personId) {
  return loadSavedContacts().some((c) => c.personId === personId);
}

export function countDeclinedAfterChange(fieldId, participantIds) {
  const map = getParticipationMap(fieldId);
  return participantIds.filter((id) => map[id] === "declined_after_change").length;
}
