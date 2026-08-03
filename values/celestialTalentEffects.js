// Concrete, bounded gameplay modifiers owned by purchased Celestial talent nodes.

import { CELESTIAL_ENGINE_CONFIG } from "./celestialEngines.js";

export const CELESTIAL_TALENT_EFFECT_CONFIG = Object.freeze({
  wayward: Object.freeze({
    extraBounces: 2,
    extraRedirects: 1,
    extraImpacts: 6,
    masteryExtraImpacts: 4,
    masteryRadiusTiles: 1,
  }),
  hollow: Object.freeze({
    pulseRadiusTiles: 1,
    extraImpacts: 8,
    pulseTempoScale: 0.78,
    masteryExtraImpacts: 6,
    masteryImplosionRadiusTiles: 2,
  }),
  comet: Object.freeze({
    extraTravelTiles: 4,
    riderSpeedBonusPxPerSecond: 90,
    extraImpacts: 6,
    masterySpeedTilesPerSecond: 2,
    masterySideBurstEveryTiles: 2,
    masteryLifetimeBonusMs: 250,
  }),
});

function effectSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

export function resolveCelestialTalentEngineDefinition(engineId, effectIds = []) {
  const base = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  if (!base) return null;
  const owned = effectSet(effectIds);
  const next = { ...base };

  if (engineId === "wayward-star") {
    const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.wayward;
    if (owned.has("wayward-extra-bounces")) {
      next.maxBounces += cfg.extraBounces;
    }
    if (owned.has("wayward-extra-redirect")) {
      next.maxRedirects += cfg.extraRedirects;
    }
    if (owned.has("wayward-impact-capacity")) {
      next.maxImpacts += cfg.extraImpacts;
    }
    if (owned.has("wayward-supernova-mastery")) {
      next.maxImpacts += cfg.masteryExtraImpacts;
      next.supernovaRadiusTiles += cfg.masteryRadiusTiles;
    }
  }

  if (engineId === "hollow-sun") {
    const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.hollow;
    if (owned.has("hollow-pulse-radius")) {
      next.pulseRadiiTiles = Object.freeze(
        base.pulseRadiiTiles.map(radius => radius + cfg.pulseRadiusTiles),
      );
    }
    if (owned.has("hollow-impact-capacity")) {
      next.maxImpacts += cfg.extraImpacts;
    }
    if (owned.has("hollow-pulse-tempo")) {
      next.pulseTimesMs = Object.freeze(
        base.pulseTimesMs.map(time => Math.round(time * cfg.pulseTempoScale)),
      );
      next.lifetimeMs = Math.max(
        next.pulseTimesMs.at(-1) + CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
        Math.round(base.lifetimeMs * cfg.pulseTempoScale),
      );
    }
    if (owned.has("hollow-implosion-mastery")) {
      next.implosionMaxImpacts = cfg.masteryExtraImpacts;
      next.implosionRadiusTiles = cfg.masteryImplosionRadiusTiles;
    }
  }

  if (engineId === "comet-engine") {
    const cfg = CELESTIAL_TALENT_EFFECT_CONFIG.comet;
    if (owned.has("comet-travel-capacity")) {
      next.maxTravelTiles += cfg.extraTravelTiles;
    }
    if (owned.has("comet-ride-control")) {
      next.rideSpeedPxPerSecond += cfg.riderSpeedBonusPxPerSecond;
    }
    if (owned.has("comet-impact-capacity")) {
      next.maxImpacts += cfg.extraImpacts;
    }
    if (owned.has("comet-drive-mastery")) {
      next.speedTilesPerSecond += cfg.masterySpeedTilesPerSecond;
      next.sideBurstEveryTiles = cfg.masterySideBurstEveryTiles;
      next.lifetimeMs += cfg.masteryLifetimeBonusMs;
    }
  }

  return Object.freeze(next);
}
