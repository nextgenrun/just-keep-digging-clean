import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";

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
    this.projectiles = new Set();
    try {
      this._createVisual();
    } catch (error) {
      this.active = false;
      this.empowered = false;
      this._destroyVisual();
      throw error;
    }
  }

  _createVisual() {
    const anchor = this.getAnchor();
    const depth = CELESTIAL_ENGINE_CONFIG.fx.worldDepth;
    this.aura = this.scene.add.image(anchor.x, anchor.y, this.assetKey)
      .setDisplaySize(
        this.definition.auraDisplaySizePx,
        this.definition.auraDisplaySizePx,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(this.definition.accent)
      .setAlpha(CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraAlpha)
      .setDepth(depth - 1);
    this.core = this.scene.add.image(anchor.x, anchor.y, this.assetKey)
      .setDisplaySize(
        this.definition.displaySizePx,
        this.definition.displaySizePx,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd2a0)
      .setDepth(depth);
    this.ring = this.scene.add.circle(
      anchor.x,
      anchor.y,
      this.definition.auraDisplaySizePx * 0.52,
      this.definition.accent,
      0.035,
    ).setStrokeStyle(3, this.definition.accent, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 2)
      .setScale(0.78);
    this.scene.tweens.add({
      targets: this.aura,
      scaleX: this.aura.scaleX * CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraPulseScale,
      scaleY: this.aura.scaleY * CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraPulseScale,
      alpha: CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraAlpha * 0.5,
      duration: CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.scene.tweens.add({
      targets: this.ring,
      scale: 1.16,
      alpha: 0.16,
      duration: CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  update(nowMs, deltaMs) {
    if (!this.active || this.finishing) return;
    const anchor = this.getAnchor();
    this.aura.setPosition(anchor.x, anchor.y);
    this.core.setPosition(anchor.x, anchor.y);
    this.ring.setPosition(anchor.x, anchor.y);
    const dt = Math.min(0.05, Math.max(0, Number(deltaMs) || 0) / 1000);
    this.core.angle += CELESTIAL_ENGINE_CONFIG.fx.stellarRage.coreRotationDegPerSecond * dt;
    this.aura.angle += CELESTIAL_ENGINE_CONFIG.fx.stellarRage.auraRotationDegPerSecond * dt;
    if (this.budget.isExpired(nowMs)) this._finish(nowMs);
  }

  launchProjectile(projectile) {
    if (!this.active || !this.empowered || !projectile) return false;
    this.shotsFired += 1;
    this.projectileImpacts += Math.max(0, projectile.impactedCount || 0);
    this.projectileDestroyed += Math.max(0, projectile.destroyedCount || 0);
    const anchor = this.getAnchor();
    const fx = CELESTIAL_ENGINE_CONFIG.fx.stellarRage;
    const angle = Math.atan2(projectile.direction.y, projectile.direction.x)
      * 180 / Math.PI;
    const laneEnds = projectile.endTiles?.length > 0
      ? projectile.endTiles
      : [projectile.targetTile];

    for (const endTile of laneEnds) {
      const endX = endTile.tx * this.tileSize + this.tileSize / 2;
      const endY = endTile.ty * this.tileSize + this.tileSize / 2;
      const travelMs = Math.max(
        this.definition.projectileMinimumTravelMs,
        Math.min(
          this.definition.projectileMaximumTravelMs,
          (endTile.distance || projectile.rangeTiles)
            * this.definition.projectileTravelMsPerTile,
        ),
      );
      const sprite = this.scene.add.image(anchor.x, anchor.y, this.assetKey)
        .setDisplaySize(
          this.definition.projectileDisplaySizePx,
          this.definition.projectileDisplaySizePx,
        )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfff0b8)
        .setAlpha(fx.projectileAlpha)
        .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + 2);
      sprite.angle = angle;
      this.projectiles.add(sprite);
      this.scene.tweens.add({
        targets: sprite,
        x: endX,
        y: endY,
        alpha: 0.2,
        duration: travelMs,
        ease: "Linear",
        onComplete: () => this._releaseProjectile(sprite),
      });
    }

    for (const hit of projectile.hits || []) this._spawnImpact(hit);
    return true;
  }

  _spawnImpact(hit) {
    const fx = CELESTIAL_ENGINE_CONFIG.fx.stellarRage;
    const image = this.scene.add.image(
      hit.tx * this.tileSize + this.tileSize / 2,
      hit.ty * this.tileSize + this.tileSize / 2,
      this.assetKey,
    ).setDisplaySize(
      this.definition.projectileDisplaySizePx * fx.projectileImpactScale,
      this.definition.projectileDisplaySizePx * fx.projectileImpactScale,
    ).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(this.definition.accent)
      .setAlpha(fx.projectileImpactAlpha)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + 1);
    this.projectiles.add(image);
    this.scene.tweens.add({
      targets: image,
      scaleX: image.scaleX * 1.8,
      scaleY: image.scaleY * 1.8,
      alpha: 0,
      delay: Math.max(0, hit.distance - 1) * this.definition.projectileTravelMsPerTile,
      duration: fx.projectileImpactMs,
      ease: "Power2.out",
      onComplete: () => this._releaseProjectile(image),
    });
  }

  _releaseProjectile(projectile) {
    this.projectiles.delete(projectile);
    projectile?.destroy?.();
  }

  getBuffSnapshot(nowMs) {
    const currentMs = Number.isFinite(Number(nowMs))
      ? Number(nowMs)
      : this.budget.startedAtMs;
    const ageMs = Math.max(0, currentMs - this.budget.startedAtMs);
    const empowered = this.empowered && ageMs < this.definition.lifetimeMs;
    return {
      active: empowered,
      empowered,
      projectileEnabled: empowered && this.definition.projectileEnabled === true,
      engineId: this.budget.engineId,
      activationId: this.budget.activationId,
      ageMs,
      lifetimeMs: this.definition.lifetimeMs,
      remainingMs: Math.max(0, this.definition.lifetimeMs - ageMs),
      impacts: this.projectileImpacts,
      maxImpacts: 0,
      bounces: 0,
      maxBounces: 0,
      redirects: 0,
      maxRedirects: 0,
      uniqueTargets: 0,
      projectileRangeTiles: this.definition.projectileRangeTiles,
      projectileDamageMultiplier: this.definition.projectileDamageMultiplier,
      projectileSideLanes: this.definition.projectileSideLanes,
      projectilePassesGeodeWalls: this.definition.projectilePassesGeodeWalls,
      shotsFired: this.shotsFired,
      projectileImpacts: this.projectileImpacts,
      projectileDestroyed: this.projectileDestroyed,
    };
  }

  getSnapshot(nowMs) {
    return this.getBuffSnapshot(nowMs);
  }

  _finish(nowMs) {
    if (!this.active || this.finishing) return;
    this.finishing = true;
    this.empowered = false;
    this.scene.tweens?.killTweensOf?.(this.aura);
    this.scene.tweens?.killTweensOf?.(this.core);
    this.scene.tweens?.killTweensOf?.(this.ring);
    this.scene.tweens.add({
      targets: [this.aura, this.core, this.ring],
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: CELESTIAL_ENGINE_CONFIG.fx.finishDelayMs,
      ease: "Power2.in",
      onComplete: () => this._complete(nowMs),
    });
  }

  _complete(nowMs) {
    if (!this.active) return;
    const health = this.getBuffSnapshot(nowMs);
    this.active = false;
    this._destroyVisual();
    this.onComplete?.("projectile-buff-ended", health);
  }

  _destroyVisual() {
    this.scene.tweens?.killTweensOf?.(this.aura);
    this.scene.tweens?.killTweensOf?.(this.core);
    this.scene.tweens?.killTweensOf?.(this.ring);
    for (const projectile of this.projectiles || []) {
      this.scene.tweens?.killTweensOf?.(projectile);
      projectile.destroy?.();
    }
    this.projectiles?.clear?.();
    this.aura?.destroy();
    this.core?.destroy();
    this.ring?.destroy();
  }

  destroy() {
    this.active = false;
    this.empowered = false;
    this._destroyVisual();
  }
}
