import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  STAR_SANCTUARY_CONFIG,
  isStarSanctuaryEnabled,
} from "../../values/starSanctuary.js";
import { StarConsumptionGuard } from "./StarConsumptionGuard.js";
import { resolveStarScarTerritorySite } from "./starScarTerritory.js";
import { resolveStarSanctuaryProfile } from "./starSanctuaryProfile.js";

const clamp = (value, minimum, maximum) => (
  Math.max(minimum, Math.min(maximum, value))
);

function makeEmptySnapshot(enabled, consumptionAcknowledged = false) {
  return {
    enabled,
    nearIntactStar: false,
    insideConsumedStarScar: false,
    activeRefuge: null,
    activeScar: null,
    resting: false,
    charging: false,
    restProgress: 0,
    gpRestored: 0,
    gpCap: 0,
    resourcesDepleted: false,
    consumedStarStressMultiplier: 1,
    consumptionAcknowledged,
    consumptionConfirmationPending: false,
    pendingConsumption: null,
  };
}

export class StarSanctuarySystem {
  constructor(
    worldModel,
    config = STAR_SANCTUARY_CONFIG,
    {
      enabled = isStarSanctuaryEnabled(),
      consumptionAcknowledged = false,
      territorySystem = null,
    } = {},
  ) {
    this.worldModel = worldModel;
    this.config = config;
    this.enabled = enabled === true;
    this.territorySystem = territorySystem;
    this._events = [];
    this._snapshot = makeEmptySnapshot(
      this.enabled,
      consumptionAcknowledged,
    );
    this._activeRefugeKey = "";
    this._activeScarKey = "";
    this._restingKey = "";
    this._restElapsedMs = 0;
    this._announcedChargeKey = "";
    this._nearbySiteCacheKey = "";
    this._nearbySiteCache = null;
    this._consumption = new StarConsumptionGuard(
      worldModel,
      config,
      (tx, ty) => this.getProfileAt(tx, ty),
      consumptionAcknowledged,
    );
  }

  getProfileAt(tx, ty) {
    return resolveStarSanctuaryProfile({
      tx,
      ty,
      identityIndex: this.worldModel?.getSkyTileIdentity?.(tx, ty) ?? 0,
      rarityIndex: this.worldModel?.getSkyTileRarity?.(tx, ty) ?? 0,
    }, this.config);
  }

  getScarSiteAt(tileX, tileY) {
    return resolveStarScarTerritorySite({
      worldModel: this.worldModel,
      territorySystem: this.config.scar.territoryBound
        ? this.territorySystem
        : null,
      tileX,
      tileY,
      radiusTiles: this.config.scar.radiusTiles,
      coversEntireTerritory: this.config.scar.coversEntireTerritory,
      minimumDepthOffsetTiles: this.config.scar.minimumDepthOffsetTiles,
    });
  }

  isResourceDepletedAt(tileX, tileY) {
    return Number.isFinite(tileX)
      && Number.isFinite(tileY)
      && this.enabled
      && this.config.scar.resourceDepletion?.enabled === true
      && Boolean(this.getScarSiteAt(tileX, tileY));
  }

  acknowledgeConsumptionRisk() {
    return this.enabled && this._consumption.acknowledgeRisk();
  }

  cancelConsumptionAttempt() {
    return this._consumption.cancelAttempt();
  }

  _findNearbySites(playerTile) {
    if (!playerTile || !this.worldModel) {
      return { activeRefuge: null, activeScar: null };
    }
    const canCache = this.worldModel.dugTiles instanceof Map;
    const dugTileCount = Number(this.worldModel.dugTiles?.size) || 0;
    const cacheKey = canCache
      ? [
          playerTile.tx,
          playerTile.ty,
          dugTileCount,
          Number(this.territorySystem?.stateRevision) || 0,
        ].join(":")
      : "";
    if (cacheKey && cacheKey === this._nearbySiteCacheKey) {
      return this._nearbySiteCache;
    }
    const territorySystem = this.config.scar.territoryBound
      ? this.territorySystem
      : null;
    const territoryScarSite = this.getScarSiteAt(playerTile.tx, playerTile.ty);
    const scanRadius = Math.ceil(territorySystem?.getNearestSite
      ? this.config.refuge.maximumRadiusTiles
      : Math.max(
        this.config.refuge.maximumRadiusTiles,
        this.config.scar.radiusTiles,
      ));
    let activeRefuge = null;
    let activeScar = territoryScarSite
      ? {
        ...this.getProfileAt(territoryScarSite.tx, territoryScarSite.ty),
        distanceSquared: (territoryScarSite.tx - playerTile.tx) ** 2
          + (territoryScarSite.ty - playerTile.ty) ** 2,
        territoryBound: true,
        coversEntireTerritory: this.config.scar.coversEntireTerritory === true,
      }
      : null;
    for (let offsetY = -scanRadius; offsetY <= scanRadius; offsetY += 1) {
      for (let offsetX = -scanRadius; offsetX <= scanRadius; offsetX += 1) {
        const tx = playerTile.tx + offsetX;
        const ty = playerTile.ty + offsetY;
        if (this.worldModel.inBounds?.(tx, ty) === false) continue;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        const tileType = this.worldModel.getTileType?.(tx, ty);
        if (tileType === TILE_TYPES.SKY_TILE) {
          const profile = this.getProfileAt(tx, ty);
          if (distanceSquared > profile.radiusTiles ** 2) continue;
          if (!activeRefuge || distanceSquared < activeRefuge.distanceSquared) {
            activeRefuge = { ...profile, distanceSquared };
          }
          continue;
        }
        if (territorySystem?.getNearestSite) continue;
        if (distanceSquared > this.config.scar.radiusTiles ** 2) continue;
        const source = this.worldModel.getDugTileSource?.(tx, ty);
        if (source?.type !== TILE_TYPES.SKY_TILE) continue;
        if (!activeScar || distanceSquared < activeScar.distanceSquared) {
          activeScar = {
            ...this.getProfileAt(tx, ty),
            distanceSquared,
          };
        }
      }
    }
    const result = { activeRefuge, activeScar };
    if (cacheKey) {
      this._nearbySiteCacheKey = cacheKey;
      this._nearbySiteCache = result;
    }
    return result;
  }

  _emitProximityEvents(activeRefuge, activeScar) {
    const refugeKey = activeRefuge?.key || "";
    const scarKey = activeScar?.key || "";
    if (refugeKey && refugeKey !== this._activeRefugeKey) {
      this._events.push({ type: "star-refuge-entered", profile: activeRefuge });
    }
    if (scarKey && scarKey !== this._activeScarKey) {
      this._events.push({ type: "star-scar-entered", profile: activeScar });
    }
    this._activeRefugeKey = refugeKey;
    this._activeScarKey = scarKey;
  }

  _resolveGpRestoration(deltaMs, context, activeRefuge) {
    const maximumGp = Math.max(0, Number(context.gpMaximum) || 0);
    const currentGp = Math.max(0, Number(context.gpCurrent) || 0);
    const gpCap = activeRefuge ? maximumGp * activeRefuge.gpCapRatio : 0;
    const speed = Math.max(0, Number(context.speedTilesPerSecond) || 0);
    const resting = Boolean(
      activeRefuge
      && context.gameplayActive === true
      && context.gpUnlocked === true
      && speed <= this.config.refuge.maximumRestSpeedTilesPerSecond,
    );
    const restingKey = resting ? activeRefuge.key : "";
    if (!resting || restingKey !== this._restingKey) {
      this._restElapsedMs = 0;
      this._restingKey = restingKey;
    } else {
      this._restElapsedMs += deltaMs;
    }
    if (!activeRefuge) {
      this._announcedChargeKey = "";
    }

    const restProgress = resting
      ? clamp(
        this._restElapsedMs / this.config.refuge.restWarmupMs,
        0,
        1,
      )
      : 0;
    const charging = Boolean(
      resting
      && restProgress >= 1
      && currentGp + Number.EPSILON < gpCap,
    );
    if (charging && this._announcedChargeKey !== activeRefuge.key) {
      this._announcedChargeKey = activeRefuge.key;
      this._events.push({ type: "star-refuge-charging", profile: activeRefuge });
    }

    let gpRestored = 0;
    if (charging && typeof context.restoreGemPower === "function") {
      const request = Math.min(
        gpCap - currentGp,
        activeRefuge.gpPerSecond * (deltaMs / 1000),
      );
      gpRestored = Math.max(0, Number(context.restoreGemPower(request, {
        source: "star-sanctuary",
        starKey: activeRefuge.key,
        identityId: activeRefuge.identityId,
        temperament: activeRefuge.temperamentId,
      })) || 0);
    }
    return { resting, charging, restProgress, gpRestored, gpCap };
  }

  update(deltaMs, context = {}) {
    if (!this.enabled) return this.getSnapshot();
    const elapsedMs = clamp(
      Number(deltaMs) || 0,
      0,
      this.config.maximumFrameMs,
    );
    const nowMs = Math.max(0, Number(context.nowMs) || 0);
    const consumption = this._consumption.update(nowMs, context);
    const { activeRefuge, activeScar } = this._findNearbySites(context.playerTile);
    this._emitProximityEvents(activeRefuge, activeScar);
    const gp = this._resolveGpRestoration(elapsedMs, context, activeRefuge);
    this._snapshot = {
      enabled: true,
      nearIntactStar: Boolean(activeRefuge),
      insideConsumedStarScar: Boolean(activeScar),
      activeRefuge,
      activeScar,
      ...gp,
      resourcesDepleted: Boolean(activeScar),
      consumedStarStressMultiplier: activeScar
        ? this.config.scar.panicStressMultiplier
        : 1,
      ...consumption,
    };
    return this.getSnapshot();
  }

  shouldBlockDamage({ tileX, tileY, type } = {}, nowMs = 0) {
    if (!this.enabled) return false;
    return this._consumption.shouldBlockDamage(
      { tileX, tileY, type },
      nowMs,
    );
  }

  drainEvents() {
    const events = [
      ...this._events,
      ...this._consumption.drainEvents(),
    ];
    this._events.length = 0;
    return events;
  }

  getSnapshot() {
    return { ...this._snapshot };
  }

  destroy() {
    this._events.length = 0;
    this._consumption.destroy();
    this._consumption = null;
    this._nearbySiteCacheKey = "";
    this._nearbySiteCache = null;
    this.territorySystem = null;
    this.worldModel = null;
  }
}
