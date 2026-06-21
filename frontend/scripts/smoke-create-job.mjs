const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.success === false) throw new Error(payload.message || "API failed");
  if (Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
  return payload;
}

async function countJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs`);
  if (!response.ok) throw new Error(`GET /jobs failed: ${response.status}`);
  const jobs = unwrapApiEnvelope(await response.json());
  return Array.isArray(jobs) ? jobs.length : 0;
}

async function smokeCreateJob() {
  const beforeCount = await countJobs();

  const createBody = {
    title: `smoke-create-${Date.now()}`,
    payAmount: 155000,
    lat: 36.351,
    lng: 127.385,
    craft: "film",
    address: "대전 서구 테스트동",
    workDate: new Date().toISOString().slice(0, 10),
    workType: "fullDay",
    urgent: false,
  };

  const createResponse = await fetch(`${API_BASE_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(createBody),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(`POST /jobs failed: ${createResponse.status} ${errorBody}`);
  }

  const created = unwrapApiEnvelope(await createResponse.json());
  const required = ["id", "title", "pay", "lat", "lng", "craft", "address"];
  const missing = required.filter((key) => created[key] == null);
  if (missing.length > 0) {
    throw new Error(`JobSummaryResponse missing fields: ${missing.join(", ")}`);
  }

  const afterCount = await countJobs();
  if (afterCount <= beforeCount) {
    throw new Error(`Job list did not grow (${beforeCount} -> ${afterCount})`);
  }

  const listResponse = await fetch(`${API_BASE_URL}/jobs`);
  const jobs = unwrapApiEnvelope(await listResponse.json());
  const found = jobs.some((job) => String(job.id) === String(created.id));
  if (!found) {
    throw new Error(`Created job id=${created.id} not found in GET /jobs`);
  }

  console.log(
    `[smoke] POST /jobs OK — id=${created.id}, title=${created.title}, list=${beforeCount}->${afterCount}`
  );
}

smokeCreateJob().catch((error) => {
  console.error(`[smoke] POST /jobs FAILED — ${error.message}`);
  process.exit(1);
});
