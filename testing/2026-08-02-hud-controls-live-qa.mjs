// Hidden-Edge QA for the approved HUD Music/SFX buttons and inventory bag.
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

    const screenshotPath = path.join(outputDir, "hud-controls-inventory-open.png");
    await page.screenshot({ path: screenshotPath });
    const report = {
      schema: "hud-controls-live-qa@1",
      generatedUtc: new Date().toISOString(),
      initial,
      afterMusic,
      afterSfx,
      afterInventory,
      browserIssues,
      screenshotPath,
    };
    const reportPath = path.join(outputDir, "live-qa-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    if (!initial.approvedSkinActive) throw new Error("Approved HUD skin is not active.");
    if (!equalSize(initial.hitSizes.music, [52, 38])) {
      throw new Error(`Music hit size mismatch: ${JSON.stringify(initial.hitSizes.music)}`);
    }
    if (!equalSize(initial.hitSizes.sfx, [52, 38])) {
      throw new Error(`SFX hit size mismatch: ${JSON.stringify(initial.hitSizes.sfx)}`);
    }
    if (!equalSize(initial.hitSizes.inventory, [109, 116])) {
      throw new Error(`Inventory hit size mismatch: ${JSON.stringify(initial.hitSizes.inventory)}`);
    }
    if (!equalSize(initial.hitSizes.inventory, initial.visualSizes.inventory)) {
      throw new Error("Inventory visible and interactive rectangles do not match.");
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
