/**
 * AtmosphereSystem — Orchestrator
 * Delegates to LightRayAtmosphere.js and GroundEffectsAtmosphere.js
 * for the ≤300-line rule. Keeps clouds and horizon glow inline.
 */
import { LightRayAtmosphere } from "./LightRayAtmosphere.js";
import { GroundEffectsAtmosphere } from "./GroundEffectsAtmosphere.js";
import { SkylineWeatherVfxSystem } from "./SkylineWeatherVfxSystem.js";

export class AtmosphereSystem {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;

    // Clouds
    this.clouds = [];
    this.cloudContainer = null;

    // Horizon glow
    this.horizonGlow = null;

    // Sub-systems
    this.lightRays = new LightRayAtmosphere(scene, config);
    this.groundEffects = new GroundEffectsAtmosphere(
      scene,
      config,
      scene.weatherSystem?.particleVisualAssets || null,
    );

    this._createClouds();
    this._createHorizonGlow();
    this.skylineWeatherVfx = new SkylineWeatherVfxSystem(scene);
    this.imagegenVfxEnabled = this.skylineWeatherVfx.create();
    this.cloudContainer?.setVisible(!this.imagegenVfxEnabled);
  }

  update(time, delta) {
    const dnc = this.scene.dayNightCycle;
    const ws = this.scene.weatherSystem;
    if (!dnc) return;

    const phase = dnc.getCurrentPhaseName();
    const nightAmount = dnc.getNightAmount();

    if (!this.imagegenVfxEnabled) this._updateClouds(delta);
    this._updateHorizonGlow(phase, nightAmount);
    this.skylineWeatherVfx.update(time, delta);

    this.lightRays.update(time, phase);

    const weather = ws?.getSnapshot?.();
    const windPower = ws ? Math.abs(ws.wind || 0) + (weather?.windGustAmount || 0) * 120 : 0;
    this.groundEffects.update(delta, phase, nightAmount, windPower);
  }

  resize() {
    this._createHorizonGlow();
    this.lightRays.resize();
    this.skylineWeatherVfx.resize();
  }

  destroy() {
    this.clouds.forEach(c => c?.sprite?.destroy());
    this.cloudContainer?.destroy();
    this.horizonGlow?.destroy();
    this.lightRays.destroy();
    this.groundEffects.destroy();
    this.skylineWeatherVfx.destroy();
    this.clouds = [];
  }

  // ─── Clouds ─────────────────────────────────────────────

  _createClouds() {
    this.cloudContainer = this.scene.add.container().setDepth(47);

    const tileSize = this.config.tileSize || 94;
    const surfaceWorldY = (this.config.topAirRows || 65) * tileSize;
    const viewportH = this.config.viewportHeight || 720;
    const skyHeight = Math.max(400, viewportH * 1.1);
    const cloudAreaTop = surfaceWorldY - skyHeight;

    const viewportW = this.config.viewportWidth || 1280;
    const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
    const zoneHalfW = viewportW * 3;

    for (let i = 0; i < 12; i++) {
      const gfx = this.scene.add.graphics();
      const cloudW = 60 + Math.random() * 100;
      const cloudH = 16 + Math.random() * 20;

      gfx.fillStyle(0xffffff, 0.04 + Math.random() * 0.04);
      gfx.fillEllipse(0, 0, cloudW, cloudH);
      gfx.fillStyle(0xffffff, 0.02 + Math.random() * 0.03);
      gfx.fillEllipse(cloudW * 0.2, -cloudH * 0.2, cloudW * 0.6, cloudH * 0.5);

      const x = spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2;
      const y = cloudAreaTop + Math.random() * skyHeight * 0.7;
      gfx.setPosition(x, y);

      this.clouds.push({
        sprite: gfx,
        baseX: x,
        y,
        speed: 3 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        floatAmp: 2 + Math.random() * 4,
      });
      this.cloudContainer.add(gfx);
    }
  }

  _updateClouds(delta) {
    const seconds = delta / 1000;
    const now = this.scene.time?.now ?? Date.now();
    const weather = this.scene.weatherSystem?.getLightingSnapshot?.() || {};
    const cloudCover = Phaser.Math.Clamp(weather.cloudCoverAmount ?? 0, 0, 1);
    const wind = this.scene.weatherSystem?.wind ?? 0;
    const direction = wind === 0 ? 1 : Math.sign(wind);
    const speedScale = 1 + Math.min(1.5, Math.abs(wind) / 140);
    this.cloudContainer?.setAlpha(0.42 + cloudCover * 0.58);

    this.clouds.forEach(c => {
      c.sprite.x += c.speed * direction * speedScale * seconds;
      c.sprite.y = c.y + Math.sin((now / 3000) + c.phase) * c.floatAmp;

      const cam = this.scene.cameras.main;
      if (direction >= 0 && c.sprite.x > cam.scrollX + cam.width + 400) {
        c.sprite.x = cam.scrollX - 400;
        c.baseX = c.sprite.x;
      } else if (direction < 0 && c.sprite.x < cam.scrollX - 400) {
        c.sprite.x = cam.scrollX + cam.width + 400;
        c.baseX = c.sprite.x;
      }
    });
  }

  // ─── Horizon Glow ────────────────────────────────────────

  _createHorizonGlow() {
    if (this.horizonGlow) this.horizonGlow.destroy();

    this.horizonGlow = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(50)
      .setAlpha(0);
  }

  _updateHorizonGlow(phase, nightAmount) {
    const isDawnDusk = phase === "dawn" || phase === "dusk" || phase === "sunset";
    const sunlight = this.scene.lightSystem?.getSunlightSnapshot?.();
    const sunStrength = sunlight?.strength ?? 1;
    const surfaceInfluence = this.scene.lightSystem?.getShaderSnapshot?.().surfaceLightInfluence ?? 1;
    if (!isDawnDusk || sunStrength <= 0.001 || surfaceInfluence <= 0.001) {
      this.horizonGlow.setAlpha(0);
      return;
    }

    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    this.horizonGlow.clear();

    let color = 0xc87850;
    if (phase === "dusk") color = 0xc86848;
    else if (phase === "sunset") color = 0xa03828;

    const source = sunlight?.screenPosition || { x: w * 0.5, y: h * 0.3 };
    const glowH = Math.max(90, h * 0.18);

    for (let i = 0; i < 6; i++) {
      const p = 1 - i / 6;
      const alpha = 0.018 + p * 0.018;
      if (alpha <= 0) continue;
      this.horizonGlow.fillStyle(color, alpha);
      this.horizonGlow.fillEllipse(
        source.x,
        source.y + glowH * 0.22,
        w * (0.32 + i * 0.14),
        glowH * (0.55 + i * 0.24),
      );
    }

    this.horizonGlow.setAlpha(
      0.6 * sunStrength * surfaceInfluence * (1 - nightAmount * 0.35)
    );
  }
}
