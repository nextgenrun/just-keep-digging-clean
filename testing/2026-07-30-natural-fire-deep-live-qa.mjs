// Real dual-WebGL depth comparison for Natural Fire versus legacy light.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { LIGHT_CONFIG } from "../values/lightConfig.js";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);
const DEFAULT_URL =
  "http://127.0.0.1:8090/testing/2026-07-30-natural-fire-live-compare.html";
const DEFAULT_OUTPUT = path.resolve(
  "visual-approval-previews/natural-fire-vs-legacy-v1/deep-simulation"
);
const DEFAULT_EDGE =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const API = "__naturalFireLiveCompare";
const DEPTH_CASES = Object.freeze([
  Object.freeze({
    id: "deep",
    depth: 700,
    file: "01-natural-vs-legacy-700m.png",
  }),
  Object.freeze({
    id: "abyss",
    depth: 1000,
    file: "02-natural-vs-legacy-1000m.png",
  }),
  Object.freeze({
    id: "extreme",
    depth: 1800,
    file: "04-natural-vs-legacy-1800m.png",
  }),
]);

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(entry => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function fatalIssues(issues) {
  return issues.filter(issue => (
    issue.startsWith("pageerror:")
    || issue.includes("Fatal error during setupScene")
    || issue.startsWith("requestfailed:")
      && issue.includes("/fire-light-v3/")
  ));
}

async function snapshot(page) {
  return page.evaluate(api => window[api].snapshot(), API);
}

function expectedVisibilityRadius(depth, additionalBonus = 0) {
  const stops = LIGHT_CONFIG.visibilityRadiusStops;
  let previous = stops[0];
  if (depth <= previous[0]) {
    return previous[1] + LIGHT_CONFIG.torchBonusRadiusTiles + additionalBonus;
  }
  for (let index = 1; index < stops.length; index += 1) {
    const next = stops[index];
    if (depth <= next[0]) {
      const raw = (depth - previous[0]) / (next[0] - previous[0]);
      const t = raw * raw * (3 - 2 * raw);
      const base = previous[1] + (next[1] - previous[1]) * t;
      return base + LIGHT_CONFIG.torchBonusRadiusTiles + additionalBonus;
    }
    previous = next;
  }
  return previous[1] + LIGHT_CONFIG.torchBonusRadiusTiles + additionalBonus;
}

async function setDepth(page, profile) {
  await page.evaluate(
    ({ api, id }) => window[api].setDepth(id),
    { api: API, id: profile.id }
  );
  await page.waitForFunction(
    ({ api, id, depth }) => {
      const value = window[api].snapshot();
      return value.depthProfile === id
        && value.scenarios.every(entry => (
          entry && Math.abs(entry.depth - depth) <= 100
        ));
    },
    { api: API, id: profile.id, depth: profile.depth },
    { timeout: 30_000 }
  );
}

async function setStandardState(page) {
  await page.evaluate(api => {
    window[api].setFuel("full");
    window[api].setWeather("clear");
    window[api].setDayPhase("day");
    window[api].setTorchActive(true);
  }, API);
  await page.waitForFunction(
    api => {
      const value = window[api].snapshot();
      return value.fuelProfile === "full"
        && value.weatherProfile === "clear"
        && value.dayProfile === "day"
        && value.scenarios.every(entry => entry?.active && entry.gpRatio > 0.95);
    },
    API,
    { timeout: 20_000 }
  );
}

function assertDepthState(value, profile, active = true) {
  assert.equal(value.ready, true);
  assert.equal(value.depthProfile, profile.id);
  assert.equal(value.scenarios.length, 2);
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
  assert.equal(natural.authoredLayers, 1);
  assert.equal(legacy.authoredLayers, 0);
  assert.equal(natural.proceduralShaderMix, 0.96);
  assert.equal(legacy.proceduralShaderMix, 1);
  assert.deepEqual(natural.tile, legacy.tile);
  assert.deepEqual(natural.tile, value.target);
  assert.ok(Math.abs(natural.depth - profile.depth) <= 100);
  assert.ok(Math.abs(natural.depth - legacy.depth) < 0.01);
  for (const entry of [natural, legacy]) {
    const expectedRadius = expectedVisibilityRadius(
      entry.depth, entry.torchBonusRadiusTiles
    );
    assert.ok(entry.visibilityRadiusTiles >= expectedRadius * 0.90);
    assert.ok(entry.visibilityRadiusTiles <= expectedRadius * 1.10);
  }
  assert.equal(natural.darknessAlpha, 1);
  assert.equal(legacy.darknessAlpha, 1);
  assert.deepEqual(natural.uiErrors, []);
  assert.deepEqual(legacy.uiErrors, []);
}

async function captureDepth(page, outputDir, profile) {
  await setDepth(page, profile);
  await setStandardState(page);
  await page.waitForTimeout(1_600);
  const value = await snapshot(page);
  assertDepthState(value, profile);
  await page.screenshot({
    path: path.join(outputDir, profile.file),
    fullPage: true,
  });
  return value;
}

async function captureLowFuel(page, outputDir) {
  const profile = DEPTH_CASES[1];
  await setDepth(page, profile);
  await page.evaluate(api => {
    window[api].setFuel("low");
    window[api].setDayPhase("night");
  }, API);
  await page.waitForTimeout(450);
  const value = await snapshot(page);
  assertDepthState(value, profile);
  assert.equal(value.fuelProfile, "low");
  assert.equal(value.dayProfile, "night");
  assert.ok(value.scenarios.every(entry => (
    entry.gpRatio >= 0.09 && entry.gpRatio <= 0.15
  )));
  await page.screenshot({
    path: path.join(outputDir, "03-natural-vs-legacy-1000m-low-gp.png"),
    fullPage: true,
  });
  return value;
}

async function frameEvidence(page) {
  return page.evaluate(() => ["natural", "legacy"].map(id => {
    const win = document.getElementById(`${id}-frame`).contentWindow;
    const scene = win.__phaserGame.scene.getScene("PlayScene");
    const light = scene.lightSystem.getFireLightSnapshot();
    const renderer = scene.lightSystem._fireLightSystem?.renderer;
    const tileSize = scene.config.tileSize;
    return {
      id,
      presentationId: light?.presentationId,
      eyeEffectScale: light?.eyeAdaptation?.effectScale || 0,
      visibleRayCount: light?.rays?.visibleRayCount || 0,
      volumeVisible: renderer?.volume?.visible === true,
      atmosphereVisible: renderer?.atmosphere?.visible === true,
      flameWidthTiles: id === "natural"
        ? (renderer?.flame?.displayWidth || 0) / tileSize
        : 0,
      flameHeightTiles: id === "natural"
        ? (renderer?.flame?.displayHeight || 0) / tileSize
        : 0,
    };
  }));
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
      if (response.url().includes("/fire-light-v3/")) {
        assetResponses.push({ status: response.status(), url: response.url() });
      }
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction(api => (
      window[api]?.ready === true
      || document.getElementById("status")?.textContent.includes("failed")
    ), API, { timeout: 520_000 });
    const boot = await page.evaluate(api => ({
      ready: window[api]?.ready === true,
      status: document.getElementById("status")?.textContent,
    }), API);
    assert.equal(boot.ready, true, boot.status);
    const captures = [];
    captures.push(await captureDepth(page, outputDir, DEPTH_CASES[0]));
    captures.push(await captureDepth(page, outputDir, DEPTH_CASES[1]));
    const lowFuel = await captureLowFuel(page, outputDir);
    captures.push(await captureDepth(page, outputDir, DEPTH_CASES[2]));
    const frames = await frameEvidence(page);
    assert.equal(frames[0].eyeEffectScale, 0.24);
    assert.equal(frames[1].eyeEffectScale, 0);
    assert.equal(frames[0].visibleRayCount, 0);
    assert.equal(frames[1].visibleRayCount, 0);
    assert.equal(frames[0].volumeVisible, false);
    assert.equal(frames[0].atmosphereVisible, false);
    assert.ok(frames[0].flameWidthTiles > 0);
    assert.ok(frames[0].flameHeightTiles > 0);
    assert.deepEqual(
      assetResponses.filter(entry => entry.status < 200 || entry.status >= 400),
      []
    );
    assert.ok(assetResponses.length >= 10);
    assert.deepEqual(fatalIssues(browserIssues), []);
    const report = {
      schema: "natural-fire-deep-live-comparison-qa@1",
      generatedUtc: new Date().toISOString(),
      url,
      captures,
      lowFuel,
      frames,
      assetResponses,
      browserIssues,
    };
    const reportPath = path.join(outputDir, "deep-simulation-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(reportPath);
  } finally {
    if (context) await context.close();
    await browser.close();
  }
}

await main();
