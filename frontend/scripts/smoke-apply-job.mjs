const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
const DEFAULT_APPLICANT_USER_ID = 1;

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.success === false) throw new Error(payload.message || "API failed");
  if (Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
  return payload;
}

async function getRecruitingJobId() {
  const response = await fetch(`${API_BASE_URL}/jobs`);
  if (!response.ok) throw new Error(`GET /jobs failed: ${response.status}`);
  const jobs = unwrapApiEnvelope(await response.json());
  const target = jobs.find((job) => job?.status === "recruiting" && job?.id != null);
  if (!target) throw new Error("No recruiting job available for apply smoke");
  return target.id;
}

async function applyOnce(jobId, applicantUserId = DEFAULT_APPLICANT_USER_ID) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      applicantUserId,
      role: "기공",
      memo: "smoke apply",
    }),
  });

  const body = await response.json();
  return { response, body };
}

async function smokeApplyJob() {
  const jobId = await getRecruitingJobId();

  const first = await applyOnce(jobId);
  if (!first.response.ok) {
    throw new Error(`First apply failed: ${first.response.status} ${JSON.stringify(first.body)}`);
  }

  const firstData = unwrapApiEnvelope(first.body);
  if (firstData.applicantId == null || firstData.jobId == null) {
    throw new Error("ApplyJobResponse missing applicantId or jobId");
  }

  const duplicate = await applyOnce(jobId);
  if (duplicate.response.ok) {
    throw new Error("Duplicate apply should fail but succeeded");
  }
  if (duplicate.response.status !== 400) {
    throw new Error(`Duplicate apply expected 400, received ${duplicate.response.status}`);
  }
  if (duplicate.body?.success !== false) {
    throw new Error("Duplicate apply response should have success=false");
  }

  console.log(
    `[smoke] POST /jobs/${jobId}/apply OK — applicantId=${firstData.applicantId}, duplicate blocked (${duplicate.body?.message || duplicate.body?.code})`
  );
}

smokeApplyJob().catch((error) => {
  console.error(`[smoke] apply FAILED — ${error.message}`);
  process.exit(1);
});
