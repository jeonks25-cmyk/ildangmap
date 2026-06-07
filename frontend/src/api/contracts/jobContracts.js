import {
  createSelfApplicant,
  getApplicantsArray,
  JOB_STATUS,
  migrateJob,
} from "../../utils/jobModel";
import { hasViewerApplied, parseApplicantUserNumericId } from "../../utils/jobOwnership";

/**
 * Target Spring contracts (ApiResponse<T> envelope unwrapped in client.js):
 *
 * GET  /jobs              → JobSummary[]
 * POST /jobs              → JobDetail (created)
 * POST /jobs/{id}/apply   → ApplyJobResponse
 */

function mapBackendJobStatus(status) {
  if (status == null || status === "") return undefined;
  const normalized = String(status).trim().toLowerCase();
  const statusMap = {
    recruiting: "recruiting",
    full: "full",
    confirmed: "confirmed",
    working: "working",
    completed: "completed",
    cancelled: "cancelled",
    matched: "confirmed",
    closed: "full",
    pending: "pending",
  };
  return statusMap[normalized] || normalized;
}

function mapBackendWorkType(workType) {
  if (workType == null || workType === "") return undefined;
  const normalized = String(workType).trim().toUpperCase();
  const workTypeMap = {
    FULL_DAY: "fullDay",
    MORNING: "morning",
    AFTERNOON: "afternoon",
    SHORT_HELP: "shortHelp",
  };
  return workTypeMap[normalized] || String(workType).trim();
}

export function unwrapJobsListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.jobs)) return payload.jobs;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}

export function mapJobSummaryFromApi(dto) {
  if (!dto || typeof dto !== "object") return dto;

  const locationText =
    dto.address ||
    dto.shortAddress ||
    dto.shortRegion ||
    dto.locationText ||
    dto.location ||
    "";

  const pay =
    dto.pay ??
    (dto.payAmount != null
      ? typeof dto.payAmount === "number"
        ? `${dto.payAmount.toLocaleString("ko-KR")}원`
        : String(dto.payAmount)
      : "");

  const participants = mapApplicantsFromApi(dto.participants ?? dto.applicants) ?? [];
  const address = locationText;
  const addressDetail = dto.fullAddress || dto.addressDetail || dto.address || locationText;
  const date = dto.date || dto.workDate || "";

  return {
    ...dto,
    id: dto.id,
    title: dto.title || "제목 없음",
    address,
    addressDetail,
    date,
    shortRegion: address,
    shortAddress: address,
    fullAddress: addressDetail,
    location: dto.location || address,
    pay,
    lat: dto.lat ?? dto.latitude,
    lng: dto.lng ?? dto.longitude,
    craft: dto.craft || dto.trade,
    isUrgent: dto.urgent ?? dto.isUrgent,
    trade: dto.trade || dto.role,
    workDate: date,
    workType: mapBackendWorkType(dto.workType) || dto.workType,
    status: mapBackendJobStatus(dto.status) || dto.status,
    distanceKm: dto.distanceKm,
    participants,
    applicants: participants,
    briefing: Array.isArray(dto.briefing) ? dto.briefing : [],
    alerts: Array.isArray(dto.alerts) ? dto.alerts : [],
    liveHelp: dto.liveHelp ?? (mapBackendWorkType(dto.workType) === "shortHelp"),
    currentApplicantCount: dto.currentApplicantCount,
    maxApplicantCount: dto.maxApplicantCount,
    postedAt: dto.postedAt || dto.createdAt,
  };
}

function mapApplicantsFromApi(applicants) {
  if (!Array.isArray(applicants)) return undefined;
  return applicants.map((applicant) => {
    const row = {
      id: applicant?.id,
      name: applicant?.name || "이름없음",
      role: applicant?.role,
      status: applicant?.status === "PENDING" ? "applied" : applicant?.status || "applied",
      workerId: applicant?.workerId,
    };
    const pid = parseApplicantUserNumericId(row);
    if (pid != null) {
      row.applicantUserId = pid;
    }
    return row;
  });
}

export function mapApplyJobRequest(applicantOverrides = {}) {
  const body = {
    role: applicantOverrides.role,
    memo: applicantOverrides.memo,
  };
  if (applicantOverrides.applicantUserId != null) {
    body.applicantUserId = applicantOverrides.applicantUserId;
  }
  return body;
}

export function mapJobDetailFromApi(dto) {
  return migrateJob(mapJobSummaryFromApi(dto));
}

export function mapJobSummaryListFromApi(payload) {
  return unwrapJobsListPayload(payload).map((item) => mapJobDetailFromApi(item));
}

function parsePayAmountValue(pay, payAmount) {
  if (Number.isFinite(Number(payAmount)) && Number(payAmount) > 0) {
    return Number(payAmount);
  }
  if (typeof pay === "number" && Number.isFinite(pay) && pay > 0) {
    return pay;
  }
  if (typeof pay === "string" && pay.trim()) {
    const digits = pay.replace(/[^\d]/g, "");
    if (digits) return Number(digits);
  }
  return undefined;
}

export function mapCreateJobRequest(jobInput) {
  if (!jobInput || typeof jobInput !== "object") return jobInput;

  const location =
    jobInput.address ||
    jobInput.shortRegion ||
    jobInput.shortAddress ||
    jobInput.locationText ||
    jobInput.location ||
    "";
  const addressDetail =
    jobInput.addressDetail || jobInput.fullAddress || jobInput.address || location;
  const workDate = jobInput.date || jobInput.workDate || "";

  const payAmount = parsePayAmountValue(jobInput.pay, jobInput.payAmount);

  const body = {
    title: jobInput.title,
    address: location,
    addressDetail,
    shortAddress: location,
    location,
    locationText: location,
    fullAddress: addressDetail,
    pay: jobInput.pay,
    payAmount,
    lat: jobInput.lat,
    lng: jobInput.lng,
    trade: jobInput.trade,
    craft: jobInput.craft || jobInput.trade,
    role: jobInput.role || jobInput.trade,
    date: workDate,
    workDate,
    workType: jobInput.workType,
    workTime: jobInput.workTime,
    urgent: Boolean(jobInput.isUrgent ?? jobInput.urgent),
    distanceKm: jobInput.distanceKm,
  };
  if (jobInput.ownerUserId != null && jobInput.ownerUserId !== "") {
    const n = Number(jobInput.ownerUserId);
    if (Number.isFinite(n)) {
      body.ownerUserId = n;
    }
  }
  return body;
}

export function mapCreateJobResponse(payload, fallbackJob) {
  if (payload && typeof payload === "object" && (payload.job || payload.jobs)) {
    return {
      job: payload.job ? mapJobDetailFromApi(payload.job) : mapJobDetailFromApi(fallbackJob),
      jobs: Array.isArray(payload.jobs) ? mapJobSummaryListFromApi(payload.jobs) : null,
    };
  }

  if (payload && typeof payload === "object" && payload.id != null) {
    return {
      job: mapJobDetailFromApi(payload),
      jobs: null,
    };
  }

  return {
    job: mapJobDetailFromApi(fallbackJob),
    jobs: null,
  };
}

export function mapApplyJobResponse(payload, jobId) {
  const resolvedJobId = payload?.jobId ?? payload?.job?.id ?? jobId ?? null;

  if (payload && typeof payload === "object" && payload.applicantId != null) {
    return {
      success: payload.success !== false,
      autoClosed: Boolean(payload.autoClosed),
      applicationStatus: payload.applicationStatus || payload.status || "PENDING",
      applicantId: payload.applicantId,
      currentApplicantCount: payload.currentApplicantCount,
      maxApplicantCount: payload.maxApplicantCount,
      chatRoomId: null,
      jobId: resolvedJobId,
      job: payload.job ? mapJobDetailFromApi(payload.job) : null,
      jobs: null,
    };
  }

  if (payload && typeof payload === "object" && (payload.job || payload.jobs || payload.autoClosed != null)) {
    return {
      success: payload.success !== false,
      autoClosed: Boolean(payload.autoClosed),
      applicationStatus: payload.applicationStatus || payload.status || null,
      chatRoomId: payload.chatRoomId ?? payload.chatRoom?.id ?? null,
      jobId: resolvedJobId,
      job: payload.job ? mapJobDetailFromApi(payload.job) : null,
      jobs: Array.isArray(payload.jobs) ? mapJobSummaryListFromApi(payload.jobs) : null,
    };
  }

  if (payload && typeof payload === "object" && payload.id != null) {
    const job = mapJobDetailFromApi(payload);
    return {
      success: true,
      autoClosed: false,
      applicationStatus: null,
      chatRoomId: null,
      jobId: job.id,
      job,
      jobs: null,
    };
  }

  return {
    success: payload?.success !== false,
    autoClosed: Boolean(payload?.autoClosed),
    applicationStatus: payload?.applicationStatus || null,
    chatRoomId: payload?.chatRoomId ?? null,
    jobId: resolvedJobId,
    job: null,
    jobs: null,
  };
}

export function mergeApplyResultIntoJob(job, applyResult, viewerApplicantUserId = null) {
  if (!job || !applyResult) return job;

  const applicants = getApplicantsArray(job);
  const hasSelf = hasViewerApplied(applicants, viewerApplicantUserId);
  const nextApplicants = hasSelf
    ? applicants
    : [
        ...applicants,
        createSelfApplicant(job, {
          viewerApplicantUserId,
          memo: applyResult?.memo,
          name: applyResult?.applicantName,
        }),
      ];

  return migrateJob({
    ...job,
    participants: nextApplicants,
    status: applyResult.autoClosed ? JOB_STATUS.FULL : job.status,
    shortageCount: applyResult.autoClosed ? 0 : job.shortageCount,
  });
}
