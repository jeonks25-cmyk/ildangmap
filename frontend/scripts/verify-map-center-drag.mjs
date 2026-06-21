import { chromium, devices } from "playwright";

const BASE = process.env.MAP_URL || "http://localhost:3001/map";

function moved(before, after) {
  if (!before || !after) return false;
  return Math.abs(before.lat - after.lat) > 0.00001 || Math.abs(before.lng - after.lng) > 0.00001;
}

async function getCenter(page) {
  return page.evaluate(() => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map?.getCenter) return null;
    const c = map.getCenter();
    return { lat: c.getLat(), lng: c.getLng() };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".map-container", { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector(".map-container")?.__ildangMap, { timeout: 45000 });
  await page.waitForTimeout(3000);

  const panByOk = await page.evaluate(() => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map?.panBy) return false;
    const b = map.getCenter();
    const before = { lat: b.getLat(), lng: b.getLng() };
    map.panBy(120, -80);
    const a = map.getCenter();
    const after = { lat: a.getLat(), lng: a.getLng() };
    return (
      Math.abs(before.lat - after.lat) > 0.00001 || Math.abs(before.lng - after.lng) > 0.00001
    );
  });

  const before = await getCenter(page);
  const box = await page.locator(".map-container").boundingBox();
  if (!box) throw new Error("no map box");

  const sx = box.x + box.width * 0.5;
  const sy = box.y + box.height * 0.55;
  const ex = sx + 160;
  const ey = sy - 120;

  await page.touchscreen.tap(sx, sy);
  await page.touchscreen.down(sx, sy);
  for (let i = 1; i <= 20; i++) {
    const x = sx + ((ex - sx) * i) / 20;
    const y = sy + ((ey - sy) * i) / 20;
    await page.touchscreen.move(x, y);
  }
  await page.touchscreen.up();
  await page.waitForTimeout(600);

  const afterTouch = await getCenter(page);
  const touchMoved = moved(before, afterTouch);

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(ex, ey, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const afterMouse = await getCenter(page);
  const mouseMoved = moved(afterTouch, afterMouse);

  console.log(
    JSON.stringify({ panByOk, touchMoved, mouseMoved, before, afterTouch, afterMouse }, null, 2),
  );
  await browser.close();
  process.exit(touchMoved || mouseMoved ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
