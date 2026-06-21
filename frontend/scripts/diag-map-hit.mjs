import { chromium, devices } from "playwright";

const BASE = process.env.MAP_URL || "http://localhost:3001/map";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".map-container")?.__ildangMap, { timeout: 45000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const c = document.querySelector(".map-container");
    const sel =
      ".geo-life-marker, .geo-pin-marker, .geo-pay-marker, .geo-estimate-marker, .geo-hmarker, .geo-compact-marker, .geo-place-marker, .job-pin-marker, [class*='marker']";
    const strict =
      ".geo-life-marker, .geo-pin-marker, .geo-pay-marker, .geo-estimate-marker, .geo-hmarker, .geo-compact-marker, .geo-place-marker, .job-pin-marker";

    const children = Array.from(c.children).map((ch) => ({
      pe: ch.style.pointerEvents || "(inline empty)",
      computedPE: getComputedStyle(ch).pointerEvents,
      dataTile: ch.getAttribute("data-ildang-tile-pane"),
      w: Math.round(ch.getBoundingClientRect().width),
      h: Math.round(ch.getBoundingClientRect().height),
      broadMarkers: ch.querySelectorAll(sel).length,
      strictMarkers: ch.querySelectorAll(strict).length,
    }));

    const box = c.getBoundingClientRect();
    const sx = box.left + box.width * 0.5;
    const sy = box.top + box.height * 0.55;
    let el = document.elementFromPoint(sx, sy);
    const chain = [];
    while (el && chain.length < 12) {
      chain.push({
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 60),
        pe: getComputedStyle(el).pointerEvents,
      });
      if (el === document.body) break;
      el = el.parentElement;
    }

    const map = c.__ildangMap;
    return {
      draggable: map?.getDraggable?.(),
      zoomable: map?.getZoomable?.(),
      children,
      elementChain: chain,
      overlayBlockers: ["map-place-overlay", "map-geo-stage__overlays", "map-geo-stage__canvas"].map((s) => {
        const n = document.querySelector(`.${s}`);
        if (!n) return null;
        const st = getComputedStyle(n);
        const r = n.getBoundingClientRect();
        return { sel: s, pe: st.pointerEvents, size: `${Math.round(r.width)}x${Math.round(r.height)}` };
      }),
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
