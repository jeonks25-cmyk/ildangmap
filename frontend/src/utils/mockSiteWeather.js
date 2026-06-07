/** Lightweight mock weather for MVP (no external API). */
export function mockSiteWeather(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  const seed = (Number.isFinite(la) ? Math.round(la * 100) : 3635) + (Number.isFinite(ln) ? Math.round(ln * 100) : 12738);
  const tempC = 18 + (seed % 9);
  const rainProbPct = 10 + (seed % 60);
  const rainSoon = rainProbPct >= 55;
  return { tempC, rainProbPct, rainSoon };
}
