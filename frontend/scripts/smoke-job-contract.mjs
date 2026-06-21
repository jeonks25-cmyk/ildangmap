function mapBackendJobStatus(status) {
  if (status == null || status === "") return undefined;
  const normalized = String(status).trim().toLowerCase();
  const statusMap = {
    recruiting: "recruiting",
    matched: "pending",
    working: "pending",
    closed: "closed",
    completed: "completed",
    pending: "pending",
  };
  return statusMap[normalized] || normalized;
}

function mapJobSummaryFromApi(dto) {
  const locationText =
    dto.shortAddress ||
    dto.shortRegion ||
    dto.locationText ||
    dto.location ||
    dto.address ||
    "";

  const pay =
    dto.pay ??
    (dto.payAmount != null
      ? typeof dto.payAmount === "number"
        ? `${dto.payAmount.toLocaleString("ko-KR")}원`
        : String(dto.payAmount)
      : "");

  return {
    ...dto,
    id: dto.id,
    title: dto.title || "제목 없음",
    shortRegion: locationText,
    pay,
    lat: dto.lat ?? dto.latitude,
    lng: dto.lng ?? dto.longitude,
    status: mapBackendJobStatus(dto.status) || dto.status,
  };
}

function unwrapApiEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (!Object.prototype.hasOwnProperty.call(payload, "success")) return payload;
  if (payload.success === false) throw new Error(payload.message || "API failed");
  if (Object.prototype.hasOwnProperty.call(payload, "data")) return payload.data;
  return payload;
}

const envelope = {
  success: true,
  code: "SUCCESS",
  data: [
    {
      id: 1,
      title: "둔산동 상가 필름 기공",
      shortAddress: "대전 서구 둔산동",
      payAmount: 140000,
      lat: 36.356,
      lng: 127.378,
      status: "recruiting",
    },
  ],
};

const jobs = unwrapApiEnvelope(envelope).map(mapJobSummaryFromApi);
if (jobs[0].status !== "recruiting" || !jobs[0].pay.includes("140")) {
  console.error("[smoke] contract normalize FAILED");
  process.exit(1);
}

console.log("[smoke] ApiResponse unwrap + JobSummary normalize OK");
