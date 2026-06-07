import { useMemo } from "react";
import { deriveJobOwnership, deriveViewerJobState } from "../utils/jobModel";
import { resolveViewerApplicantUserId } from "../utils/jobOwnership";
import { useUserStore } from "../store/useUserStore";

export function useViewerApplicantUserId() {
  return useUserStore((s) =>
    resolveViewerApplicantUserId({
      session: s.session,
      profile: s.profile,
      authReady: s.authReady,
    })
  );
}

export function useJobOwnership(job) {
  const viewerApplicantUserId = useViewerApplicantUserId();
  return useMemo(() => deriveJobOwnership(job, viewerApplicantUserId), [job, viewerApplicantUserId]);
}

export function useViewerJobState(job) {
  const viewerApplicantUserId = useViewerApplicantUserId();
  return useMemo(() => deriveViewerJobState(job, viewerApplicantUserId), [job, viewerApplicantUserId]);
}
