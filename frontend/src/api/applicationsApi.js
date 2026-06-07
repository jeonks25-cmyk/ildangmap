import { canApplyToJob, createSelfApplicant, getApplicantsArray, isLiveHelpJob, JOB_STATUS, migrateJob } from "../utils/jobModel";
import { loadStoredJobs, saveStoredJobs } from "../utils/jobsStorage";
import { createApiError, runApiRequest } from "./client";
import { isMockApiEnabled } from "./client";
import { mapApplyJobRequest, mapApplyJobResponse } from "./contracts/jobContracts";

function toLegacyApplicationStatus(status) {
  if (status === "confirmed" || status === "accepted" || status === "ACCEPTED") return "ACCEPTED";
  if (status === "rejected" || status === "REJECTED") return "REJECTED";
  return "PENDING";
}

function buildApplicationRecord(job, applicant, index = 0) {
  const safeJob = migrateJob(job);
  return {
    id: applicant?.id || `application-${safeJob.id}-${index}`,
    workerName: String(applicant?.name || "").trim() || "이름없음",
    status: toLegacyApplicationStatus(applicant?.status),
    jobId: safeJob.id,
    job: {
      id: safeJob.id,
      title: safeJob.title || "제목 없음",
    },
  };
}

function getAllApplicationRecords(jobs) {
  return (Array.isArray(jobs) ? jobs : []).flatMap((job) =>
    getApplicantsArray(job).map((applicant, index) => buildApplicationRecord(job, applicant, index))
  );
}

function normalizeApplicationRecord(item, index = 0) {
  return {
    id: item?.id || `application-${index}`,
    workerName: String(item?.workerName || item?.name || "").trim() || "이름없음",
    status: toLegacyApplicationStatus(item?.status),
    jobId: item?.jobId ?? item?.job?.id ?? null,
    job: item?.job && typeof item.job === "object"
      ? {
          id: item.job.id ?? item?.jobId ?? null,
          title: item.job.title || "제목 없음",
        }
      : {
          id: item?.jobId ?? null,
          title: "제목 없음",
        },
  };
}

function normalizeApplicationList(payload) {
  if (payload && typeof payload === "object" && Array.isArray(payload.applications)) {
    return payload.applications.map((item, index) => normalizeApplicationRecord(item, index));
  }
  return (Array.isArray(payload) ? payload : []).map((item, index) => normalizeApplicationRecord(item, index));
}

export async function applyJob(jobId, applicantOverrides = {}) {
  const payload = await runApiRequest({
    path: `/jobs/${jobId}/apply`,
    method: "POST",
    body: mapApplyJobRequest(applicantOverrides),
    useMock: isMockApiEnabled(),
    mock: () => {
      const targetId = Number(jobId);
      const loadedJobs = loadStoredJobs();
      const currentJobs = Array.isArray(loadedJobs) ? loadedJobs : [];
      const targetJob = currentJobs.find((job) => job && Number(job.id) === targetId);

      if (!targetJob) {
        throw createApiError("현장을 찾을 수 없습니다.", 404);
      }

      if (!canApplyToJob(targetJob)) {
        throw createApiError("이미 참여 요청했거나 마감된 현장입니다.", 400);
      }

      const nextApplicant = {
        ...createSelfApplicant(targetJob, {
          memo: applicantOverrides.memo,
          name: applicantOverrides.name,
        }),
        ...applicantOverrides,
      };
      const helpResolved = isLiveHelpJob(targetJob);
      const updatedJob = migrateJob({
        ...targetJob,
        participants: [...getApplicantsArray(targetJob), nextApplicant],
        status: helpResolved ? JOB_STATUS.FULL : targetJob.status,
        shortageCount: helpResolved ? 0 : targetJob.shortageCount,
      });
      const nextJobs = saveStoredJobs(
        currentJobs.map((job) => (job && Number(job.id) === targetId ? updatedJob : job))
      );

      return {
        success: true,
        autoClosed: helpResolved,
        applicationStatus: "PENDING",
        chatRoomId: `room-apply-${targetId}`,
        job: updatedJob,
        jobs: nextJobs,
      };
    },
  });

  return mapApplyJobResponse(payload, jobId);
}

export async function getApplicationsByJob(jobId) {
  const payload = await runApiRequest({
    path: `/apply/${jobId}`,
    mock: () => {
      const jobs = loadStoredJobs();
      return getAllApplicationRecords(jobs).filter((item) => String(item.jobId) === String(jobId));
    },
  });

  return normalizeApplicationList(payload);
}

export async function listApplications() {
  const payload = await runApiRequest({
    path: "/apply/list",
    mock: () => getAllApplicationRecords(loadStoredJobs()),
  });

  return normalizeApplicationList(payload);
}

export async function approveApplication(applicationId) {
  const payload = await runApiRequest({
    path: `/applications/${applicationId}/approve`,
    method: "POST",
    useMock: isMockApiEnabled(),
    mock: () => {
      const jobs = loadStoredJobs();
      let approvedRecord = null;
      const nextJobs = (Array.isArray(jobs) ? jobs : []).map((job) => {
        const applicants = getApplicantsArray(job);
        let changed = false;
        const nextApplicants = applicants.map((applicant, index) => {
          if (String(applicant?.id) !== String(applicationId)) return applicant;
          changed = true;
          const nextApplicant = {
            ...applicant,
            status: "confirmed",
          };
          approvedRecord = buildApplicationRecord(job, nextApplicant, index);
          return nextApplicant;
        });
        if (!changed) return job;
        return migrateJob({
          ...job,
          participants: nextApplicants,
        });
      });

      if (!approvedRecord) {
        throw createApiError("참여 요청자를 찾을 수 없습니다.", 404);
      }

      saveStoredJobs(nextJobs);

      return {
        message: "승인 완료",
        application: approvedRecord,
        applications: getAllApplicationRecords(nextJobs),
      };
    },
  });

  return {
    message: typeof payload?.message === "string" ? payload.message : "승인 완료",
    application: payload?.application ? normalizeApplicationRecord(payload.application, 0) : null,
    applications: normalizeApplicationList(payload?.applications || []),
  };
}

export async function rejectApplication(applicationId) {
  const payload = await runApiRequest({
    path: `/applications/${applicationId}/reject`,
    method: "POST",
    useMock: isMockApiEnabled(),
    mock: () => {
      const jobs = loadStoredJobs();
      let rejectedRecord = null;
      const nextJobs = (Array.isArray(jobs) ? jobs : []).map((job) => {
        const applicants = getApplicantsArray(job);
        let changed = false;
        const nextApplicants = applicants.map((applicant, index) => {
          if (String(applicant?.id) !== String(applicationId)) return applicant;
          changed = true;
          const nextApplicant = {
            ...applicant,
            status: "rejected",
          };
          rejectedRecord = buildApplicationRecord(job, nextApplicant, index);
          return nextApplicant;
        });
        if (!changed) return job;
        return migrateJob({
          ...job,
          participants: nextApplicants,
        });
      });

      if (!rejectedRecord) {
        throw createApiError("참여 요청자를 찾을 수 없습니다.", 404);
      }

      saveStoredJobs(nextJobs);

      return {
        message: "거절 완료",
        application: rejectedRecord,
        applications: getAllApplicationRecords(nextJobs),
      };
    },
  });

  return {
    message: typeof payload?.message === "string" ? payload.message : "거절 완료",
    application: payload?.application ? normalizeApplicationRecord(payload.application, 0) : null,
    applications: normalizeApplicationList(payload?.applications || []),
  };
}

export { mapApplyJobRequest, mapApplyJobResponse } from "./contracts/jobContracts";
