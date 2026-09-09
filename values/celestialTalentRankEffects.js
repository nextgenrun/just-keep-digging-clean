import { CELESTIAL_TALENT_BRANCHES } from "./celestialTalentBranches.js";
import {
  CELESTIAL_TALENT_RANK_BONUSES,
  CELESTIAL_TALENT_RANK_CONFIG,
  getCelestialTalentRank,
} from "./celestialTalentRanks.js";

const SPECIAL_STATS = new Set([
  "pulseImpactBonus", "lastPulseImpactBonus", "pulseRadiusBonus",
  "pulseTempoScale", "spawnTempoScale",
  "projectileOuterStateDamageBonus", "projectileFarStateDamageBonus",
]);

// The finite catalog and rank limit bound these bonuses. Apply after rank-one
// caps so a paid rank cannot disappear into an old cap.
export function applyCelestialTalentRanks(definition, ownedEffects, nodeRanks = {}) {
  const branch = CELESTIAL_TALENT_BRANCHES.find(entry => entry.id === definition.id);
  if (!branch) return definition;
  const added = {};
  let pulseTempo = 1;
  let spawnTempo = 1;
  for (const node of branch.nodes) {
    if (!ownedEffects.has(node.effectId)) continue;
    const extraRanks = getCelestialTalentRank(nodeRanks?.[node.id]) - 1;
    if (extraRanks <= 0) continue;
    for (const [stat, amount] of Object.entries(CELESTIAL_TALENT_RANK_BONUSES[node.id]?.stats || {})) {
      if (stat === "pulseTempoScale") pulseTempo *= amount ** extraRanks;
      else if (stat === "spawnTempoScale") spawnTempo *= amount ** extraRanks;
      else added[stat] = (added[stat] || 0) + amount * extraRanks;
    }
  }
  const next = { ...definition };
  for (const [stat, amount] of Object.entries(added)) {
    if (!SPECIAL_STATS.has(stat)) next[stat] = Math.round((next[stat] + amount) * 100) / 100;
  }
  if (definition.pulseTimesMs) {
    next.pulseTimesMs = Object.freeze(definition.pulseTimesMs.map(time => Math.round(time * pulseTempo)));
    next.pulseRadiiTiles = Object.freeze(definition.pulseRadiiTiles.map(
      radius => Math.min(
        CELESTIAL_TALENT_RANK_CONFIG.hollowPulseRadiusCapTiles,
        radius + (added.pulseRadiusBonus || 0),
      ),
    ));
    next.pulseImpactCaps = Object.freeze(definition.pulseImpactCaps.map((cap, index, caps) =>
      cap + (added.pulseImpactBonus || 0)
        + (index === caps.length - 1 ? (added.lastPulseImpactBonus || 0) : 0),
    ));
    next.maxImpacts = next.pulseImpactCaps.reduce((sum, cap) => sum + cap, 0);
    next.clusterSpawnDelayMs = Math.round(definition.clusterSpawnDelayMs * spawnTempo);
  }
  if (definition.projectileStates) {
    const lastIndex = definition.projectileStates.length - 1;
    next.projectileStates = Object.freeze(definition.projectileStates.map((state, index) =>
      Object.freeze({
        ...state,
        damageMultiplier: Math.round((
          state.damageMultiplier
          + (index > 0 ? added.projectileOuterStateDamageBonus || 0 : 0)
          + (index === lastIndex ? added.projectileFarStateDamageBonus || 0 : 0)
        ) * 100) / 100,
      })));
  }
  return Object.freeze(next);
}
