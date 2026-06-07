import { useJobStore } from "../store/useJobStore";

export function JobsProvider({ children }) {
  // Bootstrap is centralized in useAppBootstrap -> AppShell.
  // This bridge stays side-effect free so pages can read jobs without hidden fetches.
  return children;
}

export function useJobs() {
  const jobs = useJobStore((state) => state.jobs);
  const setJobs = useJobStore((state) => state.setJobs);
  const loading = useJobStore((state) => state.loading);
  const error = useJobStore((state) => state.error);
  const refreshJobs = useJobStore((state) => state.refreshJobs);

  return {
    jobs,
    setJobs,
    loading,
    error,
    refreshJobs,
  };
}
