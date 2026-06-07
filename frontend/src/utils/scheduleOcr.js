/** 카톡·문자 캡처 OCR — tesseract.js (한국어+영어) */

let ocrWorker = null;

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function getOcrWorker(onProgress) {
  if (ocrWorker) return ocrWorker;
  const { createWorker } = await import("tesseract.js");
  ocrWorker = await createWorker("kor+eng", 1, {
    logger: (message) => {
      if (!onProgress) return;
      if (message.status === "recognizing text" || message.status === "loading language traineddata") {
        onProgress(message.progress ?? 0, message.status);
      }
    },
  });
  return ocrWorker;
}

/**
 * @param {File|Blob|string} image
 * @param {{ onProgress?: (progress: number, status?: string) => void }} [options]
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function extractTextFromScheduleImage(image, options = {}) {
  const worker = await getOcrWorker(options.onProgress);
  const { data } = await worker.recognize(image);
  return {
    text: normalizeOcrText(data.text),
    confidence: Number(data.confidence) || 0,
  };
}

export async function releaseScheduleOcrWorker() {
  if (!ocrWorker) return;
  try {
    await ocrWorker.terminate();
  } finally {
    ocrWorker = null;
  }
}
