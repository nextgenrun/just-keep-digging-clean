// Concrete, order-independent, bounded gameplay modifiers for Celestial talents.

import { CELESTIAL_ENGINE_CONFIG } from "./celestialEngines.js";

export const CELESTIAL_TALENT_EFFECT_CONFIG = Object.freeze({
  wayward: Object.freeze({
    extraBounces: 2,
    ricochetMatrixExtraImpacts: 2,
    extraStars: 1,
    extraImpacts: 6,
    speedBonusTilesPerSecond: 1,
    lifetimeBonusMs: 1500,
    novaLensRadiusTiles: 1,
    novaLensExtraImpacts: 3,
    fractureSupernovaImpacts: 5,
    perihelionExtraBounces: 2,
    perihelionExtraStars: 1,
    perihelionExtraImpacts: 4,
    whiteDwarfSupernovaImpacts: 6,
    whiteDwarfRadiusTiles: 1,
    whiteDwarfExtraStars: 1,
    masteryExtraImpacts: 3,
    masteryRadiusTiles: 1,
    masterySupernovaImpacts: 3,
    masteryExtraStars: 1,
    caps: Object.freeze({
      lifetimeMs: 10000,
      speedTilesPerSecond: 10,
      maxBounces: 12,
      simultaneousStars: 5,
      maxImpacts: 29,
      supernovaRadiusTiles: 5,
      supernovaMaxImpacts: 24,
    }),
  }),
  hollow: Object.freeze({
    placementBonusTiles: 2,
    spacingBonusTiles: 0.35,
    pulseRadiusTiles: 1,
    tidalRadiusTiles: 1,
    echoExtraHoles: 1,
    impactCapacityPerPulse: 2,
    reservoirPulseAtMs: 6800,
    reservoirPulseRadiusTiles: 7,
    reservoirPulseImpactCap: 9,
    reservoirLifetimeBonusMs: 1500,
    abyssalExtraHoles: 1,
    abyssalImplosionImpacts: 8,
    abyssalImplosionRadiusTiles: 3,
    collapseTempoScale: 0.82,
    collapseSpawnDelayScale: 0.72,
    singularityExtraHoles: 1,
    singularityImplosionImpacts: 12,
    singularityImplosionRadiusTiles: 4,
    chronospherePulseAtMs: 8200,
    chronospherePulseRadiusTiles: 8,
    chronospherePulseImpactCap: 10,
    chronosphereLifetimeBonusMs: 2500,
    chronosphereCapacityPerPulse: 1,
    caps: Object.freeze({
      placementTiles: 5,
      simultaneousHoles: 5,
      clusterSpacingTiles: 3,
      pulseRadiusTiles: 10,
      pulseCount: 6,
      pulseImpactCap: 15,
      maxImpacts: 90,
      lifetimeMs: 11000,
      implosionMaxImpacts: 12,
      implosionRadiusTiles: 4,
    }),
  }),
  rage: Object.freeze({
    furyCoreDamageBonus: 0.25,
    rendingRangeBonusTiles: 2,
    unburdenedDurationMs: 1500,
    burningResolveDamageBonus: 0.25,
    bloodrushRangeBonusTiles: 2,
    lastingFuryDurationMs: 1500,
    worldbreakerDamageBonus: 0.5,
    overclockRangeBonusTiles: 2,
    limitBreakSideLanes: 1,
    undyingDurationMs: 2000,
    caps: Object.freeze({
      lifetimeMs: 11000,
      projectileRangeTiles: 12,
      projectileDamageMultiplier: 2,
      projectileSideLanes: 1,
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
  }
  if (owned.has("wayward-extra-star")) next.simultaneousStars += cfg.extraStars;
  if (owned.has("wayward-impact-capacity")) next.maxImpacts += cfg.extraImpacts;
  if (owned.has("wayward-speed")) next.speedTilesPerSecond += cfg.speedBonusTilesPerSecond;
  if (owned.has("wayward-lifetime")) next.lifetimeMs += cfg.lifetimeBonusMs;
  if (owned.has("wayward-supernova-radius")) {
    next.supernovaRadiusTiles += cfg.novaLensRadiusTiles;
    next.supernovaMaxImpacts += cfg.novaLensExtraImpacts;
  }
  if (owned.has("wayward-fracture-capacity")) {
    next.supernovaMaxImpacts += cfg.fractureSupernovaImpacts;
  }
  if (owned.has("wayward-perihelion-mastery")) {
    next.maxBounces += cfg.perihelionExtraBounces;
    next.simultaneousStars += cfg.perihelionExtraStars;
    next.maxImpacts += cfg.perihelionExtraImpacts;
  }
  if (owned.has("wayward-white-dwarf-mastery")) {
    next.supernovaMaxImpacts += cfg.whiteDwarfSupernovaImpacts;
    next.supernovaRadiusTiles += cfg.whiteDwarfRadiusTiles;
    next.simultaneousStars += cfg.whiteDwarfExtraStars;
  }
  if (owned.has("wayward-supernova-mastery")) {
    next.maxImpacts += cfg.masteryExtraImpacts;
    next.supernovaRadiusTiles += cfg.masteryRadiusTiles;
    next.supernovaMaxImpacts += cfg.masterySupernovaImpacts;
    next.simultaneousStars += cfg.masteryExtraStars;
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
  next.supernovaRadiusTiles = clamp(
    next.supernovaRadiusTiles, base.supernovaRadiusTiles, caps.supernovaRadiusTiles,
  );
  next.supernovaMaxImpacts = clamp(
    next.supernovaMaxImpacts,
    base.supernovaMaxImpacts,
    caps.supernovaMaxImpacts,
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
    pulseRadii = pulseRadii.map(radius => radius + cfg.tidalRadiusTiles);
  }
  if (owned.has("hollow-impact-capacity")) {
    pulseImpactCaps = pulseImpactCaps.map(value => value + cfg.impactCapacityPerPulse);
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
  if (owned.has("rage-damage-i")) {
    next.projectileDamageMultiplier += cfg.furyCoreDamageBonus;
  }
  if (owned.has("rage-speed-i")) next.projectileRangeTiles += cfg.rendingRangeBonusTiles;
  if (owned.has("rage-duration-i")) next.lifetimeMs += cfg.unburdenedDurationMs;
  if (owned.has("rage-damage-ii")) {
    next.projectileDamageMultiplier += cfg.burningResolveDamageBonus;
  }
  if (owned.has("rage-speed-ii")) next.projectileRangeTiles += cfg.bloodrushRangeBonusTiles;
  if (owned.has("rage-duration-ii")) next.lifetimeMs += cfg.lastingFuryDurationMs;
  if (owned.has("rage-damage-capstone")) {
    next.projectileDamageMultiplier += cfg.worldbreakerDamageBonus;
  }
  if (owned.has("rage-speed-bridge")) {
    next.projectileRangeTiles += cfg.overclockRangeBonusTiles;
  }
  if (owned.has("rage-limit-break")) {
    next.projectileSideLanes += cfg.limitBreakSideLanes;
  }
  if (owned.has("rage-duration-capstone")) next.lifetimeMs += cfg.undyingDurationMs;
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
  return Object.freeze(next);
}

export function resolveCelestialTalentEngineDefinition(engineId, effectIds = []) {
  const base = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  if (!base) return null;
  const owned = effectSet(effectIds);
  if (engineId === "wayward-star") return resolveWayward(base, owned);
  if (engineId === "hollow-sun") return resolveHollow(base, owned);
  if (engineId === "comet-engine") return resolveRage(base, owned);
  return Object.freeze({ ...base });
}
