import { BETA_FEEDBACK_MAX_IMAGE_BYTES } from "../constants/betaFeedback";

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

/** File[] → Discord API용 { name, dataUrl }[] */
export async function filesToDiscordPayload(files = []) {
  const list = Array.isArray(files) ? files : [];
  const out = [];
  for (const file of list) {
    if (!(file instanceof File)) continue;
    if (file.size > BETA_FEEDBACK_MAX_IMAGE_BYTES) {
      throw new Error(`이미지는 ${Math.round(BETA_FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))}MB 이하만 첨부할 수 있습니다.`);
    }
    const dataUrl = await readFileAsDataUrl(file);
    out.push({ name: file.name || "screenshot.png", dataUrl });
  }
  return out;
}
