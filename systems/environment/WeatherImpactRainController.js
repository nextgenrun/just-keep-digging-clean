import { drawRainDrop } from "./weatherRainTrail.js";
import { clamp01, lerp } from "../../values/mathUtils.js";

export class WeatherImpactRainController {
  constructor(scene, config, weatherConfig, visualAssets = null) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.visualAssets = visualAssets;
    this.drops = [];
    this._dropSpritePool = [];
    this._impactEvents = [];
    this._accumulators = { foreground: 0, midground: 0, sheet: 0 };
    this._graphics = visualAssets
      ? null
      : this.scene.add.graphics()
        .setScrollFactor(1)
        .setDepth(weatherConfig.renderDepths.rain);
  }

  update(time, delta, state) {
    const impactCfg = this.weatherConfig.rain.impact;
    this._impactEvents.length = 0;
    this._graphics?.clear?.();
    if (!impactCfg?.enabled) {
      this._releaseAllDrops();
      return;
    }

    const dtMs = Math.min(Math.max(delta || 0, 0), 100);
    const dt = dtMs / 1000;
    const amount = this._getSurfaceRainAmount(state);
    const layers = this.weatherConfig.rain.layers;
    this._night = this.scene.dayNightCycle?.getNightAmount?.() || 0;
    const stormAmount = clamp01(state.stormAmount ?? (
      state.kind === "storm" ? state.intensity : 0
    ));
    const sheetScale = lerp(
      layers.sheet.calmAmountScale,
      layers.sheet.stormAmountScale,
      stormAmount,
    );
    this._spawnLayer("foreground", amount * layers.foreground.amountScale, dt, state);
    this._spawnLayer("midground", amount * layers.midground.amountScale, dt, state);
    this._spawnLayer("sheet", amount * sheetScale, dt, state);
    this._updateDrops(dt, state);
    this._drawDrops(state.lightningFlashAmount || 0);
  }

  resize() {
    this._releaseAllDrops();
    this._impactEvents.length = 0;
    this._graphics?.clear?.();
  }

  destroy() {
    this._releaseAllDrops();
    this._dropSpritePool.forEach((sprite) => sprite?.destroy?.());
    this._dropSpritePool.length = 0;
    this._graphics?.destroy?.();
    this._graphics = null;
    this._impactEvents.length = 0;
  }

  drainImpactEvents() {
    return this._impactEvents.splice(0);
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
      if (!Number.isFinite(sample.impactWorldY)) continue;

      const scaleX = state.occlusion.worldPerScreenPixelX || 1;
      const scaleY = state.occlusion.worldPerScreenPixelY || 1;
      const startY = (state.occlusion.worldView?.y || 0) + layer.spawnY * scaleY;
      const fallDistance = sample.impactWorldY - startY;
      if (fallDistance < impactCfg.minFallDistancePx) continue;

      const speedY = lerp(layer.minSpeedY, layer.maxSpeedY, amount) * this._randomRange([0.92, 1.10]);
      const wind = state.wind + state.gust;
      const speedX = wind * layer.windScale + this._randomRange([-layer.windSpread, layer.windSpread]);
      const x = sample.worldX + this._randomRange([-layer.xJitterPx, layer.xJitterPx]) * scaleX;
      const motion = this.weatherConfig.rainMotion;
      this.drops.push({
        x,
        y: startY, spawnY: startY,
        widthScale: motion ? this._randomRange(motion.widthVariance) : 1,
        lengthScale: motion ? this._randomRange(motion.lengthVariance) : 1,
        previousX: x,
        previousY: startY,
        speedX,
        speedY,
        alpha: layer.alpha * (motion ? motion.alphaFloor + motion.alphaGain * amount : amount) * this._randomRange(layer.alphaVariance),
        layer: name,
        impactWorldY: sample.impactWorldY,
        impactSource: sample.impactSource || sample.source || "air",
        sprite: this._acquireDropSprite(name),
      });
    }
  }

  _updateDrops(dt, state) {
    const impactCfg = this.weatherConfig.rain.impact;
    const survivors = [];
    for (const drop of this.drops) {
      drop.previousX = drop.x;
      drop.previousY = drop.y;
      const nextX = drop.x + drop.speedX * dt;
      const nextY = drop.y + drop.speedY * dt;
      const hasSweptCollision = state.occlusion.supportsWorldRaycast !== false
        && typeof state.occlusion.raycastWorldSegment === "function";
      drop.usesSweptCollision = hasSweptCollision;
      const hit = hasSweptCollision
        ? this._findSweptImpact(drop, nextX, nextY, state.occlusion, impactCfg)
        : null;
      if (hit) {
        drop.x = lerp(drop.previousX, nextX, hit.fraction);
        drop.y = lerp(drop.previousY, nextY, hit.fraction);
        this._emitImpact(
          hit.worldX,
          hit.worldY,
          hit.source,
          drop.alpha,
          hit,
        );
        this._releaseDropSprite(drop);
        continue;
      }

      drop.x = nextX;
      drop.y = nextY;
      if (!hasSweptCollision) {
        const nearest = state.occlusion.nearestImpactForWorldX?.(drop.x);
        if (Number.isFinite(nearest?.impactWorldY)) {
          drop.impactWorldY = nearest.impactWorldY;
          drop.impactSource = nearest.impactSource || nearest.source || drop.impactSource;
        }

        const stopY = drop.impactWorldY - impactCfg.hardStopPaddingPx;
        if (drop.y >= stopY) {
          const travelY = Math.max(Number.EPSILON, drop.y - drop.previousY);
          const hitT = clamp01((stopY - drop.previousY) / travelY);
          const impactX = lerp(drop.previousX, drop.x, hitT);
          this._emitImpact(impactX, drop.impactWorldY, drop.impactSource, drop.alpha);
          this._releaseDropSprite(drop);
          continue;
        }
      }
      if (this._isOutsideWorldView(drop, state.occlusion.worldView, impactCfg.cullMarginPx)) {
        this._releaseDropSprite(drop);
      } else {
        survivors.push(drop);
      }
    }
    this.drops = survivors;
  }

  _findSweptImpact(drop, nextX, nextY, occlusion, impactCfg) {
    const style = impactCfg.visualStyles[drop.layer] || impactCfg.visualStyles.foreground;
    const halfWidth = style.widthPx * (drop.widthScale || 1) * impactCfg.collisionHalfWidthScale;
    const rayFractions = this.weatherConfig.precipitationCollision.rayFractions;
    let earliest = null;
    for (const fraction of rayFractions) {
      const offsetX = halfWidth * fraction;
      const hit = occlusion.raycastWorldSegment(
        drop.previousX + offsetX,
        drop.previousY + impactCfg.hardStopPaddingPx,
        nextX + offsetX,
        nextY + impactCfg.hardStopPaddingPx,
      );
      if (hit && (!earliest || hit.fraction < earliest.fraction)) earliest = hit;
    }
    return earliest;
  }

  _drawDrops(lightningFlashAmount) {
    const impactCfg = this.weatherConfig.rain.impact;
    const flash = 1 + clamp01(lightningFlashAmount) * impactCfg.flashBoost;
    for (const drop of this.drops) {
      const style = impactCfg.visualStyles[drop.layer] || impactCfg.visualStyles.foreground;
      drawRainDrop(drop,style,impactCfg,this.weatherConfig.rainMotion,flash,this._night||0,this._graphics);
    }
  }

  _emitImpact(worldX, worldY, source, alpha, hit = null) {
    const cfg = this.weatherConfig.rain.impact;
    if (this._impactEvents.length >= cfg.maxEventsPerFrame) return;
    this._impactEvents.push({
      kind: "rain",
      worldX,
      worldY,
      impactSource: source,
      normalX: hit?.normalX ?? 0,
      normalY: hit?.normalY ?? -1,
      tileX: hit?.tileX ?? null,
      tileY: hit?.tileY ?? null,
      alpha: cfg.impactAlpha * Math.max(0.35, alpha),
    });
  }

  _getSurfaceRainAmount(state) {
    const isRain = state.kind === "drizzle" || state.kind === "rain" || state.kind === "storm";
    const rainAmount = state.rainAmount ?? (isRain ? state.intensity : 0);
    return clamp01(rainAmount * state.depth.surfaceAmount * state.occlusion.openSkyAmount);
  }

  _pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  _randomRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  _acquireDropSprite(layerName = "foreground") {
    if (!this.visualAssets) return null;
    const textureKey = this.visualAssets.rainTextureKey || this.visualAssets.textureKey;
    const sprite = this._dropSpritePool.pop()
      || this.scene.add.image(0, 0, textureKey);
    const frames = this.visualAssets.frames.rainStreaks;
    const motion = this.weatherConfig.rainMotion;
    const indices = motion ? (layerName === "foreground" ? motion.nearFrameIndices : motion.farFrameIndices) : null;
    const frame = frames[indices ? this._pick(indices) : Math.floor(Math.random() * frames.length)];
    sprite
      .setTexture(textureKey, frame)
      .setOrigin(0.5)
      .setScrollFactor(1)
      .setDepth(this.weatherConfig.rain.impact.visualStyles[layerName]?.depth ?? this.weatherConfig.renderDepths.rain)
      .setAlpha(0)
      .setVisible(false);
    return sprite;
  }

  _releaseDropSprite(drop) {
    if (!drop.sprite) return;
    drop.sprite.setVisible(false).setAlpha(0);
    this._dropSpritePool.push(drop.sprite);
    drop.sprite = null;
  }

  _releaseAllDrops() {
    this.drops.forEach((drop) => this._releaseDropSprite(drop));
    this.drops.length = 0;
  }

  _isOutsideWorldView(drop, worldView, marginPx) {
    if (!worldView) return false;
    const margin = marginPx || 0;
    return drop.x < worldView.x - margin
      || drop.x > worldView.x + worldView.width + margin
      || drop.y < worldView.y - margin
      || drop.y > worldView.y + worldView.height + margin;
  }
}
