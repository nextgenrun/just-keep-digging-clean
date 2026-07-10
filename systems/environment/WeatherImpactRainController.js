const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

const LAYER_STYLES = Object.freeze({
  foreground: { width: 1.35, alphaScale: 1.00, lengthKey: "foregroundLengthPx" },
  midground: { width: 1.05, alphaScale: 0.62, lengthKey: "midgroundLengthPx" },
  sheet: { width: 2.10, alphaScale: 0.34, lengthKey: "sheetLengthPx" },
});

export class WeatherImpactRainController {
  constructor(scene, config, weatherConfig) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.drops = [];
    this.impacts = [];
    this._accumulators = { foreground: 0, midground: 0, sheet: 0 };
    this._graphics = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(weatherConfig.renderDepths.rain + 0.2);
  }

  update(time, delta, state) {
    const impactCfg = this.weatherConfig.rain.impact;
    this._graphics.clear();
    if (!impactCfg?.enabled) return;

    const dtMs = Math.min(Math.max(delta || 0, 0), 100);
    const dt = dtMs / 1000;
    const amount = this._getSurfaceRainAmount(state);
    this._spawnLayer("foreground", amount, dt, state);
    this._spawnLayer("midground", amount * 0.72, dt, state);
    this._spawnLayer("sheet", amount * (state.kind === "storm" ? 0.62 : 0.2), dt, state);
    this._updateDrops(dt, state);
    this._drawDrops(state.lightningFlashAmount || 0);
    this._updateImpacts(dtMs);
  }

  resize() {
    this.drops.length = 0;
    this.impacts.length = 0;
    this._graphics.clear();
  }

  destroy() {
    this._graphics?.destroy?.();
    this._graphics = null;
    this.drops.length = 0;
    this.impacts.length = 0;
  }

  _spawnLayer(name, amount, dt, state) {
    const impactCfg = this.weatherConfig.rain.impact;
    const layer = this.weatherConfig.rain.layers[name];
    const samples = state.occlusion.openSamples || [];
    if (amount <= 0.025 || samples.length === 0 || this.drops.length >= impactCfg.maxActiveDrops) return;

    this._accumulators[name] += layer.ratePerSecond * amount * dt;
    const count = Math.min(layer.maxBurst, Math.floor(this._accumulators[name]));
    if (count <= 0) return;
    this._accumulators[name] -= count;

    for (let i = 0; i < count && this.drops.length < impactCfg.maxActiveDrops; i += 1) {
      const sample = this._pick(samples);
      if (!Number.isFinite(sample.impactScreenY)) continue;

      const startY = layer.spawnY;
      const fallDistance = sample.impactScreenY - startY;
      if (fallDistance < impactCfg.minFallDistancePx) continue;

      const speedY = lerp(layer.minSpeedY, layer.maxSpeedY, amount) * this._randomRange([0.92, 1.10]);
      const wind = state.wind + state.gust;
      const speedX = wind * layer.windScale + this._randomRange([-layer.windSpread, layer.windSpread]);
      this.drops.push({
        x: sample.screenX + this._randomRange([-layer.xJitterPx, layer.xJitterPx]),
        y: startY,
        previousX: sample.screenX,
        previousY: startY,
        speedX,
        speedY,
        alpha: layer.alpha * amount * LAYER_STYLES[name].alphaScale,
        layer: name,
        impactScreenY: sample.impactScreenY,
        impactSource: sample.impactSource || sample.source || "air",
      });
    }
  }

  _updateDrops(dt, state) {
    const impactCfg = this.weatherConfig.rain.impact;
    const survivors = [];
    for (const drop of this.drops) {
      drop.previousX = drop.x;
      drop.previousY = drop.y;
      drop.x += drop.speedX * dt;
      drop.y += drop.speedY * dt;

      const nearest = state.occlusion.nearestImpactForScreenX?.(drop.x);
      if (nearest?.openToSky && Number.isFinite(nearest.impactScreenY)) {
        drop.impactScreenY = Math.min(drop.impactScreenY, nearest.impactScreenY);
        drop.impactSource = nearest.impactSource || nearest.source || drop.impactSource;
      }

      if (drop.y >= drop.impactScreenY - impactCfg.hardStopPaddingPx) {
        this._addImpact(drop.x, drop.impactScreenY, drop.impactSource, drop.alpha);
      } else {
        survivors.push(drop);
      }
    }
    this.drops = survivors;
  }

  _drawDrops(lightningFlashAmount) {
    const impactCfg = this.weatherConfig.rain.impact;
    const flash = 1 + clamp01(lightningFlashAmount) * impactCfg.flashBoost;
    for (const drop of this.drops) {
      const style = LAYER_STYLES[drop.layer] || LAYER_STYLES.foreground;
      const length = impactCfg[style.lengthKey] || impactCfg.foregroundLengthPx;
      const y2 = Math.min(drop.y, drop.impactScreenY - impactCfg.hardStopPaddingPx);
      const y1 = Math.max(drop.previousY, y2 - length);
      const x1 = drop.x - drop.speedX * 0.014;
      this._graphics.lineStyle(style.width, 0xbfeeff, clamp01(drop.alpha * flash));
      this._graphics.beginPath();
      this._graphics.moveTo(x1, y1);
      this._graphics.lineTo(drop.x, y2);
      this._graphics.strokePath();
    }
  }

  _addImpact(x, y, source, alpha) {
    const cfg = this.weatherConfig.rain.impact;
    const scale = source === "surfaceMask" || source === "tile" ? 1 : cfg.ceilingImpactScale;
    this.impacts.push({
      x,
      y,
      ageMs: 0,
      durationMs: cfg.impactDurationMs,
      radius: cfg.impactRadiusPx * scale,
      alpha: cfg.impactAlpha * Math.max(0.35, alpha),
    });
  }

  _updateImpacts(deltaMs) {
    const survivors = [];
    for (const impact of this.impacts) {
      impact.ageMs += deltaMs;
      const t = clamp01(impact.ageMs / Math.max(1, impact.durationMs));
      if (t >= 1) continue;

      const alpha = impact.alpha * (1 - t);
      const radius = Math.max(1, impact.radius * (0.55 + t));
      this._graphics.lineStyle(1, 0xcff6ff, alpha);
      this._graphics.beginPath();
      this._graphics.moveTo(impact.x - radius, impact.y);
      this._graphics.lineTo(impact.x + radius, impact.y);
      this._graphics.moveTo(impact.x, impact.y - radius * 0.35);
      this._graphics.lineTo(impact.x, impact.y + radius * 0.15);
      this._graphics.strokePath();
      survivors.push(impact);
    }
    this.impacts = survivors;
  }

  _getSurfaceRainAmount(state) {
    const isRain = state.kind === "drizzle" || state.kind === "rain" || state.kind === "storm";
    return isRain ? clamp01(state.intensity * state.depth.surfaceAmount * state.occlusion.openSkyAmount) : 0;
  }

  _pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  _randomRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
