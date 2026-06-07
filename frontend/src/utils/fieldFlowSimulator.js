/**
 * 개발·mock 전용 — 현장 흐름 상태 변화 시뮬 (프로덕션 UI 노출 금지)
 */
import { JOB_STATUS } from "./jobModel";
import { FLOW_KIND } from "./fieldFlowModel";

let simIndex = 0;

function patchJob(jobs, jobId, patch) {
  const now = new Date().toISOString();
  return (Array.isArray(jobs) ? jobs : []).map((job) => {
    if (!job || String(job.id) !== String(jobId)) return job;
    return {
      ...job,
      ...patch,
      flowAt: now,
    };
  });
}

const STEPS = [
  {
    label: "긴급 발생",
    toast: "긴급헬프 흐름 (mock)",
    apply(jobs) {
      return patchJob(jobs, 9, {
        isUrgent: true,
        liveHelp: true,
        workType: "shortHelp",
        flowKind: FLOW_KIND.URGENT,
        shortageCount: 2,
      });
    },
  },
  {
    label: "팀 연결 완료",
    toast: "팀 연결 완료 (mock)",
    apply(jobs) {
      return patchJob(jobs, 3, {
        shortageCount: 0,
        status: JOB_STATUS.RECRUITING,
        flowKind: FLOW_KIND.FILLED,
      });
    },
  },
  {
    label: "현장 시작",
    toast: "현장 시작됨 (mock)",
    apply(jobs) {
      return patchJob(jobs, 7, {
        status: JOB_STATUS.WORKING,
        flowKind: FLOW_KIND.STARTED,
        shortageCount: 0,
      });
    },
  },
  {
    label: "작업 종료",
    toast: "오늘 작업 종료 (mock)",
    apply(jobs) {
      return patchJob(jobs, 7, {
        status: JOB_STATUS.COMPLETED,
        flowKind: FLOW_KIND.DONE,
        shortageCount: 0,
      });
    },
  },
];

export function getFieldFlowSimSteps() {
  return STEPS.map((s) => s.label);
}

/** @returns {{ jobs: object[], toast: string }} */
export function runNextFieldFlowSim(jobs) {
  const step = STEPS[simIndex % STEPS.length];
  simIndex += 1;
  return {
    jobs: step.apply(jobs),
    toast: step.toast,
  };
}

export function resetFieldFlowSimIndex() {
  simIndex = 0;
}
