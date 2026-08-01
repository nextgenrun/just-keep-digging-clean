// Simultaneous real-Phaser/WebGL QA for natural fire versus legacy light.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);
const DEFAULT_URL =
  "http://127.0.0.1:8090/testing/2026-07-30-natural-fire-live-compare.html";
const DEFAULT_OUTPUT = path.resolve(
  "visual-approval-previews/natural-fire-vs-legacy-v1/live-simulation"
);
const DEFAULT_EDGE =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const API = "__naturalFireLiveCompare";
function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}
async function snapshot(page) {
  return page.evaluate(api => window[api].snapshot(), API);
}

async function frameEvidence(page) {
  return page.evaluate(() => ["natural", "legacy"].map(id => {
    const win = document.getElementById(`${id}-frame`).contentWindow;
    const scene = win.__phaserGame.scene.getScene("PlayScene");
    const light = scene.lightSystem.getFireLightSnapshot();
    const renderer = scene.lightSystem._fireLightSystem?.renderer;
    const camera = scene.cameras.main;
    const tileSize = scene.config.tileSize;
    return {
      id,
      href: win.location.href,
      query: Object.fromEntries(new URL(win.location.href).searchParams),
      runtimeId: light?.id,
      presentationId: light?.presentationId,
      raysRequested: light?.raysRequested,
      visibleRayCount: light?.rays?.visibleRayCount || 0,
      authoredLayers: (light?.renderer?.visibleLayerCount || 0)
        + (light?.illumination?.visibleLayerCount || 0),
      proceduralWorldGlow: light?.proceduralWorldGlow === true,
      proceduralShaderMix: light?.proceduralShaderMix ?? 1,
      eyeEffectScale: light?.eyeAdaptation?.effectScale || 0,
      torchActive: scene.lightSystem.isTorchActive(),
      rendererType: scene.game.renderer.type,
      camera: {
        scrollX: camera.scrollX,
        scrollY: camera.scrollY,
        playerScreenX: (scene.player.x - camera.scrollX) * camera.zoom,
        playerScreenY: (scene.player.y - camera.scrollY) * camera.zoom,
      },
      fireGeometry: id === "natural" ? {
        flameWidthTiles: (renderer?.flame?.displayWidth || 0) / tileSize,
        flameHeightTiles: (renderer?.flame?.displayHeight || 0) / tileSize,
        volumeVisible: renderer?.volume?.visible === true,
        atmosphereVisible: renderer?.atmosphere?.visible === true,
      } : null,
      uiErrors: [...(win.__jkdUiErrors || [])],
    };
  }));
}

function assertSynchronized(value, active) {
  assert.equal(value.ready, true);
  const [natural, legacy] = value.scenarios;
  assert.equal(natural.scenario, "natural");
  assert.equal(legacy.scenario, "legacy");
  assert.equal(natural.presentationId, "natural-fire-v1");
  assert.equal(legacy.presentationId, "legacy-procedural-v2");
  assert.equal(natural.rendererType, 2);
  assert.equal(legacy.rendererType, 2);
  assert.equal(natural.rays, 0);
  assert.equal(legacy.rays, 0);
  assert.equal(natural.active, active);
  assert.equal(legacy.active, active);
  assert.ok(Math.abs(natural.dayTime - legacy.dayTime) < 0.003);
  assert.deepEqual(natural.tile, legacy.tile);
  assert.deepEqual(natural.tile, value.target);
  assert.deepEqual(natural.uiErrors, []);
  assert.deepEqual(legacy.uiErrors, []);
}

function assertInitialFrames(frames) {
  const [natural, legacy] = frames;
  assert.equal(natural.runtimeId, "fire-light-v3");
  assert.equal(legacy.runtimeId, "fire-light-v3");
  assert.equal(natural.presentationId, "natural-fire-v1");
  assert.equal(legacy.presentationId, "legacy-procedural-v2");
  assert.equal(natural.query.fireLightStyle, "natural");
  assert.equal(legacy.query.fireLight, "legacy");
  assert.equal(natural.raysRequested, false);
  assert.equal(legacy.raysRequested, false);
  assert.equal(natural.visibleRayCount, 0);
  assert.equal(legacy.visibleRayCount, 0);
  assert.equal(natural.authoredLayers, 1);
  assert.equal(legacy.authoredLayers, 0);
  assert.equal(natural.proceduralWorldGlow, true);
  assert.equal(legacy.proceduralWorldGlow, true);
  assert.equal(natural.proceduralShaderMix, 0.96);
  assert.equal(legacy.proceduralShaderMix, 1);
  assert.equal(natural.eyeEffectScale, 0.24);
  assert.equal(legacy.eyeEffectScale, 0);
  assert.equal(natural.fireGeometry.volumeVisible, false);
  assert.equal(natural.fireGeometry.atmosphereVisible, false);
  assert.ok(natural.fireGeometry.flameWidthTiles > 0);
  assert.ok(natural.fireGeometry.flameWidthTiles < 0.50);
  assert.ok(natural.fireGeometry.flameHeightTiles < 0.67);
  assert.ok(Math.abs(
    natural.camera.playerScreenX - legacy.camera.playerScreenX
  ) < 1);
  assert.ok(Math.abs(
    natural.camera.playerScreenY - legacy.camera.playerScreenY
  ) < 1);
}

async function setProfile(page, method, value, ready) {
  await page.evaluate(
    ({ api, methodName, selected }) => window[api][methodName](selected),
    { api: API, methodName: method, selected: value }
  );
  await page.waitForFunction(
    ({ api, predicate }) => {
      const value = window[api].snapshot();
      if (predicate === "low") {
        return value.fuelProfile === "low"
          && value.scenarios.every(entry => (
            entry?.gpRatio >= 0.12 && entry.gpRatio <= 0.15
          ));
      }
      if (predicate === "night") {
        return value.dayProfile === "night"
          && value.scenarios.every(entry => entry?.nightAmount > 0.5);
      }
      return value[predicate.field] === predicate.value;
    },
    { api: API, predicate: ready },
    { timeout: 20_000 }
  );
}

async function setTorch(page, active) {
  await page.evaluate(
    ({ api, next }) => window[api].setTorchActive(next),
    { api: API, next: active }
  );
  await page.waitForFunction(
    ({ api, expected }) => window[api].snapshot().scenarios.every(
      entry => entry?.active === expected
    ),
    { api: API, expected: active },
    { timeout: 20_000 }
  );
}

function fatalIssues(issues) {
  return issues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.includes("Fatal error during setupScene")
    || issue.startsWith("requestfailed:")
      && issue.includes("/fire-light-v3/")
  ));
}

async function main() {
  const outputDir = path.resolve(argument("output", DEFAULT_OUTPUT));
  const url = argument("url", DEFAULT_URL);
  fs.mkdirSync(outputDir, { recursive: true });
  const browserIssues = [];
  const assetResponses = [];
  const browser = await chromium.launch({
    executablePath: argument("edge", DEFAULT_EDGE),
    headless: true,
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--use-angle=swiftshader",
    ],
  });
  let context = null;
  try {
    context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    page.on("console", message => {
      if (message.type() === "error") browserIssues.push(
        `console:${message.location().url}:${message.text()}`
      );
    });
    page.on("pageerror", error => {
      browserIssues.push(`pageerror:${error.message}`);
    });
    page.on("requestfailed", request => {
      browserIssues.push(
        `requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`
      );
    });
    page.on("response", response => {
      if (response.status() >= 400) {
        browserIssues.push(`response:${response.status()}:${response.url()}`);
      }
      if (response.url().includes("/fire-light-v3/")) {
        assetResponses.push({ status: response.status(), url: response.url() });
      }
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(
      api => window[api]?.ready === true,
      API,
      { timeout: 360_000 }
    );
    await page.waitForTimeout(1_200);
    const initial = await snapshot(page);
    const initialFrames = await frameEvidence(page);
    assertSynchronized(initial, true);
    assertInitialFrames(initialFrames);
    await page.screenshot({
      path: path.join(outputDir, "01-natural-vs-legacy-full-clear.png"),
      fullPage: true,
    });

    await setProfile(page, "setFuel", "low", "low");
    await setProfile(
      page, "setWeather", "rain",
      { field: "weatherProfile", value: "rain" }
    );
    await setProfile(page, "setDayPhase", "night", "night");
    await page.waitForTimeout(1_200);
    const lowRainNight = await snapshot(page);
    assertSynchronized(lowRainNight, true);
    await page.screenshot({
      path: path.join(outputDir, "02-natural-vs-legacy-low-rain-night.png"),
      fullPage: true,
    });

    await setTorch(page, false);
    await page.waitForTimeout(800);
    const torchOff = await snapshot(page);
    assertSynchronized(torchOff, false);
    await setTorch(page, true);
    await page.evaluate(api => {
      window[api].setFuel("full");
      window[api].setWeather("clear");
      window[api].setDayPhase("day");
      window[api].resync();
    }, API);
    await page.waitForFunction(
      api => {
        const value = window[api].snapshot();
        return value.fuelProfile === "full"
          && value.weatherProfile === "clear"
          && value.dayProfile === "day"
          && value.scenarios.every(entry => entry?.gpRatio > 0.98);
      },
      API,
      { timeout: 20_000 }
    );
    await page.waitForTimeout(1_000);
    const finalSnapshot = await snapshot(page);
    assertSynchronized(finalSnapshot, true);
    await page.screenshot({
      path: path.join(outputDir, "03-natural-vs-legacy-resynced.png"),
      fullPage: true,
    });

    assert.deepEqual(
      assetResponses.filter(entry => entry.status < 200 || entry.status >= 400),
      []
    );
    assert.ok(assetResponses.length >= 10);
    assert.deepEqual(fatalIssues(browserIssues), []);
    const report = {
      schema: "natural-fire-live-comparison-qa@1",
      generatedUtc: new Date().toISOString(),
      url,
      initial,
      initialFrames,
      lowRainNight,
      torchOff,
      finalSnapshot,
      assetResponses,
      browserIssues,
    };
    const reportPath = path.join(outputDir, "live-simulation-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
  } finally {
    if (context) await context.close();
    await browser.close();
  }
}

await main();
