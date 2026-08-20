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
  "wayward-extra-redirect",
  "wayward-impact-capacity",
  "wayward-supernova-mastery",
]);
assert.equal(wayward.maxBounces, baseWayward.maxBounces + 2);
assert.equal(wayward.maxRedirects, baseWayward.maxRedirects + 1);
assert.equal(wayward.maxImpacts, baseWayward.maxImpacts + 10);
assert.equal(wayward.supernovaRadiusTiles, baseWayward.supernovaRadiusTiles + 1);

const baseHollow = CELESTIAL_ENGINE_CONFIG.engines["hollow-sun"];
const hollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-impact-capacity",
  "hollow-pulse-tempo",
  "hollow-implosion-mastery",
]);
assert.deepEqual(hollow.pulseRadiiTiles, baseHollow.pulseRadiiTiles.map(v => v + 1));
assert.equal(hollow.maxImpacts, baseHollow.maxImpacts + 8);
assert.ok(hollow.pulseTimesMs.at(-1) < baseHollow.pulseTimesMs.at(-1));
assert.equal(hollow.implosionRadiusTiles, 2);
assert.equal(hollow.implosionMaxImpacts, 6);

const stackedHollow = resolveCelestialTalentEngineDefinition("hollow-sun", [
  "hollow-pulse-radius",
  "hollow-extra-pulse",
  "hollow-tidal-radius",
]);
assert.deepEqual(
  stackedHollow.pulseRadiiTiles,
  [4, 5, 6, 7],
  "the added fourth pulse must receive both global radius upgrades",
);

const baseComet = CELESTIAL_ENGINE_CONFIG.engines["comet-engine"];
const comet = resolveCelestialTalentEngineDefinition("comet-engine", [
  "comet-travel-capacity",
  "comet-ride-control",
  "comet-impact-capacity",
  "comet-drive-mastery",
]);
assert.equal(comet.maxTravelTiles, baseComet.maxTravelTiles + 4);
assert.equal(comet.rideSpeedPxPerSecond, baseComet.rideSpeedPxPerSecond + 90);
assert.equal(comet.maxImpacts, baseComet.maxImpacts + 6);
assert.equal(comet.sideBurstEveryTiles, 2);
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
