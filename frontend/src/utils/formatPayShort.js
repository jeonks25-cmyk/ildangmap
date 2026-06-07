import { formatJobMarkerPay } from "./jobPayFormat";

/** @deprecated {@link formatJobMarkerPay} 사용 */
export const formatPayMarkerAmount = formatJobMarkerPay;

/**
 * 지도 미리보기용 일당 압축 표기 (가독성 우선, 짧게)
 * 220000 → "22만", 135000 → "13.5만", 70000 → "7만"
 */
export function formatPayShort(pay) {
  const n = Number(String(pay ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "협의";

  const man = n / 10000;
  if (man >= 1000) return `${Math.round(man)}만`;

  const roundedTenth = Math.round(man * 10) / 10;
  const isWhole = Math.abs(roundedTenth - Math.round(roundedTenth)) < 0.05;
  const value = isWhole ? Math.round(roundedTenth) : roundedTenth;
  const text = isWhole ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  return `${text}만`;
}
