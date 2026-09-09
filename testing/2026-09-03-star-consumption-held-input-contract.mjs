import assert from "node:assert/strict";
import { StarConsumptionGuard } from "../systems/environment/StarConsumptionGuard.js";
import { STAR_SANCTUARY_CONFIG as config } from "../values/starSanctuary.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const target = { tx: 70, ty: 88 };
const damage = { tileX: target.tx, tileY: target.ty, type: TILE_TYPES.SKY_TILE };
const held = { gameplayActive: true, consumptionHeld: true, consumptionTarget: target };
const holdMs = config.consumption.confirmationHoldMs;
const gapMs = config.consumption.maximumAttemptGapMs;
const frameMs = Math.max(1, Math.floor(Math.min(holdMs, gapMs) / 10));
const slowStrikeMs = holdMs + gapMs;
const make = (acknowledged = true) => new StarConsumptionGuard(
  { getTileType: () => TILE_TYPES.SKY_TILE }, config,
  (tx, ty) => ({ id: "held-input-regression", tx, ty }), acknowledged,
);
const sustain = (guard, until) => {
  for (let now = frameMs; now <= until; now += frameMs) guard.update(now, held);
};

assert.equal(holdMs, 1000, "the deliberate hold duration must not be shortened");
assert.equal(config.consumption.acknowledgement.confirmationWord, "DESTROY");
const unacknowledged = make(false);
assert.equal(unacknowledged.shouldBlockDamage(damage, 0), true);
sustain(unacknowledged, slowStrikeMs);
assert.equal(unacknowledged.shouldBlockDamage(damage, slowStrikeMs), true,
  "holding cannot bypass the typed acknowledgement");
assert.equal(unacknowledged.getSnapshot(slowStrikeMs).consumptionConfirmationPending, true);

const early = make();
assert.equal(early.shouldBlockDamage(damage, 0), true);
sustain(early, holdMs - frameMs);
assert.equal(early.shouldBlockDamage(damage, holdMs - 1), true,
  "the first second still protects the Star");

const slow = make();
assert.equal(slow.shouldBlockDamage(damage, 0), true);
sustain(slow, slowStrikeMs);
assert.equal(slow.getSnapshot(slowStrikeMs).pendingConsumption.phase, "holding",
  "holding alone does not apply damage or authorize it before a contact");
assert.equal(slow.shouldBlockDamage(damage, slowStrikeMs), false,
  "continuous real input must survive an attack interval longer than the stale-attempt limit");
assert.equal(slow.getSnapshot(slowStrikeMs).pendingConsumption.phase, "authorized");

for (const [name, interruption] of [
  ["release", { ...held, consumptionHeld: false }],
  ["retarget", { ...held, consumptionTarget: { tx: target.tx + 1, ty: target.ty } }],
  ["pause", { ...held, gameplayActive: false }],
]) {
  const guard = make();
  guard.shouldBlockDamage(damage, 0);
  sustain(guard, holdMs / 2);
  guard.update(holdMs / 2 + frameMs, interruption);
  assert.equal(guard.getSnapshot(slowStrikeMs).pendingConsumption, null, `${name} cancels the hold`);
  assert.equal(guard.shouldBlockDamage(damage, slowStrikeMs), true, `${name} requires a new hold`);
}

const staleFrame = make();
staleFrame.shouldBlockDamage(damage, 0);
staleFrame.update(gapMs + 1, held);
assert.equal(staleFrame.getSnapshot(gapMs + 1).pendingConsumption, null,
  "a genuinely stale frame cannot revive an old hold");
assert.equal(staleFrame.shouldBlockDamage(damage, gapMs + 1), true);

const noInput = make();
noInput.shouldBlockDamage(damage, 0);
for (let now = frameMs; now <= slowStrikeMs; now += frameMs) noInput.update(now, {});
assert.equal(noInput.getSnapshot(slowStrikeMs).pendingConsumption, null,
  "unverified input cannot renew the attempt clock");
assert.equal(noInput.shouldBlockDamage(damage, slowStrikeMs), true);

console.log("STAR_CONSUMPTION_HELD_INPUT_CONTRACT_OK", JSON.stringify({
  holdMs, staleGapMs: gapMs, slowStrikeMs, typedGatePreserved: true,
  cancellationCases: ["release", "retarget", "pause", "stale-frame", "unknown-input"],
}));
