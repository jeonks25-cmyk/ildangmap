import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyJob as applyJobApi, approveApplication, rejectApplication } from "../api/applicationsApi";
import { isMockApiEnabled, isNetworkError } from "../api/client";
import { mergeApplyResultIntoJob } from "../api/contracts/jobContracts";
import {
  closeJobRecruitment as closeJobRecruitmentApi,
  completeJobWork as completeJobWorkApi,
  createJob as createJobApi,
  getJobs as getJobsApi,
  startJobWork as startJobWorkApi,
} from "../api/jobApi";
import { resolveViewerApplicantUserId } from "../utils/jobOwnership";
import { normalizePreparationChecklist, togglePreparationChecklist } from "../utils/preparationInfo";
import { QUOTE_STATUS } from "../constants/quoteStatus";
import {
  CONSUMER_REQUESTS_STORAGE_KEY,
  loadStoredConsumerRequests,
  mergeConsumerRequestsWithSeedData,
  migrateConsumerRequest,
} from "../utils/consumerRequestsStorage";
import { loadStoredJobs, mergeJobsWithSeedData, saveStoredJobs } from "../utils/jobsStorage";
import { createSafeJsonStorage, pickPersistedStoreState, resolveUpdater, runAsyncStoreAction, writeJsonStorage } from "./storeUtils";
import { useUserStore } from "./useUserStore";

const STORE_KEY = "ildangmap_job_store_v2";
const SEARCH_RECENT_STORAGE_KEY = "map_search_recent_v1";

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadLegacyRecentSearches() {
  try {
    const raw = localStorage.getItem(SEARCH_RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
  } catch (_) {
    return [];
  }
}

function createDefaultFilters() {
  return {
    selectedDateKey: toDateKey(new Date()),
    jobBoardFilter: "all",
    searchQuery: "",
    searchCraftFilter: null,
    searchTradeFilter: null,
    searchWorkFilter: null,
    searchDistanceKm: null,
    recentSearches: loadLegacyRecentSearches(),
  };
}

function createInitialState() {
  return {
    jobs: mergeJobsWithSeedData(loadStoredJobs()),
    requests: mergeConsumerRequestsWithSeedData(loadStoredConsumerRequests()),
    selectedJobId: null,
    selectedHelpJobId: null,
    filters: createDefaultFilters(),
    loading: false,
    error: "",
    mutationLoading: false,
    mutationError: "",
  };
}

function syncLegacyJobState(state) {
  saveStoredJobs(state.jobs);
  writeJsonStorage(
    CONSUMER_REQUESTS_STORAGE_KEY,
    mergeConsumerRequestsWithSeedData(state.requests)
  );
  writeJsonStorage(SEARCH_RECENT_STORAGE_KEY, (state.filters?.recentSearches || []).slice(0, 6));
}

function isSameJobId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function updateJobInList(jobs, jobId, updater) {
  let updatedJob = null;
  const nextJobs = (Array.isArray(jobs) ? jobs : []).map((job) => {
    if (!job || !isSameJobId(job.id, jobId)) return job;
    updatedJob = updater(job);
    return updatedJob;
  });
  return {
    nextJobs,
    updatedJob,
  };
}

export const useJobStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),

      setLoading: (loading) => set(() => ({ loading: Boolean(loading) })),
      setError: (error) => set(() => ({ error: error || "" })),

      setJobs: (nextJobs) =>
        set((state) => ({
          jobs: mergeJobsWithSeedData(resolveUpdater(state.jobs, nextJobs)),
        })),

      updateJobLocal: (jobId, patchOrUpdater) => {
        if (jobId == null) return null;
        let updatedJob = null;
        set((state) => {
          const { nextJobs } = updateJobInList(state.jobs, jobId, (job) => {
            const patch =
              typeof patchOrUpdater === "function" ? patchOrUpdater(job) : patchOrUpdater;
            updatedJob = {
              ...job,
              ...(patch || {}),
              updatedAt: new Date().toISOString(),
            };
            return updatedJob;
          });
          return { jobs: mergeJobsWithSeedData(nextJobs) };
        });
        return updatedJob;
      },

      refreshJobs: async () =>
        runAsyncStoreAction({
          set,
          defaultErrorMessage: "현장을 불러오지 못했습니다.",
          action: () => getJobsApi(),
          onSuccess: (_, nextJobs) => ({
            jobs: mergeJobsWithSeedData(nextJobs),
            error: "",
          }),
          onError: (state, error) => {
            if (!isNetworkError(error)) return {};
            const fallback =
              Array.isArray(state.jobs) && state.jobs.length > 0
                ? state.jobs
                : mergeJobsWithSeedData(loadStoredJobs());
            return {
              jobs: fallback,
              error: "",
            };
          },
        }).then(() => get().jobs),

      createJobPost: async (payload) => {
        let result;
        try {
          result = await runAsyncStoreAction({
            set,
            loadingKey: "mutationLoading",
            errorKey: "mutationError",
            defaultErrorMessage: "현장 등록 중 오류가 발생했습니다.",
            action: () => createJobApi(payload),
            onSuccess: (state, createResult) => {
              if (isMockApiEnabled()) {
                const createdJob = createResult?.job || payload || null;
                const nextJobs = Array.isArray(createResult?.jobs)
                  ? mergeJobsWithSeedData(createResult.jobs)
                  : mergeJobsWithSeedData([createdJob, ...(Array.isArray(state.jobs) ? state.jobs : [])].filter(Boolean));
                return {
                  jobs: nextJobs,
                  error: "",
                };
              }
              return { error: "" };
            },
          });
        } catch (error) {
          if (!isNetworkError(error)) throw error;
          const fallbackJob = {
            ...(payload || {}),
            id: payload?.id || Date.now(),
            createdAt: payload?.createdAt || new Date().toISOString(),
          };
          set((state) => ({
            jobs: mergeJobsWithSeedData([fallbackJob, ...(Array.isArray(state.jobs) ? state.jobs : [])]),
            mutationLoading: false,
            mutationError: "",
            error: "",
          }));
          return fallbackJob;
        }

        if (!isMockApiEnabled()) {
          await get().refreshJobs();
          const createdId = result?.job?.id;
          if (createdId != null) {
            const syncedJob = get().jobs.find((job) => isSameJobId(job.id, createdId));
            if (syncedJob) return syncedJob;
          }
        }

        return result?.job || payload || null;
      },

      createJobItem: async (payload) => get().createJobPost(payload),

      applyToJob: async (jobId, applicantOverrides = {}) => {
        const result = await runAsyncStoreAction({
          set,
          loadingKey: "mutationLoading",
          errorKey: "mutationError",
          defaultErrorMessage: "참여 요청 처리 중 오류가 발생했습니다.",
          action: () => applyJobApi(jobId, applicantOverrides),
          onSuccess: (state, applyResult) => {
            if (isMockApiEnabled()) {
              if (Array.isArray(applyResult?.jobs)) {
                return { jobs: mergeJobsWithSeedData(applyResult.jobs), error: "" };
              }
              if (applyResult?.job) {
                const nextJobs = (Array.isArray(state.jobs) ? state.jobs : []).map((job) =>
                  isSameJobId(job.id, applyResult.job.id) ? applyResult.job : job
                );
                return { jobs: mergeJobsWithSeedData(nextJobs), error: "" };
              }
              if (applyResult?.jobId != null) {
                const { nextJobs } = updateJobInList(state.jobs, applyResult.jobId, (job) =>
                  mergeApplyResultIntoJob(job, applyResult, resolveViewerApplicantUserId(useUserStore.getState()))
                );
                return { jobs: mergeJobsWithSeedData(nextJobs), error: "" };
              }
            }
            return { error: "" };
          },
        });

        if (!isMockApiEnabled()) {
          await get().refreshJobs();
          const syncedJob = get().jobs.find((job) => isSameJobId(job.id, jobId));
          return {
            ...result,
            job: syncedJob || result?.job || null,
          };
        }

        return result;
      },

      toggleJobBookmark: (jobId) => {
        let nextBookmarked = false;
        set((state) => {
          const { nextJobs } = updateJobInList(state.jobs, jobId, (job) => {
            nextBookmarked = !Boolean(job.bookmarked);
            return {
              ...job,
              bookmarked: nextBookmarked,
            };
          });
          return { jobs: nextJobs };
        });
        return nextBookmarked;
      },

      toggleJobPreparationChecklist: (jobId, checklistId) => {
        if (jobId == null || !checklistId) return null;
        let updatedJob = null;
        set((state) => {
          const result = updateJobInList(state.jobs, jobId, (job) => {
            const nextChecklistSource =
              Array.isArray(job.prepChecklist) && job.prepChecklist.length
                ? job.prepChecklist
                : normalizePreparationChecklist(job);
            updatedJob = {
              ...job,
              prepChecklist: togglePreparationChecklist(nextChecklistSource, checklistId),
            };
            return updatedJob;
          });
          return { jobs: result.nextJobs };
        });
        return updatedJob;
      },

      promoteJobToUrgent: (jobId) => {
        let updatedJob = null;
        set((state) => {
          const result = updateJobInList(state.jobs, jobId, (job) => {
            updatedJob = { ...job, isUrgent: true };
            return updatedJob;
          });
          return { jobs: result.nextJobs };
        });
        return updatedJob;
      },

      confirmJobApplicant: async (jobId, applicantId) => {
        await approveApplication(applicantId);
        await get().refreshJobs();
      },

      rejectJobApplicant: async (jobId, applicantId) => {
        await rejectApplication(applicantId);
        await get().refreshJobs();
      },

      closeJobRecruitment: async (jobId) => {
        if (jobId == null) return;
        await closeJobRecruitmentApi(jobId);
        await get().refreshJobs();
      },

      startJobWork: async (jobId) => {
        if (jobId == null) return;
        await startJobWorkApi(jobId);
        await get().refreshJobs();
      },

      completeJobWork: async (jobId) => {
        if (jobId == null) return;
        await completeJobWorkApi(jobId);
        await get().refreshJobs();
      },

      setRequests: (nextRequests) =>
        set((state) => ({
          requests: mergeConsumerRequestsWithSeedData(resolveUpdater(state.requests, nextRequests)),
        })),

      addRequest: (payload) => {
        const next = migrateConsumerRequest(
          {
            ...payload,
            id: payload?.id || `consumer-${Date.now()}`,
            status: "open",
            quoteStatus: QUOTE_STATUS.OPEN,
            createdAt: new Date().toISOString(),
          },
          0
        );
        set((state) => ({
          requests: [next, ...(Array.isArray(state.requests) ? state.requests : [])],
        }));
        return next;
      },

      markRequestQuoted: (requestId) => {
        let resolved = null;
        set((state) => ({
          requests: (Array.isArray(state.requests) ? state.requests : []).map((item) => {
            if (!item || item.id !== requestId) return item;
            resolved = {
              ...item,
              status: "visiting",
              quoteStatus: QUOTE_STATUS.VISITING,
            };
            return resolved;
          }),
        }));
        return resolved;
      },

      supportEstimateRequest: (requestId, supporter) => {
        if (!requestId || !supporter?.userId) return null;
        let resolved = null;
        set((state) => ({
          requests: (Array.isArray(state.requests) ? state.requests : []).map((item) => {
            if (!item || item.id !== requestId || item.type !== "estimate") return item;
            const existing = Array.isArray(item.supporters) ? item.supporters : [];
            if (existing.some((s) => s && String(s.userId) === String(supporter.userId))) {
              resolved = item;
              return item;
            }
            const nextSupporter = {
              userId: String(supporter.userId),
              name: String(supporter.name || "오야지").trim() || "오야지",
              supportedAt: supporter.supportedAt || new Date().toISOString(),
            };
            resolved = { ...item, supporters: [...existing, nextSupporter] };
            return resolved;
          }),
        }));
        return resolved;
      },

      setSelectedJobId: (jobId) => set(() => ({ selectedJobId: jobId ?? null })),
      setSelectedHelpJobId: (jobId) => set(() => ({ selectedHelpJobId: jobId ?? null })),

      setFilters: (patch) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...(typeof patch === "function" ? patch(state.filters) : patch),
          },
        })),

      setSelectedDateKey: (selectedDateKey) =>
        set((state) => ({
          filters: { ...state.filters, selectedDateKey: selectedDateKey || toDateKey(new Date()) },
        })),

      setJobBoardFilter: (jobBoardFilter) =>
        set((state) => ({
          filters: { ...state.filters, jobBoardFilter: jobBoardFilter || "all" },
        })),

      setSearchQuery: (searchQuery) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: searchQuery || "" },
        })),

      setSearchCraftFilter: (searchCraftFilter) =>
        set((state) => ({
          filters: { ...state.filters, searchCraftFilter: searchCraftFilter ?? null },
        })),

      setSearchTradeFilter: (searchTradeFilter) =>
        set((state) => ({
          filters: { ...state.filters, searchTradeFilter: searchTradeFilter ?? null },
        })),

      setSearchWorkFilter: (searchWorkFilter) =>
        set((state) => ({
          filters: { ...state.filters, searchWorkFilter: searchWorkFilter ?? null },
        })),

      setSearchDistanceKm: (searchDistanceKm) =>
        set((state) => ({
          filters: { ...state.filters, searchDistanceKm: searchDistanceKm ?? null },
        })),

      setRecentSearches: (nextRecentSearches) =>
        set((state) => ({
          filters: {
            ...state.filters,
            recentSearches: (resolveUpdater(state.filters.recentSearches, nextRecentSearches) || []).filter(Boolean).slice(0, 6),
          },
        })),

      rememberRecentSearch: (term) =>
        set((state) => {
          const clean = String(term || "").trim();
          if (!clean) return state;
          return {
            filters: {
              ...state.filters,
              recentSearches: [
                clean,
                ...(Array.isArray(state.filters.recentSearches)
                  ? state.filters.recentSearches.filter((item) => item !== clean)
                  : []),
              ].slice(0, 6),
            },
          };
        }),

      clearRecentSearches: () =>
        set((state) => ({
          filters: { ...state.filters, recentSearches: [] },
        })),
    }),
    {
      name: STORE_KEY,
      storage: createSafeJsonStorage(),
      partialize: (state) =>
        pickPersistedStoreState(state, ["jobs", "requests", "selectedJobId", "selectedHelpJobId", "filters"]),
      onRehydrateStorage: () => (state) => {
        if (state) syncLegacyJobState(state);
      },
    }
  )
);

syncLegacyJobState(useJobStore.getState());
useJobStore.subscribe((state) => {
  syncLegacyJobState(state);
});
