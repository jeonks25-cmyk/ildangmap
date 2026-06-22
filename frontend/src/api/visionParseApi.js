import { getApiBaseUrl } from "./client";

/**
 * 카카오톡 캡처 → Gemini Vision 구조화
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function parseVisionSiteImage(file) {
  if (!file) {
    throw new Error("image_required");
  }

  console.log("[VISION-OCR] request", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const form = new FormData();
  form.append("image", file);

  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/site-import/vision-parse`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  let envelope = null;
  try {
    envelope = await response.json();
  } catch {
    throw new Error("vision_parse_invalid_response");
  }

  console.log("[VISION-OCR] response", {
    ok: response.ok,
    status: response.status,
    envelope,
  });

  if (!response.ok || !envelope?.success || !envelope?.data) {
    const message = envelope?.message || envelope?.code || `HTTP ${response.status}`;
    console.warn("[VISION-OCR] failed — tesseract fallback", {
      status: response.status,
      code: envelope?.code,
      message,
    });
    throw new Error(message);
  }

  console.log("[VISION-OCR] parsed-json", envelope.data);
  return envelope.data;
}
