import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  OLD_SCHOOL_LAMP_LIVE_COMPARISON as CONFIG,
  getCarriedLightLiveComparisonFrameUrl,
} from "../values/carriedLightLiveComparison.js";

const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const [torch, lamp] = CONFIG.scenarios;

assert.equal(CONFIG.id, "old-school-lamp-live-comparison-v1");
assert.equal(CONFIG.reviewOnly, true);
assert.equal(CONFIG.scenarios.length, 2);
assert.equal(torch.id, "torch");
assert.equal(lamp.id, "lamp");
assert.notEqual(torch.saveSlot, lamp.saveSlot);
assert.equal(torch.query.carriedLightStyle, undefined);
assert.equal(lamp.query.carriedLightStyle, "lamp-review");
assert.equal(torch.query.fireRays, undefined);
assert.equal(lamp.query.fireRays, undefined);
assert.equal(torch.query.jkd_e2e, "1");
assert.equal(CONFIG.dayProfiles.day.time, 0.50);
assert.equal(CONFIG.dayProfiles.dusk.time, 0.73);
assert.equal(CONFIG.dayProfiles.night.time, 0.88);
assert.equal(CONFIG.defaultDepthProfile, "shallow");
assert.equal(CONFIG.depthProfiles.abyss.depthTiles, 1000);
assert.equal(CONFIG.depthProfiles.extreme.depthTiles, 1800);
assert.equal(lamp.query.jkd_e2e, "1");

const pageUrl = "http://127.0.0.1:8090/testing/2026-07-30-old-school-lamp-live-compare.html";
const torchUrl = new URL(
  getCarriedLightLiveComparisonFrameUrl(pageUrl, torch, CONFIG)
);
const lampUrl = new URL(
  getCarriedLightLiveComparisonFrameUrl(pageUrl, lamp, CONFIG)
);
assert.equal(torchUrl.pathname, "/");
assert.equal(lampUrl.pathname, "/");
assert.equal(torchUrl.searchParams.get("fireRays"), null);
assert.equal(lampUrl.searchParams.get("fireRays"), null);
assert.equal(torchUrl.searchParams.get("carriedLightStyle"), null);
assert.equal(
  lampUrl.searchParams.get("carriedLightStyle"),
  "lamp-review"
);

const html = read("testing/2026-07-30-old-school-lamp-live-compare.html");
const controller = read("testing/2026-07-30-old-school-lamp-live-compare.js");
const sharedController = read("testing/2026-07-30-carried-light-live-controller.js");
const runtime = read("testing/2026-07-30-carried-light-live-runtime.js");

assert.equal((html.match(/<iframe\b/g) || []).length, 2);
assert.match(html, /id="torch-frame"/);
assert.match(html, /id="lamp-frame"/);
assert.match(html, /data-action="fuel"/);
assert.match(html, /data-action="weather"/);
assert.match(html, /data-action="day"/);
assert.match(html, /data-action="torch"/);
assert.match(html, /data-action="resync"/);
assert.match(html, /pointer-events:\s*none/);
assert.match(
  html,
  /2026-07-30-old-school-lamp-live-compare\.js/
);

for (const needle of [
  "OLD_SCHOOL_LAMP_LIVE_COMPARISON",
  "startCarriedLightLiveComparison",
]) assert.ok(controller.includes(needle), `controller missing ${needle}`);
for (const needle of [
  "window[CONFIG.apiGlobal]",
  "runtime.initialize(location.href)",
  "runtime.setFuel",
  "runtime.setWeather",
  "runtime.setDayPhase",
  "runtime.setDepth",
  "runtime.setTorchActive",
]) assert.ok(sharedController.includes(needle), `shared controller missing ${needle}`);

for (const needle of [
  "for (const entry of frameEntries) await launch(entry)",
  "game.scene.start(\"WorldLoadScene\"",
  "worldIdentity: CONFIG.world.identity",
  "findDepthTarget",
  "depthProfile:",
  "visibilityRadiusTiles:",
  "forceAll(target)",
  "setFuel(\"full\")",
  "setWeather(\"clear\")",
  "setDayPhase(\"day\")",
  "cycle?.fromJSON",
  "dayTime: scene.dayNightCycle?.currentTime",
  "setTorchActive(true)",
  "new win.KeyboardEvent",
  "rendererType: scene.game.renderer.type",
]) {
  assert.ok(runtime.includes(needle), `runtime missing ${needle}`);
}

assert.ok(
  runtime.indexOf("state.ready = true")
    < runtime.indexOf("setFuel(\"full\")"),
  "synchronized controls must become writable before initialization applies them"
);
assert.equal(
  (runtime.match(/entry\.frame\.src\s*=/g) || []).length,
  1,
  "frame URLs must be assigned through the shared scenario loop"
);
assert.equal(
  (runtime.match(/forcePlayerState/g) || []).length,
  1,
  "all positioning must use the shared forceScene route"
);
assert.match(runtime, /setTimeout\(poll, pollIntervalMs\)/);
assert.ok(!runtime.includes("setTimeout(poll, CONFIG.timing.pollIntervalMs)"));

for (const file of [
  "values/carriedLightLiveComparison.js",
  "testing/2026-07-30-old-school-lamp-live-compare.js",
  "testing/2026-07-30-old-school-lamp-live-runtime.js",
  "testing/2026-07-30-carried-light-live-controller.js",
  "testing/2026-07-30-carried-light-live-depth.js",
  "testing/2026-07-30-carried-light-live-runtime.js",
]) {
  const lines = read(file).trimEnd().split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log(
  "live carried-light comparison contract passed: two real frames, synchronized controls, shared world, separate saves, hidden rays"
);
