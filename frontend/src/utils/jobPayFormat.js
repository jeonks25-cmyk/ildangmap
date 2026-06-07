/**
 * 지도 마커·목록 금액 — "만" 없이 만원 단위 숫자만
 * 220000 → "22", 140000 → "14", 165000 → "16.5", 95000 → "9.5"
 */
export function formatJobMarkerPay(pay) {
  const n = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "—";

  const man = n / 10000;
  if (man >= 1000) return String(Math.round(man));

  const roundedTenth = Math.round(man * 10) / 10;
  const isWhole = Math.abs(roundedTenth - Math.round(roundedTenth)) < 0.05;
  if (isWhole) return String(Math.round(roundedTenth));
  return roundedTenth.toFixed(1).replace(/\.0$/, "");
}
