import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import {
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../values/celestialActionBar.js";
import {
  DEFAULT_GAMEPLAY_CAPABILITIES,
  DEVELOPMENT_GAMEPLAY_CAPABILITIES,
} from "../values/gameplayCapabilities.js";
import { GOD_MODE_CONFIG } from "../values/godMode.js";
import { GAMEPLAY_DEV_INPUT } from "../values/keybindActions.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  getCelestialActionBarAbilityState,
} from "../world/playScene/CelestialActionBarRuntime.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";

assert.deepEqual(GAMEPLAY_DEV_INPUT, { godModeKey: "V" });
assert.equal(GOD_MODE_CONFIG.miningDamage, 999);
assert.equal(GOD_MODE_CONFIG.mineCooldownReduction, 0.8);

const upgradeSystem = new UpgradeSystem(null, null, {
  gameplayCapabilities: DEVELOPMENT_GAMEPLAY_CAPABILITIES,
});
upgradeSystem.setGodMode(true);
assert.equal(upgradeSystem.isGodModeActive(), true);
assert.equal(upgradeSystem.getEffectiveWalkSpeed(200), GOD_MODE_CONFIG.movementSpeedPxPerSec);
assert.equal(upgradeSystem.getEffectiveDigDamageMultiplier(6), 999);
assert.ok(Math.abs(upgradeSystem.getEffectiveMineCooldown(200) - 40) < 1e-9);

const abilities = new PlayerAbilities(
  { scene: { floatingTextSystem: { getUnlockedConstellations: () => [] } } },
  {},
  { tileSize: 94 },
  upgradeSystem,
);
abilities.setGodMode(true);
assert.equal(abilities.isGodModeActive(), true);
assert.equal(abilities.isQuickslashUnlocked(), true);
assert.equal(abilities.isThunderStrikeUnlocked(), true);
assert.equal(abilities.getQuickslashCost(), 0);
assert.equal(abilities.getThunderStrikeCost(), 0);
assert.equal(abilities._getFlyStartCost(), 0);

const digSystem = new DigSystem({}, {}, { mineCooldownMs: 200 }, upgradeSystem);
digSystem.setCelestialEmpowerProvider(() => ({
  active: true,
  attackSpeedMultiplier: 5,
  damageMultiplier: 5,
  minimumCooldownMs: 80,
}));
assert.ok(Math.abs(digSystem._getCooldown({
  isQuickslashActive: () => true,
  getConstellationStats: () => ({ quickslashSpeedBonus: 0.2 }),
}) - 40) < 1e-9, "God Mode must remain exactly 80% cooldown-reduced");
assert.equal(digSystem._getDamage(6, TILE_TYPES.DIRT), 999);

const actionBarScene = {
  upgradeSystem,
  playerController: { abilities },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({ branches: [], unlockedAbilityIds: [] }),
  },
  starHeartProgressionSystem: { getSnapshot: () => ({ godMode: true }) },
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
  },
};
for (const abilityId of [
  CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.STELLAR_RAGE,
]) {
  const state = getCelestialActionBarAbilityState(actionBarScene, abilityId);
  assert.equal(state.unlocked, true, `${abilityId} must be unlocked in God Mode`);
  assert.equal(state.available, true, `${abilityId} must be available in God Mode`);
}

const gameplayPrototype = {};
setupGameplayMethods(gameplayPrototype);
const toggleUpgradeSystem = new UpgradeSystem(null, null, {
  gameplayCapabilities: DEVELOPMENT_GAMEPLAY_CAPABILITIES,
});
const toggleAbilities = new PlayerAbilities({}, {}, { tileSize: 94 }, toggleUpgradeSystem);
const toggleScene = {
  gameplayCapabilities: DEVELOPMENT_GAMEPLAY_CAPABILITIES,
  upgradeSystem: toggleUpgradeSystem,
  playerController: { abilities: toggleAbilities },
  digSystem: {
    totals: {},
    setResourceTotals(value) { this.totals = value; },
    getResourceTotals() { return this.totals; },
  },
  starHeartProgressionSystem: { refreshGodMode() {} },
  hudSystem: { flashStatus(text) { this.lastStatus = text; } },
};
assert.equal(gameplayPrototype.activateDevCheat.call(toggleScene), true);
assert.equal(toggleUpgradeSystem.isGodModeActive(), true);
assert.equal(toggleAbilities.isGodModeActive(), true);
assert.match(toggleScene.hudSystem.lastStatus, /GOD MODE ON.*999 DMG.*V TO DISABLE/);
assert.equal(gameplayPrototype.activateDevCheat.call(toggleScene), true);
assert.equal(toggleUpgradeSystem.isGodModeActive(), false);
assert.equal(toggleAbilities.isGodModeActive(), false);
assert.match(toggleScene.hudSystem.lastStatus, /GOD MODE OFF.*V TO ENABLE/);

const liveUpgradeSystem = new UpgradeSystem(null, null, {
  gameplayCapabilities: DEFAULT_GAMEPLAY_CAPABILITIES,
});
liveUpgradeSystem.setGodMode(true);
assert.equal(liveUpgradeSystem.isGodModeActive(), false);
const liveAbilities = new PlayerAbilities({}, {}, { tileSize: 94 }, liveUpgradeSystem);
liveAbilities.setGodMode(true);
assert.equal(liveAbilities.isGodModeActive(), false);
let liveMutationCount = 0;
assert.equal(gameplayPrototype.activateDevCheat.call({
  gameplayCapabilities: DEFAULT_GAMEPLAY_CAPABILITIES,
  upgradeSystem: { setGodMode() { liveMutationCount += 1; } },
}), false);
assert.equal(liveMutationCount, 0, "production-safe capabilities must reject God Mode");

const inputSource = await readFile(
  new URL("../world/playScene/GameInputHandler.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(inputSource, /godModeRequiresShift|Shift\+V/);
assert.match(inputSource, /justDown\(keys\.devCheat\)/);
assert.match(inputSource, /GAMEPLAY_FEATURE_IDS\.GOD_MODE/);

console.log("DEV_GODMODE_CONTRACT_OK");
