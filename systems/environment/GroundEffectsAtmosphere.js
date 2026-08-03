/**
 * GroundEffectsAtmosphere
 * Ground-level ambient effects: mist, fireflies, wind particles.
 * Extracted from AtmosphereSystem for the ≤300-line rule.
 */
import { ANIMATION_SMOOTHNESS_CONFIG } from "../../values/animationSmoothness.js";
import {
  frameRateIndependentResponse,
  frameRateIndependentStepCount,
} from "../../values/mathUtils.js";

export class GroundEffectsAtmosphere {
  constructor(scene, config = {}, visualAssets = null) {
    this.scene = scene;
    this.config = config;
    this.visualAssets = visualAssets;

    // Ground mist
    this.mistParticles = [];

    // Fireflies
    this.fireflies = [];

    // Wind particles
    this.windParticles = [];
    this._windTimer = 0;
    this._elapsedMs = 0;

    this._createMist();
    this._createFireflies();
  }

  update(delta, phase, nightAmount, windPower) {
    const timing = ANIMATION_SMOOTHNESS_CONFIG;
    const stepCount = frameRateIndependentStepCount(
      delta,
      timing.referenceFrameMs,
      timing.maxCatchUpSteps,
    );
    const motionDeltaMs = stepCount * timing.referenceFrameMs;
    this._elapsedMs += motionDeltaMs;
    this._updateMist(phase, nightAmount, motionDeltaMs, stepCount);
    this._updateFireflies(phase, nightAmount, motionDeltaMs, stepCount);
    this._updateWindParticles(delta, windPower, stepCount);
  }

  destroy() {
    this.mistParticles.forEach(m => m?.sprite?.destroy());
    this.fireflies.forEach(f => f?.sprite?.destroy());
    this.windParticles.forEach(w => w?.sprite?.destroy());
    this.mistParticles = [];
    this.fireflies = [];
    this.windParticles = [];
  }

  // ─── Ground Mist ─────────────────────────────────────────

  _createMist() {
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;

    for (let i = 0; i < 8; i++) {
      const presentation = this.visualAssets?.presentation?.ambientMist;
      const mw = presentation ? this._randomRange(presentation.widthPx) : 120 + Math.random() * 160;
      const mh = presentation ? this._randomRange(presentation.heightPx) : 8 + Math.random() * 10;
      const sprite = presentation
        ? this._createImageParticle(presentation.frameGroup, 20, presentation.blendMode)
        : this.scene.add.graphics();
      if (!presentation) {
        sprite.fillStyle(0xc8d8e8, 0.04 + Math.random() * 0.03);
        sprite.fillEllipse(0, 0, mw, mh);
      } else {
        sprite.setDisplaySize(mw, mh);
      }

      const viewportW = this.config.viewportWidth || 1280;
      const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
      const zoneHalfW = viewportW * 2;

      const x = spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2;
      const y = surfaceY + 10 + Math.random() * 30;
      sprite.setPosition(x, y);
      sprite.setDepth(20);

      this.mistParticles.push({
        sprite,
        baseX: x,
        y,
        speed: 5 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        alpha: 0,
        targetAlpha: 0,
        maxAlpha: presentation ? this._randomRange(presentation.alpha) : 0.08,
      });
    }
  }

  _updateMist(phase, nightAmount, deltaMs, stepCount) {
    const isMistyTime = phase === "dawn" || phase === "morning" || (phase === "dusk" && nightAmount < 0.4);
    const targetAlpha = isMistyTime ? 1 : 0;
    const timing = ANIMATION_SMOOTHNESS_CONFIG;
    const response = frameRateIndependentResponse(
      timing.groundEffects.mistAlphaResponsePerReferenceFrame,
      deltaMs,
      timing.referenceFrameMs,
      timing.maxCatchUpSteps,
    );

    this.mistParticles.forEach(m => {
      m.targetAlpha = targetAlpha;
      m.alpha += (m.targetAlpha - m.alpha) * response;

      if (m.alpha < 0.01) {
        m.sprite.setAlpha(0);
        return;
      }

      m.sprite.x += m.speed * (stepCount / timing.referenceFps);
      m.sprite.setAlpha(m.alpha * m.maxAlpha);
    });
  }

  // ─── Fireflies ───────────────────────────────────────────

  _createFireflies() {
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;

    for (let i = 0; i < 15; i++) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0xffdd66, 0.6);
      gfx.fillCircle(0, 0, 2);
      gfx.fillStyle(0xffee88, 0.3);
      gfx.fillCircle(0, 0, 4);
      gfx.setDepth(25);

      const viewportW = this.config.viewportWidth || 1280;
      const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
      const zoneHalfW = viewportW * 2;

      this.fireflies.push({
        sprite: gfx,
        x: spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2,
        y: surfaceY - 10 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
        bobAmplitude: 4 + Math.random() * 8,
        alpha: 0,
        targetAlpha: 0,
      });
    }
  }

  _updateFireflies(phase, nightAmount, deltaMs, stepCount) {
    const isFireflyTime = nightAmount > 0.2 || phase === "dusk" || phase === "sunset";
    const targetAlpha = isFireflyTime ? 1 : 0;
    const timing = ANIMATION_SMOOTHNESS_CONFIG;
    const response = frameRateIndependentResponse(
      timing.groundEffects.fireflyAlphaResponsePerReferenceFrame,
      deltaMs,
      timing.referenceFrameMs,
      timing.maxCatchUpSteps,
    );
    const now = this._elapsedMs;

    this.fireflies.forEach(f => {
      f.targetAlpha = targetAlpha;
      f.alpha += (f.targetAlpha - f.alpha) * response;

      if (f.alpha < 0.01) {
        f.sprite.setAlpha(0);
        return;
      }

      const wobbleX = Math.sin((now / 800) + f.phase) * 0.5;
      const wobbleY = Math.sin((now / 600) + f.phase * 1.3) * 0.8;

      f.x += (f.vx + wobbleX) * f.speed * stepCount;
      f.y += (f.vy + wobbleY) * f.speed * stepCount;

      const tileSize = this.config.tileSize || 94;
      const surfaceY = (this.config.topAirRows || 65) * tileSize;

      const boundaryVelocity = timing.groundEffects.fireflyBoundaryVelocityPerReferenceFrame
        * stepCount;
      if (f.y < surfaceY - 120) f.vy += boundaryVelocity;
      if (f.y > surfaceY + 40) f.vy -= boundaryVelocity;

      f.sprite.setPosition(f.x, f.y);

      const glow = 0.3 + Math.sin((now / 400) + f.phase * 2) * 0.7;
      f.sprite.setAlpha(f.alpha * glow);
    });
  }

  // ─── Wind Particles ──────────────────────────────────────

  _updateWindParticles(delta, windPower, stepCount) {
    if (windPower < 0.3) {
      const fade = ANIMATION_SMOOTHNESS_CONFIG.groundEffects.inactiveWindFadePerReferenceFrame * stepCount;
      this.windParticles.forEach(w => {
        w.sprite.setAlpha(Math.max(0, w.sprite.alpha - fade));
      });
      this._windTimer = 0;
      return;
    }

    this._windTimer += delta;

    if (this._windTimer > Math.max(200, 800 - windPower * 500)) {
      this._windTimer = 0;
      this._emitWindParticle(windPower);
    }

    for (let i = this.windParticles.length - 1; i >= 0; i--) {
      const w = this.windParticles[i];
      w.sprite.x += w.vx * stepCount;
      w.sprite.y += w.vy * stepCount;
      w.sprite.setAlpha(Math.max(0, w.sprite.alpha - w.fadePerFrame * stepCount));

      if (w.sprite.alpha <= 0.01) {
        w.sprite.destroy();
        this.windParticles.splice(i, 1);
      }
    }
  }

  _emitWindParticle(windPower) {
    const cam = this.scene.cameras.main;
    const presentation = this.visualAssets?.presentation?.ambientWind;
    const size = presentation ? this._randomRange(presentation.sizePx) : 2 + Math.random() * 3;
    const sprite = presentation
      ? this._createImageParticle(presentation.frameGroup, 35, presentation.blendMode)
      : this.scene.add.graphics();
    if (!presentation) {
      sprite.fillStyle(0xc8b888, 0.3 + Math.random() * 0.3);
      sprite.fillCircle(0, 0, size);
    } else {
      sprite
        .setDisplaySize(size, size)
        .setAlpha(this._randomRange(presentation.alpha));
    }
    sprite.setDepth(35);

    const ws = this.scene.weatherSystem;
    const windDir = ws ? Math.sign(ws.wind || 1) : 1;
    const startX = windDir > 0 ? cam.scrollX - 50 : cam.scrollX + cam.width + 50;
    const startY = cam.scrollY + Math.random() * cam.height * 0.6;

    sprite.setPosition(startX, startY);

    this.windParticles.push({
      sprite,
      vx: windDir * (2 + windPower * 3),
      vy: -0.5 + Math.random() * 1,
      fadePerFrame: presentation?.fadePerFrame ?? 0.003,
    });
  }

  _createImageParticle(frameGroup, depth, blendMode) {
    const frames = this.visualAssets.frames[frameGroup];
    const frame = frames[Math.floor(Math.random() * frames.length)];
    const sprite = this.scene.add.image(0, 0, this.visualAssets.textureKey, frame)
      .setOrigin(0.5)
      .setScrollFactor(1)
      .setDepth(depth);
    const resolvedBlendMode = globalThis.Phaser?.BlendModes?.[blendMode?.toUpperCase?.()];
    if (resolvedBlendMode !== undefined) sprite.setBlendMode(resolvedBlendMode);
    return sprite;
  }

  _randomRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
