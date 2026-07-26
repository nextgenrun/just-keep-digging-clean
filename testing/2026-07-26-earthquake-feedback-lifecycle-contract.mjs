import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
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
  ],
);

for (const [asset, expectedSize] of [
  [runtimeAssets[0], [960, 180]],
  [runtimeAssets[1], [256, 256]],
]) {
  const bytes = await readFile(path.join(root, asset.path));
  const info = pngInfo(bytes);
  assert.deepEqual([info.width, info.height], expectedSize, `${asset.key} dimensions`);
  assert.equal(info.colorType, 6, `${asset.key} must retain RGBA transparency`);
}

assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.timing.escapeVisibleMs <= 6500);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.timing.recapVisibleMs <= 3200);
assert.deepEqual(
  EARTHQUAKE_FEEDBACK_CONFIG.timing.phaseVisibleMs,
  { warning: 4800, earthquake: 5200, aftermath: 3200 },
);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.timing.hideFailsafePaddingMs > 0);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.card.width <= 480);
assert.ok(EARTHQUAKE_FEEDBACK_CONFIG.hazards.maxMarkers <= 2);

const [systemSource, uiSource, hazardSource, bootSource] = await Promise.all([
  readSource("systems/environment/EarthquakeSystem.js"),
  readSource("systems/visual/EarthquakeFeedbackUI.js"),
  readSource("systems/visual/EarthquakeHazardOverlay.js"),
  readSource("ui/scenes/BootScene.js"),
]);

assert.ok(systemSource.includes("earthquakeFeedbackUI?.completeEvent?.({"));
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
assert.ok(uiSource.includes("now >= this.recap.expiresAt"));
assert.ok(uiSource.includes("now >= this.modeExpiresAt"));
assert.ok(uiSource.includes("now >= this.hideDeadline"));
assert.ok(uiSource.includes("if (this.hiding ||"));
assert.ok(uiSource.includes("this._setVisible(false)"));
assert.ok(hazardSource.includes("this.scene.add.image("));
assert.ok(!hazardSource.includes("edgeBg"));
assert.ok(!hazardSource.includes("worldGraphics.fillRect"));
assert.ok(bootSource.includes("getEarthquakeFeedbackPreloadAssets"));

{
  const completionCalls = [];
  const system = Object.create(EarthquakeSystem.prototype);
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
      retentionProgressSystem: { recordEarthquake() {} },
      earthquakeFeedbackUI: {
        completeEvent: summary => completionCalls.push(summary),
      },
    },
    _getPlayerDistanceToEpicenter: () => 3,
    isPlayerAware: () => true,
    _scheduleNext() { this.nextEventMs = 1000; },
    _log() {},
  });

  system._finishEvent();
  assert.equal(system.state, "idle");
  assert.equal(completionCalls.length, 1);
  assert.deepEqual(completionCalls[0], {
    intensity: "major",
    passagesOpened: 2,
    playerAware: true,
    aftershockWatch: false,
  });
}

console.log("earthquake feedback lifecycle contract passed");
