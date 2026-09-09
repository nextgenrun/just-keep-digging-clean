// Concrete, order-independent, bounded gameplay modifiers for Celestial talents.

import { CELESTIAL_ENGINE_CONFIG } from "./celestialEngines.js";
import { applyCelestialTalentRanks } from "./celestialTalentRankEffects.js";

export const CELESTIAL_TALENT_EFFECT_CONFIG = Object.freeze({
  wayward: Object.freeze({
    extraBounces: 2,
    ricochetMatrixExtraImpacts: 2,
    extraStars: 1,
    extraImpacts: 6,
    bounceMomentumMultiplier: 0.12,
    lifetimeBonusMs: 1500,
    seekRadiusTiles: 3,
    fractureReturnImpacts: 5,
    perihelionExtraBounces: 2,
    perihelionExtraStars: 1,
    perihelionExtraImpacts: 4,
    whiteDwarfReturnImpacts: 6,
    whiteDwarfReturnSpeedBonus: 1.6,
    whiteDwarfExtraStars: 1,
    masteryExtraImpacts: 3,
    masterySeekRadiusTiles: 5,
    masteryExtraStars: 1,
    caps: Object.freeze({
      lifetimeMs: 10000,
      speedTilesPerSecond: 4,
      maxBounces: 12,
      simultaneousStars: 5,
      maxImpacts: 29,
      returnSpeedTilesPerSecond: 8,
    }),
  }),
  hollow: Object.freeze({
    placementBonusTiles: 2,
    spacingBonusTiles: 0.35,
    pulseRadiusTiles: 1,
    tidalRadiusTiles: 1,
    echoExtraHoles: 1,
    impactCapacityPerPulse: 4,
    reservoirPulseAtMs: 6800,
    reservoirPulseRadiusTiles: 7,
    reservoirPulseImpactCap: 10,
    reservoirLifetimeBonusMs: 1500,
    abyssalExtraHoles: 0,
    abyssalImplosionImpacts: 18,
    abyssalImplosionRadiusTiles: 3,
    collapseTempoScale: 0.82,
    collapseSpawnDelayScale: 0.72,
    singularityExtraHoles: 0,
    singularityImplosionImpacts: 30,
    singularityImplosionRadiusTiles: 4,
    chronospherePulseAtMs: 8200,
    chronospherePulseRadiusTiles: 8,
    chronospherePulseImpactCap: 12,
    chronosphereLifetimeBonusMs: 2500,
    chronosphereCapacityPerPulse: 2,
    anchorFollowDistanceBonusTiles: 0.75,
    tidalDigDriftStepBonusTiles: 0.16,
    tidalFollowSpeedBonusTilesPerSecond: 0.55,
    controlPulseEveryNudges: 3,
    caps: Object.freeze({
      placementTiles: 5,
      simultaneousHoles: 4,
      clusterSpacingTiles: 3,
      pulseRadiusTiles: 10,
      pulseCount: 6,
      pulseImpactCap: 24,
      maxImpacts: 80,
      lifetimeMs: 11000,
      implosionMaxImpacts: 30,
      implosionRadiusTiles: 4,
    }),
  }),
  rage: Object.freeze({
    furyCoreDamageBonus: 0.25,
    longshotOuterStateDamageBonus: 0.15,
    resonantEveryShots: 4,
    resonantSideLanes: 1,
    resonantDamageBonus: 0.1,
    breakChargePerDestroyedTile: 0.1,
    breakChargeMaximum: 0.35,
    bloodrushRangeBonusTiles: 1,
    reservoirLifetimePerDestroyedTileMs: 180,
    reservoirLifetimeCapMs: 3000,
    worldbreakerDamageBonus: 0.25,
    overclockRangeBonusTiles: 1,
    limitBreakSideLanes: 1,
    endlessVolleyWindowMs: 3000,
    endlessVolleySideLanes: 1,
    caps: Object.freeze({
      lifetimeMs: 20000,
      projectileRangeTiles: 8,
      projectileDamageMultiplier: 1.5,
      projectileSideLanes: 1,
    }),
  }),
  apex: Object.freeze({
    wayward: Object.freeze({
      displaySizePx: 46,
      speedTilesPerSecond: 1.36,
      returnSpeedTilesPerSecond: 3,
      leashTiles: 3.8,
      bouncesBeforeReturn: 4,
      impactCooldownMs: 2600,
      damageScale: 0.18,
    }),
    hollow: Object.freeze({
      displaySizePx: 58,
      followDistanceTiles: 1.4,
      followSpeedTilesPerSecond: 1.7,
      pulseEveryDigs: 4,
      pulseRadiusTiles: 1,
      pulseImpactCap: 1,
      damageScale: 0.16,
    }),
    rage: Object.freeze({
      projectileRangeTiles: 2,
      projectileDamageMultiplier: 0.25,
    }),
  }),
});

function effectSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundHundredth(value) {
  return Math.round(value * 100) / 100;
}

function resolveWayward(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.wayward;
  const next = { ...base };
  if (owned.has("wayward-extra-bounces")) {
    next.maxBounces += cfg.extraBounces;
    next.maxImpacts += cfg.ricochetMatrixExtraImpacts;
    next.seekFreshTargets = true;
    next.seekRadiusTiles = Math.max(next.seekRadiusTiles, cfg.seekRadiusTiles);
  }
  if (owned.has("wayward-extra-star")) next.simultaneousStars += cfg.extraStars;
  if (owned.has("wayward-impact-capacity")) next.maxImpacts += cfg.extraImpacts;
  if (owned.has("wayward-speed")) {
    next.bounceSpeedMultiplier += cfg.bounceMomentumMultiplier;
  }
  if (owned.has("wayward-lifetime")) {
    next.lifetimeMs += cfg.lifetimeBonusMs;
    next.maxBounces += 2;
  }
  if (owned.has("wayward-supernova-radius")) {
    next.returnToPlayer = true;
  }
  if (owned.has("wayward-fracture-capacity")) {
    next.returnToPlayer = true;
    next.returnCanImpact = true;
    next.maxImpacts += cfg.fractureReturnImpacts;
  }
  if (owned.has("wayward-perihelion-mastery")) {
    next.maxBounces += cfg.perihelionExtraBounces;
    next.simultaneousStars += cfg.perihelionExtraStars;
    next.maxImpacts += cfg.perihelionExtraImpacts;
  }
  if (owned.has("wayward-white-dwarf-mastery")) {
    next.returnToPlayer = true;
    next.returnCanImpact = true;
    next.maxImpacts += cfg.whiteDwarfReturnImpacts;
    next.returnSpeedTilesPerSecond += cfg.whiteDwarfReturnSpeedBonus;
    next.simultaneousStars += cfg.whiteDwarfExtraStars;
  }
  if (owned.has("wayward-supernova-mastery")) {
    next.maxImpacts += cfg.masteryExtraImpacts;
    next.simultaneousStars += cfg.masteryExtraStars;
    next.seekFreshTargets = true;
    next.seekRadiusTiles = Math.max(next.seekRadiusTiles, cfg.masterySeekRadiusTiles);
  }
  if (owned.has("wayward-homebound-passive")) {
    const passive = CELESTIAL_TALENT_EFFECT_CONFIG.apex.wayward;
    next.companionEnabled = true;
    next.companionDisplaySizePx = passive.displaySizePx;
    next.companionSpeedTilesPerSecond = passive.speedTilesPerSecond;
    next.companionReturnSpeedTilesPerSecond = passive.returnSpeedTilesPerSecond;
    next.companionLeashTiles = passive.leashTiles;
    next.companionBouncesBeforeReturn = passive.bouncesBeforeReturn;
    next.companionImpactCooldownMs = passive.impactCooldownMs;
    next.companionDamageScale = passive.damageScale;
  }
  const caps = cfg.caps;
  next.lifetimeMs = clamp(next.lifetimeMs, base.lifetimeMs, caps.lifetimeMs);
  next.speedTilesPerSecond = clamp(
    next.speedTilesPerSecond, base.speedTilesPerSecond, caps.speedTilesPerSecond,
  );
  next.maxBounces = clamp(next.maxBounces, base.maxBounces, caps.maxBounces);
  next.simultaneousStars = clamp(
    next.simultaneousStars,
    base.simultaneousStars,
    caps.simultaneousStars,
  );
  next.maxImpacts = clamp(next.maxImpacts, base.maxImpacts, caps.maxImpacts);
  next.returnSpeedTilesPerSecond = clamp(
    next.returnSpeedTilesPerSecond,
    base.returnSpeedTilesPerSecond,
    caps.returnSpeedTilesPerSecond,
  );
  return Object.freeze(next);
}

function resolveHollow(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.hollow;
  const next = { ...base };
  let pulseTimes = [...base.pulseTimesMs];
  let pulseRadii = [...base.pulseRadiiTiles];
  let pulseImpactCaps = [...base.pulseImpactCaps];
  let lifetimeBonusMs = 0;
  let tempoScale = 1;
  let implosionMaxImpacts = Number(base.implosionMaxImpacts) || 0;
  let implosionRadiusTiles = Number(base.implosionRadiusTiles) || 0;

  if (owned.has("hollow-placement-range")) {
    next.placementTiles += cfg.placementBonusTiles;
    next.clusterSpacingTiles += cfg.spacingBonusTiles;
    next.softFollowDistanceTiles += cfg.anchorFollowDistanceBonusTiles;
  }
  if (owned.has("hollow-extra-pulse") && pulseTimes.length < cfg.caps.pulseCount) {
    next.simultaneousHoles += cfg.echoExtraHoles;
  }
  if (owned.has("hollow-reservoir-capacity") && pulseTimes.length < cfg.caps.pulseCount) {
    pulseTimes.push(cfg.reservoirPulseAtMs);
    pulseRadii.push(cfg.reservoirPulseRadiusTiles);
    pulseImpactCaps.push(cfg.reservoirPulseImpactCap);
    lifetimeBonusMs += cfg.reservoirLifetimeBonusMs;
  }
  if (owned.has("hollow-chronosphere-mastery") && pulseTimes.length < cfg.caps.pulseCount) {
    pulseTimes.push(cfg.chronospherePulseAtMs);
    pulseRadii.push(cfg.chronospherePulseRadiusTiles);
    pulseImpactCaps.push(cfg.chronospherePulseImpactCap);
    lifetimeBonusMs += cfg.chronosphereLifetimeBonusMs;
  }
  if (owned.has("hollow-pulse-radius")) {
    pulseRadii = pulseRadii.map(radius => radius + cfg.pulseRadiusTiles);
  }
  if (owned.has("hollow-tidal-radius")) {
    next.digDriftStepTiles += cfg.tidalDigDriftStepBonusTiles;
    next.softFollowSpeedTilesPerSecond += cfg.tidalFollowSpeedBonusTilesPerSecond;
  }
  if (owned.has("hollow-impact-capacity")) {
    next.controlPulseEveryNudges = cfg.controlPulseEveryNudges;
  }
  if (owned.has("hollow-abyssal-mastery")) {
    next.simultaneousHoles += cfg.abyssalExtraHoles;
    implosionMaxImpacts = Math.max(implosionMaxImpacts, cfg.abyssalImplosionImpacts);
    implosionRadiusTiles = Math.max(
      implosionRadiusTiles, cfg.abyssalImplosionRadiusTiles,
    );
  }
  if (owned.has("hollow-collapse-pulse")) {
    tempoScale *= cfg.collapseTempoScale;
    next.clusterSpawnDelayMs *= cfg.collapseSpawnDelayScale;
  }
  if (owned.has("hollow-chronosphere-mastery")) {
    pulseImpactCaps = pulseImpactCaps.map(
      value => value + cfg.chronosphereCapacityPerPulse,
    );
  }
  if (owned.has("hollow-implosion-mastery")) {
    next.simultaneousHoles += cfg.singularityExtraHoles;
    implosionMaxImpacts = Math.max(
      implosionMaxImpacts,
      cfg.singularityImplosionImpacts,
    );
    implosionRadiusTiles = Math.max(
      implosionRadiusTiles, cfg.singularityImplosionRadiusTiles,
    );
  }
  if (owned.has("hollow-umbra-passive")) {
    const passive = CELESTIAL_TALENT_EFFECT_CONFIG.apex.hollow;
    next.passiveHollowEnabled = true;
    next.passiveHollowDisplaySizePx = passive.displaySizePx;
    next.passiveHollowFollowDistanceTiles = passive.followDistanceTiles;
    next.passiveHollowFollowSpeedTilesPerSecond = passive.followSpeedTilesPerSecond;
    next.passiveHollowPulseEveryDigs = passive.pulseEveryDigs;
    next.passiveHollowPulseRadiusTiles = passive.pulseRadiusTiles;
    next.passiveHollowPulseImpactCap = passive.pulseImpactCap;
    next.passiveHollowDamageScale = passive.damageScale;
  }

  pulseTimes = pulseTimes.map(time => Math.round(time * tempoScale));
  pulseRadii = pulseRadii.map(radius => clamp(
    radius, 0, cfg.caps.pulseRadiusTiles,
  ));
  pulseImpactCaps = pulseImpactCaps.map(value => clamp(
    value, 1, cfg.caps.pulseImpactCap,
  ));
  next.placementTiles = clamp(next.placementTiles, base.placementTiles, cfg.caps.placementTiles);
  next.simultaneousHoles = clamp(
    next.simultaneousHoles,
    base.simultaneousHoles,
    cfg.caps.simultaneousHoles,
  );
  next.clusterSpacingTiles = clamp(
    roundHundredth(next.clusterSpacingTiles),
    base.clusterSpacingTiles,
    cfg.caps.clusterSpacingTiles,
  );
  next.clusterSpawnDelayMs = Math.max(0, Math.round(next.clusterSpawnDelayMs));
  next.maxImpacts = clamp(
    pulseImpactCaps.reduce((sum, value) => sum + value, 0),
    base.maxImpacts,
    cfg.caps.maxImpacts,
  );
  next.implosionMaxImpacts = clamp(
    implosionMaxImpacts, 0, cfg.caps.implosionMaxImpacts,
  );
  next.implosionRadiusTiles = clamp(
    implosionRadiusTiles, 0, cfg.caps.implosionRadiusTiles,
  );
  next.pulseTimesMs = Object.freeze(pulseTimes);
  next.pulseRadiiTiles = Object.freeze(pulseRadii);
  next.pulseImpactCaps = Object.freeze(pulseImpactCaps);
  next.lifetimeMs = clamp(Math.max(
    pulseTimes.at(-1) + CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
    base.lifetimeMs + lifetimeBonusMs,
  ), base.lifetimeMs, cfg.caps.lifetimeMs);
  return Object.freeze(next);
}

function resolveRage(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.rage;
  const next = { ...base };
  const projectileStates = base.projectileStates.map(state => ({ ...state }));
  if (owned.has("rage-damage-i")) {
    next.projectileDamageMultiplier += cfg.furyCoreDamageBonus;
  }
  if (owned.has("rage-speed-i")) {
    projectileStates.forEach((state, index) => {
      if (index > 0) state.damageMultiplier += cfg.longshotOuterStateDamageBonus;
    });
  }
  if (owned.has("rage-duration-i")) {
    next.resonantEveryShots = cfg.resonantEveryShots;
    next.resonantSideLanes = cfg.resonantSideLanes;
    next.resonantDamageBonus = cfg.resonantDamageBonus;
  }
  if (owned.has("rage-damage-ii")) {
    next.breakChargePerDestroyedTile = cfg.breakChargePerDestroyedTile;
    next.breakChargeMaximum = cfg.breakChargeMaximum;
  }
  if (owned.has("rage-speed-ii")) next.projectileRangeTiles += cfg.bloodrushRangeBonusTiles;
  if (owned.has("rage-duration-ii")) {
    next.lifetimeGainPerDestroyedTileMs = cfg.reservoirLifetimePerDestroyedTileMs;
    next.lifetimeGainCapMs = cfg.reservoirLifetimeCapMs;
  }
  if (owned.has("rage-damage-capstone")) {
    next.projectileDamageMultiplier += cfg.worldbreakerDamageBonus;
  }
  if (owned.has("rage-speed-bridge")) next.projectileRangeTiles += cfg.overclockRangeBonusTiles;
  if (owned.has("rage-limit-break")) {
    next.projectileSideLanes += cfg.limitBreakSideLanes;
  }
  if (owned.has("rage-duration-capstone")) {
    next.finalWindowMs = cfg.endlessVolleyWindowMs;
    next.finalWindowSideLanes = cfg.endlessVolleySideLanes;
  }
  if (owned.has("rage-echo-passive")) {
    const passive = CELESTIAL_TALENT_EFFECT_CONFIG.apex.rage;
    next.passiveLanceEnabled = true;
    next.passiveLanceRangeTiles = passive.projectileRangeTiles;
    next.passiveLanceDamageMultiplier = passive.projectileDamageMultiplier;
  }
  const caps = cfg.caps;
  next.lifetimeMs = clamp(next.lifetimeMs, base.lifetimeMs, caps.lifetimeMs);
  next.projectileRangeTiles = clamp(
    next.projectileRangeTiles,
    base.projectileRangeTiles,
    caps.projectileRangeTiles,
  );
  next.projectileDamageMultiplier = clamp(
    roundHundredth(next.projectileDamageMultiplier),
    base.projectileDamageMultiplier,
    caps.projectileDamageMultiplier,
  );
  next.projectileSideLanes = clamp(
    next.projectileSideLanes,
    base.projectileSideLanes,
    caps.projectileSideLanes,
  );
  next.projectileStates = Object.freeze(
    projectileStates.map(state => Object.freeze(state)),
  );
  next.projectileInfiniteRange = false;
  return Object.freeze(next);
}

export function resolveCelestialTalentEngineDefinition(engineId, effectIds = [], nodeRanks = {}) {
  const base = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  if (!base) return null;
  const owned = effectSet(effectIds);
  if (engineId === "wayward-star") return applyCelestialTalentRanks(resolveWayward(base, owned), owned, nodeRanks);
  if (engineId === "hollow-sun") return applyCelestialTalentRanks(resolveHollow(base, owned), owned, nodeRanks);
  if (engineId === "comet-engine") return applyCelestialTalentRanks(resolveRage(base, owned), owned, nodeRanks);
  return Object.freeze({ ...base });
}
