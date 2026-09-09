// Star Points strengthen an owned node; they never replace its Talent Point unlock.

export const CELESTIAL_TALENT_RANK_CONFIG = Object.freeze({
  maxRank: 3,
  rootUpgradeCost: 100,
  costMultipliers: Object.freeze([0, 1, 2]),
  legacyPaidRank: 2,
  hollowPulseRadiusCapTiles: 10,
});

const bonus = (stats, description) => Object.freeze({
  stats: Object.freeze(stats),
  description,
});

// Each entry is the added benefit of ONE paid rank. Entity counts stay bounded:
// extra-star, extra-hole and extra-lane nodes improve their hits at higher ranks.
export const CELESTIAL_TALENT_RANK_BONUSES = Object.freeze({
  "wayward-star-root": bonus({ maxImpacts: 1 },
    "Each star can hit 1 more block."),
  "wayward-stellar-bearings": bonus({ bounceSpeedMultiplier: 0.04 },
    "Each bounce adds another 4% travel speed."),
  "wayward-ricochet-matrix": bonus({ maxBounces: 1, seekRadiusTiles: 0.5 },
    "Stars gain 1 bounce and look farther for their next fresh block."),
  "wayward-nova-lens": bonus({ returnSpeedTilesPerSecond: 0.6 },
    "Stars fly home 0.6 tiles per second faster."),
  "wayward-echo-orbit": bonus({ maxBounces: 1 },
    "The pursuit route gains 1 more bounce."),
  "wayward-vector-command": bonus({ maxImpacts: 1 },
    "Every star can hit 1 more block."),
  "wayward-fracture-bloom": bonus({ maxImpacts: 1 },
    "A returning Star can graze 1 more block."),
  "wayward-perihelion-loop": bonus({ maxBounces: 1, maxImpacts: 2 },
    "Each star gains 1 bounce and can hit 2 more blocks."),
  "wayward-impact-lattice": bonus({ maxImpacts: 1 },
    "Every star can hit 1 more block."),
  "wayward-supernova-core": bonus({ seekRadiusTiles: 1 },
    "Stars search 1 tile farther for a fresh ricochet target."),
  "wayward-white-dwarf-shell": bonus({ returnSpeedTilesPerSecond: 0.4, maxImpacts: 1 },
    "Returning Stars fly faster and can graze 1 more block."),
  "wayward-homebound-apex": bonus({
    companionImpactCooldownMs: -450,
    companionSpeedTilesPerSecond: 0.18,
    companionDamageScale: 0.05,
  }, "The companion bounces faster, chips harder, and attacks more often."),
  "hollow-sun-root": bonus({ pulseImpactBonus: 1 },
    "Every pulse can hit 1 more block."),
  "hollow-orbit-anchor": bonus({ softFollowSpeedTilesPerSecond: 0.2, clusterSpacingTiles: 0.125 },
    "The cluster follows faster and holds its formation a little wider."),
  "hollow-gravity-well": bonus({ pulseRadiusBonus: 0.5 },
    "Every pulse reaches 0.5 tile farther."),
  "hollow-echo-seed": bonus({ lastPulseImpactBonus: 1 },
    "The last pulse from every hole can hit 1 more block."),
  "hollow-tidal-lens": bonus({ digDriftStepTiles: 0.08, softFollowSpeedTilesPerSecond: 0.15 },
    "Punches push the cluster farther and it catches up faster."),
  "hollow-event-horizon": bonus({ controlPulseImpactCap: 1 },
    "Each commanded pulse can touch 1 more block."),
  "hollow-dark-reservoir": bonus({ lifetimeMs: 250, lastPulseImpactBonus: 1 },
    "Holes last 0.25 second longer and their last pulse hits 1 more block."),
  "hollow-abyssal-field": bonus({ implosionMaxImpacts: 2, implosionRadiusTiles: 0.5 },
    "The final implosion reaches 0.5 tile farther and can hit 2 more blocks."),
  "hollow-collapse-cycle": bonus({ pulseTempoScale: 0.96, spawnTempoScale: 0.94 },
    "Pulses arrive 4% sooner and holes appear 6% faster."),
  "hollow-singularity-core": bonus({ implosionMaxImpacts: 3 },
    "Each final implosion can hit 3 more blocks."),
  "hollow-chronosphere": bonus({ lifetimeMs: 500, lastPulseImpactBonus: 1 },
    "Holes last 0.5 second longer and their last pulse hits 1 more block."),
  "hollow-eternal-eclipse": bonus({
    passiveHollowPulseEveryDigs: -1,
    passiveHollowPulseImpactCap: 1,
    passiveHollowDamageScale: 0.04,
  }, "The permanent Hollow Sun pulses sooner, reaches another block, and chips harder."),
  "comet-engine-root": bonus({ projectileDamageMultiplier: 0.03 },
    "Each lance deals 3% more dig damage."),
  "comet-ignition-coil": bonus({ projectileDamageMultiplier: 0.03 },
    "Each lance deals 3% more dig damage."),
  "comet-bore-drive": bonus({ projectileOuterStateDamageBonus: 0.05 },
    "Shifted Lance forms deal another 5% damage."),
  "comet-fracture-nose": bonus({ resonantDamageBonus: 0.05 },
    "Every fourth Resonant Lance deals another 5% damage."),
  "comet-longburn-reservoir": bonus({ breakChargeMaximum: 0.08 },
    "Stored break power can boost the next Lance by another 8%."),
  "comet-rider-plating": bonus({ projectileOuterStateDamageBonus: 0.05 },
    "After 3 tiles, each lance deals 5% more damage."),
  "comet-wide-wake": bonus({ lifetimeGainCapMs: 500 },
    "Block breaks can extend the activation by another 0.5 second in total."),
  "comet-aphelion-drive": bonus({ projectileDamageMultiplier: 0.08 },
    "Each lance deals 8% more dig damage."),
  "comet-impact-wake": bonus({ projectileRangeTiles: 1 },
    "Lances travel 1 tile farther."),
  "comet-zenith-drive": bonus({ projectileDamageMultiplier: 0.04 },
    "All three lances deal 4% more dig damage."),
  "comet-shockfront": bonus({ finalWindowMs: 500 },
    "The final wide-volley window begins 0.5 second sooner."),
  "comet-echo-arsenal": bonus({
    passiveLanceRangeTiles: 1,
    passiveLanceDamageMultiplier: 0.05,
  }, "Every permanent Echo Lance travels 1 tile farther and deals 5% more dig damage."),
});

export function getCelestialTalentRank(value) {
  const rank = Number(value);
  return Number.isFinite(rank)
    ? Math.max(1, Math.min(CELESTIAL_TALENT_RANK_CONFIG.maxRank, Math.floor(rank)))
    : 1;
}

export function getCelestialTalentRankCost(node, currentRank) {
  const rank = getCelestialTalentRank(currentRank);
  if (!node || rank >= CELESTIAL_TALENT_RANK_CONFIG.maxRank) return 0;
  return (node.starsCost || CELESTIAL_TALENT_RANK_CONFIG.rootUpgradeCost)
    * CELESTIAL_TALENT_RANK_CONFIG.costMultipliers[rank];
}
