const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (!Object.prototype.hasOwnProperty.call(payload, "success")) return payload;
  if (payload.success === false) {
    throw new Error(payload.message || "API request failed");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

async function smokeGetJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`GET /jobs failed with status ${response.status}`);
  }

  const payload = await response.json();
  const jobs = unwrapApiEnvelope(payload);

  if (!Array.isArray(jobs)) {
    throw new Error("GET /jobs data is not an array");
  }

  if (jobs.length === 0) {
    throw new Error("GET /jobs returned an empty list");
  }

  const first = jobs[0];
  const required = ["id", "title", "pay", "lat", "lng", "craft", "address"];
  const missing = required.filter((key) => first[key] == null);
  if (missing.length > 0) {
    throw new Error(`JobSummaryResponse missing fields: ${missing.join(", ")}`);
  }

  console.log(`[smoke] GET /jobs OK — ${jobs.length} job(s), first id=${first.id}, title=${first.title}`);
  return jobs;
}

smokeGetJobs().catch((error) => {
  console.error(`[smoke] GET /jobs FAILED — ${error.message}`);
  process.exit(1);
});
