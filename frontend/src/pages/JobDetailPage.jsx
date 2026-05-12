import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJobs } from "../context/JobsContext";
import JobDetail from "../components/Jobs/JobDetail";
import ApplicantsSheet from "../components/map/ApplicantsSheet";
import {
  JOB_STATUS,
  canApplyToJob,
  createSelfApplicant,
  getApplicantsArray,
} from "../utils/jobModel";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { jobs, setJobs } = useJobs();
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

  const handleApply = useCallback(
    (target) => {
      if (!target || target.id == null || !canApplyToJob(target)) return;
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          if (!item || item.id !== target.id || !canApplyToJob(item)) return item;
          return { ...item, applicants: [...getApplicantsArray(item), createSelfApplicant(item)] };
        })
      );
    },
    [setJobs]
  );

  const handleConfirmApplicant = useCallback(
    (jobId, applicantId) => {
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((j) => {
          if (!j || j.id !== jobId) return j;
          const applicants = getApplicantsArray(j).map((a) =>
            a.id === applicantId ? { ...a, status: "confirmed" } : a
          );
          return { ...j, status: JOB_STATUS.PENDING, applicants };
        })
      );
    },
    [setJobs]
  );

  const handleRejectApplicant = useCallback(
    (jobId, applicantId) => {
      setJobs((prev) =>
        (Array.isArray(prev) ? prev : []).map((j) => {
          if (!j || j.id !== jobId) return j;
          const applicants = getApplicantsArray(j).map((a) =>
            a.id === applicantId ? { ...a, status: "rejected" } : a
          );
          return { ...j, applicants };
        })
      );
    },
    [setJobs]
  );

  return (
    <>
      <JobDetail
        job={job}
        onBack={() => navigate(-1)}
        onApply={handleApply}
        onShowApplicants={() => job && setApplicantsOpen(true)}
      />
      {sheetJob ? (
        <ApplicantsSheet
          job={sheetJob}
          onClose={() => setApplicantsOpen(false)}
          onConfirm={(applicantId) => handleConfirmApplicant(sheetJob.id, applicantId)}
          onReject={(applicantId) => handleRejectApplicant(sheetJob.id, applicantId)}
        />
      ) : null}
    </>
  );
}
