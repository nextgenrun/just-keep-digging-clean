import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerFlightMotion } from "../player/PlayerFlightMotion.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
} from "../world/playScene/CelestialActionBarRuntime.js";
import { CELESTIAL_ACTION_BAR_ENTRY_IDS } from "../values/celestialActionBar.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { TILE_TYPES } from "../values/tileTypes.js";

function createCombinedAbilities(unlockedConstellations = []) {
  const body = {
    x: 0,
    y: 0,
    w: 31,
    h: 75,
    vx: 0,
    vy: 0,
    setFlightActive(value) { this.flightActive = value; },
  };
  const abilities = new PlayerAbilities(
    {
      scene: {
        floatingTextSystem: {
          getUnlockedConstellations: () => [...unlockedConstellations],
        },
        hudSystem: { flashStatus() {} },
      },
    },
    null,
    { tileSize: 94, flightSpeedPxPerSec: 252 },
    {
      isGemPowerUnlocked: () => true,
      isQuickslashUnlocked: () => true,
      getUpgradeEffects: () => ({}),
    },
    body,
  );
  abilities.gemPower = 500;
  abilities.setAbilityAssetReadiness({
    isReady: () => true,
    ensure: async () => ({ ready: true }),
  });
  return { abilities, body };
}

const combinedInput = {
  getFlyInput: () => true,
  getQuickslashInput: () => true,
  getHorizontalMovement: () => ({ left: false, right: true }),
  getFlightMovement: () => ({ x: 1, y: -1 }),
};
const combined = createCombinedAbilities();
combined.abilities.update(1 / 60, combinedInput, true, true);
assert.equal(combined.abilities.isFlying(), true);
assert.equal(combined.abilities.isQuickslashActive(), true);
assert.equal(combined.body.flightActive, true);
assert.equal(
  combined.abilities.getQuickslashMovementBonus(),
  PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec,
);
assert.equal(
  combined.abilities.getEffectiveFlightSpeed(),
  252 + PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec,
);

const flight = new PlayerFlightMotion(
  combined.body,
  { tileSize: 94 },
);
for (let frame = 0; frame < 180; frame += 1) {
  flight.updatePowered(
    1 / 60,
    combinedInput,
    frame === 0,
    combined.abilities.getEffectiveFlightSpeed(),
  );
}
const combinedFlightSpeed = Math.hypot(combined.body.vx, combined.body.vy);
assert.ok(
  combinedFlightSpeed > 252 * 1.8,
  `Quickslash Flight should be decisively faster than base Flight, got ${combinedFlightSpeed}`,
);

const steel = createCombinedAbilities(["steel"]);
steel.abilities.update(1 / 60, combinedInput, true, true);
assert.equal(
  steel.abilities.getEffectiveFlightSpeed(),
  252 + PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec + 160,
);

// Active Q must not make a separately budgeted Star talent unavailable.
let engineActivations = 0;
const engineScene = {
  upgradeSystem: { godModeActive: false },
  starHeartProgressionSystem: { getSnapshot: () => ({ godMode: false }) },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      unlockedAbilityIds: [CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR],
      branches: [],
    }),
  },
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
    activateEngine: abilityId => {
      engineActivations += 1;
      return { ok: true, abilityId };
    },
  },
  playerController: {
    abilities: {
      isQuickslashActive: () => true,
      getGemPowerExact: () => 500,
      getSpendableGemPower: () => 500,
      canSpendGemPower: () => true,
    },
  },
};
const engineState = getCelestialActionBarAbilityState(
  engineScene,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
);
assert.equal(engineState.available, true);
assert.equal(activateCelestialActionBarEntry(
  engineScene,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
).ok, true);
assert.equal(engineActivations, 1);
assert.equal(engineScene.playerController.abilities.isQuickslashActive(), true);

// Stellar Lance and Quickslash compose into one stronger projectile action.
const hits = [];
const world = {
  inBounds: (tx, ty) => tx >= 0 && tx < 2 && ty === 0,
  isSolid: (tx, ty) => tx >= 0 && tx < 2 && ty === 0,
  isDiggable: (tx, ty) => tx >= 0 && tx < 2 && ty === 0,
  getTileType: () => TILE_TYPES.DIRT,
  damageTile(tx, ty, damage) {
    hits.push({ tx, ty, damage });
    return {
      success: true,
      destroyed: false,
      hp: 999,
      hpBefore: 999,
      maxHp: 999,
      typeBeforeDamage: TILE_TYPES.DIRT,
      wasRubble: false,
      overkillDamage: 0,
    };
  },
};
const dig = new DigSystem(
  world,
  { applyTileUpdate() {} },
  { ...MINING_CONFIG, tileSize: 94, topAirRows: 0, seed: 1 },
);
dig.setCelestialEmpowerProvider(() => ({
  active: true,
  engineId: "comet-engine",
  activationId: "quickslash-combination",
  projectileEnabled: true,
  projectileRangeTiles: 2,
  projectileDamageMultiplier: 2,
  projectileSideLanes: 0,
  projectilePassesGeodeWalls: true,
}));
let quickslashCosts = 0;
const quickslash = {
  isQuickslashActive: () => true,
  canPayQuickslashCost: () => true,
  spendQuickslashCost: () => { quickslashCosts += 1; return 12; },
  getConstellationStats: () => ({
    quickslashDamageMult: 0,
    quickslashSpeedBonus: 0,
  }),
};
const projectileResult = dig.tryMine(
  { tx: 0, ty: 0 },
  1000,
  "RIGHT",
  quickslash,
  { ignoreCooldown: true },
);
assert.equal(projectileResult.success, true);
assert.equal(hits.length, 1);
assert.deepEqual(
  hits.map(hit => hit.damage),
  [
    MINING_CONFIG.baseDamage * PLAYER_ABILITIES_CONFIG.quickslashDamageMultiplier * 2,
  ],
);
assert.equal(projectileResult.celestialProjectile.visualPaths[0].endTile.tx, 0);
assert.equal(quickslashCosts, 1);

// One Quick Slash contact must mine both horizontal targets for one GP cost.
dig.setCelestialEmpowerProvider(null);
dig.lastMineTime = -Infinity;
hits.length = 0;
const dualSidedResult = dig.tryMineArea(
  [
    { tx: 0, ty: 0, aimDirection: "LEFT" },
    { tx: 1, ty: 0, aimDirection: "RIGHT" },
  ],
  2000,
  "RIGHT",
  quickslash,
  { skipHeavyPunch: false },
);
assert.equal(dualSidedResult.success, true);
assert.equal(dualSidedResult.hits.filter(hit => hit.result.success).length, 2);
assert.equal(hits.length, 2);
assert.equal(quickslashCosts, 2, "the two-sided contact must add only one cost");

const playUpdateSource = await readFile(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(playUpdateSource, /thunderStrikeOwnsPlayerAction/);
assert.match(playUpdateSource, /\[quickslashDir, -quickslashDir\]/);
assert.match(playUpdateSource, /tryMineArea\(\s*quickslashTargets/);
assert.ok(
  playUpdateSource.indexOf("thunderStrikeActionRuntime?.update")
    < playUpdateSource.indexOf("// Quickslash: one native action"),
  "Thunder input must receive the shared action slot before held Q starts another action",
);
assert.doesNotMatch(
  playUpdateSource,
  /!this\.isDigAnimating\s*&&\s*this\.playerController\?\.abilities\?\.isFlying/,
);

console.log("QUICKSLASH_ABILITY_COMBINATION_CONTRACT_OK");
