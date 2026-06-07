/**
 * MVP: 단일 이미지를 JPEG data URL로 축소 (용량·트래픽 상한).
 * @param {File} file
 * @param {{ maxWidth?: number, quality?: number, maxChars?: number }} [opts]
 * @returns {Promise<string>}
 */
export function compressImageFileToDataUrl(file, opts = {}) {
  const maxWidth = opts.maxWidth ?? 960;
  const startQuality = opts.quality ?? 0.78;
  const maxChars = opts.maxChars ?? 130_000;

  return new Promise((resolve, reject) => {
    if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
      reject(new Error("JPEG·PNG·WebP 이미지만 첨부할 수 있어요."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            reject(new Error("이미지 크기를 확인할 수 없어요."));
            return;
          }
          const scale = w > maxWidth ? maxWidth / w : 1;
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("이미지 처리에 실패했어요."));
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          let q = startQuality;
          let dataUrl = canvas.toDataURL("image/jpeg", q);
          let guard = 0;
          while (dataUrl.length > maxChars && q > 0.42 && guard < 14) {
            q -= 0.07;
            dataUrl = canvas.toDataURL("image/jpeg", q);
            guard += 1;
          }
          if (dataUrl.length > maxChars) {
            reject(new Error("이미지가 너무 커요. 더 작은 사진을 선택해 주세요."));
            return;
          }
          resolve(dataUrl);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("이미지 처리에 실패했어요."));
        }
      };
      img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}
