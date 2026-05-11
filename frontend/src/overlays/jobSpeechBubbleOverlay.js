/**
 * 거지맵형 말풍선 오버레이 HTML (카카오 CustomOverlay content)
 * 직종: 조공(회) · 준기공(파) · 기공(초) · 오야지(빨)
 */

const TRADE_KEYS = ["조공", "준기공", "기공", "오야지"];

const TRADE_META = {
  조공: { emoji: "🧰", accent: "jogong" },
  준기공: { emoji: "🏠", accent: "junki" },
  기공: { emoji: "🏢", accent: "gigi" },
  오야지: { emoji: "👔", accent: "oyaji" },
};

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeJobTrade(job) {
  const raw = job?.trade ?? job?.jobTrade ?? job?.직종;
  if (raw && TRADE_META[raw]) return raw;
  const t = String(job?.title ?? "");
  if (t.includes("오야지") || t.includes("사장")) return "오야지";
  if (t.includes("기공") && !t.includes("준")) return "기공";
  if (t.includes("준기공")) return "준기공";
  if (t.includes("조공")) return "조공";
  return "조공";
}

export function getTradeAccentKey(job) {
  const trade = normalizeJobTrade(job);
  return (TRADE_META[trade] || TRADE_META.조공).accent;
}

export function getJobSpeechBubbleHtml(job) {
  const trade = normalizeJobTrade(job);
  const meta = TRADE_META[trade] || TRADE_META.조공;
  const payRaw = job?.pay == null || job?.pay === "" ? "-" : String(job.pay);
  const pay = escHtml(payRaw);
  const payAria = escHtml(payRaw);
  const emoji = meta.emoji;
  const accent = meta.accent;
  const label = escHtml(`${trade} 공고`);

  return `
<div class="job-speech-bubble-anchor">
  <div
    class="job-speech-bubble job-speech-bubble--accent-${accent}"
    role="button"
    tabindex="0"
    aria-label="${label}, 급여 ${payAria}"
  >
    <span class="job-speech-bubble__emoji-ring" aria-hidden="true">
      <span class="job-speech-bubble__emoji">${emoji}</span>
    </span>
    <span class="job-speech-bubble__pay">${pay}</span>
  </div>
  <div class="job-speech-bubble__tail" aria-hidden="true"></div>
</div>
`.trim();
}

export { TRADE_KEYS, TRADE_META };
