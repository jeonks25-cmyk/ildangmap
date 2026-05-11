import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { JOBS_STORAGE_KEY, loadStoredJobs } from "../utils/jobsStorage";

const JobsContext = createContext(null);

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState(() => loadStoredJobs());

  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (_) {
      /* noop */
    }
  }, [jobs]);

  const value = useMemo(() => ({ jobs, setJobs }), [jobs]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    throw new Error("useJobs must be used within JobsProvider");
  }
  return ctx;
}
