import { clamp01, lerp } from "../../values/mathUtils.js";
import { createWeatherSnowFallbackTexture } from "./WeatherParticleTextures.js";

const FALLBACK_SNOW_TEXTURE_KEY = "_weather_snow_fallback";

export class WeatherSnowController {
  constructor(scene, weatherConfig, visualAssets) {
    this.scene = scene;
    this.weatherConfig = weatherConfig;
    if (!visualAssets) {
      createWeatherSnowFallbackTexture(scene, FALLBACK_SNOW_TEXTURE_KEY);
    }
    this.visualAssets = visualAssets || {
      textureKey: FALLBACK_SNOW_TEXTURE_KEY,
      frames: { snowFlakes: [null] },
    };
    this.flakes = [];
    this._spritePool = [];
    this._impactEvents = [];
    this._spawnAccumulator = 0;
  }

  update(time, delta, state) {
    const cfg = this.weatherConfig.snow;
    this._impactEvents.length = 0;
    if (!cfg?.enabled) {
      this._releaseAll();
      return;
    }

    const dt = Math.min(Math.max(delta || 0, 0), 100) / 1000;
    const snowAmount = state.snowAmount ?? (state.kind === "snow" ? state.intensity : 0);
    const amount = clamp01(
      snowAmount * state.depth.surfaceAmount * state.occlusion.openSkyAmount,
    );
    this._spawn(amount, dt, state);
    this._updateFlakes(time, dt, state);
  }

  resize() {
    this._releaseAll();
    this._impactEvents.length = 0;
    this._spawnAccumulator = 0;
  }

  destroy() {
    this._releaseAll();
    this._spritePool.forEach((sprite) => sprite?.destroy?.());
    this._spritePool.length = 0;
    this._impactEvents.length = 0;
  }

  drainImpactEvents() {
    return this._impactEvents.splice(0);
  }

  _spawn(amount, dt, state) {
    const cfg = this.weatherConfig.snow;
    const samples = state.occlusion.openSamples || [];
    if (amount <= 0.02 || samples.length === 0 || this.flakes.length >= cfg.maxActiveFlakes) {
      return;
    }

    this._spawnAccumulator += cfg.ratePerSecond * amount * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._spawnAccumulator));
    if (count <= 0) return;
    this._spawnAccumulator -= count;

    const scaleX = state.occlusion.worldPerScreenPixelX || 1;
    const scaleY = state.occlusion.worldPerScreenPixelY || 1;
    const worldTop = state.occlusion.worldView?.y || 0;
    for (let index = 0; index < count && this.flakes.length < cfg.maxActiveFlakes; index += 1) {
      const sample = this._pick(samples);
      if (!Number.isFinite(sample?.impactWorldY)) continue;
      const worldY = worldTop + cfg.spawnOffsetPx * scaleY;
      if (sample.impactWorldY - worldY < cfg.minFallDistancePx) continue;

      const size = this._randomRange(cfg.sizePx);
      const frames = this.visualAssets.frames.snowFlakes;
      const frame = frames[Math.floor(Math.random() * frames.length)];
      const sprite = this._acquireSprite(frame);
      const speedY = lerp(cfg.minSpeedY, cfg.maxSpeedY, amount)
        * this._randomRange(cfg.speedVariance);
      const wind = state.wind + state.gust;
      this.flakes.push({
        worldX: sample.worldX + this._randomRange([-cfg.xJitterPx, cfg.xJitterPx]) * scaleX,
        worldY,
        speedX: wind * cfg.windScale + this._randomRange([-cfg.windSpread, cfg.windSpread]),
        speedY,
        driftAmplitude: this._randomRange(cfg.driftAmplitudePx),
        driftPeriodMs: this._randomRange(cfg.driftPeriodMs),
        driftPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: this._randomRange(cfg.rotationSpeed),
        size,
        alpha: cfg.alpha * amount,
        impactWorldY: sample.impactWorldY,
        impactSource: sample.impactSource || sample.source || "air",
        sprite,
      });
    }
  }

  _updateFlakes(time, dt, state) {
    const cfg = this.weatherConfig.snow;
    const survivors = [];
    for (const flake of this.flakes) {
      const drift = Math.sin(time / flake.driftPeriodMs * Math.PI * 2 + flake.driftPhase)
        * flake.driftAmplitude;
      const previousX = flake.worldX;
      const previousY = flake.worldY;
      const nextX = previousX + (flake.speedX + drift) * dt;
      const nextY = previousY + flake.speedY * dt;
      flake.rotation += flake.rotationSpeed * dt;

      const hasSweptCollision = state.occlusion.supportsWorldRaycast !== false
        && typeof state.occlusion.raycastWorldSegment === "function";
      const sweptHit = hasSweptCollision
        ? this._findSweptImpact(flake, previousX, previousY, nextX, nextY, state.occlusion)
        : null;
      if (sweptHit) {
        flake.worldX = lerp(previousX, nextX, sweptHit.fraction);
        flake.worldY = lerp(previousY, nextY, sweptHit.fraction);
        flake.impactWorldY = sweptHit.worldY;
        flake.impactSource = sweptHit.source;
        this._emitImpact(flake, sweptHit);
        this._releaseSprite(flake);
        continue;
      }

      flake.worldX = nextX;
      flake.worldY = nextY;
      let renderY = flake.worldY;
      if (!hasSweptCollision) {
        const nearest = state.occlusion.nearestImpactForWorldX?.(flake.worldX);
        if (Number.isFinite(nearest?.impactWorldY)) {
          flake.impactWorldY = nearest.impactWorldY;
          flake.impactSource = nearest.impactSource || nearest.source || flake.impactSource;
        }
        const stopY = flake.impactWorldY - cfg.hardStopPaddingPx;
        if (flake.worldY + flake.size * 0.5 >= stopY) {
          this._emitImpact(flake);
          this._releaseSprite(flake);
          continue;
        }
        renderY = Math.min(flake.worldY, stopY - flake.size * 0.5);
      }
      if (this._outsideWorldView(flake, state.occlusion.worldView, cfg.cullMarginPx)) {
        this._releaseSprite(flake);
        continue;
      }

      flake.sprite
        .setPosition(flake.worldX, renderY)
        .setDisplaySize(flake.size, flake.size)
        .setRotation(flake.rotation)
        .setAlpha(flake.alpha)
        .setVisible(true);
      survivors.push(flake);
    }
    this.flakes = survivors;
  }

  _findSweptImpact(flake, previousX, previousY, nextX, nextY, occlusion) {
    const cfg = this.weatherConfig.snow;
    const radius = flake.size * cfg.collisionRadiusScale;
    const rayFractions = this.weatherConfig.precipitationCollision.rayFractions;
    const startY = previousY + radius + cfg.hardStopPaddingPx;
    const endY = nextY + radius + cfg.hardStopPaddingPx;
    let earliest = null;
    for (const fraction of rayFractions) {
      const offsetX = radius * fraction;
      const groundHit = occlusion.raycastWorldSegment(
        previousX + offsetX,
        startY,
        nextX + offsetX,
        endY,
      );
      if (groundHit && (!earliest || groundHit.fraction < earliest.fraction)) {
        earliest = groundHit;
      }
      if (Math.abs(fraction) !== 1) continue;
      const sideHit = occlusion.raycastWorldSegment(
        previousX + offsetX,
        previousY,
        nextX + offsetX,
        nextY,
      );
      if (sideHit && (!earliest || sideHit.fraction < earliest.fraction)) {
        earliest = sideHit;
      }
    }
    return earliest;
  }

  _emitImpact(flake, hit = null) {
    this._impactEvents.push({
      kind: "snow",
      worldX: hit?.worldX ?? flake.worldX,
      worldY: hit?.worldY ?? flake.impactWorldY,
      impactSource: hit?.source ?? flake.impactSource,
      normalX: hit?.normalX ?? 0,
      normalY: hit?.normalY ?? -1,
      tileX: hit?.tileX ?? null,
      tileY: hit?.tileY ?? null,
      alpha: flake.alpha,
    });
  }

  _acquireSprite(frame) {
    const sprite = this._spritePool.pop()
      || this.scene.add.image(0, 0, this.visualAssets.textureKey);
    if (frame === null) sprite.setTexture(this.visualAssets.textureKey);
    else sprite.setTexture(this.visualAssets.textureKey, frame);
    sprite
      .setOrigin(0.5)
      .setScrollFactor(1)
      .setDepth(this.weatherConfig.renderDepths.snow)
      .setAlpha(0)
      .setVisible(false);
    return sprite;
  }

  _releaseSprite(flake) {
    flake.sprite.setVisible(false).setAlpha(0);
    this._spritePool.push(flake.sprite);
    flake.sprite = null;
  }

  _releaseAll() {
    this.flakes.forEach((flake) => this._releaseSprite(flake));
    this.flakes.length = 0;
  }

  _outsideWorldView(flake, view, margin) {
    if (!view) return false;
    return flake.worldX < view.x - margin
      || flake.worldX > view.x + view.width + margin
      || flake.worldY < view.y - margin
      || flake.worldY > view.y + view.height + margin;
  }

  _pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  _randomRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
