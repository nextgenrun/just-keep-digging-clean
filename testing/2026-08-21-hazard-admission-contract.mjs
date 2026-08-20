import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EarthquakeDiagnostics,
  inspectEarthquakeAssetHealth,
  resolveEarthquakeLifecycleStage,
} from "../systems/environment/EarthquakeDiagnostics.js";
import {
  resolveGraveborerWurmAdmission,
  resolveGraveborerWurmLifecycleStage,
} from "../world/playScene/GraveborerWurmAdmission.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../values/earthquakeFeedback.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../values/graveborerWurm.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

function makeWurmFixture() {
  return {
    scene: {
      config: { topAirRows: 10 },
      hardcoreModeData: { mode: "hardcore", armed: true },
      upgradeSystem: { isGemPowerUnlocked: () => true },
    },
    playerTile: { tx: 20, ty: 129 },
    system: {
      enabled: true,
      phase: GRAVEBORER_WURM_PHASES.dormant,
      cooldownMs: 100,
      noise: 0,
      devTest10x: false,
    },
  };
}

{
  const fixture = makeWurmFixture();
  const inspect = overrides => resolveGraveborerWurmAdmission({
    ...fixture,
    visualReady: true,
    ...overrides,
  });
  assert.equal(inspect().reason, "cooldown");
  fixture.system.cooldownMs = 0;
  assert.equal(inspect().reason, "noise-too-low");
  fixture.system.noise = GRAVEBORER_WURM_CONFIG.noise.threshold;
  assert.equal(inspect().reason, "armed");
  assert.equal(inspect().active, true);
  assert.equal(inspect({ visualReady: false }).reason, "asset-missing");
  fixture.system.enabled = false;
  assert.equal(inspect().reason, "disabled");
  fixture.system.enabled = true;
  fixture.scene.hardcoreModeData = { mode: "normal", armed: false };
  assert.equal(inspect().reason, "wrong-mode");
  fixture.scene.hardcoreModeData = { mode: "hardcore", armed: true };
  fixture.scene.upgradeSystem.isGemPowerUnlocked = () => false;
  assert.equal(inspect().reason, "missing-unlock");
  fixture.scene.upgradeSystem.isGemPowerUnlocked = () => true;
  fixture.playerTile.ty = 40;
  assert.equal(inspect().reason, "too-shallow");
  assert.equal(inspect({ devForceActive: true, devToolsEnabled: true }).reason, "forced");
  fixture.playerTile.ty = 129;
  fixture.system.phase = GRAVEBORER_WURM_PHASES.warning;
  assert.equal(inspect().stage, "telegraphing");
  fixture.system.phase = GRAVEBORER_WURM_PHASES.burrowing;
  assert.equal(inspect().stage, "active");
  fixture.system.phase = GRAVEBORER_WURM_PHASES.cooldown;
  assert.equal(
    resolveGraveborerWurmLifecycleStage(fixture.system, inspect(), "active"),
    "resolved",
  );
}

{
  const notices = [];
  const scene = {
    textures: { exists: () => true },
    uiNotifications: { warning: (...args) => notices.push(args) },
    worldModel: {
      widthTiles: 30,
      depthTiles: 30,
      topAirRows: 2,
      inBounds: (tx, ty) => tx >= 0 && tx < 30 && ty >= 0 && ty < 30,
    },
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 5 }) },
  };
  let scheduled = 0;
  let debrisScheduled = 0;
  let forced = null;
  const system = {
    config: EARTHQUAKE_CONFIG,
    state: "idle",
    paused: false,
    suppressed: false,
    nextEventMs: 42,
    syncSuppression: () => system.suppressed,
    _scheduleNext: () => { scheduled += 1; },
    _scheduleNextDebrisEvent: () => { debrisScheduled += 1; },
    _getDepth: () => 30,
    _selectWorldEpicenter: () => null,
    _makeEpicenter: (tx, ty) => ({ tx, ty, depth: ty - 1 }),
    _isCavityAnchor: (tx, ty) => tx === 10 && ty === 6,
    getStatus: () => ({ state: system.state }),
    start: (intensity, options) => { forced = { intensity, options }; },
    triggerDebrisEvent: options => { forced = { debris: true, options }; },
    cancelActiveHazards: reason => { forced = { cancel: reason }; },
  };
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    const diagnostics = new EarthquakeDiagnostics(scene, system, EARTHQUAKE_CONFIG);
    assert.equal(inspectEarthquakeAssetHealth(scene).ready, true);
    diagnostics.recordInitial();
    assert.equal(diagnostics.getGate().reason, "armed");
    assert.equal(diagnostics.prepareStart(), null);
    assert.equal(diagnostics.getGate().reason, "no-valid-epicenter");
    assert.equal(scheduled, 1);
    assert.deepEqual(
      diagnostics.prepareStart({ deterministic: true }),
      { tx: 10, ty: 6, depth: 5 },
    );
    assert.deepEqual(
      diagnostics.prepareStart({ epicenter: { tx: 5, ty: 7 } }),
      { tx: 5, ty: 7, depth: 6 },
    );
    system.paused = true;
    assert.equal(diagnostics.prepareStart(), null);
    assert.equal(diagnostics.getGate().reason, "paused");
    system.paused = false;
    system.suppressed = true;
    assert.equal(diagnostics.prepareStart(), null);
    assert.equal(diagnostics.getGate().reason, "suppressed");
    system.suppressed = false;
    scene.textures.exists = () => false;
    assert.equal(diagnostics.prepareStart(), null);
    assert.equal(diagnostics.getGate().reason, "asset-missing");
    assert.equal(
      diagnostics.getGate().details.missing.length,
      Object.keys(EARTHQUAKE_FEEDBACK_CONFIG.assets).length,
    );
    scene.textures.exists = () => true;
    system._getDepth = () => 3;
    assert.equal(diagnostics.prepareDebris(EARTHQUAKE_CONFIG.debrisEvents), null);
    assert.equal(diagnostics.getGate().reason, "too-shallow");
    assert.equal(debrisScheduled, 1);
    system._getDepth = () => 30;
    diagnostics.recordNoCeiling("debris", { tx: 5, ty: 7 });
    assert.equal(diagnostics.getGate().reason, "no-valid-ceiling");
    diagnostics.recordWarning("minor", { tx: 5, ty: 7 }, true, { deterministic: true });
    assert.equal(diagnostics.getGate().stage, "telegraphing");
    diagnostics.recordQuake(1, [{ tx: 5, ty: 6 }]);
    assert.equal(diagnostics.getGate().stage, "active");
    diagnostics.recordResolved("minor", 1, 2);
    assert.equal(diagnostics.getGate().stage, "resolved");
    assert.equal(resolveEarthquakeLifecycleStage("warning"), "telegraphing");
    assert.equal(resolveEarthquakeLifecycleStage("earthquake"), "active");
    assert.equal(resolveEarthquakeLifecycleStage("aftermath"), "aftermath");
    assert.equal(diagnostics.showFirstResponseCaption(), true);
    assert.equal(diagnostics.showFirstResponseCaption(), false);
    assert.match(notices[0][0], /HOLD Q FOR GP SHIELD/);
    globalThis.window.earthquakeDebug.force("minor", { tx: 5, ty: 7 });
    assert.deepEqual(forced, {
      intensity: "minor",
      options: { deterministic: true, epicenter: { tx: 5, ty: 7 } },
    });
    diagnostics.destroy();
    assert.equal(globalThis.window.earthquakeDebug, undefined);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

const [earthquakeSource, updateSource, shieldSource] = await Promise.all([
  source("systems/environment/EarthquakeSystem.js"),
  source("world/playScene/PlaySceneUpdate.js"),
  source("systems/visual/DebrisShieldSystem.js"),
]);
assert.match(earthquakeSource, /absorbFallingRock/);
assert.match(updateSource, /debrisShieldSystem\?\.update\?\.\(delta, keys\.q/);
assert.match(shieldSource, /source:\s*["']debrisShield["']/);

console.log("HAZARD_ADMISSION_CONTRACT_OK");
