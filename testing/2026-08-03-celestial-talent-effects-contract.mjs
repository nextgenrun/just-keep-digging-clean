import assert from "node:assert/strict";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import {
  resolveCelestialTalentEngineDefinition,
} from "../values/celestialTalentEffects.js";

const baseWayward = CELESTIAL_ENGINE_CONFIG.engines["wayward-star"];
const wayward = resolveCelestialTalentEngineDefinition("wayward-star", [
  "wayward-extra-bounces",
  "wayward-extra-star",
  "wayward-impact-capacity",
  "wayward-supernova-mastery",
]);
assert.equal(wayward.maxBounces, baseWayward.maxBounces + 2);
assert.equal(wayward.simultaneousStars, baseWayward.simultaneousStars + 2);
assert.equal(wayward.maxImpacts, baseWayward.maxImpacts + 11);
assert.equal(wayward.supernovaRadiusTiles, 0);
assert.equal(wayward.supernovaMaxImpacts, 0);
assert.equal(wayward.seekFreshTargets, true);
assert.equal(wayward.seekRadiusTiles, 5);

const baseHollow = CELESTIAL_ENGINE_CONFIG.engines["hollow-sun"];
const hollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-impact-capacity",
  "hollow-implosion-mastery",
]);
assert.deepEqual(hollow.pulseRadiiTiles, baseHollow.pulseRadiiTiles.map(v => v + 1));
assert.equal(hollow.maxImpacts, baseHollow.maxImpacts);
assert.equal(hollow.lifetimeMs, baseHollow.lifetimeMs);
assert.equal(hollow.simultaneousHoles, baseHollow.simultaneousHoles);
assert.equal(hollow.implosionRadiusTiles, 4);
assert.equal(hollow.implosionMaxImpacts, 30);
assert.equal(hollow.controlPulseEveryNudges, 3);

const stackedHollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-extra-pulse",
  "hollow-collapse-pulse",
  "hollow-tidal-radius",
]);
assert.deepEqual(
  stackedHollow.pulseRadiiTiles,
  [3, 4, 5, 6],
  "the gravity path expands pulses while the control path improves steering",
);
assert.deepEqual(stackedHollow.pulseTimesMs, [738, 1968, 3198, 4428]);
assert.equal(stackedHollow.simultaneousHoles, 4);
assert.ok(stackedHollow.digDriftStepTiles > baseHollow.digDriftStepTiles);
assert.ok(stackedHollow.softFollowSpeedTilesPerSecond > baseHollow.softFollowSpeedTilesPerSecond);

const baseRage = CELESTIAL_ENGINE_CONFIG.engines["comet-engine"];
const rage = resolveCelestialTalentEngineDefinition("comet-engine", [
  "rage-damage-i",
  "rage-speed-i",
  "rage-duration-i",
  "rage-limit-break",
]);
assert.equal(
  rage.projectileDamageMultiplier,
  baseRage.projectileDamageMultiplier + 0.25,
);
assert.equal(rage.projectileRangeTiles, baseRage.projectileRangeTiles);
assert.equal(rage.projectileInfiniteRange, false);
assert.equal(rage.projectileStates[1].minimumDistanceTiles, 3);
assert.equal(rage.projectileStates[1].damageMultiplier, 1.15);
assert.equal(rage.projectileSideLanes, 1);
assert.equal(rage.lifetimeMs, baseRage.lifetimeMs);
assert.equal(rage.resonantEveryShots, 4);
assert.equal(rage.resonantSideLanes, 1);
assert.equal("attackSpeedMultiplier" in rage, false);
assert.equal(resolveCelestialTalentEngineDefinition("missing"), null);

const apexWayward = resolveCelestialTalentEngineDefinition("wayward-star", [
  "wayward-homebound-passive",
], { "wayward-homebound-apex": 3 });
assert.equal(apexWayward.companionEnabled, true);
assert.equal(apexWayward.companionImpactCooldownMs, 1700);
assert.equal(apexWayward.companionDamageScale, 0.28);

const apexHollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-umbra-passive",
], { "hollow-eternal-eclipse": 3 });
assert.equal(apexHollow.passiveHollowEnabled, true);
assert.equal(apexHollow.passiveHollowPulseEveryDigs, 2);
assert.equal(apexHollow.passiveHollowPulseImpactCap, 3);

const apexLance = resolveCelestialTalentEngineDefinition("comet-engine", [
  "rage-echo-passive",
], { "comet-echo-arsenal": 3 });
assert.equal(apexLance.passiveLanceEnabled, true);
assert.equal(apexLance.passiveLanceRangeTiles, 4);
assert.equal(apexLance.passiveLanceDamageMultiplier, 0.35);

for (const branch of CELESTIAL_TALENT_PROGRESSION_CONFIG.branches) {
  const base = resolveCelestialTalentEngineDefinition(branch.id, []);
  for (const node of branch.nodes.filter(candidate => candidate.kind !== "ability")) {
    const modified = resolveCelestialTalentEngineDefinition(branch.id, [node.effectId]);
    assert.notDeepEqual(
      modified,
      base,
      `${node.id} must change the live ${branch.id} Engine definition`,
    );
  }
}

console.log("PASS Celestial effects: every purchased upgrade changes its live Engine definition");
