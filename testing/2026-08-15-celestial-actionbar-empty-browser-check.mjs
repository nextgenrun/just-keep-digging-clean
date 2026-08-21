import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const artifactDir = new URL("./artifacts/", import.meta.url);
const baseUrl = process.argv.find((entry) => entry.startsWith("--base-url="))
  ?.slice("--base-url=".length) || "http://localhost:8080";
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(
    `${baseUrl}/testing/2026-08-15-celestial-actionbar-empty-visual-harness.html?v=20260821-feedback`,
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => document.body.dataset.celestialActionBarReady === "true");
  const snapshot = await page.evaluate(() => globalThis.__celestialActionBarReview.snapshot());
  assert.equal(snapshot.health.ready, true);
  assert.equal(snapshot.health.slotCount, 5);
  assert.equal(snapshot.health.lockedCount, 5);
  assert.equal(snapshot.visibleIconCount, 0);
  assert.equal(snapshot.lockObjectCount, 0);
  await page.screenshot({
    path: new URL("celestial-actionbar-empty-slots.png", artifactDir).pathname.slice(1),
    clip: { x: 400, y: 500, width: 480, height: 190 },
  });
  await page.mouse.move(709, 598);
  await page.waitForTimeout(100);
  const hovered = await page.evaluate(() => globalThis.__celestialActionBarReview.snapshot());
  assert.equal(hovered.tooltip.visible, true);
  assert.equal(hovered.tooltip.textureKey, "ui-celestial-talent-tooltip-v2");
  assert.ok(Math.abs(hovered.tooltip.width - 440) < 0.01);
  assert.ok(Math.abs(hovered.tooltip.height - 132) < 0.01);
  assert.equal(hovered.tooltip.titleFontSize, "18px");
  assert.equal(hovered.tooltip.bodyFontSize, "14px");
  assert.ok(
    hovered.tooltip.bodyBottom <= hovered.tooltip.height / 2 - 14,
    "tooltip body copy must clear the lower authored trim",
  );
  await page.screenshot({
    path: new URL("celestial-actionbar-tooltip-hollow-sun.png", artifactDir).pathname.slice(1),
    clip: { x: 410, y: 370, width: 540, height: 320 },
  });
  console.log("PASS Celestial action bar: empty sockets and readable aligned Star Pillar tooltip");
} finally {
  await browser.close();
}
