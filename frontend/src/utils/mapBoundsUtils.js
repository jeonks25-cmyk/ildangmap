const BOUNDS_ROUND = 1e5;

function roundCoord(n) {
  return Math.round(Number(n) * BOUNDS_ROUND) / BOUNDS_ROUND;
}

/** @param {import('./mapBoundsUtils').MapBounds | null | undefined} b */
export function normalizeMapBounds(b) {
  if (!b) return null;
  return {
    minLat: roundCoord(b.minLat),
    maxLat: roundCoord(b.maxLat),
    minLng: roundCoord(b.minLng),
    maxLng: roundCoord(b.maxLng),
  };
}

/**
 * @param {import('./mapBoundsUtils').MapBounds | null | undefined} a
 * @param {import('./mapBoundsUtils').MapBounds | null | undefined} b
 */
export function isSameMapBounds(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const na = normalizeMapBounds(a);
  const nb = normalizeMapBounds(b);
  return (
    na.minLat === nb.minLat &&
    na.maxLat === nb.maxLat &&
    na.minLng === nb.minLng &&
    na.maxLng === nb.maxLng
  );
}
