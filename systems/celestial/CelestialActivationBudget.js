import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";

export class CelestialActivationBudget {
  constructor(engineId, activationId, startedAtMs, definitionOverride = null) {
    const engine = definitionOverride || CELESTIAL_ENGINE_CONFIG.engines[engineId];
    if (!engine) throw new Error(`Unknown Celestial Engine: ${engineId}`);
    this.engineId = engineId;
    this.activationId = String(activationId || "");
    this.startedAtMs = Math.max(0, Number(startedAtMs) || 0);
    this.lifetimeMs = engine.lifetimeMs;
    this.maxImpacts = engine.maxImpacts;
    this.maxBounces = engine.maxBounces || 0;
    this.maxRedirects = engine.maxRedirects || 0;
    this.impacts = 0;
    this.bounces = 0;
    this.redirects = 0;
    this._targetKeys = new Set();
  }

  tryImpact(tx, ty) {
    if (this.impacts >= this.maxImpacts) return null;
    const targetKey = `${tx},${ty}`;
    if (this._targetKeys.has(targetKey)) return null;
    this._targetKeys.add(targetKey);
    this.impacts += 1;
    return `${this.activationId}:impact:${this.impacts}:${targetKey}`;
  }

  tryBounce() {
    if (this.maxBounces <= 0 || this.bounces >= this.maxBounces) return false;
    this.bounces += 1;
    return true;
  }

  tryRedirect() {
    if (this.maxRedirects <= 0 || this.redirects >= this.maxRedirects) return false;
    this.redirects += 1;
    return true;
  }

  isExpired(nowMs) {
    return Number(nowMs) - this.startedAtMs >= this.lifetimeMs;
  }

  isImpactCapReached() {
    return this.impacts >= this.maxImpacts;
  }

  getSnapshot(nowMs) {
    return {
      engineId: this.engineId,
      activationId: this.activationId,
      ageMs: Math.max(0, Number(nowMs) - this.startedAtMs),
      lifetimeMs: this.lifetimeMs,
      impacts: this.impacts,
      maxImpacts: this.maxImpacts,
      bounces: this.bounces,
      maxBounces: this.maxBounces,
      redirects: this.redirects,
      maxRedirects: this.maxRedirects,
      uniqueTargets: this._targetKeys.size,
    };
  }
}

export function resolveCardinalDirection(aim, facingRight = true) {
  const x = Number(aim?.x) || 0;
  const y = Number(aim?.y) || 0;
  if (Math.abs(y) > Math.abs(x)) return { x: 0, y: y < 0 ? -1 : 1 };
  if (Math.abs(x) > 0) return { x: x < 0 ? -1 : 1, y: 0 };
  return { x: facingRight ? 1 : -1, y: 0 };
}

export function enumerateDiscTiles(center, radiusTiles) {
  const radius = Math.max(0, Math.floor(Number(radiusTiles) || 0));
  const tiles = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > radius * radius) continue;
      tiles.push({
        tx: center.tx + dx,
        ty: center.ty + dy,
        distanceSq,
      });
    }
  }
  return tiles.sort((a, b) => a.distanceSq - b.distanceSq || a.ty - b.ty || a.tx - b.tx);
}

export function enumerateExpandingPulseTiles(center, radiusTiles, previousRadiusTiles = 0) {
  const previousRadius = Math.max(0, Math.floor(Number(previousRadiusTiles) || 0));
  const previousRadiusSq = previousRadius * previousRadius;
  return enumerateDiscTiles(center, radiusTiles).sort((a, b) => {
    const aInNewBand = a.distanceSq > previousRadiusSq;
    const bInNewBand = b.distanceSq > previousRadiusSq;
    if (aInNewBand !== bInNewBand) return aInNewBand ? -1 : 1;
    return b.distanceSq - a.distanceSq || a.ty - b.ty || a.tx - b.tx;
  });
}

export function getPerpendicularDirections(direction) {
  return [
    { x: -direction.y, y: direction.x },
    { x: direction.y, y: -direction.x },
  ];
}
