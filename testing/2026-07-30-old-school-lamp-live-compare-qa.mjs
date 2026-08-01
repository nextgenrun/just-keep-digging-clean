// Simultaneous real-Phaser/WebGL QA for the carried torch versus safety lamp lab.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const DEFAULT_URL = "http://127.0.0.1:8090/testing/2026-07-30-old-school-lamp-live-compare.html";
const DEFAULT_OUTPUT = path.resolve("visual-approval-previews/old-school-lamp-light-v1/live-simulation");
const DEFAULT_EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}
async function comparisonSnapshot(page) {
  return page.evaluate(() => window.__lampLiveCompare.snapshot());
}
async function frameEvidence(page) {
  return page.evaluate(() => ["torch", "lamp"].map(id => {
    const frame = document.getElementById(`${id}-frame`);
    const win = frame.contentWindow;
    const scene = win.__phaserGame.scene.getScene("PlayScene");
    const light = scene.lightSystem.getFireLightSnapshot();
    const renderer = scene.lightSystem._fireLightSystem?.renderer;
    const tileSize = scene.config.tileSize;
    const camera = scene.cameras.main;
    const query = Object.fromEntries(new URL(win.location.href).searchParams);
    return {
      id,
      href: win.location.href,
      query,
      runtimeId: light?.id,
      raysRequested: light?.raysRequested,
      visibleRayCount: light?.rays?.visibleRayCount,
      torchActive: scene.lightSystem.isTorchActive(),
      rendererType: scene.game.renderer.type,
      weather: scene.weatherSystem?.getSnapshot?.() || null,
      camera: {
        scrollX: camera.scrollX,
        scrollY: camera.scrollY,
        playerScreenX: (scene.player.x - camera.scrollX) * camera.zoom,
        playerScreenY: (scene.player.y - camera.scrollY) * camera.zoom,
      },
      fireGeometry: id === "torch" ? {
        flameWidthTiles: (renderer?.flame?.displayWidth || 0) / tileSize,
        flameHeightTiles: (renderer?.flame?.displayHeight || 0) / tileSize,
        atmosphereHeightTiles:
          (renderer?.atmosphere?.displayHeight || 0) / tileSize,
      } : null,
      uiErrors: [...(win.__jkdUiErrors || [])],
    };
  }));
}
function assertSynchronized(snapshot, active) {
  assert.equal(snapshot.ready, true);
  assert.equal(snapshot.scenarios.length, 2);
  const [torch, lamp] = snapshot.scenarios;
  assert.equal(torch.scenario, "torch");
  assert.equal(lamp.scenario, "lamp");
  assert.equal(torch.runtimeId, "fire-light-v3");
  assert.equal(lamp.runtimeId, "old-school-lamp-light-v1");
  assert.equal(torch.rendererType, 2);
  assert.equal(lamp.rendererType, 2);
  assert.equal(torch.rays, 0);
  assert.equal(lamp.rays, 0);
  assert.equal(torch.active, active);
  assert.equal(lamp.active, active);
  assert.ok(Math.abs(torch.dayTime - lamp.dayTime) < 0.003);
  assert.deepEqual(torch.tile, lamp.tile);
  assert.deepEqual(torch.tile, snapshot.target);
  assert.deepEqual(torch.uiErrors, []);
  assert.deepEqual(lamp.uiErrors, []);
}
function assertInitialFrames(frames) {
  const [torch, lamp] = frames;
  assert.equal(torch.runtimeId, "fire-light-v3");
  assert.equal(lamp.runtimeId, "old-school-lamp-light-v1");
  assert.equal(torch.query.fireRays, undefined);
  assert.equal(lamp.query.fireRays, undefined);
  assert.equal(torch.query.carriedLightStyle, undefined);
  assert.equal(lamp.query.carriedLightStyle, "lamp-review");
  assert.equal(torch.raysRequested, false);
  assert.equal(lamp.raysRequested, false);
  assert.equal(torch.visibleRayCount, 0);
  assert.equal(lamp.visibleRayCount, 0);
  assert.equal(torch.rendererType, 2);
  assert.equal(lamp.rendererType, 2);
  assert.ok(torch.fireGeometry.flameWidthTiles > 0);
  assert.ok(torch.fireGeometry.flameWidthTiles < 0.50);
  assert.ok(
    Math.abs(torch.camera.playerScreenX - lamp.camera.playerScreenX) < 1
  );
  assert.ok(Math.abs(torch.camera.playerScreenY - lamp.camera.playerScreenY) < 1);
  assert.ok(torch.fireGeometry.flameHeightTiles < 0.67);
  assert.ok(torch.fireGeometry.atmosphereHeightTiles <= 1.66);
  assert.deepEqual(torch.uiErrors, []);
  assert.deepEqual(lamp.uiErrors, []);
}
async function waitForFuel(page, profile, minimum, maximum) {
  await page.evaluate(id => window.__lampLiveCompare.setFuel(id), profile);
  await page.waitForFunction(
    ({ low, high }) => {
      const snap = window.__lampLiveCompare.snapshot();
      return snap.fuelProfile === "low"
        && snap.scenarios.every(
          entry => entry?.gpRatio >= low && entry.gpRatio <= high
        );
    },
    { low: minimum, high: maximum },
    { timeout: 20_000 }
  );
}
async function waitForWeather(page, profile) {
  await page.evaluate(id => window.__lampLiveCompare.setWeather(id), profile);
  await page.waitForFunction(
    id => {
      if (window.__lampLiveCompare.snapshot().weatherProfile !== id) return false;
      return ["torch", "lamp"].every(frameId => {
        const win = document.getElementById(`${frameId}-frame`).contentWindow;
        const scene = win.__phaserGame.scene.getScene("PlayScene");
        return scene.weatherSystem?.getSnapshot?.().kind === id;
      });
    },
    profile,
    { timeout: 20_000 }
  );
}
async function waitForDay(page, profile) {
  await page.evaluate(id => window.__lampLiveCompare.setDayPhase(id), profile);
  await page.waitForFunction(
    id => {
      const snap = window.__lampLiveCompare.snapshot();
      if (snap.dayProfile !== id) return false;
      const times = snap.scenarios.map(entry => entry?.dayTime || 0);
      const synchronized = Math.abs(times[0] - times[1]) < 0.003;
      const nightReady = id !== "night"
        || snap.scenarios.every(entry => entry?.nightAmount > 0.5);
      return synchronized && nightReady;
    },
    profile,
    { timeout: 20_000 }
  );
}
async function waitForTorch(page, active) {
  await page.evaluate(
    next => window.__lampLiveCompare.setTorchActive(next),
    active
  );
  await page.waitForFunction(
    expected => window.__lampLiveCompare.snapshot().scenarios.every(
      entry => entry?.active === expected
    ),
    active,
    { timeout: 20_000 }
  );
}
function fatalBrowserIssues(issues) {
  return issues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.includes("Fatal error during setupScene")
    || issue.startsWith("requestfailed:")
      && (
        issue.includes("/fire-light-v3/")
        || issue.includes("/old-school-lamp-light-v1/")
      )
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
    args: ["--disable-background-timer-throttling",
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
        `console:${message.location().url}:${message.text()}`);
    });
    page.on("pageerror", error => browserIssues.push(`pageerror:${error.message}`));
    page.on("requestfailed", request => {
      browserIssues.push(
        `requestfailed:${request.url()}:${request.failure()?.errorText || "unknown"}`
      );
    });
    page.on("response", response => {
      const responseUrl = response.url();
      if (response.status() >= 400) {
        browserIssues.push(`response:${response.status()}:${responseUrl}`);
      }
      if (responseUrl.includes("/fire-light-v3/")
        || responseUrl.includes("/old-school-lamp-light-v1/")) {
        assetResponses.push({ status: response.status(), url: responseUrl });
      }
    });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForFunction(
      () => window.__lampLiveCompare?.ready === true,
      null,
      { timeout: 360_000 }
    );
    await page.waitForTimeout(1_200);
    const initial = await comparisonSnapshot(page);
    const initialFrames = await frameEvidence(page);
    assertSynchronized(initial, true);
    assertInitialFrames(initialFrames);
    await page.screenshot({ path: path.join(outputDir, "01-live-full-clear.png"), fullPage: true });
    await waitForFuel(page, "low", 0.12, 0.15);
    await waitForWeather(page, "rain");
    await waitForDay(page, "night");
    await page.waitForTimeout(1_200);
    const lowRain = await comparisonSnapshot(page);
    assertSynchronized(lowRain, true);
    assert.equal(lowRain.fuelProfile, "low");
    assert.equal(lowRain.weatherProfile, "rain");
    assert.equal(lowRain.dayProfile, "night");
    await page.screenshot({ path: path.join(outputDir, "02-live-low-rain.png"), fullPage: true });
    await waitForTorch(page, false);
    const torchOff = await comparisonSnapshot(page);
    assertSynchronized(torchOff, false);
    await page.waitForTimeout(800);
    await waitForTorch(page, true);
    await waitForWeather(page, "storm");
    await waitForDay(page, "dusk");
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.__lampLiveCompare.setFuel("full");
      window.__lampLiveCompare.setWeather("clear");
      window.__lampLiveCompare.setDayPhase("day");
      window.__lampLiveCompare.resync();
    });
    await page.waitForFunction(
      () => {
        const snap = window.__lampLiveCompare.snapshot();
        return snap.fuelProfile === "full"
          && snap.weatherProfile === "clear"
          && snap.dayProfile === "day"
          && snap.scenarios.every(entry => entry?.gpRatio > 0.98);
      },
      null,
      { timeout: 20_000 }
    );
    await page.waitForTimeout(1_000);
    const finalSnapshot = await comparisonSnapshot(page);
    assertSynchronized(finalSnapshot, true);
    await page.screenshot({ path: path.join(outputDir, "03-live-resynced.png"), fullPage: true });
    const failedAssets = assetResponses.filter(
      entry => entry.status < 200 || entry.status >= 400
    );
    assert.deepEqual(failedAssets, []);
    assert.ok(assetResponses.some(
      entry => entry.url.includes("/fire-light-v3/")
    ));
    assert.ok(assetResponses.some(
      entry => entry.url.includes("/old-school-lamp-light-v1/")
    ));
    const fatal = fatalBrowserIssues(browserIssues);
    assert.deepEqual(fatal, []);
    const report = {
      schema: "old-school-lamp-live-comparison-qa@1",
      generatedUtc: new Date().toISOString(),
      url,
      initial,
      initialFrames,
      lowRain,
      torchOff,
      finalSnapshot,
      assetResponses,
      browserIssues,
    };
    const reportPath = path.join(outputDir, "live-simulation-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await page.close();
    await context.close();
    context = null;
    console.log(reportPath);
  } finally {
    if (context) await context.close();
    await browser.close();
  }
}
await main();
