// Exercises real pointer/keyboard input and default/rollback rendering in Edge.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";
import {
  getLoadingMiningMinigamePreloadAssets,
} from "../values/loadingMiningMinigame.js";
import {
  getLoadingScreenPresentationAssets,
} from "../values/loadingScreenPresentation.js";

const BASE_URL = process.argv.find(value => value.startsWith("--url="))
  ?.slice("--url=".length)
  || "http://127.0.0.1:8091/testing/2026-07-30-loading-mining-minigame-harness.html";
const outputDir = process.argv.find(value => value.startsWith("--output="))
  ?.slice("--output=".length)
  || path.join(os.tmpdir(), "loading-mining-minigame-live-qa");
const DEBUG_PORT = 9391;
const GAME_URL = process.argv.find(value => value.startsWith("--game-url="))
  ?.slice("--game-url=".length)
  || "";
const MINIGAME_KEYS = getLoadingMiningMinigamePreloadAssets(undefined, "").map(asset => asset.key);
const SCREEN_KEYS = getLoadingScreenPresentationAssets()
  .map(asset => asset.key);
const PRODUCTION_KEYS = [...MINIGAME_KEYS, ...SCREEN_KEYS];

async function navigate(client, rollback = false) {
  const url = new URL(BASE_URL);
  url.searchParams.set("duration", "30000");
  url.searchParams.set("density", "1.5");
  if (rollback) url.searchParams.set("loadingMine", "0");
  await client.send("Page.navigate", { url: url.href });
  await client.waitFor(
    "Boolean(window.__loadingMiningHarness?.ready)",
    rollback ? "rollback harness" : "default harness",
    45000,
  );
  return url.href;
}

function assertDensitySafeLayout(snapshot, label, expectedScale = null) {
  const layout = snapshot?.layout;
  if (
    !layout
    || layout.presentation !== "imagegen-v1"
    || layout.visibleUiSource !== "authored-bitmaps"
    || layout.meterCount !== 2
    || layout.toolSlots !== 7
    || layout.overlapFree !== true
    || layout.noProceduralVisuals !== true
    || layout.progressPlacement !== "dual-left"
    || layout.progressFrameSource !== "loading-screen-v1"
    || layout.minigameBottomBar !== false
    || (
      expectedScale !== null
      && Math.abs(layout.scale - expectedScale) > 0.001
    )
  ) {
    throw new Error(
      `${label} is not density-safe or still overlaps: ${JSON.stringify(snapshot)}`,
    );
  }
}

async function dispatchKey(client, key, code, windowsVirtualKeyCode) {
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
}

async function captureBreakContact(client, screenshot) {
  const before = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  const remainingHp = await client.evaluate(
    "window.__loadingMiningHarness.screen.minigame.state"
      + ".getSelectedCell().hp",
  );
  for (let hit = 1; hit < remainingHp; hit += 1) {
    await dispatchKey(client, " ", "Space", 32);
    await delay(190);
  }
  await dispatchKey(client, " ", "Space", 32);
  await delay(88);
  await client.screenshot(screenshot);
  const contact = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  if (
    contact.minigame.fxBreakCount < before.minigame.fxBreakCount + 1
    || contact.minigame.fxContactCount < before.minigame.fxContactCount + 1
  ) {
    throw new Error(`Break-contact FX did not execute: ${JSON.stringify({
      before,
      contact,
      remainingHp,
    })}`);
  }
  await delay(320);
  return { before, contact, remainingHp };
}

async function exerciseDefault(client) {
  const before = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  assertDensitySafeLayout(before, "Harness loading layout", 1.5);
  if (before.keyboardRightListeners !== 1) {
    throw new Error(`Keyboard handler count is not singular: ${JSON.stringify(before)}`);
  }
  await client.evaluate(
    "(() => { window.__loadingMiningHarness.screen.setLabel("
      + "'Tip: Strong chains unlock stronger pickaxes'); return true; })()",
  );
  const labelFit = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  if (labelFit.label.width > labelFit.label.maxWidth) {
    throw new Error(`Integrated loading label overflowed: ${JSON.stringify(labelFit.label)}`);
  }
  const point = await client.evaluate(
    "window.__loadingMiningHarness.cellScreenPosition(2, 3)",
  );
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await delay(950);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  const afterPointer = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  await dispatchKey(client, "ArrowRight", "ArrowRight", 39);
  await dispatchKey(client, " ", "Space", 32);
  await client.waitFor(
    "window.__loadingMiningHarness.snapshot().minigame"
      + ".restingPickaxeVisible === false",
    "authored pickaxe rest",
    3000,
  );
  const after = await client.evaluate(
    "window.__loadingMiningHarness.snapshot()",
  );
  if (!after.minigame || after.minigame.blocksMined < 1) {
    throw new Error(`Pointer hold did not mine a block: ${JSON.stringify(after)}`);
  }
  if (
    after.minigame.selected.column === afterPointer.minigame.selected.column
  ) {
    throw new Error(`Keyboard selection did not move: ${JSON.stringify({
      afterPointer, after,
    })}`);
  }
  if (after.progress <= before.progress) {
    throw new Error(`Loader progress stopped while mining: ${JSON.stringify({ before, after })}`);
  }
  if (
    after.minigame.fxSwingCount < 3
    || after.minigame.fxContactCount < 2
    || after.minigame.fxHitCount < 2
    || after.minigame.fxBreakCount < 1
    || after.minigame.fxDropCellCount < 1
  ) {
    throw new Error(
      `Layered mining FX did not execute: ${JSON.stringify(after.minigame)}`,
    );
  }
  if (
    after.minigame.visibleToolIcons !== 7
    || after.minigame.restingPickaxeVisible !== false
    || !after.meters
    || after.meters.overallPercent === after.meters.phasePercent
  ) {
    throw new Error(
      `Authored tool rail or dual meters are invalid: ${JSON.stringify(after)}`,
    );
  }
  return { before, labelFit, afterPointer, after, point };
}

async function exerciseProductionBoot(client) {
  if (!GAME_URL) return null;
  const url = new URL(GAME_URL);
  url.searchParams.set("jkd_e2e", "1");
  await client.send("Page.navigate", { url: url.href });
  await client.waitFor(
    "Boolean(window.__jkdLoadingMiningMinigame?.assetsReady)",
    "production Boot loading minigame",
    120000,
  );
  const result = await client.evaluate(`(() => ({
    url: location.href,
    layout: window.__phaserGame?.scene?.getScene("BootScene")
      ?.loadingUi?.layout || null,
    meters: window.__phaserGame?.scene?.getScene("BootScene")
      ?.loadingUi?.meters?.getSnapshot?.() || null,
    diagnostic: window.__jkdLoadingMiningMinigame,
    activeScenes: window.__phaserGame?.scene?.getScenes(true)
      ?.map(scene => scene.sys.settings.key) || [],
    loadedAssets: ${JSON.stringify(PRODUCTION_KEYS)}
      .filter(key => window.__phaserGame?.textures?.exists(key)).length,
  }))()`);
  assertDensitySafeLayout(result, "Production Boot loading layout");
  if (
    result.diagnostic?.revision !== "loading-mining-authored-console-v6-20260731"
    || result.loadedAssets !== PRODUCTION_KEYS.length
  ) {
    throw new Error(`Production Boot did not wire the full pack: ${JSON.stringify(result)}`);
  }
  const screenshot = path.join(outputDir, "production-boot.png");
  await client.screenshot(screenshot);
  return {
    ...result,
    screenshot,
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: 1280,
    height: 720,
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    const defaultUrl = await navigate(client, false);
    const defaultResult = await exerciseDefault(client);
    const contactScreenshot = path.join(outputDir, "break-contact.png");
    const breakContact = await captureBreakContact(
      client,
      contactScreenshot,
    );
    const defaultScreenshot = path.join(outputDir, "default-interactive.png");
    await client.screenshot(defaultScreenshot);

    const rollbackUrl = await navigate(client, true);
    const rollback = await client.evaluate(
      "window.__loadingMiningHarness.snapshot()",
    );
    if (rollback.minigame !== null || rollback.loadedAssets !== 0) {
      throw new Error(`Rollback did not restore legacy loader: ${JSON.stringify(rollback)}`);
    }
    const rollbackScreenshot = path.join(outputDir, "rollback-legacy.png");
    await client.screenshot(rollbackScreenshot);

    const productionBoot = await exerciseProductionBoot(client);

    const browserErrors = client.events.filter(event => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method !== "Log.entryAdded") return false;
      const entry = event.params?.entry;
      return entry?.level === "error"
        && !String(entry.url || "").endsWith("/favicon.ico");
    });
    if (browserErrors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(browserErrors)}`);
    }
    const report = {
      status: "pass",
      defaultUrl,
      rollbackUrl,
      defaultResult,
      breakContact,
      rollback,
      productionBoot,
      screenshots: {
        contactScreenshot,
        defaultScreenshot,
        rollbackScreenshot,
        productionBoot: productionBoot?.screenshot,
      },
    };
    const reportPath = path.join(outputDir, "report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
  } finally {
    try {
      await client?.send("Browser.close");
    } catch (_) {
      edge.kill();
    }
    client?.close();
    edge.kill();
  }
}

await main();
