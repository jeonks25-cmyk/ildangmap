import { parseApplicantUserNumericId } from "./jobOwnership";
import { formatPublicAddress } from "./formatPublicAddress";

const APPROVED_STATUSES = new Set(["approved", "confirmed", "accepted", "accept", "ACCEPTED"]);
const PENDING_STATUSES = new Set(["pending", "applied", "apply", "PENDING"]);
const REJECTED_STATUSES = new Set(["rejected", "reject", "REJECTED"]);
const CHECKED_IN_STATUSES = new Set(["checked_in", "checked-in", "arrived", "working"]);
const COMPLETED_STATUSES = new Set(["completed", "complete", "done"]);

function viewerIdOf(viewer) {
  if (viewer == null) return null;
  if (typeof viewer === "object") {
    const value = viewer.viewerApplicantUserId ?? viewer.applicantUserId ?? viewer.userId ?? viewer.id;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(viewer);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getParticipants(job) {
  if (Array.isArray(job?.participants) && job.participants.length) return job.participants.filter(Boolean);
  if (Array.isArray(job?.applicants)) return job.applicants.filter(Boolean);
  return [];
}

function getViewerParticipant(job, viewer) {
  const viewerId = viewerIdOf(viewer);
  if (viewerId == null) return null;
  return getParticipants(job).find((participant) => parseApplicantUserNumericId(participant) === viewerId) || null;
}

function hashNumber(value) {
  const text = String(value || "");
  let out = 0;
  for (let i = 0; i < text.length; i += 1) out = (out * 31 + text.charCodeAt(i)) >>> 0;
  return out;
}

export function normalizeParticipantStatus(status) {
  const raw = String(status == null ? "pending" : status).trim();
  const lower = raw.toLowerCase();
  if (APPROVED_STATUSES.has(raw) || APPROVED_STATUSES.has(lower)) return "approved";
  if (REJECTED_STATUSES.has(raw) || REJECTED_STATUSES.has(lower)) return "rejected";
  if (CHECKED_IN_STATUSES.has(raw) || CHECKED_IN_STATUSES.has(lower)) return "checked_in";
  if (COMPLETED_STATUSES.has(raw) || COMPLETED_STATUSES.has(lower)) return "completed";
  if (PENDING_STATUSES.has(raw) || PENDING_STATUSES.has(lower)) return "pending";
  return "pending";
}

export function isJobOwner(job, viewer) {
  const viewerId = viewerIdOf(viewer);
  const ownerId = Number(job?.ownerUserId);
  return viewerId != null && Number.isFinite(ownerId) && ownerId === viewerId;
}

export function isApprovedParticipant(job, viewer) {
  const participant = getViewerParticipant(job, viewer);
  if (!participant) return false;
  const status = normalizeParticipantStatus(participant.status);
  return status === "approved" || status === "checked_in" || status === "completed";
}

export function canViewPrivateJobInfo(job, viewer) {
  if (!job) return false;
  return isJobOwner(job, viewer) || isApprovedParticipant(job, viewer);
}

export function canViewExactLocation(job, viewer) {
  return canViewPrivateJobInfo(job, viewer);
}

export function canViewAccessInfo(job, viewer) {
  return canViewPrivateJobInfo(job, viewer);
}

export function canViewPrivateScheduleInfo(schedule, viewer, job = null) {
  if (job && canViewPrivateJobInfo(job, viewer)) return true;
  const viewerId = viewerIdOf(viewer);
  if (viewerId == null || !schedule) return false;
  const createdBy = Number(schedule.createdByUserId);
  if (Number.isFinite(createdBy) && createdBy === viewerId) return true;
  const acceptedParticipant = Number(schedule.acceptedParticipantUserId);
  if (Number.isFinite(acceptedParticipant) && acceptedParticipant === viewerId) return true;
  const invites = Array.isArray(schedule.scheduleInvites) ? schedule.scheduleInvites : [];
  return invites.some((invite) => {
    const inviteUserId = Number(invite?.userId);
    return Number.isFinite(inviteUserId) && inviteUserId === viewerId && normalizeParticipantStatus(invite?.status) === "approved";
  });
}

export function maskPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "연락처 승인 후 공개";
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-****-${tail}`;
}

export function maskAddressDetail(address) {
  const publicLine = formatPublicAddress(address);
  return publicLine || "상세주소 승인 후 공개";
}

export function getPublicJobLocation(job) {
  const publicAddress = job?.publicAddress || job?.address || job?.shortRegion || job?.shortAddress || "";
  const lat = Number(job?.publicLat);
  const lng = Number(job?.publicLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      lat,
      lng,
      address: formatPublicAddress(publicAddress),
      isExact: false,
    };
  }

  const exactLat = Number(job?.lat);
  const exactLng = Number(job?.lng);
  if (Number.isFinite(exactLat) && Number.isFinite(exactLng)) {
    const hash = hashNumber(job?.id || `${publicAddress}:${exactLat}:${exactLng}`);
    const latSign = hash % 2 === 0 ? 1 : -1;
    const lngSign = hash % 3 === 0 ? 1 : -1;
    const latOffset = (0.0045 + ((hash % 7) * 0.00045)) * latSign;
    const lngOffset = (0.0045 + (((hash >> 3) % 7) * 0.00045)) * lngSign;
    return {
      lat: exactLat + latOffset,
      lng: exactLng + lngOffset,
      address: formatPublicAddress(publicAddress),
      isExact: false,
    };
  }

  return {
    lat: null,
    lng: null,
    address: formatPublicAddress(publicAddress),
    isExact: false,
  };
}

export function getViewerJobLocation(job, viewer) {
  if (canViewExactLocation(job, viewer)) {
    const lat = Number(job?.lat);
    const lng = Number(job?.lng);
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      address: job?.privateFields?.fullAddress || job?.addressDetail || job?.fullAddress || job?.address || "",
      isExact: true,
    };
  }
  return getPublicJobLocation(job);
}

export function createPrivateJobSnapshot(job) {
  if (!job) return null;
  return {
    contactPhone: job.privateFields?.contactPhone || job.contactPhone || "",
    fullAddress: job.privateFields?.fullAddress || job.addressDetail || job.fullAddress || job.address || "",
    accessPassword: job.privateFields?.accessPassword || job.accessPassword || "",
    navigationLink: job.privateFields?.navigationLink || job.navigationLink || "",
    lat: Number.isFinite(Number(job.lat)) ? Number(job.lat) : null,
    lng: Number.isFinite(Number(job.lng)) ? Number(job.lng) : null,
  };
}

export function getPrivateJobFieldsForViewer(job, viewer) {
  const snapshot = createPrivateJobSnapshot(job) || {};
  if (canViewPrivateJobInfo(job, viewer)) {
    return {
      ...snapshot,
      masked: false,
    };
  }
  return {
    contactPhone: snapshot.contactPhone ? maskPhone(snapshot.contactPhone) : "",
    fullAddress: snapshot.fullAddress ? maskAddressDetail(snapshot.fullAddress) : "",
    accessPassword: "승인 후 출입정보 공개",
    navigationLink: "",
    lat: null,
    lng: null,
    masked: true,
  };
}

export function applyViewerLocationToJob(job, viewer) {
  if (!job) return job;
  const location = getViewerJobLocation(job, viewer);
  return {
    ...job,
    lat: location.lat,
    lng: location.lng,
    address: location.address || job.address,
    isExactLocationVisible: location.isExact,
  };
}
