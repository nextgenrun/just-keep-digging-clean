/**
 * LightRayAtmosphere
 * Soft god-ray light shafts that drift across the screen.
 * Extracted from AtmosphereSystem for the ≤300-line rule.
 */
import { LIGHT_CONFIG } from "../../values/lightConfig.js";

const LIGHT_RAY_TEXTURE_KEY = "__atmosphere_soft_light_ray";
const LIGHT_RAY_DEPTH = 51;

const LIGHT_RAY_PRESETS = Object.freeze({
  dawn: Object.freeze({ tint: 0xffeecd, alpha: 0.150 }),
  morning: Object.freeze({ tint: 0xfffce8, alpha: 0.135 }),
  afternoon: Object.freeze({ tint: 0xfffce8, alpha: 0.135 }),
  dusk: Object.freeze({ tint: 0xffe0ba, alpha: 0.145 }),
  sunset: Object.freeze({ tint: 0xffe0ba, alpha: 0.145 }),
  night: Object.freeze({ tint: 0xacc4ff, alpha: 0.055 }),
  midnight: Object.freeze({ tint: 0xacc4ff, alpha: 0.055 }),
});

const LIGHT_RAY_LAYOUT = Object.freeze([
  Object.freeze({ x: 0.12, y: -0.06, w: 0.22, h: 0.84, angle: -10, alpha: 0.80, speed: 0.13, phase: 0.2 }),
  Object.freeze({ x: 0.34, y: -0.08, w: 0.18, h: 0.76, angle: -6, alpha: 0.66, speed: 0.10, phase: 1.8 }),
  Object.freeze({ x: 0.57, y: -0.10, w: 0.26, h: 0.88, angle: 8, alpha: 0.58, speed: 0.08, phase: 4.1 }),
  Object.freeze({ x: 0.78, y: -0.05, w: 0.20, h: 0.72, angle: 13, alpha: 0.48, speed: 0.11, phase: 2.7 }),
]);

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export class LightRayAtmosphere {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this.lightRayContainer = null;
    this.lightRays = [];

    this._create();
  }

  _create() {
    this._ensureLightRayTexture();

    this.lightRayContainer?.destroy(true);
    this.lightRayContainer = this.scene.add.container()
      .setScrollFactor(0)
      .setDepth(LIGHT_RAY_DEPTH)
      .setAlpha(0);

    this.lightRays = LIGHT_RAY_LAYOUT.map(layout => {
      const sprite = this.scene.add.image(0, 0, LIGHT_RAY_TEXTURE_KEY)
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setAlpha(0);

      this.lightRayContainer.add(sprite);

      return { sprite, layout };
    });

    this._layoutLightRays();
  }

  _ensureLightRayTexture() {
    if (this.scene.textures.exists(LIGHT_RAY_TEXTURE_KEY)) return;

    const width = 240;
    const height = 760;
    const texture = this.scene.textures.createCanvas(LIGHT_RAY_TEXTURE_KEY, width, height);
    const ctx = texture.getContext();
    const horizontal = ctx.createLinearGradient(0, 0, width, 0);
    horizontal.addColorStop(0, "rgba(255,255,255,0)");
    horizontal.addColorStop(0.28, "rgba(255,255,255,0.18)");
    horizontal.addColorStop(0.50, "rgba(255,255,255,0.50)");
    horizontal.addColorStop(0.72, "rgba(255,255,255,0.18)");
    horizontal.addColorStop(1, "rgba(255,255,255,0)");

    const vertical = ctx.createLinearGradient(0, 0, 0, height);
    vertical.addColorStop(0, "rgba(255,255,255,0)");
    vertical.addColorStop(0.12, "rgba(255,255,255,0.72)");
    vertical.addColorStop(0.52, "rgba(255,255,255,0.24)");
    vertical.addColorStop(1, "rgba(255,255,255,0)");

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.22;
    ctx.filter = "blur(12px)";
    ctx.fillStyle = "white";
    ctx.fillRect(26, 40, width - 52, height - 90);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    texture.refresh();
  }

  _layoutLightRays() {
    if (!this.lightRays.length) return;

    const cam = this.scene.cameras.main;
    const width = cam.width || this.config.viewportWidth || 1280;
    const height = cam.height || this.config.viewportHeight || 720;

    this.lightRays.forEach(ray => {
      const layout = ray.layout;
      ray.sprite
        .setPosition(width * layout.x, height * layout.y)
        .setDisplaySize(width * layout.w, height * layout.h)
        .setRotation(Phaser.Math.DegToRad(layout.angle));
    });
  }

  update(time, phase) {
    if (!this.lightRayContainer || !this.lightRays.length) return;

    const preset = this._getLightRayPreset(phase);
    const surfaceInfluence = this._getSurfaceInfluence();
    const weatherScale = this._getLightRayWeatherScale();
    const pulse = 0.92 + Math.sin(time * 0.0008) * 0.04;
    const baseAlpha = preset.alpha * weatherScale * surfaceInfluence * pulse;

    this.lightRayContainer.setAlpha(baseAlpha > 0.001 ? 1 : 0);

    const cam = this.scene.cameras.main;
    const width = cam.width || this.config.viewportWidth || 1280;
    const height = cam.height || this.config.viewportHeight || 720;

    this.lightRays.forEach(ray => {
      const layout = ray.layout;
      const drift = Math.sin(time * 0.001 * layout.speed + layout.phase) * 18;
      const wobble = Math.sin(time * 0.001 * layout.speed + layout.phase) * 0.7;

      ray.sprite
        .setTint(preset.tint)
        .setAlpha(baseAlpha * layout.alpha)
        .setPosition(width * layout.x + drift, height * layout.y)
        .setRotation(Phaser.Math.DegToRad(layout.angle + wobble));
    });
  }

  resize() {
    this._layoutLightRays();
  }

  destroy() {
    this.lightRayContainer?.destroy(true);
    this.lightRays = [];
    this.lightRayContainer = null;
  }

  _getLightRayPreset(phase) {
    return LIGHT_RAY_PRESETS[phase] || LIGHT_RAY_PRESETS.afternoon;
  }

  _getLightRayWeatherScale() {
    const ws = this.scene.weatherSystem;
    if (!ws) return 1;

    const snapshot = ws.getLightingSnapshot?.() || ws.getSnapshot?.() || {};
    const kind = snapshot.kind ?? ws.kind;
    const intensity = clamp01(snapshot.intensity ?? ws.intensity ?? 0);
    const rainAmount = clamp01(
      snapshot.rainAmount
      ?? (kind === "drizzle" || kind === "rain" || kind === "storm" ? intensity : 0)
    );
    const stormAmount = clamp01(snapshot.stormAmount ?? (kind === "storm" ? intensity : 0));
    const rainScale = Phaser.Math.Linear(1, 0.45, rainAmount);
    const stormScale = Phaser.Math.Linear(rainScale, 0.18, stormAmount);

    return clamp01(stormAmount > 0 ? stormScale : rainScale);
  }

  _getSurfaceInfluence() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;
    const cameraMidY = (view?.y ?? cam.scrollY ?? 0) + (view?.height ?? cam.height ?? this.config.viewportHeight) * 0.5;
    const depthTiles = Math.max(0, (cameraMidY - surfaceY) / tileSize);
    const cfg = LIGHT_CONFIG.surfaceSunlight;
    const start = cfg.fullStrengthDepthTiles;
    const end = Math.max(start + 1, cfg.fadeOutEndDepthTiles);

    if (depthTiles <= start) return 1;
    if (depthTiles >= end) return 0;

    return 1 - smoothstep((depthTiles - start) / (end - start));
  }
}