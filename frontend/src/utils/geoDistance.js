/** 위·경도 간 거리(km) — 하버사인 */
export function distanceKmBetween(aLat, aLng, bLat, bLng) {
  const lat1 = Number(aLat);
  const lng1 = Number(aLng);
  const lat2 = Number(bLat);
  const lng2 = Number(bLng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const a = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/** 목록용 거리 라벨 (344m / 1.2km) */
export function formatDistanceLabel(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1) return `${Math.max(1, Math.round(n * 1000))}m`;
  return `${n.toFixed(1)}km`;
}

export function getJobDistanceKm(job, originLat, originLng) {
  const lat = Number(job?.lat);
  const lng = Number(job?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!Number.isFinite(Number(originLat)) || !Number.isFinite(Number(originLng))) {
    return null;
  }
  return distanceKmBetween(originLat, originLng, lat, lng);
}
