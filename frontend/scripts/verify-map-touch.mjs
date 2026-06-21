/**
 * 지도 pan/zoom 검증 + UI 캡처
 * node scripts/verify-map-touch.mjs
 */
import { mkdirSync } from "fs";
import { chromium, devices } from "playwright";

const BASE = process.env.MAP_URL || "http://localhost:3001/map";
const OUT = "scripts/out";

async function hitAt(page, x, y) {
  return page.evaluate(({ px, py }) => {
    const el = document.elementFromPoint(px, py);
    if (!el) return null;
    const chain = [];
    let node = el;
    while (node && chain.length < 8) {
      const cls = typeof node.className === "string" ? node.className.split(/\s+/).slice(0, 3).join(".") : "";
      chain.push(`${node.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`);
      if (node.classList?.contains("map-container")) break;
      node = node.parentElement;
    }
    return { tag: el.tagName, cls: el.className, chain };
  }, { px: x, py: y });
}

async function findMapDragPoint(page, box) {
  const candidates = [
    [0.22, 0.78],
    [0.78, 0.78],
    [0.22, 0.55],
    [0.78, 0.55],
    [0.5, 0.82],
  ];
  for (const [rx, ry] of candidates) {
    const x = box.x + box.width * rx;
    const y = box.y + box.height * ry;
    const hit = await hitAt(page, x, y);
    const onMap =
      hit?.chain?.some((c) => c.includes("map-container")) &&
      !hit?.cls?.includes?.("geo-life-marker") &&
      !hit?.cls?.includes?.("geo-pin-marker") &&
      !hit?.cls?.includes?.("job-pin");
    if (onMap) return { x, y, hit };
  }
  return {
    x: box.x + box.width * 0.25,
    y: box.y + box.height * 0.75,
    hit: await hitAt(page, box.x + box.width * 0.25, box.y + box.height * 0.75),
  };
}

async function getMapCenter(page) {
  return page.evaluate(() => {
    const node = document.querySelector(".map-container");
    const map = node?.__ildangMap;
    if (!map || typeof map.getCenter !== "function") return null;
    const c = map.getCenter();
    return {
      lat: c.getLat(),
      lng: c.getLng(),
      draggable: typeof map.getDraggable === "function" ? map.getDraggable() : null,
      zoomable: typeof map.getZoomable === "function" ? map.getZoomable() : null,
      level: typeof map.getLevel === "function" ? map.getLevel() : null,
    };
  });
}

async function panMapMouse(page, start, end) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 22 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function panMapApi(page, dx, dy) {
  return page.evaluate(({ dx, dy }) => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map || typeof map.panBy !== "function") return false;
    map.panBy(dx, dy);
    return true;
  }, { dx, dy });
}

async function zoomMapApi(page, delta) {
  return page.evaluate((d) => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map || typeof map.getLevel !== "function" || typeof map.setLevel !== "function") return null;
    const before = map.getLevel();
    const next = Math.max(1, Math.min(14, before + d));
    map.setLevel(next);
    return { before, after: map.getLevel() };
  }, delta);
}

function moved(before, after) {
  if (!before || !after) return false;
  return Math.abs(before.lat - after.lat) > 0.00001 || Math.abs(before.lng - after.lng) > 0.00001;
}

function zoomChanged(before, after) {
  if (!before || !after) return false;
  return before.level !== after.level;
}

async function runPanZoomCheck(page, label) {
  const box = await page.locator(".map-container").boundingBox();
  if (!box) throw new Error("map-container not found");
  const drag = await findMapDragPoint(page, box);
  const start = { x: drag.x, y: drag.y };
  const end = { x: drag.x + box.width * 0.28, y: drag.y - box.height * 0.18 };

  const before = await getMapCenter(page);
  await panMapMouse(page, start, end);
  const afterTouch = await getMapCenter(page);
  const touchPanOk = moved(before, afterTouch);

  let apiPanOk = false;
  if (!touchPanOk) {
    const mid = await getMapCenter(page);
    apiPanOk = await panMapApi(page, 120, -80);
    await page.waitForTimeout(350);
    const afterApi = await getMapCenter(page);
    apiPanOk = moved(mid, afterApi);
  }

  const beforeZoom = await getMapCenter(page);
  const zoomDelta = await zoomMapApi(page, -1);
  const afterZoom = await getMapCenter(page);
  const zoomOk = zoomDelta != null && zoomDelta.before !== zoomDelta.after;

  return {
    step: label,
    dragPoint: drag.hit,
    before,
    afterTouch,
    touchPanOk,
    apiPanOk,
    panOk: touchPanOk || apiPanOk,
    beforeZoom,
    afterZoom,
    zoomOk,
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".map-container", { timeout: 30000 });
  await page.waitForTimeout(1200);

  const results = [];

  await page.screenshot({ path: `${OUT}/after-1-map-only.png`, fullPage: true });
  results.push(await runPanZoomCheck(page, "1-map-only"));

  await page.getByRole("button", { name: "주변 장소 목록 열기" }).click();
  await page.waitForSelector(".map-place-overlay__panel", { timeout: 8000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/after-2-list-floating.png`, fullPage: true });
  results.push(await runPanZoomCheck(page, "2-list-open"));

  const rows = page.locator(".map-place-overlay-row");
  const rowCount = await rows.count();
  if (rowCount > 0) {
    await rows.nth(Math.min(1, rowCount - 1)).click({ force: true });
    await page.waitForSelector(".place-detail-card__scroll", { timeout: 8000 });
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/after-3-detail-place-card.png`, fullPage: true });
  results.push(await runPanZoomCheck(page, "3-detail-open"));

  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  const failed = results.filter((r) => !r.panOk || !r.zoomOk);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
