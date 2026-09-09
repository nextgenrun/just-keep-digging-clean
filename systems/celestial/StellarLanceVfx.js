import { CelestialContactVfx } from "./CelestialContactVfx.js";
import { CELESTIAL_PRESENTATION as P } from "../../values/celestialPresentation.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";

/** Solid Cinder shots with short, stable echoes and crisp contact flashes. */
export class StellarLanceVfx {
  constructor(options) {
    Object.assign(this, options);
    this.projectileAssetKeys = (options.projectileAssetKeys || []).filter(Boolean);
    if (!this.projectileAssetKeys.length) throw new Error("Stellar Lance requires Cinder artwork");
    this.impactAssetKey = options.impactAssetKey || this.projectileAssetKeys[0];
    this.effects = new Set();
    this.trails = new Set();
    this.travelMarks = new WeakMap();
    this.wakeCount = 0;
    this.strength = options.passive ? P.lance.passiveAlpha : 1;
    this.contacts = new CelestialContactVfx(this.scene, this.tileSize, this.strength);
    this.scheduledImpactCount = 0;
    this.impactMomentCount = 0;
    for (const key of this.projectileAssetKeys) {
      const texture = this.scene.textures?.get(key), f = C.frame;
      if (texture && !texture.has(f.name)) texture.add(f.name, 0, f.x, f.y, f.width, f.height);
    }
  }

  get paletteCount() { return this.projectileAssetKeys.length; }
  getPalette(index) { return C.palettes[Math.max(0, Number(index) || 0) % C.palettes.length]; }
  getProjectileAssetKey(index) {
    return this.projectileAssetKeys[Math.max(0, Number(index) || 0) % this.paletteCount];
  }
  getProjectileFrame(index) {
    return this.scene.textures?.get(this.getProjectileAssetKey(index))?.has(C.frame.name)
      ? C.frame.name : undefined;
  }
  applyState(sprite, _stateIndex, sizeMultiplier = 1) {
    // Active and passive cores stay solid; only their separate echoes fade.
    return sprite.setOrigin(C.originX, C.originY)
      .setDisplaySize(C.displayWidthPx * sizeMultiplier, C.displayHeightPx * sizeMultiplier)
      .setAlpha(C.alpha);
  }
  trackTravel(sprite) {
    const cfg = P.lance;
    const previous = this.travelMarks.get(sprite);
    if (previous && Math.hypot(sprite.x - previous.x, sprite.y - previous.y) < cfg.trailSpacingPx) return;
    this.travelMarks.set(sprite, { x: sprite.x, y: sprite.y });
    if (!previous || this.trails.size >= cfg.trailMaxLive) return;
    const index = sprite.celestialPaletteIndex || 0;
    const echo = this.scene.add.image(previous.x, previous.y,
      this.getProjectileAssetKey(index), this.getProjectileFrame(index))
      .setOrigin(C.originX, C.originY).setDisplaySize(C.displayWidthPx, C.displayHeightPx)
      .setAlpha(cfg.trailAlpha * this.strength)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + P.detailDepthOffset);
    echo.angle = sprite.angle;
    this.wakeCount += 1;
    this.effects.add(echo); this.trails.add(echo);
    this.scene.tweens.add({ targets: echo, alpha: 0,
      duration: cfg.trailLifeMs, ease: "Linear", onComplete: () => this._release(echo) });
  }
  spawnImpact(hit, paletteIndex, delayMs = 0, travelAngleDeg = 0) {
    const cfg = CELESTIAL_ENGINE_CONFIG.fx.stellarRage;
    const point = hit.worldPoint || {
      x: (hit.tx + 0.5) * this.tileSize, y: (hit.ty + 0.5) * this.tileSize,
    };
    const size = this.tileSize * cfg.projectileImpactDisplaySizeTiles * cfg.projectileImpactScale;
    const image = this.scene.add.image(point.x, point.y, this.impactAssetKey)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(CELESTIAL_ENGINE_CONFIG.fx.worldDepth + cfg.transientDepthOffset + 1)
      .setOrigin(cfg.projectileImpactOriginX, cfg.projectileImpactOriginY)
      .setDisplaySize(size, size).setAlpha(0);
    image.angle = travelAngleDeg - cfg.projectileImpactAuthoredTravelAngleDeg;
    image.setTint?.(this.getPalette(paletteIndex).impactTint);
    this.effects.add(image);
    this.scheduledImpactCount += 1;
    const show = () => {
      if (!this.effects.has(image)) return;
      image.setAlpha(cfg.projectileImpactAlpha * this.strength);
      this.impactMomentCount += 1;
      const angle = travelAngleDeg / P.degreesPerRadian;
      this.contacts.play(point, { x: Math.cos(angle), y: Math.sin(angle) });
      this.scene.tweens.add({ targets: image, alpha: 0,
        duration: cfg.projectileImpactMs, ease: "Linear",
        onComplete: () => this._release(image) });
    };
    if (delayMs <= 0) show();
    else this.scene.tweens.add({ targets: image, alpha: 0,
      delay: Math.max(0, delayMs - C.minimumTravelMs), duration: C.minimumTravelMs,
      onComplete: show });
    return image;
  }
  _release(image) {
    this.effects.delete(image); this.trails.delete(image);
    image?.destroy?.();
  }
  getSnapshot() {
    return Object.freeze({
      liveVfxCount: this.effects.size + this.contacts.effects.size,
      liveWakes: this.trails.size, wakeCount: this.wakeCount,
      ...this.contacts.getSnapshot(),
      launchFlashCount: 0, stateBurstCount: 0,
      scheduledImpactCount: this.scheduledImpactCount, impactMomentCount: this.impactMomentCount,
      paletteIds: C.palettes.slice(0, this.paletteCount).map(palette => palette.id),
    });
  }
  destroy() {
    this.contacts.destroy();
    for (const effect of this.effects) {
      this.scene.tweens?.killTweensOf?.(effect);
      effect.destroy?.();
    }
    this.effects.clear();
    this.trails.clear();
  }
}
