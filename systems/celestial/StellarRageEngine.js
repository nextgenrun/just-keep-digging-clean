import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { StellarLanceVfx } from "./StellarLanceVfx.js?rev=20260905-cinder-contact";
import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";
import { resolveStellarLanceTravel, resolveStellarLanceHit } from "./stellarLanceTravel.js";

const roundHundredth = value => Math.round(value * 100) / 100;

/** Save-compatible runtime for the player-facing Stellar Lance projectile buff. */
export class StellarRageEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride
      || CELESTIAL_ENGINE_CONFIG.engines[this.budget.engineId];
    this.active = true;
    this.empowered = true;
    this.finishing = false;
    this.shotsFired = 0;
    this.projectileImpacts = 0;
    this.projectileDestroyed = 0;
    this.storedBreakCharge = 0;
    this.earnedLifetimeMs = 0;
    this.lastConsumedBreakCharge = 0;
    this.lastProjectilePalette = null;
    this.paletteHistory = [];
    this.launchHistory = [];
    this.random = options.random || Math.random;
    this.projectiles = new Set();
    this.vfx = new StellarLanceVfx({
      scene: this.scene,
      assetKey: this.assetKey,
      projectileAssetKeys: this.projectileAssetKeys,
      impactAssetKey: this.impactAssetKey,
      definition: this.definition,
      passive: options.passive === true,
      tileSize: this.tileSize,
    });
    this._createVisual();
  }

  /** The retired spinning core/aura is deliberately absent from the player. */
  _createVisual() {
    this.playerVisualCount = 0;
  }

  update(nowMs) {
    if (!this.active || this.finishing) return;
    const ageMs = Math.max(0, Number(nowMs) - this.budget.startedAtMs);
    if (ageMs >= this._getEffectiveLifetimeMs()) this._finish(nowMs);
  }

  launchProjectile(projectile) {
    if (!this.active || !this.empowered || !projectile) return false;
    this.shotsFired += 1;
    this.lastConsumedBreakCharge = this.storedBreakCharge;
    this.storedBreakCharge = 0;
    this.projectileImpacts += Math.max(0, projectile.impactedCount || 0);
    this.projectileDestroyed += Math.max(0, projectile.destroyedCount || 0);
    const destroyed = Math.max(0, projectile.destroyedCount || 0);
    this.storedBreakCharge = Math.min(
      Math.max(0, Number(this.definition.breakChargeMaximum) || 0),
      destroyed * Math.max(0, Number(this.definition.breakChargePerDestroyedTile) || 0),
    );
    this.earnedLifetimeMs = Math.min(
      Math.max(0, Number(this.definition.lifetimeGainCapMs) || 0),
      this.earnedLifetimeMs
        + destroyed * Math.max(0, Number(this.definition.lifetimeGainPerDestroyedTileMs) || 0),
    );
    const origin = { ...(projectile.originWorld || this.getAnchor()) };
    const normalCount = Math.min(C.normalPaletteCount, this.vfx.paletteCount);
    const rare = this.vfx.paletteCount > C.rarePaletteIndex && this.random() < C.rareChance;
    const paletteIndex = rare ? C.rarePaletteIndex : (this.shotsFired - 1) % normalCount;
    this.lastProjectilePalette = this.vfx.getPalette(paletteIndex).id;
    this.paletteHistory.push(this.lastProjectilePalette);
    if (this.paletteHistory.length > C.historyLimit) this.paletteHistory.shift();
    this.launchHistory.push({
      shot: this.shotsFired, origin, originSource: projectile.originSource || "fallback",
      palette: this.lastProjectilePalette, releasedAtMs: projectile.releasedAtMs,
      releaseFrame: projectile.releaseFrame, contactPose: projectile.contactPose,
      contactEvent: projectile.contactEvent,
    });
    if (this.launchHistory.length > C.historyLimit) this.launchHistory.shift();
    const visualPaths = projectile.visualPaths?.length > 0
      ? projectile.visualPaths
      : (projectile.endTiles || [projectile.targetTile]).map(endTile => ({
          lane: endTile?.lane || 0,
          transitions: [],
          endTile,
        }));

    const travels = new Map();
    for (const path of visualPaths) {
      if (!path?.endTile) continue;
      const travel = resolveStellarLanceTravel(origin, path, projectile.direction, this.tileSize);
      travels.set(Number(path.lane) || 0, travel);
      const sprite = this._createProjectileVisual(origin, travel.angle, paletteIndex);
      this.projectiles.add(sprite);
      this._launchVisualPath(sprite, travel);
    }
    for (const hit of projectile.hits || []) {
      if (hit.result && hit.result.success !== true) continue;
      const travel = travels.get(Number(hit.lane) || 0);
      if (travel) this._spawnImpact(hit, travel, paletteIndex);
    }
    return true;
  }

  _createProjectileVisual(anchor, angle, paletteIndex) {
    const sprite = this.scene.add.image(
      anchor.x,
      anchor.y,
      this.vfx.getProjectileAssetKey(paletteIndex),
      this.vfx.getProjectileFrame(paletteIndex),
    )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + 2);
    sprite.angle = angle;
    sprite.celestialPaletteIndex = paletteIndex;
    this.vfx.applyState(sprite);
    return sprite;
  }

  _launchVisualPath(sprite, travel) {
    // The core keeps full opacity and fixed size; only separate echoes fade.
    this.vfx.trackTravel(sprite);
    this.scene.tweens.add({
      targets: sprite, x: travel.end.x, y: travel.end.y,
      duration: travel.durationMs, ease: "Linear",
      onUpdate: () => this.vfx.trackTravel(sprite),
      onComplete: () => this._releaseProjectile(sprite),
    });
  }

  _getTravelMs(distance) {
    return distance * this.tileSize / C.speedPxPerSecond * 1000;
  }

  _spawnImpact(hit, travel, paletteIndex) {
    const contact = resolveStellarLanceHit(travel, hit, this.tileSize);
    this.vfx.spawnImpact({ ...hit, worldPoint: contact.worldPoint },
      paletteIndex, contact.delayMs, travel.angle);
  }

  _releaseProjectile(projectile) {
    this.projectiles.delete(projectile);
    this.scene.tweens?.killTweensOf?.(projectile);
    projectile?.destroy?.();
  }

  getBuffSnapshot(nowMs) {
    const currentMs = Number.isFinite(Number(nowMs))
      ? Number(nowMs)
      : this.budget.startedAtMs;
    const ageMs = Math.max(0, currentMs - this.budget.startedAtMs);
    const lifetimeMs = this._getEffectiveLifetimeMs();
    const remainingMs = Math.max(0, lifetimeMs - ageMs);
    const empowered = this.empowered && ageMs < lifetimeMs;
    const nextShot = this.shotsFired + 1;
    const resonantEvery = Math.max(0, Math.floor(Number(this.definition.resonantEveryShots) || 0));
    const resonantReady = resonantEvery > 0 && nextShot % resonantEvery === 0;
    const finalWindow = empowered
      && Number(this.definition.finalWindowMs) > 0
      && remainingMs <= Number(this.definition.finalWindowMs);
    const projectileDamageMultiplier = roundHundredth(
      this.definition.projectileDamageMultiplier
        + this.storedBreakCharge
        + (resonantReady ? Number(this.definition.resonantDamageBonus) || 0 : 0),
    );
    const projectileSideLanes = this.definition.projectileSideLanes
      + (resonantReady ? Math.max(0, Number(this.definition.resonantSideLanes) || 0) : 0)
      + (finalWindow ? Math.max(0, Number(this.definition.finalWindowSideLanes) || 0) : 0);
    const states = this.definition.projectileStates || [];
    const maximumStateDamage = states.reduce(
      (maximum, state) => Math.max(maximum, Number(state.damageMultiplier) || 1),
      1,
    );
    const vfx = this.vfx?.getSnapshot?.() || {};
    return {
      active: empowered,
      empowered,
      projectileEnabled: empowered && this.definition.projectileEnabled === true,
      engineId: this.budget.engineId,
      activationId: this.budget.activationId,
      ageMs,
      lifetimeMs,
      remainingMs,
      impacts: this.projectileImpacts,
      maxImpacts: 0,
      bounces: 0,
      maxBounces: 0,
      redirects: 0,
      maxRedirects: 0,
      uniqueTargets: 0,
      projectileInfiniteRange: this.definition.projectileInfiniteRange === true,
      projectileRangeTiles: this.definition.projectileRangeTiles,
      projectileSafetyMaxTiles: this.definition.projectileSafetyMaxTiles,
      projectileDamageMultiplier,
      projectileMaximumDamageMultiplier: roundHundredth(
        projectileDamageMultiplier * maximumStateDamage,
      ),
      projectileStates: states,
      projectileStateCount: states.length,
      projectileSideLanes,
      projectilePassesGeodeWalls: this.definition.projectilePassesGeodeWalls,
      shotsFired: this.shotsFired,
      projectileImpacts: this.projectileImpacts,
      projectileDestroyed: this.projectileDestroyed,
      storedBreakCharge: roundHundredth(this.storedBreakCharge),
      lastConsumedBreakCharge: roundHundredth(this.lastConsumedBreakCharge),
      earnedLifetimeMs: this.earnedLifetimeMs,
      resonantReady,
      nextShot,
      finalWindow,
      playerVisualCount: this.playerVisualCount,
      liveVfxCount: vfx.liveVfxCount || 0,
      liveWakes: vfx.liveWakes || 0,
      wakeCount: vfx.wakeCount || 0,
      launchFlashCount: vfx.launchFlashCount || 0,
      stateBurstCount: vfx.stateBurstCount || 0,
      scheduledImpactCount: vfx.scheduledImpactCount || 0,
      impactMomentCount: vfx.impactMomentCount || 0,
      contactPresentation: { count: vfx.contacts || 0, lastContact: vfx.lastContact || null },
      projectilePaletteCycle: vfx.paletteIds || [],
      lastProjectilePalette: this.lastProjectilePalette,
      paletteHistory: [...(this.paletteHistory || [])],
      liveProjectileCount: this.projectiles.size,
      projectileSpeedPxPerSecond: C.speedPxPerSecond,
      launchHistory: this.launchHistory.map(entry => ({ ...entry })),
    };
  }

  getSnapshot(nowMs) {
    return this.getBuffSnapshot(nowMs);
  }

  _getEffectiveLifetimeMs() {
    return Math.max(1, Number(this.definition.lifetimeMs) || 1)
      + Math.max(0, Number(this.earnedLifetimeMs) || 0);
  }

  _finish(nowMs) {
    if (!this.active || this.finishing) return;
    this.finishing = true;
    this.empowered = false;
    this._complete(nowMs);
  }

  _complete(nowMs) {
    if (!this.active) return;
    const health = this.getBuffSnapshot(nowMs);
    this.active = false;
    this._destroyVisual();
    this.onComplete?.("projectile-buff-ended", health);
  }

  _destroyVisual() {
    for (const projectile of this.projectiles || []) {
      this.scene.tweens?.killTweensOf?.(projectile);
      projectile.destroy?.();
    }
    this.projectiles?.clear?.();
    this.vfx?.destroy?.();
  }

  destroy() {
    this.active = false;
    this.empowered = false;
    this._destroyVisual();
  }
}
