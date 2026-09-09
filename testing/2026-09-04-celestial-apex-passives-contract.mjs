import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import { resolveCelestialTalentEngineDefinition as resolve } from
  "../values/celestialTalentEffects.js";

const branches = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches;
for (const branch of branches) {
  const apex = branch.nodes.find(node => node.kind === "apex");
  assert.ok(apex, `${branch.id} needs one permanent mastery`);
  assert.equal(apex.row, 4);
  assert.equal(apex.prerequisiteMode, "all");
  assert.deepEqual(apex.prerequisiteIds, branch.completionNodeIds);
  assert.equal(apex.starsCost, 500);
}

const waywardBranch = branches.find(branch => branch.id === "wayward-star");
const wayward = resolve(
  "wayward-star",
  waywardBranch.nodes.map(node => node.effectId),
  Object.fromEntries(waywardBranch.nodes.map(node => [node.id, 3])),
);
assert.equal(wayward.supernovaRadiusTiles, 0);
assert.equal(wayward.supernovaMaxImpacts, 0);
assert.equal(wayward.companionEnabled, true);
assert.equal(wayward.companionDamageScale, 0.28);
assert.equal(wayward.companionBouncesBeforeReturn, 4);
assert.ok(wayward.companionImpactCooldownMs >= 1500);

const hollowBranch = branches.find(branch => branch.id === "hollow-sun");
const hollow = resolve(
  "hollow-sun",
  hollowBranch.nodes.map(node => node.effectId),
  Object.fromEntries(hollowBranch.nodes.map(node => [node.id, 3])),
);
assert.equal(hollow.passiveHollowEnabled, true);
assert.equal(hollow.passiveHollowPulseEveryDigs, 2);
assert.equal(hollow.passiveHollowPulseImpactCap, 3);
assert.ok(hollow.softFollowSpeedTilesPerSecond > 0);
assert.equal(hollow.controlPulseEveryNudges, 3);

const lanceBranch = branches.find(branch => branch.id === "comet-engine");
const lance = resolve(
  "comet-engine",
  lanceBranch.nodes.map(node => node.effectId),
  Object.fromEntries(lanceBranch.nodes.map(node => [node.id, 3])),
);
assert.equal(CELESTIAL_ENGINE_CONFIG.engines["comet-engine"].lifetimeMs, 15000);
assert.equal(lance.passiveLanceEnabled, true);
assert.equal(lance.passiveLanceRangeTiles, 4);
assert.equal(lance.passiveLanceDamageMultiplier, 0.35);
assert.equal(lance.resonantEveryShots, 4);
assert.ok(lance.lifetimeGainCapMs > 0);
assert.ok(lance.finalWindowMs > 0);

const cell = { type: TILE_TYPES.DIRT, hp: 100 };
const worldModel = {
  config: { skyTileRarities: [] },
  inBounds: (tx, ty) => tx === 1 && ty === 1,
  isSolid: () => true,
  isDiggable: () => true,
  getTile: () => ({ ...cell, solid: true, diggable: true }),
  damageTile(_tx, _ty, damage) {
    const hpBefore = cell.hp;
    cell.hp = Math.max(0, cell.hp - damage);
    return {
      success: true,
      destroyed: cell.hp === 0,
      hp: cell.hp,
      hpBefore,
      maxHp: 100,
      typeBeforeDamage: TILE_TYPES.DIRT,
      wasRubble: false,
      overkillDamage: 0,
    };
  },
};
const digSystem = new DigSystem(
  worldModel,
  { applyTileDamageUpdate() {}, applyTileUpdate() {} },
  { seed: 1, topAirRows: 0, tileSize: 16 },
);
const chipped = digSystem.applyCelestialDamage({
  activationId: "apex:test",
  engineId: "wayward-star",
  hitId: "chip:1",
  tx: 1,
  ty: 1,
  damageScale: 0.2,
});
assert.equal(chipped.damage, 20);
assert.equal(chipped.destroyed, false);
assert.equal(cell.hp, 80);

const [controllerSource, waywardSource, vfxSource] = await Promise.all([
  readFile(new URL("../world/playScene/CelestialEngineController.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/celestial/WaywardStarEngine.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/celestial/StellarLanceVfx.js", import.meta.url), "utf8"),
]);
assert.match(controllerSource, /CelestialApexPassiveSystem/);
assert.match(controllerSource, /getLanceEmpowerSnapshot/);
assert.doesNotMatch(waywardSource, /enumerateDiscTiles/);
assert.doesNotMatch(waywardSource, /"supernova"/);
assert.doesNotMatch(vfxSource, /options\.assetKey/);

console.log("CELESTIAL_APEX_PASSIVES_OK", {
  nodes: branches.flatMap(branch => branch.nodes).length,
  waywardDamageScale: wayward.companionDamageScale,
  hollowPulseEveryDigs: hollow.passiveHollowPulseEveryDigs,
  echoLance: [lance.passiveLanceRangeTiles, lance.passiveLanceDamageMultiplier],
});
