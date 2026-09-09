import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GEM_POWER_CONFIG } from "../values/gemPower.js";
import {
  createHardcoreModeData,
} from "../values/hardcoreMode.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

globalThis.Phaser = {
  Math: {
    Clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
    Linear: (start, end, amount) => start + (end - start) * amount,
  },
};

const { PlayerAbilities } = await import("../player/PlayerAbilities.js");
const { HardcoreModeSystem } = await import("../systems/hardcore/HardcoreModeSystem.js");
const { LightSystem } = await import("../systems/lighting/LightSystem.js");
const { UpgradeSystem } = await import("../systems/progression/UpgradeSystem.js");

const upgrades = new UpgradeSystem();
upgrades.setUpgradeLevels({
  gemPowerEfficiency: 6,
  boboCaveEyes: 5,
});
const effects = upgrades.getUpgradeEffects();
assert.equal(effects.gemPowerCostReduction, 0.30);
assert.equal(effects.noTorchMinVisibilityRadius, 0.8);
assert.equal(effects.caveEyesPanicReduction, 0.30);
assert.equal(upgrades.getEffectiveGemPowerCost(100), 70);

const abilities = new PlayerAbilities(
  { scene: { floatingTextSystem: { getUnlockedConstellations: () => [] } } },
  null,
  { tileSize: 94, flightSpeedPxPerSec: 252 },
  upgrades,
  { x: 0, y: 0, w: 31, h: 75, vx: 0, vy: 0 },
);
abilities.gemPower = 1000;
assert.equal(abilities.getQuickslashCost(), 8.4);
assert.equal(abilities.getThunderStrikeCost(), 175);
assert.equal(abilities._getGemPowerDrain(), GEM_POWER_CONFIG.baseDrain * 0.70);
assert.equal(abilities._getFlyStartCost(), GEM_POWER_CONFIG.flightStartCost * 0.70);

const light = Object.create(LightSystem.prototype);
light.config = LIGHT_CONFIG;
light._torchIntensityPercent = 100;
light.scene = { upgradeSystem: upgrades };
assert.equal(
  light._getTorchDrainPerSecond(0),
  LIGHT_CONFIG.torchDrainGpPerSecond * 0.70,
);

const hardcoreData = {
  ...createHardcoreModeData("hardcore", 1),
  armed: true,
  armedAt: 1,
  stress: 90,
  peakStress: 90,
};
const hardcoreContext = {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  torchIntensity: 0,
  nearIntactStarLight: false,
  descentTilesPerSecond: 0,
};
const baseline = new HardcoreModeSystem(hardcoreData).update(0.000001, hardcoreContext);
const protectedSnapshot = new HardcoreModeSystem(hardcoreData).update(0.000001, {
  ...hardcoreContext,
  caveEyesPanicReduction: effects.caveEyesPanicReduction,
  gpDrainMultiplier: upgrades.getGemPowerCostMultiplier(),
});
assert.ok(Math.abs(
  protectedSnapshot.stressGainPerSecond - baseline.stressGainPerSecond * 0.70,
) < 1e-8);
assert.ok(Math.abs(
  protectedSnapshot.stressGpDrainPerSecond
    - baseline.stressGpDrainPerSecond * 0.49,
) < 1e-8);

assert.equal(
  UPGRADES.gemPowerTank.description,
  "Increase your maximum GP. In Hardcore, GP is your health.",
);
assert.equal(UPGRADES.quickReflexes.description, "Dig faster.");
assert.match(UPGRADES.gemPowerEfficiency.description, /Flight, abilities and your torch.*hits and panic/i);
assert.match(UPGRADES.boboCaveEyes.description, /panic/);

const engineSource = readFileSync(
  new URL("../world/playScene/CelestialEngineController.js", import.meta.url),
  "utf8",
);
const wurmSource = readFileSync(
  new URL("../world/playScene/GraveborerWurmEventBridge.js", import.meta.url),
  "utf8",
);
assert.match(engineSource, /getEffectiveGemPowerCost/);
assert.match(wurmSource, /getEffectiveGemPowerCost/);

console.log("SHARED_GP_EFFICIENCY_OK");
