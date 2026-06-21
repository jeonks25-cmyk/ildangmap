/**
 * 모바일 캡처 3종
 * node scripts/capture-map-screenshots.mjs
 */
import { mkdirSync } from "fs";
import { chromium, devices } from "playwright";

const BASE = process.env.MAP_URL || "http://localhost:3001/map";
const OUT = "scripts/out";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".map-container", { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector(".map-container")?.__ildangMap,
    { timeout: 45000 },
  );
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `${OUT}/capture-1-map-default.png`, fullPage: true });

  await page.locator(".map-page-head--geo-stack").waitFor({ state: "visible" });
  await page.locator(".map-geo-stage__map-list-fab").screenshot({
    path: `${OUT}/capture-2-list-fab-row.png`,
  });

  await page.getByRole("button", { name: "주변 장소 목록 열기" }).click();
  await page.waitForSelector(".map-card-container.map-place-overlay-card", { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/capture-3-list-card.png`, fullPage: true });

  await browser.close();
  console.log("saved:", `${OUT}/capture-1-map-default.png`, `${OUT}/capture-2-list-fab-row.png`, `${OUT}/capture-3-list-card.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
