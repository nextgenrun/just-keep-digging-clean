import assert from "node:assert/strict";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import {
  ABILITY_ROLE_DECISIONS,
  getAbilityRoleHealth,
} from "../values/abilityRoles.js";

assert.equal(getAbilityRoleHealth().ready, true);
assert.equal(Object.keys(ABILITY_ROLE_DECISIONS).length, 5);

const body = {
  x: 100,
  y: 100,
  w: 30,
  h: 70,
  vx: 0,
  setFlightActive() {},
};
const sprite = { scene: { time: { now: 1000 }, floatingTextSystem: null } };
const world = {
  depth: 100,
  inBounds: () => true,
  isDiggable: () => true,
  getTileType: () => 1,
  damageTile: () => ({
    destroyed: false,
    typeBeforeDamage: 1,
    hpBefore: 100,
    maxHp: 100,
  }),
};
const upgrades = {
  gameplayCapabilities: null,
  isGemPowerUnlocked: () => true,
  isQuickslashUnlocked: () => true,
  isThunderStrikeUnlocked: () => true,
  getUpgradeLevel: () => 1,
  getUpgradeEffects: () => ({}),
};
const abilities = new PlayerAbilities(
  sprite,
  world,
  { tileSize: 100 },
  upgrades,
  body,
);
abilities.gemPower = 1000;
abilities.update(0.016, {
  getFlyInput: () => true,
  getQuickslashInput: () => true,
  getHorizontalMovement: () => ({ left: false, right: true }),
}, false, true);
abilities.startThunderStrikeCharge(0);
const strike = abilities.executeThunderStrike(0);
assert.equal(strike.success, true);
const events = abilities.drainAbilityUseEvents();
assert.deepEqual(events.map(event => event.ability), [
  "flight",
  "quickslash",
  "thunderStrike",
]);
assert.equal(events[1].direction, 1);
assert.equal(events[2].hit, true);
assert.ok(events[2].damage > 0);
assert.deepEqual(abilities.drainAbilityUseEvents(), []);

console.log("ABILITY_ROLE_TELEMETRY_CONTRACT_OK");
