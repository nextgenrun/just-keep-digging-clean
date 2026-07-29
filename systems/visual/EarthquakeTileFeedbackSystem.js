import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";

const tileKey = (tx, ty, variant) => `${variant}:${tx},${ty}`;

function rotationFor(tx, ty, choices) {
  if (!Array.isArray(choices) || choices.length === 0) return 0;
  const hash = Math.abs(((tx * 73856093) ^ (ty * 19349663)) >>> 0);
  return choices[hash % choices.length];
}

export class EarthquakeTileFeedbackSystem {
  constructor(scene, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.pool = [];
    this.recent = new Map();
    this.destroyed = false;
    this._createPool();
  }

  _createPool() {
    const fx = this.config.tileFx;
    const fallbackKey = this.config.assets.tileFracture.key;
    for (let index = 0; index < fx.poolSize; index += 1) {
      const image = this.scene.add.image(0, 0, fallbackKey)
        .setOrigin(0.5)
        .setDepth(fx.depth)
        .setVisible(false);
      this.pool.push({
        image,
        active: false,
        startedAt: 0,
        token: 0,
        holdTimer: null,
      });
    }
  }

  showDamage({ tx, ty, destroyed = false } = {}) {
    return this._play(destroyed ? "collapse" : "fracture", tx, ty);
  }

  showCaveInFracture({ tx, ty } = {}) {
    return this._play("fracture", tx, ty);
  }

  showRestore({ tx, ty } = {}) {
    return this._play("restore", tx, ty);
  }

  _play(variantName, tx, ty) {
    if (
      this.destroyed
      || !Number.isInteger(tx)
      || !Number.isInteger(ty)
      || !this._isVisible(tx, ty)
    ) {
      return false;
    }

    const variant = this.config.tileFx.variants[variantName];
    const asset = this.config.assets[variant?.asset];
    if (!variant || !asset || this.scene.textures?.exists?.(asset.key) === false) {
      return false;
    }

    const now = this._now();
    const key = tileKey(tx, ty, variantName);
    if (now - (this.recent.get(key) ?? Number.NEGATIVE_INFINITY) < this.config.tileFx.dedupeMs) {
      return false;
    }
    this.recent.set(key, now);
    this._pruneRecent(now);

    const entry = this._acquire();
    const image = entry.image;
    const tileSize = this.scene.config.tileSize;
    const displaySize = tileSize * variant.displayTiles;
    const token = ++entry.token;

    this._stopEntry(entry);
    entry.active = true;
    entry.startedAt = now;
    image
      .setTexture(asset.key)
      .setPosition((tx + 0.5) * tileSize, (ty + 0.5) * tileSize)
      .setDisplaySize(displaySize, displaySize)
      .setRotation(rotationFor(tx, ty, this.config.tileFx.rotationRadians))
      .setAlpha(0)
      .setVisible(true);

    const baseScaleX = image.scaleX;
    const baseScaleY = image.scaleY;
    image.setScale(baseScaleX * variant.startScale, baseScaleY * variant.startScale);

    if (!this.scene.tweens?.add) {
      image.setAlpha(variant.alpha);
      entry.holdTimer = this.scene.time?.delayedCall?.(
        variant.enterMs + variant.holdMs + variant.exitMs,
        () => this._release(entry, token),
      );
      return true;
    }

    this.scene.tweens.add({
      targets: image,
      alpha: variant.alpha,
      scaleX: baseScaleX * variant.peakScale,
      scaleY: baseScaleY * variant.peakScale,
      duration: variant.enterMs,
      ease: "Back.easeOut",
      onComplete: () => {
        if (!entry.active || token !== entry.token) return;
        entry.holdTimer = this.scene.time?.delayedCall?.(variant.holdMs, () => {
          if (!entry.active || token !== entry.token) return;
          this.scene.tweens.add({
            targets: image,
            alpha: 0,
            y: image.y + tileSize * variant.driftYTiles,
            scaleX: baseScaleX * variant.endScale,
            scaleY: baseScaleY * variant.endScale,
            duration: variant.exitMs,
            ease: "Sine.easeOut",
            onComplete: () => this._release(entry, token),
          });
        });
      },
    });
    return true;
  }

  _isVisible(tx, ty) {
    const camera = this.scene.cameras?.main;
    if (!camera) return true;
    const tileSize = this.scene.config.tileSize;
    const padding = tileSize * this.config.tileFx.cameraPaddingTiles;
    const view = camera.worldView || {
      x: camera.scrollX,
      y: camera.scrollY,
      width: camera.width,
      height: camera.height,
    };
    const x = (tx + 0.5) * tileSize;
    const y = (ty + 0.5) * tileSize;
    return x >= view.x - padding
      && x <= view.x + view.width + padding
      && y >= view.y - padding
      && y <= view.y + view.height + padding;
  }

  _acquire() {
    const free = this.pool.find(entry => !entry.active);
    if (free) return free;
    return this.pool.reduce((oldest, entry) => (
      entry.startedAt < oldest.startedAt ? entry : oldest
    ), this.pool[0]);
  }

  _stopEntry(entry) {
    entry.holdTimer?.remove?.(false);
    entry.holdTimer = null;
    this.scene.tweens?.killTweensOf?.(entry.image);
  }

  _release(entry, token = entry.token) {
    if (token !== entry.token) return;
    this._stopEntry(entry);
    entry.active = false;
    entry.image.setVisible(false).setAlpha(0);
  }

  _pruneRecent(now) {
    const expiry = this.config.tileFx.dedupeMs * 4;
    for (const [key, timestamp] of this.recent) {
      if (now - timestamp > expiry) this.recent.delete(key);
    }
  }

  getStatus() {
    return {
      active: this.pool.filter(entry => entry.active).length,
      capacity: this.pool.length,
    };
  }

  clear() {
    this.pool.forEach(entry => this._release(entry));
    this.recent.clear();
  }

  _now() {
    return Number.isFinite(this.scene.time?.now) ? this.scene.time.now : performance.now();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    this.pool.forEach(entry => entry.image.destroy());
    this.pool.length = 0;
    this.scene = null;
  }
}
