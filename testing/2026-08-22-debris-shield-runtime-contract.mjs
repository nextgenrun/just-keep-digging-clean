import assert from "node:assert/strict";

import { DebrisShieldSystem } from "../systems/visual/DebrisShieldSystem.js";
import { DEBRIS_SHIELD_CONFIG } from "../values/debrisShield.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";

let drained = 0;
let blockedText = null;
let confirms = 0;
const scene = {
  playerController: {
    getGemPowerExact: () => 50,
    consumeGemPower(amount, context) {
      drained += amount;
      assert.deepEqual(context, { source: "debrisShield" });
    },
  },
  floatingTextSystem: {
    showFloatingText(x, y, text) { blockedText = { x, y, text }; },
  },
  soundSystem: { playUiConfirm() { confirms += 1; } },
  shakeSystem: { shake() {} },
};
const shield = Object.create(DebrisShieldSystem.prototype);
Object.assign(shield, {
  scene,
  config: DEBRIS_SHIELD_CONFIG,
  threatActive: false,
  active: false,
  _syncVisuals() {},
});

assert.equal(shield.update(1000, { isDown: true }, { fallingRocks: [], caveIns: [] }), false);
assert.equal(drained, 0, "Q must not drain GP when no debris threatens the player");
assert.equal(shield.update(500, { isDown: false }, { fallingRocks: [{}], caveIns: [] }), false);
assert.equal(shield.isInputCaptured(), true, "the Q hint must become contextual during debris");
assert.equal(shield.update(500, { isDown: true }, { fallingRocks: [{}], caveIns: [] }), true);
assert.equal(drained, DEBRIS_SHIELD_CONFIG.gpDrainPerSecond / 2);
assert.equal(shield.absorbFallingRock({ x: 12, y: 34 }), true);
assert.deepEqual(blockedText, { x: 12, y: 34, text: DEBRIS_SHIELD_CONFIG.feedback.blockedText });
assert.equal(confirms, 1);
shield.active = false;
assert.equal(shield.absorbFallingRock({ x: 12, y: 34 }), false);

assert.equal(EARTHQUAKE_CONFIG.debrisEvents.enabled, true);
assert.ok(EARTHQUAKE_CONFIG.debrisEvents.intervalMs[1] <= 90_000);
assert.equal(DEBRIS_SHIELD_CONFIG.fixedKeyLabel, "Q");

console.log("Debris shield runtime contract passed: contextual Q, GP drain, absorb, and 45-90s event cadence.");
