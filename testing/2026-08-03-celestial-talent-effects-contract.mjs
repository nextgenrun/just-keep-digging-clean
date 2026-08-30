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
assert.equal(wayward.supernovaRadiusTiles, baseWayward.supernovaRadiusTiles + 1);
assert.equal(wayward.supernovaMaxImpacts, baseWayward.supernovaMaxImpacts + 3);

const baseHollow = CELESTIAL_ENGINE_CONFIG.engines["hollow-sun"];
const hollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-impact-capacity",
  "hollow-implosion-mastery",
]);
assert.deepEqual(hollow.pulseRadiiTiles, baseHollow.pulseRadiiTiles.map(v => v + 1));
assert.equal(hollow.maxImpacts, baseHollow.maxImpacts + 8);
assert.equal(hollow.lifetimeMs, baseHollow.lifetimeMs);
assert.equal(hollow.simultaneousHoles, baseHollow.simultaneousHoles + 1);
assert.equal(hollow.implosionRadiusTiles, 4);
assert.equal(hollow.implosionMaxImpacts, 12);

const stackedHollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-extra-pulse",
  "hollow-collapse-pulse",
  "hollow-tidal-radius",
]);
assert.deepEqual(
  stackedHollow.pulseRadiiTiles,
  [4, 5, 6, 7],
  "both radius talents must apply to every black-hole pulse",
);
assert.deepEqual(stackedHollow.pulseTimesMs, [738, 1968, 3198, 4428]);
assert.equal(stackedHollow.simultaneousHoles, 3);

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
assert.equal(rage.projectileRangeTiles, baseRage.projectileRangeTiles + 2);
assert.equal(rage.projectileSideLanes, 1);
assert.equal(rage.lifetimeMs, baseRage.lifetimeMs + 1500);
assert.equal("attackSpeedMultiplier" in rage, false);
assert.equal(resolveCelestialTalentEngineDefinition("missing"), null);

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
