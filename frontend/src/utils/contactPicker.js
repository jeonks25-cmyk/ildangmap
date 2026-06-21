/**
 * Contact Picker API — 지원 브라우저(주로 Android Chrome)에서 휴대폰 연락처 선택.
 */
export function isContactPickerSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && typeof navigator.contacts?.select === "function";
}

export async function pickPhoneContact() {
  if (!isContactPickerSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const rows = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const row = rows?.[0];
    if (!row) return { ok: false, reason: "cancelled" };

    const name = Array.isArray(row.name) ? row.name[0] : String(row.name || "").trim();
    const telRaw = Array.isArray(row.tel) ? row.tel[0] : row.tel;
    const phone = String(telRaw || "").trim();

    if (!name && !phone) return { ok: false, reason: "empty" };
    return { ok: true, contact: { name: name || "이름 없음", phone } };
  } catch (err) {
    if (err?.name === "AbortError" || err?.name === "NotAllowedError") {
      return { ok: false, reason: "cancelled" };
    }
    return { ok: false, reason: "error" };
  }
}
