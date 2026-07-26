function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function wrap01(value) {
  return value - Math.floor(value);
}

export class WorldVisualDepthAmbientLayer {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.graphics = null;
    this.lastDrawTime = Number.NEGATIVE_INFINITY;
  }

  create() {
    this.graphics = this.scene.add.graphics()
      .setDepth(this.config.render.ambientDepth)
      .setBlendMode(Phaser.BlendModes.ADD || Phaser.BlendModes.SCREEN);
    this.graphics.name = "world-visual-depth-ambient-motion";
  }

  update(time, regionViews, lighting = {}) {
    if (!this.graphics) return;
    const motion = this.config.motion;
    const fps = Number(this.scene.game?.loop?.actualFps) || 60;
    if (fps < motion.disableBelowFps) {
      this.graphics.clear();
      return;
    }

    const reduced = fps < motion.reduceBelowFps;
    const interval = reduced ? motion.reducedUpdateMs : motion.ambientUpdateMs;
    const now = Number(time) || 0;
    if (now - this.lastDrawTime < interval) return;
    this.lastDrawTime = now;
    this.graphics.clear();

    const moteLimit = reduced ? motion.reducedMaxMotes : motion.maxMotes;
    let drawn = 0;
    for (const view of regionViews) {
      const ambient = view.region.ambient;
      if (!ambient) continue;
      const regionSeed = hashString(view.region.id);
      for (const segment of view.segments.values()) {
        const count = reduced ? Math.ceil(ambient.count * 0.55) : ambient.count;
        for (let index = 0; index < count && drawn < moteLimit; index += 1) {
          this._drawMote(segment, ambient, regionSeed, index, now, lighting);
          drawn += 1;
        }
        if (drawn >= moteLimit) return;
      }
    }
  }

  _drawMote(segment, ambient, regionSeed, index, time, lighting) {
    const seed = (
      regionSeed
      ^ Math.imul(segment.column + 31, 73856093)
      ^ Math.imul(segment.row + 47, 19349663)
      ^ Math.imul(index + 71, 83492791)
    ) >>> 0;
    const xSeed = random01(seed);
    const ySeed = random01(seed ^ 0x9e3779b9);
    const phaseSeed = random01(seed ^ 0x85ebca6b);
    const progress = wrap01(time / ambient.periodMs + phaseSeed);
    const phase = progress * Math.PI * 2;
    const width = segment.widthPx;
    const height = segment.heightPx;
    const lightBoost = 1 + clamp01(lighting.lightning) * 0.45;
    let x = segment.baseX + xSeed * width;
    let y = segment.baseY + ySeed * height;
    let alpha = ambient.alpha * lightBoost;
    let size = ambient.size * (0.62 + random01(seed ^ 0xc2b2ae35) * 0.76);

    if (ambient.kind === "drip") {
      y = segment.baseY + wrap01(ySeed + progress * ambient.travel) * height;
      x += Math.sin(phase + xSeed * 9) * ambient.drift * width;
      this.graphics.fillStyle(ambient.tint, alpha).fillRect(x, y, Math.max(1, size * 0.45), size * 3.8);
      return;
    }
    if (ambient.kind === "ember" || ambient.kind === "steam") {
      y = segment.baseY + wrap01(ySeed - progress * ambient.travel) * height;
      x += Math.sin(phase + ySeed * 8) * ambient.drift * width;
      alpha *= Math.sin(progress * Math.PI);
      if (ambient.kind === "steam") {
        size *= 0.8 + progress * 1.7;
        this.graphics.fillStyle(ambient.tint, alpha * 0.48).fillCircle(x, y, size);
      } else {
        this.graphics.fillStyle(ambient.tint, alpha).fillCircle(x, y, size);
      }
      return;
    }
    if (ambient.kind === "ash") {
      y = segment.baseY + wrap01(ySeed + progress * ambient.travel) * height;
      x += Math.sin(phase + ySeed * 11) * ambient.drift * width;
      this.graphics.fillStyle(ambient.tint, alpha).fillRect(x, y, size * 0.8, size * 1.8);
      return;
    }
    if (ambient.kind === "star") {
      x += Math.sin(phase + ySeed * 7) * ambient.drift * width;
      y += Math.cos(phase * 0.73 + xSeed * 8) * ambient.travel * height;
      alpha *= 0.28 + (Math.sin(phase + xSeed * 12) * 0.5 + 0.5) * 0.72;
      this.graphics.fillStyle(ambient.tint, alpha).fillCircle(x, y, size);
      if (size > 2.4) {
        this.graphics.fillRect(x - size * 1.8, y - 0.5, size * 3.6, 1);
        this.graphics.fillRect(x - 0.5, y - size * 1.8, 1, size * 3.6);
      }
      return;
    }

    x += Math.sin(phase + ySeed * 10) * ambient.drift * width;
    y += Math.cos(phase * 0.67 + xSeed * 8) * ambient.travel * height;
    alpha *= 0.55 + Math.sin(phase + xSeed * 5) * 0.2;
    this.graphics.fillStyle(ambient.tint, alpha).fillCircle(x, y, size);
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = null;
  }
}
