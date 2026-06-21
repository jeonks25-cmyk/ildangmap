/**
 * 실제 pointer/mouse/drag 이벤트 + 지도 center 이동 검증
 * node scripts/verify-map-pointer-drag.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { chromium, devices } from "playwright";

const BASE = process.env.MAP_URL || "http://localhost:3001/map";
const OUT = "scripts/out";

function moved(before, after) {
  if (!before || !after) return false;
  return Math.abs(before.lat - after.lat) > 0.00001 || Math.abs(before.lng - after.lng) > 0.00001;
}

async function getMapCenter(page) {
  return page.evaluate(() => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map?.getCenter) return null;
    const c = map.getCenter();
    return { lat: c.getLat(), lng: c.getLng(), level: map.getLevel?.() };
  });
}

async function auditPointerBlockers(page) {
  return page.evaluate(() => {
    const selectors = [
      ".map-place-overlay",
      ".map-geo-stage__overlays",
      ".map-geo-stage__place-tools",
      ".geo-map-chrome",
      ".map-floating-action-layer",
      ".map-geo-stage__map-surface",
      ".map-geo-stage__canvas",
    ];
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    const fullThreshold = 0.92;

    const blockers = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const coversW = r.width >= viewport.w * fullThreshold;
        const coversH = r.height >= viewport.h * fullThreshold;
        const abs = s.position === "absolute" || s.position === "fixed";
        const insetLike =
          (s.top === "0px" || parseFloat(s.top) <= 2) &&
          (s.left === "0px" || parseFloat(s.left) <= 2) &&
          r.width > 200 &&
          r.height > 200;
        blockers.push({
          selector: sel,
          className: el.className?.slice?.(0, 80) || "",
          position: s.position,
          inset: `${s.top} ${s.right} ${s.bottom} ${s.left}`,
          size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          pointerEvents: s.pointerEvents,
          zIndex: s.zIndex,
          coversViewport: coversW && coversH,
          fullScreenCandidate: abs && insetLike && coversW && coversH,
          blocksMapIfAuto: s.pointerEvents === "auto" && coversW && coversH,
        });
      });
    });
    return { viewport, blockers };
  });
}

async function dragOnTilePane(page, startRatio, delta) {
  return page.evaluate(
    ({ startRatio, delta }) => {
      const container = document.querySelector(".map-container");
      const map = container?.__ildangMap;
      if (!container) return { error: "no map-container" };

      let tilePane =
        container.querySelector("[data-ildang-tile-pane='true']") || container;
      if (!(tilePane instanceof HTMLElement)) tilePane = container;

      const counts = {};
      const types = [
        "dragstart",
        "drag",
        "dragend",
        "pointerdown",
        "pointermove",
        "pointerup",
        "mousedown",
        "mousemove",
        "mouseup",
        "touchstart",
        "touchmove",
        "touchend",
      ];
      const onEvt = (e) => {
        counts[e.type] = (counts[e.type] || 0) + 1;
      };
      types.forEach((t) => {
        tilePane.addEventListener(t, onEvt, true);
        container.addEventListener(t, onEvt, true);
      });

      const rect = tilePane.getBoundingClientRect();
      const sx = rect.left + rect.width * startRatio.rx;
      const sy = rect.top + rect.height * startRatio.ry;
      const ex = sx + delta.dx;
      const ey = sy + delta.dy;

      const before = map?.getCenter?.();
      const beforeCenter = before ? { lat: before.getLat(), lng: before.getLng() } : null;

      const pe = getComputedStyle(tilePane).pointerEvents;

      const firePointer = (type, x, y) => {
        tilePane.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            buttons: type === "pointerdown" || type === "pointermove" ? 1 : 0,
          }),
        );
      };
      const fireMouse = (type, x, y) => {
        tilePane.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            buttons: type === "mousedown" || type === "mousemove" ? 1 : 0,
          }),
        );
      };

      firePointer("pointerdown", sx, sy);
      fireMouse("mousedown", sx, sy);
      for (let i = 1; i <= 16; i++) {
        const x = sx + ((ex - sx) * i) / 16;
        const y = sy + ((ey - sy) * i) / 16;
        firePointer("pointermove", x, y);
        fireMouse("mousemove", x, y);
      }
      firePointer("pointerup", ex, ey);
      fireMouse("mouseup", ex, ey);

      types.forEach((t) => {
        tilePane.removeEventListener(t, onEvt, true);
        container.removeEventListener(t, onEvt, true);
      });

      const after = map?.getCenter?.();
      const afterCenter = after ? { lat: after.getLat(), lng: after.getLng() } : null;

      return {
        tilePanePointerEvents: pe,
        tilePaneSize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        eventCounts: counts,
        beforeCenter,
        afterCenter,
        centerMoved:
          beforeCenter &&
          afterCenter &&
          (Math.abs(beforeCenter.lat - afterCenter.lat) > 0.00001 ||
            Math.abs(beforeCenter.lng - afterCenter.lng) > 0.00001),
      };
    },
    { startRatio: { rx: 0.35, ry: 0.65 }, delta: { dx: 140, dy: -100 } },
  );
}

async function installKakaoDragListeners(page) {
  return page.evaluate(() => {
    const map = document.querySelector(".map-container")?.__ildangMap;
    if (!map || !window.kakao?.maps?.event) return false;
    window.__ildangKakaoDragLog = [];
    ["dragstart", "drag", "dragend", "center_changed"].forEach((name) => {
      kakao.maps.event.addListener(map, name, () => {
        window.__ildangKakaoDragLog.push(name);
      });
    });
    return true;
  });
}

async function readKakaoDragLog(page) {
  return page.evaluate(() => [...(window.__ildangKakaoDragLog || [])]);
}

async function cdpTouchDrag(page, start, end) {
  const client = await page.context().newCDPSession(page);
  const steps = 16;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: Math.round(start.x), y: Math.round(start.y) }],
  });
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((end.x - start.x) * i) / steps;
    const y = start.y + ((end.y - start.y) * i) / steps;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(x), y: Math.round(y) }],
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function cdpMouseDrag(page, start, end) {
  const client = await page.context().newCDPSession(page);
  const steps = 16;
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: Math.round(start.x),
    y: Math.round(start.y),
    button: "left",
    clickCount: 1,
  });
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((end.x - start.x) * i) / steps;
    const y = start.y + ((end.y - start.y) * i) / steps;
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: Math.round(x),
      y: Math.round(y),
      button: "left",
    });
  }
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: Math.round(end.x),
    y: Math.round(end.y),
    button: "left",
  });
}

async function playwrightMouseDrag(page) {
  await installKakaoDragListeners(page);

  const meta = await page.evaluate(() => {
    const container = document.querySelector(".map-container");
    if (!container) return null;
    const tilePane =
      container.querySelector("[data-ildang-tile-pane='true']") || container;
    const r = tilePane.getBoundingClientRect();
    const sx = r.left + r.width * 0.3;
    const sy = r.top + r.height * 0.65;
    const hit = document.elementFromPoint(sx, sy);
    return {
      w: r.width,
      h: r.height,
      pe: getComputedStyle(tilePane).pointerEvents,
      hitTag: hit?.tagName,
      hitCls: typeof hit?.className === "string" ? hit.className.slice(0, 60) : "",
      hitTile: hit?.closest?.("[data-ildang-tile-pane='true']") != null,
    };
  });

  if (!meta) return { error: "no tile box" };

  const before = await getMapCenter(page);
  const box = await page.locator(".map-container").boundingBox();
  let cdpCenterMoved = false;
  let cdpTouchCenterMoved = false;
  if (box) {
    const dragStart = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.65 };
    const dragEnd = { x: box.x + box.width * 0.75, y: box.y + box.height * 0.25 };
    const midTouch = await getMapCenter(page);
    await cdpTouchDrag(page, dragStart, dragEnd);
    await page.waitForTimeout(500);
    const afterTouch = await getMapCenter(page);
    cdpTouchCenterMoved = moved(midTouch, afterTouch);

    const midMouse = await getMapCenter(page);
    await cdpMouseDrag(page, dragStart, dragEnd);
    await page.waitForTimeout(500);
    const afterCdp = await getMapCenter(page);
    cdpCenterMoved = moved(midMouse, afterCdp);
  }

  const tile = page.locator("[data-ildang-tile-pane='true']").first();
  const count = await tile.count();
  if (count > 0) {
    const box = await tile.boundingBox();
    if (box) {
      await tile.dragTo(tile, {
        sourcePosition: { x: box.width * 0.25, y: box.height * 0.6 },
        targetPosition: { x: box.width * 0.75, y: box.height * 0.25 },
        force: true,
      });
    }
  } else {
    const container = page.locator(".map-container");
    const box = await container.boundingBox();
    if (box) {
      await container.dragTo(container, {
        sourcePosition: { x: box.width * 0.25, y: box.height * 0.6 },
        targetPosition: { x: box.width * 0.75, y: box.height * 0.25 },
        force: true,
      });
    }
  }
  await page.waitForTimeout(800);
  const after = await getMapCenter(page);
  const kakaoMapEvents = await readKakaoDragLog(page);
  const kakaoDragOk = kakaoMapEvents.some((e) => e === "drag" || e === "dragend" || e === "center_changed");

  return {
    tilePanePointerEvents: meta.pe,
    tileBox: { w: meta.w, h: meta.h },
    hitAtDragStart: { tag: meta.hitTag, cls: meta.hitCls, onTilePane: meta.hitTile },
    kakaoMapEvents,
    kakaoDragOk,
    before,
    after,
    centerMoved: moved(before, after),
    cdpCenterMoved,
    cdpTouchCenterMoved,
  };
}

async function runScenario(page, label, setup) {
  if (setup) await setup();
  await page.waitForTimeout(400);

  const synthetic = await dragOnTilePane(page);
  const mouse = await playwrightMouseDrag(page);

  const ok =
    synthetic.centerMoved === true ||
    mouse.centerMoved === true ||
    mouse.cdpCenterMoved === true ||
    mouse.cdpTouchCenterMoved === true;

  return {
    label,
    pointerNote:
      "HTML5 dragstart/drag/dragend는 Kakao Maps 미사용. pan 판정: getCenter 변화 또는 kakao.maps drag/dragend.",
    syntheticDrag: synthetic,
    playwrightMouse: mouse,
    dragHtml5: {
      dragstart: synthetic.eventCounts?.dragstart || 0,
      drag: synthetic.eventCounts?.drag || 0,
      dragend: synthetic.eventCounts?.dragend || 0,
    },
    pointerEvents: {
      pointerdown: synthetic.eventCounts?.pointerdown || 0,
      pointermove: synthetic.eventCounts?.pointermove || 0,
      pointerup: synthetic.eventCounts?.pointerup || 0,
    },
    mouseEvents: {
      mousedown: synthetic.eventCounts?.mousedown || 0,
      mousemove: synthetic.eventCounts?.mousemove || 0,
      mouseup: synthetic.eventCounts?.mouseup || 0,
    },
    panOk:
      synthetic.centerMoved ||
      mouse.centerMoved ||
      mouse.cdpCenterMoved ||
      mouse.cdpTouchCenterMoved,
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const headless = process.env.HEADED !== "1";
  const browser = await chromium.launch({ headless });
  const page = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".map-container", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector(".map-container");
      if (!c?.__ildangMap) return false;
      const r = c.getBoundingClientRect();
      return r.height > 240 && r.width > 240;
    },
    { timeout: 45000 },
  );
  await page.waitForTimeout(800);

  const audit = await auditPointerBlockers(page);
  writeFileSync(`${OUT}/pointer-blockers-audit.json`, JSON.stringify(audit, null, 2));

  const scenarios = [];
  scenarios.push(await runScenario(page, "1-map-only", null));

  await page.getByRole("button", { name: "주변 장소 목록 열기" }).click();
  await page.waitForSelector(".map-place-overlay__panel");
  scenarios.push(await runScenario(page, "2-list-open", null));

  const rows = page.locator(".map-place-overlay-row");
  if ((await rows.count()) > 0) {
    await rows.nth(0).click({ force: true });
    try {
      await page.waitForSelector(".place-detail-card__scroll", { timeout: 8000 });
    } catch {
      await page.waitForSelector(".map-place-overlay__panel--detail", { timeout: 3000 }).catch(() => {});
    }
  }
  scenarios.push(await runScenario(page, "3-detail-open", null));

  const report = { audit, scenarios };
  writeFileSync(`${OUT}/pointer-drag-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  const failed = scenarios.filter((s) => !s.panOk);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
