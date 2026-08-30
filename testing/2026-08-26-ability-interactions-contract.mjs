import assert from "node:assert/strict";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerController } from "../player/PlayerController.js";
import { PlayerMovement } from "../player/PlayerMovement.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
} from "../world/playScene/CelestialActionBarRuntime.js";
import { CELESTIAL_ACTION_BAR_ENTRY_IDS } from "../values/celestialActionBar.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { TILE_TYPES } from "../values/tileTypes.js";

// Every Quick Slash has a large movement lead; Steel stacks above that baseline.
const baseQuickslashMovement = PlayerController.prototype._resolveMovementStats.call({
  config: { walkSpeedPxPerSec: 200 },
  upgradeSystem: {
    getUpgradeEffects: () => ({}),
    isGodModeActive: () => false,
  },
  playerLevelSystem: null,
  abilities: {
    isQuickslashActive: () => true,
    getConstellationStats: () => ({ quickslashBurstSpeed: 0 }),
  },
}, true);
assert.equal(
  baseQuickslashMovement.movementSpeedPxPerSec,
  200 + PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec,
);
const movement = PlayerController.prototype._resolveMovementStats.call({
  config: { walkSpeedPxPerSec: 200 },
  upgradeSystem: {
    getUpgradeEffects: () => ({}),
    isGodModeActive: () => false,
  },
  playerLevelSystem: null,
  abilities: {
    isQuickslashActive: () => true,
    getConstellationStats: () => ({ quickslashBurstSpeed: 160 }),
  },
}, true);
assert.equal(
  movement.movementSpeedPxPerSec,
  200 + PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec + 160,
);
assert.equal(movement.permanentMovementSpeedPxPerSec, 200);
const burstBody = { vx: movement.movementSpeedPxPerSec };
const burstMotion = new PlayerMovement(
  burstBody,
  { tileSize: 94, walkSpeedPxPerSec: 200 },
);
burstMotion.applyHorizontalMovement(movement.movementSpeedPxPerSec, false, true, 0.016, true);
assert.equal(burstBody.vx, movement.movementSpeedPxPerSec);
const releasedMovement = PlayerController.prototype._resolveMovementStats.call({
  config: { walkSpeedPxPerSec: 200 },
  upgradeSystem: {
    getUpgradeEffects: () => ({}),
    isGodModeActive: () => false,
  },
  playerLevelSystem: null,
  abilities: { isQuickslashActive: () => false },
}, true);
assert.equal(releasedMovement.movementSpeedPxPerSec, 200);

// Stellar Lance adds a projectile without inflating ordinary ability damage or cadence.
const lanceBuff = {
  active: true,
  projectileEnabled: true,
  projectileRangeTiles: 12,
  projectileDamageMultiplier: 2,
  projectileSideLanes: 1,
};
const dig = new DigSystem(null, null, { ...MINING_CONFIG, mineCooldownMs: 800 });
const controlDig = new DigSystem(null, null, { ...MINING_CONFIG, mineCooldownMs: 800 });
dig.setCelestialEmpowerProvider(() => lanceBuff);
assert.equal(dig.getDamagePreview(TILE_TYPES.DIRT), MINING_CONFIG.baseDamage);
const quickslashAbilities = {
  isQuickslashActive: () => true,
  getConstellationStats: () => ({ quickslashSpeedBonus: 0.2 }),
};
assert.equal(
  dig._getCooldown(quickslashAbilities),
  controlDig._getCooldown(quickslashAbilities),
);

const thunderHits = [];
const thunderWorld = {
  depth: 3,
  inBounds: (tx, ty) => tx >= 0 && ty >= 0 && ty < 3,
  isDiggable: () => true,
  getTileType: () => TILE_TYPES.DIRT,
  damageTile(tx, ty, damage) {
    thunderHits.push({ tx, ty, damage });
    return {
      destroyed: false,
      typeBeforeDamage: TILE_TYPES.DIRT,
      wasRubble: false,
      hpBefore: 100,
      maxHp: 100,
    };
  },
};
const thunder = new PlayerAbilities(
  null,
  thunderWorld,
  { tileSize: 16 },
  {
    isThunderStrikeUnlocked: () => true,
    getUpgradeEffects: () => ({}),
  },
  { x: 16, y: 16, w: 12, h: 12 },
);
thunder.gemPower = 1000;
let providedDamageCalls = 0;
thunder.setMiningDamageProvider(tileType => {
  providedDamageCalls += 1;
  return dig.getDamagePreview(tileType);
});
assert.equal(thunder.startThunderStrikeCharge(0), true);
assert.equal(thunder.executeThunderStrike(0).success, true);
assert.equal(providedDamageCalls, 1);
assert.equal(thunderHits[0].damage, Math.round(MINING_CONFIG.baseDamage * 1.5));

// Paid Slam I keeps free, exact-timing action-bar follow-ups available at zero GP.
let queuedThunder = 0;
const chainScene = {
  upgradeSystem: { godModeActive: false },
  thunderStrikeActionRuntime: { isAnimating: true },
  playerController: {
    input: { queueThunderStrikeInput: () => { queuedThunder += 1; return true; } },
    abilities: {
      isThunderStrikeUnlocked: () => true,
      isThunderStrikeCharging: () => false,
      getThunderStrikeCost: () => 250,
      getGemPowerExact: () => 0,
    },
  },
};
const chainState = getCelestialActionBarAbilityState(
  chainScene,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
);
assert.equal(chainState.active, true);
assert.equal(chainState.available, true);
assert.equal(activateCelestialActionBarEntry(
  chainScene,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
).ok, true);
assert.equal(queuedThunder, 1);
chainScene.thunderStrikeActionRuntime.isAnimating = false;
assert.equal(getCelestialActionBarAbilityState(
  chainScene,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
).available, false);

console.log("ABILITY_INTERACTIONS_CONTRACT_OK");
