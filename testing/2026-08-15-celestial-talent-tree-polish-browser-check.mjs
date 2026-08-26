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
    "http://localhost:8080/testing/2026-08-14-celestial-talent-tree-visual-harness.html?width=1280&height=720&level=1&v=20260815-polish",
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => document.body.dataset.celestialTalentTreeReady === "true");
  const locked = await page.evaluate(() => globalThis.__celestialTalentTreeReview.snapshot());
  assert.equal(locked.health.ready, true);
  assert.equal(locked.health.nodeCount, 33);
  assert.equal(locked.visibleLockCount, 3, "pre-level tree should show one root lock per branch");
  await page.screenshot({
    path: new URL("celestial-talent-level1-locks.png", artifactDir).pathname.slice(1),
  });

  await page.goto(
    "http://localhost:8080/testing/2026-08-14-celestial-talent-tree-visual-harness.html?width=1280&height=720&level=5&node=comet-shockfront&v=20260815-polish",
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => document.body.dataset.celestialTalentTreeReady === "true");
  const selected = await page.evaluate(() => globalThis.__celestialTalentTreeReview.snapshot());
  assert.equal(selected.health.tooltipVisible, true);
  assert.equal(selected.health.tooltipNodeId, "comet-shockfront");
  await page.screenshot({
    path: new URL("celestial-talent-tooltip-top-right.png", artifactDir).pathname.slice(1),
  });

  const target = await page.evaluate(() => (
    globalThis.__celestialTalentTreeReview.nodeCenter("hollow-tidal-lens")
  ));
  assert.ok(target.hitWidth >= 70 && target.hitHeight >= 60);
  await page.mouse.move(target.x + target.hitWidth / 2 - 3, target.y);
  await page.waitForTimeout(100);
  const hovered = await page.evaluate(() => globalThis.__celestialTalentTreeReview.snapshot());
  assert.equal(hovered.health.tooltipNodeId, "hollow-tidal-lens");

  await page.setViewportSize({ width: 960, height: 640 });
  await page.goto(
    "http://localhost:8080/testing/2026-08-14-celestial-talent-tree-visual-harness.html?width=960&height=640&level=5&node=wayward-fracture-bloom&v=20260815-polish",
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => document.body.dataset.celestialTalentTreeReady === "true");
  const compact = await page.evaluate(() => globalThis.__celestialTalentTreeReview.snapshot());
  assert.equal(compact.health.ready, true);
  assert.equal(compact.health.tooltipVisible, true);
  await page.screenshot({
    path: new URL("celestial-talent-tooltip-compact.png", artifactDir).pathname.slice(1),
  });
  console.log("PASS Celestial talent polish: 3 pre-level locks, edge hover, aligned wide and compact tooltips");
} finally {
  await browser.close();
}
