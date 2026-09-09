import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import {
  EARTHQUAKE_FEEDBACK_CONFIG,
  getEarthquakeFeedbackPreloadAssets,
} from "../values/earthquakeFeedback.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = relativePath => readFile(path.join(root, relativePath), "utf8");

function pngInfo(bytes) {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

const runtimeAssets = getEarthquakeFeedbackPreloadAssets();
assert.deepEqual(
  runtimeAssets.map(asset => asset.key),
  [
    "ui-earthquake-status-frame-v2",
    "ui-earthquake-medallion-v2",
    "fx-earthquake-tile-fracture-v1",
    "fx-earthquake-tile-collapse-v1",
    "fx-earthquake-rubble-return-v1",
    "fx-earthquake-landing-footprint-v1",
    "fx-earthquake-falling-boulder-v1",
    "fx-earthquake-ceiling-fracture-v1",
    "fx-earthquake-impact-debris-v1",
  ],
);

for (const [asset, expectedSize] of [
  [runtimeAssets[0], [960, 180]],
  [runtimeAssets[1], [256, 256]],
  [runtimeAssets[2], [512, 512]],
  [runtimeAssets[3], [512, 512]],
  [runtimeAssets[4], [512, 512]],
  [runtimeAssets[5], [512, 512]],
  [runtimeAssets[6], [512, 512]],
  [runtimeAssets[7], [512, 512]],
  [runtimeAssets[8], [512, 512]],
]) {
  const bytes = await readFile(path.join(root, asset.path));
  const info = pngInfo(bytes);
  assert.deepEqual([info.width, info.height], expectedSize, `${asset.key} dimensions`);
  assert.equal(info.colorType, 6, `${asset.key} must retain RGBA transparency`);
}

assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.timing.escapeVisibleMs <= 3400);
assert.equal("recapVisibleMs" in EARTHQUAKE_FEEDBACK_CONFIG.timing, false);
assert.deepEqual(
  EARTHQUAKE_FEEDBACK_CONFIG.timing.phaseVisibleMs,
  { warning: null, earthquake: null, aftermath: null },
);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.timing.hideFailsafePaddingMs > 0);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.card.width <= 420);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.card.height <= 80);
assert.ok(
  EARTHQUAKE_FEEDBACK_CONFIG.hazards.maxFallZones
    >= EARTHQUAKE_CONFIG.maxConcurrentFallZones,
);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.hazards.landingFootprintDepth < 20);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.hazards.fallingBoulderDepth > 20);
assert.ok(
  EARTHQUAKE_FEEDBACK_CONFIG.hazards.settledBoulderDepth
    > EARTHQUAKE_FEEDBACK_CONFIG.hazards.fallingBoulderDepth,
);
assert.ok(
  EARTHQUAKE_FEEDBACK_CONFIG.hazards.footprintHeightTiles >= 1,
  "the authored floor footprint must not be flattened into an unreadable strip",
);

const [
  systemSource,
  uiSource,
  tileFxSource,
  hazardSource,
  fallZoneSource,
  impactSource,
  bootSource,
] = await Promise.all([
  readSource("systems/environment/EarthquakeSystem.js"),
  readSource("systems/visual/EarthquakeFeedbackUI.js"),
  readSource("systems/visual/EarthquakeTileFeedbackSystem.js"),
  readSource("systems/visual/EarthquakeHazardOverlay.js"),
  readSource("systems/visual/EarthquakeFallZoneView.js"),
  readSource("systems/visual/EarthquakeRockImpactView.js"),
  readSource("ui/scenes/BootScene.js"),
]);

assert.ok(!systemSource.includes("earthquakeFeedbackUI?.completeEvent"));
assert.equal(
  (systemSource.match(/this\._seismicFlash\(\)/g) || []).length,
  1,
  "only quake start may request the restrained screen flash",
);
assert.ok(!systemSource.includes("_updateWarningText"));
assert.ok(!systemSource.includes("_showWarningText"));
assert.ok(!systemSource.includes("⚠  EARTHQUAKE!"));
assert.ok(!systemSource.includes("uiNotifications.warning"));
assert.ok(!systemSource.includes("💥 CAVE IN"));

assert.ok(uiSource.includes("now >= this.escapeExpiresAt"));
assert.ok(!uiSource.includes("this.recap"));
assert.ok(!uiSource.includes("completeEvent"));
assert.ok(uiSource.includes("now >= this.modeExpiresAt"));
assert.ok(uiSource.includes("now >= this.hideDeadline"));
assert.ok(uiSource.includes("if (this.hiding ||"));
assert.ok(uiSource.includes("this._setVisible(false)"));
assert.ok(!uiSource.includes("this.scene.add.graphics"));
assert.ok(tileFxSource.includes("this.scene.add.image"));
assert.ok(!tileFxSource.includes("this.scene.add.graphics"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showDamage?.({"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showRestore?.({"));
assert.ok(hazardSource.includes("this.scene.add.image("));
assert.ok(!hazardSource.includes("edgeBg"));
assert.ok(!hazardSource.includes("add.graphics"));
assert.ok(fallZoneSource.includes("assets.landingFootprint.key"));
assert.ok(fallZoneSource.includes("assets.ceilingFracture.key"));
assert.ok(fallZoneSource.includes("assets.fallingBoulder.key"));
assert.ok(!fallZoneSource.includes("add.graphics"));
assert.ok(impactSource.includes("assets.impactDebris.key"));
assert.ok(impactSource.includes("settledRock"));
assert.ok(!impactSource.includes("add.graphics"));
assert.ok(bootSource.includes("getEarthquakeFeedbackPreloadAssets"));

{
  const recordedEvents = [];
  const system = Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } });
  Object.assign(system, {
    state: "aftermath",
    intensity: "major",
    chainPending: false,
    stateRemaining: 1,
    stateTotalMs: 7000,
    nextEventMs: 0,
    _openedPassageKeys: new Set(["4,5", "4,6"]),
    fx: { clear() {} },
    scene: {
      retentionProgressSystem: {
        recordEarthquake: summary => recordedEvents.push(summary),
      },
    },
    _getPlayerDistanceToEpicenter: () => 3,
    isPlayerAware: () => true,
    _scheduleNext() { this.nextEventMs = 1000; },
    _log() {},
  });

  system._finishEvent();
  assert.equal(system.state, "idle");
  assert.deepEqual(recordedEvents, [{
    intensity: "major",
    passagesOpened: 2,
    distanceEndured: 3,
  }]);
}

console.log("earthquake feedback lifecycle contract passed");
