import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import { StarHeartProgressionSystem } from "../systems/celestial/StarHeartProgressionSystem.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { CONSTELLATION_BUFFS } from "../values/constellationBuffs.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
} from "../values/celestialEngines.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";

const upgradeSystem = new UpgradeSystem();
assert.equal(upgradeSystem.isGemPowerUnlocked(), false);
assert.equal(upgradeSystem.isQuickslashUnlocked(), false);
assert.equal(upgradeSystem.isThunderStrikeUnlocked(), false);
assert.equal(upgradeSystem.isGemDashUnlocked(), false, "retired Gem Dash must not be advertised");

const thunderHits = [];
const body = {
  x: 16,
  y: 16,
  w: 12,
  h: 12,
  vx: 0,
  vy: 0,
  setClimbing(value) { this.climbing = value; },
};
const worldModel = {
  depth: 30,
  isSolid: () => false,
  isDiggable: (_tx, ty) => ty < 30,
  getTileType: () => TILE_TYPES.DIRT,
  damageTile(tx, ty, damage) {
    thunderHits.push({ tx, ty, damage });
    return {
      success: true,
      destroyed: false,
      typeBeforeDamage: TILE_TYPES.DIRT,
      wasRubble: false,
      hpBefore: 100,
      maxHp: 100,
      overkillDamage: 0,
    };
  },
};
const sprite = {
  scene: {
    time: { now: 1000 },
    floatingTextSystem: { getUnlockedConstellations: () => [] },
    hudSystem: { flashStatus() {} },
  },
};
const abilities = new PlayerAbilities(
  sprite,
  worldModel,
  { tileSize: 16, climbSpeedPxPerSec: 252 },
  upgradeSystem,
  body,
);

upgradeSystem.setGodMode(true);
abilities.setGodMode(true);
assert.equal(upgradeSystem.isGodModeActive(), true);
assert.equal(upgradeSystem.isGemPowerUnlocked(), true);
assert.equal(upgradeSystem.isQuickslashUnlocked(), true);
assert.equal(upgradeSystem.isThunderStrikeUnlocked(), true);
assert.equal(abilities.isGodModeActive(), true);
assert.equal(abilities.gemPower, abilities.getGemPowerMax());
assert.equal(abilities.getQuickslashCost(), 0);
assert.equal(abilities.getThunderStrikeCost(), 0);
assert.equal(abilities._getFlyStartCost(), 0);
assert.equal(abilities._getGemPowerDrain(), 0);

const stats = abilities.getConstellationStats();
assert.equal(Object.keys(CONSTELLATION_BUFFS).length, 10);
assert.ok(stats.quickslashFlatDamage > 0);
assert.ok(stats.quickslashBurstSpeed > 0);
assert.ok(stats.thunderstrikeRange > 0);
assert.equal(stats.thunderstrikeDamageMult, 0.35);
assert.equal(stats.thunderstrikeRecoveryBonus, undefined);
assert.equal(stats.thunderstrikeBedrockBreach, undefined);

const gpBeforeAbilities = abilities.gemPower;
abilities.update(0.5, {
  getFlyInput: () => true,
  getFlyDownInput: () => false,
  getQuickslashInput: () => false,
  isUp: () => false,
}, false, true);
assert.equal(abilities.isFlying(), true);
assert.equal(abilities.gemPower, gpBeforeAbilities, "God Mode flight must be free");

abilities.update(0.016, {
  getFlyInput: () => false,
  getFlyDownInput: () => false,
  getQuickslashInput: () => true,
  isUp: () => false,
}, true, true);
assert.equal(abilities.isQuickslashActive(), true);
assert.equal(abilities.spendQuickslashCost(), 0);
assert.equal(abilities.gemPower, gpBeforeAbilities, "God Mode Quickslash must be free");

assert.equal(abilities.startThunderStrikeCharge(2000), true);
const thunderResult = abilities.executeThunderStrike(0);
assert.equal(thunderResult.success, true);
assert.ok(thunderHits.length > 0);
assert.equal(
  new Set(thunderHits.map(hit => hit.tx)).size,
  1,
  "Thunderstrike must remain a single vertical lane even with Citadel Storm",
);
assert.equal(abilities.gemPower, gpBeforeAbilities, "God Mode Thunderstrike must be free");
assert.equal(abilities.consumeGemPower(50), 50);
assert.equal(abilities.gemPower, gpBeforeAbilities);
assert.equal(abilities.drainAllGemPower(), 0);
assert.equal(abilities.gemPower, gpBeforeAbilities);

const lightSystem = Object.create(LightSystem.prototype);
lightSystem.scene = { upgradeSystem };
lightSystem.config = {};
assert.equal(lightSystem._getTorchDrainPerSecond(5000), 0, "God Mode torch must report zero drain");

let godModeActive = true;
const starHeart = new StarHeartProgressionSystem({
  isGodModeActive: () => godModeActive,
});
starHeart.loadSaveData(null, 0);
const untouchedSave = starHeart.getSaveData();
assert.equal(starHeart.getSnapshot().godMode, true);
assert.equal(starHeart.getSnapshot().unlocked, true);
assert.equal(starHeart.getSnapshot().charged, true);

for (const [index, engineId] of CELESTIAL_ENGINE_ORDER.entries()) {
  assert.equal(starHeart.chooseEngine(engineId).ok, true);
  assert.equal(starHeart.getSnapshot().selectedEngine, engineId);
  const activation = starHeart.consumeActivation(3000 + index);
  assert.equal(activation.ok, true);
  assert.equal(activation.engineId, engineId);
  assert.equal(
    starHeart.getSnapshot().charge,
    CELESTIAL_ENGINE_CONFIG.charge.capacity,
    "God Mode Engines must not consume charge",
  );
}
assert.deepEqual(starHeart.getSaveData(), untouchedSave, "God Mode Engine switching must not alter saves");

const safeGodScene = {
  sys: { settings: { key: "PlayScene" }, isActive: () => true },
  scene: { isActive: () => true },
  worldModel: {},
  worldRenderer: {},
  playerController: {},
  hudSystem: {},
  digSystem: { _celestialTransactions: new Map() },
  starHeartProgressionSystem: starHeart,
  celestialEngineController: {
    getHealthSnapshot: () => ({ activeCount: 0, activation: null }),
  },
};
const canary = evaluateRuntimeCanaries(
  {
    canvas: { isConnected: true },
    loop: { frame: 2, actualFps: 60, running: true, inFocus: true },
    scene: { getScenes: () => [safeGodScene], scenes: [safeGodScene] },
  },
  {
    noActiveSinceMs: null,
    lastFrame: 1,
    lastFrameChangedAtMs: 0,
    activeSinceByScene: new Map([["PlayScene", 0]]),
  },
  RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1,
  false,
);
assert.equal(
  canary.findings.some(item => item.code === RUNTIME_CANARY_CONFIG.events.celestialInvariant),
  false,
);

const gameplayPrototype = {};
setupGameplayMethods(gameplayPrototype);
const devState = {
  resourceTotals: null,
  money: 0,
  upgradeGodMode: false,
  abilityGodMode: false,
  starHeartRefreshed: false,
};
gameplayPrototype.activateDevCheat.call({
  digSystem: {
    setResourceTotals(value) { devState.resourceTotals = value; },
    getResourceTotals: () => devState.resourceTotals,
  },
  upgradeSystem: {
    addMoney(value) { devState.money += value; },
    getMoney: () => devState.money,
    setGodMode(value) { devState.upgradeGodMode = value; },
    grantUpgrade: () => ({ success: true }),
  },
  playerController: {
    abilities: { setGodMode(value) { devState.abilityGodMode = value; } },
  },
  starHeartProgressionSystem: {
    refreshGodMode() { devState.starHeartRefreshed = true; },
  },
  surfaceTunnelDoorSystem: { syncFromUpgrade() {} },
  arcCoreVehicleSystem: { syncOwnership() {} },
  uiResourceBar: { setResources() {}, setMoney() {} },
  uiInventoryPopup: { setResources() {}, setMoney() {} },
  hudSystem: { flashStatus() {} },
});
assert.equal(devState.upgradeGodMode, true);
assert.equal(devState.abilityGodMode, true);
assert.equal(devState.starHeartRefreshed, true);

godModeActive = false;
starHeart.refreshGodMode();
assert.equal(starHeart.getSnapshot().godMode, false);
assert.equal(starHeart.getSnapshot().selectedEngine, null);

const [
  inputSource,
  setupSource,
  overlaySource,
  overlayPresentationSource,
  timingSystemSource,
  timingViewSource,
] = await Promise.all([
  readFile(new URL("../world/playScene/PlayerInputHandler.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/StarHeartOverlay.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/starHeartOverlayPresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/ThunderStrikeTimingBarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/ThunderStrikeTimingBarView.js", import.meta.url), "utf8"),
]);
assert.doesNotMatch(inputSource, /addBoundKey\("gemDash"\)/);
assert.match(setupSource, /isGodModeActive:\s*\(\)\s*=>\s*this\.upgradeSystem/);
assert.match(overlaySource, /refreshStarHeartSelection/);
assert.match(overlayPresentationSource, /godModeConfirm/);
assert.match(timingSystemSource, /getThunderStrikeCost\?\.\(\)\s*===\s*0/);
assert.match(timingViewSource, /const castFree = milestone\.stageIndex > 0 \|\| initialCastFree/);
assert.match(timingViewSource, /castFree\s*\?\s*"FREE"\s*:\s*"PAID"/);

console.log("godmode abilities contract: flight, quickslash, thunderstrike, torch, and all Celestial Engines are free and save-safe");
