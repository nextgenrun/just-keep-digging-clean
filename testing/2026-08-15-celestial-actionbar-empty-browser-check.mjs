import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const artifactDir = new URL("./artifacts/", import.meta.url);
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(
    "http://localhost:8080/testing/2026-08-15-celestial-actionbar-empty-visual-harness.html?v=20260815-empty-slots",
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => document.body.dataset.celestialActionBarReady === "true");
  const snapshot = await page.evaluate(() => globalThis.__celestialActionBarReview.snapshot());
  assert.equal(snapshot.health.ready, true);
  assert.equal(snapshot.health.slotCount, 6);
  assert.equal(snapshot.health.lockedCount, 5);
  assert.equal(snapshot.visibleIconCount, 1);
  assert.equal(snapshot.lockObjectCount, 0);
  assert.equal(snapshot.campfire.iconVisible, true);
  assert.equal(snapshot.campfire.quantityVisible, true);
  assert.equal(snapshot.campfire.quantity, "1");
  assert.equal(snapshot.campfire.iconWidth, 48);
  assert.equal(snapshot.campfire.iconHeight, 28);
  assert.ok(snapshot.layout.scale < 0.52);
  assert.ok(snapshot.layout.xpGap >= 9.99, "actionbar must clear the XP frame");
  assert.ok(snapshot.layout.inventoryGap >= 9.99, "actionbar must clear inventory input");
  await page.screenshot({
    path: new URL("celestial-actionbar-campfire-slot-six.png", artifactDir).pathname.slice(1),
    clip: { x: 350, y: 500, width: 930, height: 220 },
  });
  await page.mouse.move(
    snapshot.layout.campfireCenter.x,
    snapshot.layout.campfireCenter.y,
  );
  await page.waitForTimeout(100);
  const hovered = await page.evaluate(() => globalThis.__celestialActionBarReview.snapshot());
  assert.equal(hovered.tooltip.visible, true);
  assert.equal(hovered.tooltip.textureKey, "ui-celestial-talent-tooltip-v2");
  assert.ok(Math.abs(hovered.tooltip.width - 440) < 0.01);
  assert.ok(Math.abs(hovered.tooltip.height - 132) < 0.01);
  assert.equal(hovered.tooltip.titleFontSize, "18px");
  assert.equal(hovered.tooltip.bodyFontSize, "14px");
  assert.match(hovered.tooltip.bodyText, /Town or Campfire restores at least 1 use/i);
  assert.match(hovered.tooltip.bodyText, /Find Ember Ore underground.*2 uses/i);
  assert.ok(
    hovered.tooltip.bodyBottom <= hovered.tooltip.height / 2 - 14,
    "tooltip body copy must clear the lower authored trim",
  );
  await page.screenshot({
    path: new URL("celestial-actionbar-tooltip-campfire-refill.png", artifactDir).pathname.slice(1),
    clip: { x: 500, y: 390, width: 780, height: 330 },
  });
  console.log("PASS Celestial action bar: Campfire charge, refill hover copy, and readable Star Pillar tooltip");
} finally {
  await browser.close();
}
