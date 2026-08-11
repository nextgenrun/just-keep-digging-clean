// Hidden-Edge QA for approved HUD audio, Inventory, and ESC Menu controls.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const DEFAULT_URL = "http://127.0.0.1:8091/testing/2026-08-02-hud-controls-visual-harness.html";
const DEFAULT_OUTPUT = path.resolve("visual-approval-previews/2026-08-02-hud-controls");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function equalSize(actual, expected) {
  return actual.length === expected.length
    && actual.every((value, index) => Math.abs(value - expected[index]) < 0.01);
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT));
  fs.mkdirSync(outputDir, { recursive: true });
  const browserIssues = [];
  const browser = await chromium.launch({
    executablePath: argument("edge", DEFAULT_EDGE),
    headless: true,
    args: ["--use-angle=swiftshader"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("console", message => {
      if (message.type() === "error") browserIssues.push(`console:${message.text()}`);
    });
    page.on("pageerror", error => browserIssues.push(`pageerror:${error.message}`));

    await page.goto(argument("url", DEFAULT_URL), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => globalThis.__HUD_CONTROLS_HARNESS__?.snapshot?.().ready === true,
      null,
      { timeout: 30_000 },
    );

    const readSnapshot = () => page.evaluate(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot());
    const initial = await readSnapshot();
    await page.mouse.click(initial.positions.music.x, initial.positions.music.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().musicEnabled === false);
    const afterMusic = await readSnapshot();

    await page.mouse.click(initial.positions.sfx.x, initial.positions.sfx.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().sfxEnabled === false);
    const afterSfx = await readSnapshot();

    await page.mouse.click(initial.positions.inventory.x, initial.positions.inventory.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().inventoryOpen === true);
    await page.waitForTimeout(350);
    const afterInventory = await readSnapshot();

    await page.mouse.click(initial.positions.pause.x, initial.positions.pause.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().inventoryOpen === false);
    const afterPauseClosedInventory = await readSnapshot();

    await page.mouse.click(initial.positions.pause.x, initial.positions.pause.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().pauseOpen === true);
    const afterPauseOpened = await readSnapshot();

    await page.mouse.click(initial.positions.pause.x, initial.positions.pause.y);
    await page.waitForFunction(() => globalThis.__HUD_CONTROLS_HARNESS__.snapshot().pauseOpen === false);
    const afterPauseResumed = await readSnapshot();

    const screenshotPath = path.join(outputDir, "hud-controls-inventory-open.png");
    await page.screenshot({ path: screenshotPath });
    const report = {
      schema: "hud-controls-live-qa@1",
      generatedUtc: new Date().toISOString(),
      initial,
      afterMusic,
      afterSfx,
      afterInventory,
      afterPauseClosedInventory,
      afterPauseOpened,
      afterPauseResumed,
      browserIssues,
      screenshotPath,
    };
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    if (!initial.approvedSkinActive) throw new Error("Approved HUD skin is not active.");
    if (initial.quickControls?.depth !== 1970) {
      throw new Error(`Quick-control input depth mismatch: ${JSON.stringify(initial.quickControls)}`);
    }
    if (!equalSize(initial.hitSizes.music, [52, 38])) {
      throw new Error(`Music hit size mismatch: ${JSON.stringify(initial.hitSizes.music)}`);
    }
    if (!equalSize(initial.hitSizes.sfx, [52, 38])) {
      throw new Error(`SFX hit size mismatch: ${JSON.stringify(initial.hitSizes.sfx)}`);
    }
    if (!equalSize(initial.visualSizes.inventory, [94, 94])) {
      throw new Error(`Inventory visual size mismatch: ${JSON.stringify(initial.visualSizes.inventory)}`);
    }
    if (!equalSize(initial.hitSizes.inventory, [102, 102])) {
      throw new Error(`Inventory hit size mismatch: ${JSON.stringify(initial.hitSizes.inventory)}`);
    }
    if (!equalSize(initial.visualSizes.pause, [154, 36])) {
      throw new Error(`Pause visual size mismatch: ${JSON.stringify(initial.visualSizes.pause)}`);
    }
    if (!equalSize(initial.hitSizes.pause, [164, 44])) {
      throw new Error(`Pause hit size mismatch: ${JSON.stringify(initial.hitSizes.pause)}`);
    }
    if (initial.quickControls?.inventory?.keyLabel !== "I") {
      throw new Error(`Inventory live key label mismatch: ${JSON.stringify(initial.quickControls)}`);
    }
    if (
      initial.quickControls?.inventory?.keycapTextureKey
        !== "ui-hud-approved-inventory-keycap-v1"
      || !equalSize([
        initial.quickControls.inventory.keycapWidth,
        initial.quickControls.inventory.keycapHeight,
      ], [25, 25])
    ) {
      throw new Error(`Inventory keycap mismatch: ${JSON.stringify(initial.quickControls)}`);
    }
    if (initial.quickControls?.pause?.label !== "ESC  MENU") {
      throw new Error(`Pause live label mismatch: ${JSON.stringify(initial.quickControls)}`);
    }
    if (afterMusic.musicEnabled !== false || afterMusic.musicAlpha !== 0.48) {
      throw new Error(`Music click did not apply its muted state: ${JSON.stringify(afterMusic)}`);
    }
    if (afterSfx.sfxEnabled !== false || afterSfx.sfxAlpha !== 0.48) {
      throw new Error(`SFX click did not apply its muted state: ${JSON.stringify(afterSfx)}`);
    }
    if (
      !afterInventory.inventoryOpen
      || !afterInventory.inventoryShellVisible
      || afterInventory.controlsEnabled
      || !afterInventory.shopOpen
      || !afterInventory.uiInputPriority
    ) {
      throw new Error(`Inventory click did not open and lock the canonical modal: ${JSON.stringify(afterInventory)}`);
    }
    if (afterPauseClosedInventory.inventoryOpen || afterPauseClosedInventory.pauseOpen) {
      throw new Error("ESC Menu did not close Inventory before opening Pause.");
    }
    if (!afterPauseOpened.pauseOpen || afterPauseOpened.controlsEnabled) {
      throw new Error("ESC Menu did not open Pause and disable controls.");
    }
    if (afterPauseResumed.pauseOpen || !afterPauseResumed.controlsEnabled) {
      throw new Error("ESC Menu did not resume play.");
    }
    if (afterInventory.scenePointerDowns > 0 && afterInventory.lastCurrentlyOverCount < 1) {
      throw new Error("HUD pointer input reached the scene without an interactive UI hit.");
    }
    if (browserIssues.length) throw new Error(`Browser issues: ${JSON.stringify(browserIssues)}`);
    console.log(reportPath);
  } finally {
    await browser.close();
  }
}

await main();
