const BANNER_STORAGE_KEY = "ildangmap_pwa_banner_dismissed_at";

export function isPwaStandalone() {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  return Boolean(standaloneMedia || window.navigator.standalone);
}

export function getPwaPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function shouldShowPwaInstallBanner() {
  if (typeof window === "undefined") return false;
  if (isPwaStandalone()) return false;
  try {
    const dismissedAt = localStorage.getItem(BANNER_STORAGE_KEY);
    return dismissedAt !== todayKey();
  } catch {
    return true;
  }
}

export function dismissPwaInstallBannerForToday() {
  try {
    localStorage.setItem(BANNER_STORAGE_KEY, todayKey());
  } catch {
    /* ignore */
  }
}
