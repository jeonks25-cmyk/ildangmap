import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { applyJob } from "../api/applicationsApi";
import JobDetail from "../components/Jobs/JobDetail";
import ApplicantsSheet from "../components/map/ApplicantsSheet";
import { useJobs } from "../context/JobsContext";
import { useViewerApplicantUserId } from "../hooks/useJobOwnership";
import { canApplyToJob, deriveViewerJobState } from "../utils/jobModel";

import { useJobStore } from "../store/useJobStore";
import { useUiStore } from "../store/useUiStore";
import { useUserStore } from "../store/useUserStore";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const viewerApplicantUserId = useViewerApplicantUserId();
  const { id } = useParams();
  const { jobs, setJobs } = useJobs();
  const confirmJobApplicant = useJobStore((s) => s.confirmJobApplicant);
  const rejectJobApplicant = useJobStore((s) => s.rejectJobApplicant);
  const [applicantsOpen, setApplicantsOpen] = useState(false);

  const job = useMemo(() => {
    const nid = Number(id);
    const list = Array.isArray(jobs) ? jobs : [];
    return list.find((j) => j && Number(j.id) === nid) || null;
  }, [id, jobs]);

  useEffect(() => {
    setApplicantsOpen(false);
  }, [id]);

  const sheetJob = useMemo(() => {
    if (!applicantsOpen || !job) return null;
    return jobs.find((j) => j && j.id === job.id) || job;
  }, [applicantsOpen, jobs, job]);

  const applicantsSheetCanManage = useMemo(() => {
    if (!sheetJob) return false;
    return deriveViewerJobState(sheetJob, viewerApplicantUserId).canApproveApplicants;
  }, [sheetJob, viewerApplicantUserId]);

  const handleApply = useCallback(
    async (target) => {
      const { session, authReady } = useUserStore.getState();
      if (!authReady) return;
      if (!session.isAuthenticated) {
        useUiStore.getState().openAuthPrompt("apply");
        return;
      }
      if (!target || target.id == null || !canApplyToJob(target, viewerApplicantUserId)) return;
      try {
        const result = await applyJob(target.id);
        if (Array.isArray(result?.jobs)) setJobs(result.jobs);
      } catch (_) {
        /* noop */
      }
    },
    [setJobs, viewerApplicantUserId]
  );

  const handleConfirmApplicant = useCallback(
    async (jobId, applicantId) => {
      const { session, authReady } = useUserStore.getState();
      if (!authReady) return;
      if (!session.isAuthenticated) {
        useUiStore.getState().openAuthPrompt("applicants");
        return;
      }
      try {
        await confirmJobApplicant(jobId, applicantId);
      } catch (_) {
        /* noop */
      }
    },
    [confirmJobApplicant]
  );

  const handleRejectApplicant = useCallback(
    async (jobId, applicantId) => {
      const { session, authReady } = useUserStore.getState();
      if (!authReady) return;
      if (!session.isAuthenticated) {
        useUiStore.getState().openAuthPrompt("applicants");
        return;
      }
      try {
        await rejectJobApplicant(jobId, applicantId);
      } catch (_) {
        /* noop */
      }
    },
    [rejectJobApplicant]
  );

  return (
    <>
      <JobDetail
        job={job}
        onBack={() => navigate(-1)}
        onApply={handleApply}
        onShowApplicants={() => {
          const { session, authReady } = useUserStore.getState();
          if (!authReady) return;
          if (!session.isAuthenticated) {
            useUiStore.getState().openAuthPrompt("applicants");
            return;
          }
          if (job) setApplicantsOpen(true);
        }}
      />
      {sheetJob ? (
        <ApplicantsSheet
          job={sheetJob}
          onClose={() => setApplicantsOpen(false)}
          canManageApplicants={applicantsSheetCanManage}
          onConfirm={(applicantId) => handleConfirmApplicant(sheetJob.id, applicantId)}
          onReject={(applicantId) => handleRejectApplicant(sheetJob.id, applicantId)}
        />
      ) : null}
    </>
  );
}
