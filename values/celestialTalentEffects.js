// Concrete, order-independent, bounded gameplay modifiers for Celestial talents.

import { CELESTIAL_ENGINE_CONFIG } from "./celestialEngines.js";

export const CELESTIAL_TALENT_EFFECT_CONFIG = Object.freeze({
  wayward: Object.freeze({
    extraBounces: 2,
    extraRedirects: 1,
    extraImpacts: 6,
    speedBonusTilesPerSecond: 0.8,
    lifetimeBonusMs: 1000,
    novaLensRadiusTiles: 1,
    fractureExtraImpacts: 4,
    perihelionExtraBounces: 2,
    perihelionExtraRedirects: 1,
    whiteDwarfExtraImpacts: 6,
    whiteDwarfRadiusTiles: 1,
    masteryExtraImpacts: 4,
    masteryRadiusTiles: 1,
    caps: Object.freeze({
      lifetimeMs: 15000,
      speedTilesPerSecond: 10,
      maxBounces: 16,
      maxRedirects: 6,
      maxImpacts: 48,
      supernovaRadiusTiles: 6,
    }),
  }),
  hollow: Object.freeze({
    placementBonusTiles: 1,
    pulseRadiusTiles: 1,
    tidalRadiusTiles: 1,
    extraPulseAtMs: 3400,
    extraPulseRadiusTiles: 5,
    extraImpacts: 8,
    reservoirExtraImpacts: 6,
    pulseTempoScale: 0.78,
    chronosphereTempoScale: 0.82,
    chronosphereExtraImpacts: 4,
    abyssalExtraImpacts: 4,
    abyssalImplosionImpacts: 4,
    abyssalImplosionRadiusTiles: 1,
    masteryExtraImpacts: 6,
    masteryImplosionRadiusTiles: 2,
    caps: Object.freeze({
      placementTiles: 4,
      pulseRadiusTiles: 7,
      pulseCount: 4,
      maxImpacts: 48,
      lifetimeMs: 5200,
      implosionMaxImpacts: 8,
      implosionRadiusTiles: 3,
    }),
  }),
  comet: Object.freeze({
    extraTravelTiles: 4,
    riderSpeedBonusPxPerSecond: 90,
    extraImpacts: 6,
    ignitionSpeedTilesPerSecond: 1,
    fractureExtraImpacts: 3,
    longburnLifetimeMs: 300,
    wideWakeEveryTiles: 2,
    aphelionTravelTiles: 3,
    aphelionSpeedTilesPerSecond: 1,
    aphelionExtraImpacts: 3,
    shockfrontTravelTiles: 1,
    shockfrontExtraImpacts: 5,
    masterySpeedTilesPerSecond: 2,
    masterySideBurstEveryTiles: 2,
    masteryLifetimeBonusMs: 250,
    caps: Object.freeze({
      lifetimeMs: 2600,
      maxTravelTiles: 20,
      maxImpacts: 36,
      speedTilesPerSecond: 13,
      rideSpeedPxPerSecond: 600,
    }),
  }),
});

function effectSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolveWayward(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.wayward;
  const next = { ...base };
  if (owned.has("wayward-extra-bounces")) next.maxBounces += cfg.extraBounces;
  if (owned.has("wayward-extra-redirect")) next.maxRedirects += cfg.extraRedirects;
  if (owned.has("wayward-impact-capacity")) next.maxImpacts += cfg.extraImpacts;
  if (owned.has("wayward-speed")) next.speedTilesPerSecond += cfg.speedBonusTilesPerSecond;
  if (owned.has("wayward-lifetime")) next.lifetimeMs += cfg.lifetimeBonusMs;
  if (owned.has("wayward-supernova-radius")) {
    next.supernovaRadiusTiles += cfg.novaLensRadiusTiles;
  }
  if (owned.has("wayward-fracture-capacity")) next.maxImpacts += cfg.fractureExtraImpacts;
  if (owned.has("wayward-perihelion-mastery")) {
    next.maxBounces += cfg.perihelionExtraBounces;
    next.maxRedirects += cfg.perihelionExtraRedirects;
  }
  if (owned.has("wayward-white-dwarf-mastery")) {
    next.maxImpacts += cfg.whiteDwarfExtraImpacts;
    next.supernovaRadiusTiles += cfg.whiteDwarfRadiusTiles;
  }
  if (owned.has("wayward-supernova-mastery")) {
    next.maxImpacts += cfg.masteryExtraImpacts;
    next.supernovaRadiusTiles += cfg.masteryRadiusTiles;
  }
  const caps = cfg.caps;
  next.lifetimeMs = clamp(next.lifetimeMs, base.lifetimeMs, caps.lifetimeMs);
  next.speedTilesPerSecond = clamp(
    next.speedTilesPerSecond, base.speedTilesPerSecond, caps.speedTilesPerSecond,
  );
  next.maxBounces = clamp(next.maxBounces, base.maxBounces, caps.maxBounces);
  next.maxRedirects = clamp(next.maxRedirects, base.maxRedirects, caps.maxRedirects);
  next.maxImpacts = clamp(next.maxImpacts, base.maxImpacts, caps.maxImpacts);
  next.supernovaRadiusTiles = clamp(
    next.supernovaRadiusTiles, base.supernovaRadiusTiles, caps.supernovaRadiusTiles,
  );
  return Object.freeze(next);
}

function resolveHollow(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.hollow;
  const next = { ...base };
  let pulseTimes = [...base.pulseTimesMs];
  let pulseRadii = [...base.pulseRadiiTiles];
  let tempoScale = 1;
  let implosionMaxImpacts = Number(base.implosionMaxImpacts) || 0;
  let implosionRadiusTiles = Number(base.implosionRadiusTiles) || 0;

  if (owned.has("hollow-placement-range")) next.placementTiles += cfg.placementBonusTiles;
  if (owned.has("hollow-extra-pulse") && pulseTimes.length < cfg.caps.pulseCount) {
    pulseTimes.push(cfg.extraPulseAtMs);
    pulseRadii.push(cfg.extraPulseRadiusTiles);
  }
  if (owned.has("hollow-pulse-radius")) {
    pulseRadii = pulseRadii.map(radius => radius + cfg.pulseRadiusTiles);
  }
  if (owned.has("hollow-tidal-radius")) {
    pulseRadii = pulseRadii.map(radius => radius + cfg.tidalRadiusTiles);
  }
  if (owned.has("hollow-impact-capacity")) next.maxImpacts += cfg.extraImpacts;
  if (owned.has("hollow-reservoir-capacity")) next.maxImpacts += cfg.reservoirExtraImpacts;
  if (owned.has("hollow-pulse-tempo")) tempoScale *= cfg.pulseTempoScale;
  if (owned.has("hollow-abyssal-mastery")) {
    next.maxImpacts += cfg.abyssalExtraImpacts;
    implosionMaxImpacts = Math.max(implosionMaxImpacts, cfg.abyssalImplosionImpacts);
    implosionRadiusTiles = Math.max(
      implosionRadiusTiles, cfg.abyssalImplosionRadiusTiles,
    );
  }
  if (owned.has("hollow-chronosphere-mastery")) {
    tempoScale *= cfg.chronosphereTempoScale;
    next.maxImpacts += cfg.chronosphereExtraImpacts;
  }
  if (owned.has("hollow-implosion-mastery")) {
    implosionMaxImpacts = Math.max(implosionMaxImpacts, cfg.masteryExtraImpacts);
    implosionRadiusTiles = Math.max(
      implosionRadiusTiles, cfg.masteryImplosionRadiusTiles,
    );
  }

  pulseTimes = pulseTimes.map(time => Math.round(time * tempoScale));
  pulseRadii = pulseRadii.map(radius => clamp(
    radius, 0, cfg.caps.pulseRadiusTiles,
  ));
  next.placementTiles = clamp(next.placementTiles, base.placementTiles, cfg.caps.placementTiles);
  next.maxImpacts = clamp(next.maxImpacts, base.maxImpacts, cfg.caps.maxImpacts);
  next.implosionMaxImpacts = clamp(
    implosionMaxImpacts, 0, cfg.caps.implosionMaxImpacts,
  );
  next.implosionRadiusTiles = clamp(
    implosionRadiusTiles, 0, cfg.caps.implosionRadiusTiles,
  );
  next.pulseTimesMs = Object.freeze(pulseTimes);
  next.pulseRadiiTiles = Object.freeze(pulseRadii);
  next.lifetimeMs = clamp(Math.max(
    pulseTimes.at(-1) + CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
    Math.round(base.lifetimeMs * tempoScale),
  ), CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs, cfg.caps.lifetimeMs);
  return Object.freeze(next);
}

function resolveComet(base, owned) {
  const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.comet;
  const next = { ...base };
  if (owned.has("comet-travel-capacity")) next.maxTravelTiles += cfg.extraTravelTiles;
  if (owned.has("comet-ride-control")) {
    next.rideSpeedPxPerSecond += cfg.riderSpeedBonusPxPerSecond;
  }
  if (owned.has("comet-impact-capacity")) next.maxImpacts += cfg.extraImpacts;
  if (owned.has("comet-ignition-speed")) {
    next.speedTilesPerSecond += cfg.ignitionSpeedTilesPerSecond;
  }
  if (owned.has("comet-fracture-capacity")) next.maxImpacts += cfg.fractureExtraImpacts;
  if (owned.has("comet-longburn-lifetime")) next.lifetimeMs += cfg.longburnLifetimeMs;
  if (owned.has("comet-wide-wake-pattern")) {
    next.sideBurstEveryTiles = Math.min(next.sideBurstEveryTiles, cfg.wideWakeEveryTiles);
  }
  if (owned.has("comet-aphelion-mastery")) {
    next.maxTravelTiles += cfg.aphelionTravelTiles;
    next.speedTilesPerSecond += cfg.aphelionSpeedTilesPerSecond;
    next.maxImpacts += cfg.aphelionExtraImpacts;
  }
  if (owned.has("comet-shockfront-mastery")) {
    next.maxTravelTiles += cfg.shockfrontTravelTiles;
    next.maxImpacts += cfg.shockfrontExtraImpacts;
  }
  if (owned.has("comet-drive-mastery")) {
    next.speedTilesPerSecond += cfg.masterySpeedTilesPerSecond;
    next.sideBurstEveryTiles = Math.min(
      next.sideBurstEveryTiles, cfg.masterySideBurstEveryTiles,
    );
    next.lifetimeMs += cfg.masteryLifetimeBonusMs;
  }
  const caps = cfg.caps;
  next.lifetimeMs = clamp(next.lifetimeMs, base.lifetimeMs, caps.lifetimeMs);
  next.maxTravelTiles = clamp(next.maxTravelTiles, base.maxTravelTiles, caps.maxTravelTiles);
  next.maxImpacts = clamp(next.maxImpacts, base.maxImpacts, caps.maxImpacts);
  next.speedTilesPerSecond = clamp(
    next.speedTilesPerSecond, base.speedTilesPerSecond, caps.speedTilesPerSecond,
  );
  next.rideSpeedPxPerSecond = clamp(
    next.rideSpeedPxPerSecond, base.rideSpeedPxPerSecond, caps.rideSpeedPxPerSecond,
  );
  return Object.freeze(next);
}

export function resolveCelestialTalentEngineDefinition(engineId, effectIds = []) {
  const base = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  if (!base) return null;
  const owned = effectSet(effectIds);
  if (engineId === "wayward-star") return resolveWayward(base, owned);
  if (engineId === "hollow-sun") return resolveHollow(base, owned);
  if (engineId === "comet-engine") return resolveComet(base, owned);
  return Object.freeze({ ...base });
}
