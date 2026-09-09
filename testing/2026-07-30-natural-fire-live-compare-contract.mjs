import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NATURAL_FIRE_LIVE_COMPARISON as CONFIG,
  getCarriedLightLiveComparisonFrameUrl,
} from "../values/carriedLightLiveComparison.js";
import { FIRE_LIGHT_PRESENTATION_CONFIG } from
  "../values/fireLightPresentation.js";

const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const [natural, legacy] = CONFIG.scenarios;
const pageUrl =
  "http://127.0.0.1:8090/testing/2026-07-30-natural-fire-live-compare.html";

assert.equal(CONFIG.id, "natural-fire-live-comparison-v1");
assert.equal(CONFIG.reviewOnly, true);
assert.equal(CONFIG.apiGlobal, "__naturalFireLiveCompare");
assert.equal(CONFIG.scenarios.length, 2);
assert.equal(natural.id, "natural");
assert.equal(legacy.id, "legacy");
assert.notEqual(natural.saveSlot, legacy.saveSlot);
assert.equal(natural.query.fireLightStyle, "natural");
assert.equal(natural.query.fireLight, undefined);
assert.equal(legacy.query.fireLight, "legacy");
assert.equal(legacy.query.fireLightStyle, undefined);
assert.equal(natural.query.fireRays, undefined);
assert.equal(legacy.query.fireRays, undefined);
assert.equal(natural.query.jkd_e2e, "1");
assert.equal(legacy.query.jkd_e2e, "1");
assert.equal(CONFIG.dayProfiles.day.time, 0.50);
assert.equal(CONFIG.dayProfiles.dusk.time, 0.73);
assert.equal(CONFIG.dayProfiles.night.time, 0.88);
assert.equal(CONFIG.defaultDepthProfile, "abyss");
assert.equal(CONFIG.depthProfiles.shallow.depthTiles, 140);
assert.equal(CONFIG.depthProfiles.deep.depthTiles, 700);
assert.equal(CONFIG.depthProfiles.abyss.depthTiles, 1000);
assert.equal(CONFIG.depthProfiles.extreme.depthTiles, 1800);

const naturalUrl = new URL(
  getCarriedLightLiveComparisonFrameUrl(pageUrl, natural, CONFIG)
);
const legacyUrl = new URL(
  getCarriedLightLiveComparisonFrameUrl(pageUrl, legacy, CONFIG)
);
assert.equal(naturalUrl.pathname, "/");
assert.equal(legacyUrl.pathname, "/");
assert.equal(naturalUrl.searchParams.get("fireLightStyle"), "natural");
assert.equal(naturalUrl.searchParams.get("fireLight"), null);
assert.equal(legacyUrl.searchParams.get("fireLight"), "legacy");
assert.equal(legacyUrl.searchParams.get("fireLightStyle"), null);
assert.equal(naturalUrl.searchParams.get("fireRays"), null);
assert.equal(legacyUrl.searchParams.get("fireRays"), null);

const profile = FIRE_LIGHT_PRESENTATION_CONFIG.profiles.natural;
assert.equal(profile.authoredLayerTarget, 1);
assert.equal(profile.proceduralWorldGlow, true);
assert.equal(profile.expandedIllumination, false);
assert.ok(profile.proceduralShaderMix > 0.8);
assert.ok(profile.eyeAdaptationEffectScale < 0.5);

const html = read("testing/2026-07-30-natural-fire-live-compare.html");
const controller = read("testing/2026-07-30-natural-fire-live-compare.js");
const sharedController = read(
  "testing/2026-07-30-carried-light-live-controller.js"
);
const runtime = read("testing/2026-07-30-carried-light-live-runtime.js");
const deepQa = read("testing/2026-07-30-natural-fire-deep-live-qa.mjs");
assert.equal((html.match(/<iframe\b/g) || []).length, 2);
assert.match(html, /id="natural-frame"/);
assert.match(html, /id="legacy-frame"/);
assert.match(html, /data-action="depth"/);
assert.match(html, /data-value="deep"/);
assert.match(html, /data-value="abyss"/);
assert.match(html, /data-value="extreme"/);
assert.match(html, /data-action="fuel"/);
assert.match(html, /data-action="weather"/);
assert.match(html, /data-action="day"/);
assert.match(html, /data-action="torch"/);
assert.match(html, /data-action="resync"/);
assert.match(html, /pointer-events:\s*none/);
assert.match(html, /2026-07-30-natural-fire-live-compare\.js/);
assert.match(controller, /NATURAL_FIRE_LIVE_COMPARISON/);
assert.match(controller, /startCarriedLightLiveComparison/);
assert.match(sharedController, /window\[CONFIG\.apiGlobal\]/);
assert.match(sharedController, /runtime\.initialize\(location\.href\)/);
assert.match(sharedController, /runtime\.setDepth/);

for (const needle of [
  "for (const entry of frameEntries) await launch(entry)",
  "menu.scene.start(\"WorldLoadScene\"",
  "worldIdentity: CONFIG.world.identity",
  "findDepthTarget",
  "depthProfile:",
  "visibilityRadiusTiles:",
  "torchBonusRadiusTiles:",
  "stabilizeLighting(scene)",
  "scene.cameras.main.zoomX",
  "forceAll(target)",
  "setFuel(\"full\")",
  "setWeather(\"clear\")",
  "setDayPhase(\"day\")",
  "cycle?.fromJSON",
  "setTorchActive(true)",
  "new win.KeyboardEvent",
  "presentationId: light?.presentationId",
  "authoredLayers:",
  "proceduralWorldGlow:",
  "rendererType: scene.game.renderer.type",
]) assert.ok(runtime.includes(needle), `runtime missing ${needle}`);

assert.ok(
  runtime.indexOf("state.ready = true")
    < runtime.indexOf("setFuel(\"full\")"),
  "controls must become writable before initialization applies shared state"
);
assert.equal((runtime.match(/entry\.frame\.src\s*=/g) || []).length, 1);
assert.equal((runtime.match(/forcePlayerState/g) || []).length, 1);
assert.match(runtime, /setTimeout\(poll, pollIntervalMs\)/);
assert.ok(!runtime.includes("setTimeout(poll, CONFIG.timing.pollIntervalMs)"));
for (const needle of [
  "natural-fire-deep-live-comparison-qa@1",
  "expectedVisibilityRadius",
  "captureDepth(page, outputDir, DEPTH_CASES[2])",
  "assert.equal(natural.darknessAlpha, 1)",
  "assert.equal(legacy.darknessAlpha, 1)",
]) assert.ok(deepQa.includes(needle), `deep QA missing ${needle}`);

for (const file of [
  "values/carriedLightLiveComparison.js",
  "values/fireLightPresentation.js",
  "testing/2026-07-30-natural-fire-live-compare.js",
  "testing/2026-07-30-carried-light-live-controller.js",
  "testing/2026-07-30-carried-light-live-depth.js",
  "testing/2026-07-30-carried-light-live-runtime.js",
  "testing/2026-07-30-natural-fire-deep-live-qa.mjs",
]) {
  const lines = read(file).trimEnd().split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log(
  "natural fire live comparison passed: real 140/700/1000/1800 m depth controls, settled A/B state"
);
