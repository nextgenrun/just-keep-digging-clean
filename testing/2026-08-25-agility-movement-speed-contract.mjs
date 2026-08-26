import assert from "node:assert/strict";

import { PlayerMovement } from "../player/PlayerMovement.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { getUpgradeEffect } from "../values/upgradeFormulas.js";

const baseSpeed = PLAYER_STATS_CONFIG.walkSpeedPxPerSec;
const agility = UPGRADES.agility;

assert.equal(getUpgradeEffect("agility", 1), 20);
assert.equal(getUpgradeEffect("agility", agility.softcapLevel), agility.softcapValue);
assert.equal(getUpgradeEffect("agility", agility.maxLevel), agility.maxValue);

const upgradeSystem = new UpgradeSystem();
upgradeSystem.setMoney(agility.baseCost);
assert.equal(upgradeSystem.getEffectiveWalkSpeed(baseSpeed), 200);
assert.deepEqual(upgradeSystem.purchaseUpgrade("agility"), {
  success: true,
  level: 1,
  effect: 20,
  cost: agility.baseCost,
});
assert.equal(upgradeSystem.getUpgradeEffects().walkSpeed, 20);
assert.equal(upgradeSystem.getEffectiveWalkSpeed(baseSpeed), 220);

function movementDistanceAt(speed) {
  const body = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    update() {},
    resetVelocity() { this.vx = 0; this.vy = 0; },
    setFlightActive() {},
  };
  const movement = new PlayerMovement(
    body,
    { walkSpeedPxPerSec: baseSpeed, tileSize: 94 },
    { enabled: false },
  );
  const collision = {
    resolveBodyOverlap: () => true,
    moveAndCollideX(target, amount) { target.x += amount; },
    moveAndCollideY(target, amount) { target.y += amount; },
  };
  movement.applyHorizontalMovement(speed, false, true, 1, false);
  movement.update(1, collision, false);
  return body.x;
}

assert.equal(movementDistanceAt(baseSpeed), 200);
assert.equal(movementDistanceAt(upgradeSystem.getEffectiveWalkSpeed(baseSpeed)), 220);

console.log("Agility movement-speed contract OK", {
  baseSpeed,
  levelOneSpeed: upgradeSystem.getEffectiveWalkSpeed(baseSpeed),
  levelOneDistance: movementDistanceAt(upgradeSystem.getEffectiveWalkSpeed(baseSpeed)),
  maxBonus: agility.maxValue,
});
