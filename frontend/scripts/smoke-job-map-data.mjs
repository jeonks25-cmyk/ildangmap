const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.success === false) throw new Error(payload.message || "API failed");
  if (Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
  return payload;
}

function mapBackendJobStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  const map = { recruiting: "recruiting", matched: "pending", working: "pending", closed: "closed" };
  return map[normalized] || normalized;
}

function mapJobSummaryFromApi(dto) {
  const locationText = dto.address || dto.shortAddress || "";
  const pay =
    dto.pay ??
    (dto.payAmount != null
      ? `${Number(dto.payAmount).toLocaleString("ko-KR")}원`
      : "");

  return {
    id: dto.id,
    title: dto.title,
    shortRegion: locationText,
    pay,
    lat: dto.lat,
    lng: dto.lng,
    craft: dto.craft || dto.trade,
    status: mapBackendJobStatus(dto.status),
  };
}

async function smokeMapJobData() {
  const response = await fetch(`${API_BASE_URL}/jobs`);
  if (!response.ok) throw new Error(`GET /jobs failed: ${response.status}`);

  const jobs = unwrapApiEnvelope(await response.json()).map(mapJobSummaryFromApi);
  const withCoords = jobs.filter(
    (job) => Number.isFinite(Number(job.lat)) && Number.isFinite(Number(job.lng))
  );

  if (withCoords.length === 0) {
    throw new Error("No jobs with valid lat/lng for map markers");
  }

  console.log(
    `[smoke] map marker data OK — ${withCoords.length}/${jobs.length} jobs have coordinates (ids: ${withCoords.map((j) => j.id).join(", ")})`
  );
}

smokeMapJobData().catch((error) => {
  console.error(`[smoke] map marker data FAILED — ${error.message}`);
  process.exit(1);
});
