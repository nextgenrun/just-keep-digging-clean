// Exercises the real F9 chooser, short HUD suppression, fullscreen broad mode,
// upload endpoint, and WebM naming in an isolated hidden Edge profile.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CdpClient,
  delay,
  launchSurfaceHeroQaEdge,
  waitForTarget,
} from "./surfaceHeroLandmarksV4LiveQaSupport.mjs";

const GAME_URL = process.argv.find(value => value.startsWith("--url="))
  ?.slice("--url=".length)
  || "http://127.0.0.1:8080/?jkd_e2e=1&nativeDensity=0&runtimeAssetQueue=1";
const outputDir = process.argv.find(value => value.startsWith("--output="))
  ?.slice("--output=".length)
  || path.join(os.tmpdir(), "screen-record-modes-live-qa");
const RECORDING_DIR = path.resolve("systems/screenrecord");
const DEBUG_PORT = 9479;
const F9_KEY = Object.freeze({
  key: "F9",
  code: "F9",
  windowsVirtualKeyCode: 120,
  nativeVirtualKeyCode: 120,
});

function recordingNames() {
  return fs.readdirSync(RECORDING_DIR)
    .filter(name => name.toLowerCase().endsWith(".webm"))
    .sort();
}

async function waitForDialog(client, fromIndex, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = client.events.slice(fromIndex)
      .find(candidate => candidate.method === "Page.javascriptDialogOpening");
    if (event) return event.params;
    await delay(25);
  }
  throw new Error("F9 capture chooser did not open");
}

async function pressF9(client) {
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...F9_KEY });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...F9_KEY });
}

async function chooseF9Mode(client, mode) {
  const eventIndex = client.events.length;
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...F9_KEY });
  const dialog = await waitForDialog(client, eventIndex);
  await client.send("Page.handleJavaScriptDialog", {
    accept: true,
    promptText: mode,
  });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...F9_KEY });
  if (
    dialog.type !== "prompt"
    || !dialog.message.includes("SHORT")
    || !dialog.message.includes("BROAD")
  ) {
    throw new Error(`F9 chooser copy is incomplete: ${JSON.stringify(dialog)}`);
  }
  return dialog;
}

async function startPlayScene(client) {
  await client.send("Page.navigate", { url: GAME_URL });
  await client.waitFor(`Boolean(
    window.__phaserGame?.scene
    && window.__phaserGame.scene.getScenes(true).some(
      scene => ["MainMenuScene", "StartMenuScene"].includes(scene.scene.key)
    )
  )`, "game menu", 180000);
  await client.evaluate(`(() => {
    window.__phaserGame.scene.start("WorldLoadScene", {
      saveSlot: 1,
      worldIdentity: "screen-record-modes-live-qa-20260801",
      isNewSave: true,
      tutorialChoice: "no",
      autoStart: true,
    });
    return true;
  })()`);
  await client.waitFor(`Boolean(
    window.__phaserGame?.scene?.isActive("PlayScene")
    && window.__phaserGame.scene.getScene("PlayScene")?.screenRecordSystem
    && window.__phaserGame.scene.getScene("PlayScene")?.gameState === "playing"
  )`, "PlayScene recorder", 240000);
  await client.evaluate(`(() => {
    window.__jkdE2E?.closeAll?.();
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    window.__screenRecordQaUi = scene.children.list.filter(object => (
      object.visible === true
      && Number(object.scrollFactorX) === 0
      && Number(object.scrollFactorY) === 0
      && Number(object.depth) >= 998
    ));
    return window.__screenRecordQaUi.length;
  })()`);
}

async function captureState(client) {
  return client.evaluate(`(() => {
    const scene = window.__phaserGame.scene.getScene("PlayScene");
    const recorder = scene.screenRecordSystem;
    return {
      mode: recorder.activeMode,
      pendingStart: recorder.pendingStart,
      recorderState: recorder.recorder?.state || null,
      sourceSize: [scene.game.canvas.width, scene.game.canvas.height],
      recordingSize: recorder.recordingCanvas
        ? [recorder.recordingCanvas.width, recorder.recordingCanvas.height]
        : null,
      uiTotal: window.__screenRecordQaUi?.length || 0,
      uiVisible: window.__screenRecordQaUi?.filter(object => object.visible).length || 0,
      fullscreen: window.__isGameFullscreen?.() === true,
      nativeFullscreen: document.fullscreenElement?.id === "game-root",
      fallbackFullscreen: document.querySelector("#game-root")
        ?.classList.contains("fullscreen-fallback") === true,
      indicator: document.querySelector("[data-screen-record-indicator]")?.textContent || "",
    };
  })()`);
}

async function waitForSaved(client) {
  await client.waitFor(`(() => {
    const recorder = window.__phaserGame.scene.getScene("PlayScene")?.screenRecordSystem;
    return Boolean(recorder)
      && recorder.pendingStart === false
      && recorder.saving === false
      && recorder.recorder === null
      && recorder.activeMode === null;
  })()`, "recording upload", 60000);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const beforeFiles = new Set(recordingNames());
  const edge = launchSurfaceHeroQaEdge({
    port: DEBUG_PORT,
    width: 1600,
    height: 900,
  });
  let client = null;
  try {
    client = await new CdpClient(await waitForTarget(DEBUG_PORT)).connect();
    await startPlayScene(client);
    const before = await captureState(client);
    if (before.uiTotal < 1 || before.uiVisible !== before.uiTotal) {
      throw new Error(`Initial HUD was not visible: ${JSON.stringify(before)}`);
    }

    const shortDialog = await chooseF9Mode(client, "short");
    await client.waitFor(
      `window.__phaserGame.scene.getScene("PlayScene")?.screenRecordSystem?.activeMode === "short"`,
      "short recording",
      15000,
    );
    await delay(900);
    const short = await captureState(client);
    if (
      short.recordingSize?.[0] !== 720
      || short.recordingSize?.[1] !== 1280
      || short.uiVisible !== 0
      || !short.indicator.includes("SHORT")
    ) {
      throw new Error(`Short capture state is invalid: ${JSON.stringify(short)}`);
    }
    const shortScreenshot = path.join(outputDir, "short-ui-free-live.png");
    await client.screenshot(shortScreenshot);
    await delay(900);
    await pressF9(client);
    await waitForSaved(client);
    const afterShort = await captureState(client);
    if (afterShort.uiVisible !== afterShort.uiTotal) {
      throw new Error(`Short capture did not restore HUD: ${JSON.stringify(afterShort)}`);
    }

    const broadDialog = await chooseF9Mode(client, "broad");
    await client.waitFor(
      `window.__phaserGame.scene.getScene("PlayScene")?.screenRecordSystem?.activeMode === "broad"`,
      "broad recording",
      15000,
    );
    await delay(900);
    const broad = await captureState(client);
    if (
      broad.fullscreen !== true
      || broad.recordingSize?.[0] !== broad.sourceSize?.[0]
      || broad.recordingSize?.[1] !== broad.sourceSize?.[1]
      || broad.uiVisible !== 0
      || !broad.indicator.includes("BROAD FULLSCREEN")
    ) {
      throw new Error(`Broad capture state is invalid: ${JSON.stringify(broad)}`);
    }
    const broadScreenshot = path.join(outputDir, "broad-fullscreen-live.png");
    await client.screenshot(broadScreenshot);
    await delay(900);
    await pressF9(client);
    await waitForSaved(client);

    const createdFiles = recordingNames().filter(name => !beforeFiles.has(name));
    if (
      !createdFiles.some(name => name.includes("screenrecord-short-"))
      || !createdFiles.some(name => name.includes("screenrecord-broad-"))
    ) {
      throw new Error(`Expected SHORT and BROAD WebMs: ${JSON.stringify(createdFiles)}`);
    }
    const browserErrors = client.events.filter(event => (
      event.method === "Runtime.exceptionThrown"
      || (
        event.method === "Log.entryAdded"
        && event.params?.entry?.level === "error"
        && !String(event.params.entry.url || "").endsWith("/favicon.ico")
      )
    ));
    if (browserErrors.length) {
      throw new Error(`Browser errors: ${JSON.stringify(browserErrors)}`);
    }

    const report = {
      status: "pass",
      url: GAME_URL,
      before,
      shortDialog,
      short,
      afterShort,
      broadDialog,
      broad,
      createdFiles,
      screenshots: { shortScreenshot, broadScreenshot },
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
