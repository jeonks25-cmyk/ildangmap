import {
  mapCreateJobRequest,
  mapCreateJobResponse,
  mapJobSummaryFromApi,
  mapJobSummaryListFromApi,
} from "./contracts/jobContracts";
import { isMockApiEnabled, runApiRequest } from "./client";
import { migrateJob } from "../utils/jobModel";
import { initialJobs, loadStoredJobs, saveStoredJobs } from "../utils/jobsStorage";

function normalizeJobRecord(job) {
  return migrateJob(job);
}

function getSeedJobs() {
  return initialJobs.map(normalizeJobRecord);
}

export async function getJobs() {
  const payload = await runApiRequest({
    path: "/jobs",
    useMock: isMockApiEnabled(),
    mock: () => {
      const stored = loadStoredJobs();
      if (Array.isArray(stored) && stored.length > 0) {
        return stored.map(normalizeJobRecord);
      }
      return getSeedJobs();
    },
  });

  return mapJobSummaryListFromApi(payload);
}

export async function getEmergencyJobs() {
  const payload = await runApiRequest({
    path: "/jobs/emergency",
    mock: async () => {
      const jobs = await getJobs();
      return jobs.filter((job) => Boolean(job?.isUrgent || job?.liveHelp));
    },
  });
  const jobs = mapJobSummaryListFromApi(payload);
  return jobs.filter((job) => Boolean(job?.isUrgent || job?.liveHelp));
}

export async function createJob(jobInput) {
  const requestBody = mapCreateJobRequest(jobInput);

  const payload = await runApiRequest({
    path: "/jobs",
    method: "POST",
    body: requestBody,
    useMock: isMockApiEnabled(),
    mock: () => {
      const createdJob = normalizeJobRecord(jobInput);
      const currentJobs = loadStoredJobs();
      const nextJobs = saveStoredJobs([createdJob, ...(Array.isArray(currentJobs) ? currentJobs : [])]);
      return {
        job: createdJob,
        jobs: nextJobs,
      };
    },
  });

  return mapCreateJobResponse(payload, jobInput);
}

async function postJobLifecycleAction(jobId, pathSuffix, nextStatus) {
  const id = Number(jobId);
  const payload = await runApiRequest({
    path: `/jobs/${id}${pathSuffix}`,
    method: "POST",
    useMock: isMockApiEnabled(),
    mock: async () => {
      const current = loadStoredJobs();
      const list = Array.isArray(current) ? current : [];
      const found = list.find((j) => j && Number(j.id) === id);
      if (!found) return { id, status: nextStatus };
      const updated = migrateJob({ ...found, status: nextStatus });
      saveStoredJobs(list.map((j) => (j && Number(j.id) === id ? updated : j)));
      return updated;
    },
  });
  return mapJobSummaryFromApi(payload);
}

export async function closeJobRecruitment(jobId) {
  return postJobLifecycleAction(jobId, "/close-recruitment", "full");
}

export async function startJobWork(jobId) {
  return postJobLifecycleAction(jobId, "/start-work", "working");
}

export async function completeJobWork(jobId) {
  return postJobLifecycleAction(jobId, "/complete", "completed");
}

export { mapJobDetailFromApi, mapJobSummaryListFromApi, mapCreateJobRequest } from "./contracts/jobContracts";
