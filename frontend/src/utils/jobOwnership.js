/**
 * Centralized job ownership / self-application rules (session-backed viewer id).
 * Avoids scattering "self-worker-mvp" checks; anonymous mode still uses the legacy ref.
 */

export const ANONYMOUS_SELF_WORKER_ID = "self-worker-mvp";

const RECRUITING = "recruiting";

export function resolveViewerApplicantUserId(userSlice) {
  if (!userSlice || typeof userSlice !== "object") return null;
  const { session, profile } = userSlice;
  if (!session || session.isAuthenticated !== true) return null;
  const n = Number(profile?.applicantUserId);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

export function parseApplicantUserNumericId(applicant) {
  if (!applicant || typeof applicant !== "object") return null;
  if (applicant.applicantUserId != null) {
    const fromField = Number(applicant.applicantUserId);
    if (Number.isFinite(fromField) && fromField > 0) return fromField;
  }
  const w = applicant.workerId;
  if (w === ANONYMOUS_SELF_WORKER_ID) return 1;
  if (typeof w === "string" && w.startsWith("user-")) {
    const parsed = Number(w.slice("user-".length));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const direct = Number(w);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return null;
}

export function selfApplicantWorkerRefFromViewerId(viewerApplicantUserId) {
  if (viewerApplicantUserId != null && Number.isFinite(Number(viewerApplicantUserId)) && Number(viewerApplicantUserId) > 0) {
    return `user-${Number(viewerApplicantUserId)}`;
  }
  return ANONYMOUS_SELF_WORKER_ID;
}

export function hasViewerApplied(applicants, viewerApplicantUserId) {
  if (!Array.isArray(applicants) || applicants.length === 0) return false;
  if (viewerApplicantUserId != null && Number.isFinite(Number(viewerApplicantUserId)) && Number(viewerApplicantUserId) > 0) {
    const v = Number(viewerApplicantUserId);
    return applicants.some((a) => parseApplicantUserNumericId(a) === v);
  }
  return applicants.some((a) => a && a.workerId === ANONYMOUS_SELF_WORKER_ID);
}

export function getSelfApplicantForViewer(applicants, viewerApplicantUserId) {
  if (!Array.isArray(applicants) || applicants.length === 0) return null;
  if (viewerApplicantUserId != null && Number.isFinite(Number(viewerApplicantUserId)) && Number(viewerApplicantUserId) > 0) {
    const v = Number(viewerApplicantUserId);
    return applicants.find((a) => parseApplicantUserNumericId(a) === v) || null;
  }
  return applicants.find((a) => a && a.workerId === ANONYMOUS_SELF_WORKER_ID) || null;
}

export function isJobOwner(job, viewerUserId) {
  if (job == null || viewerUserId == null) return false;
  const owner = Number(job.ownerUserId);
  const v = Number(viewerUserId);
  if (!Number.isFinite(owner) || !Number.isFinite(v)) return false;
  return owner === v;
}

export function canViewerApplyToJob({ job, applicants, viewerApplicantUserId }) {
  if (!job) return false;
  const st = String(job.status || RECRUITING).toLowerCase();
  if (st !== RECRUITING) return false;
  if (isJobOwner(job, viewerApplicantUserId)) return false;
  if (hasViewerApplied(applicants, viewerApplicantUserId)) return false;
  return true;
}
