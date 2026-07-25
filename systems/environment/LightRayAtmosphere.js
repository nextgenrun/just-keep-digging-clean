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

import { clamp01 } from "../../values/mathUtils.js";
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
    const sunlight = this._getSunlightSnapshot(width, height);
    const sourceX = sunlight.screenPosition.x;
    const sourceY = sunlight.screenPosition.y;
    const sourceLean = (sourceX / Math.max(1, width) - 0.5) * 18;

    this.lightRays.forEach(ray => {
      const layout = ray.layout;
      const spreadX = (layout.x - 0.5) * width * 0.78;
      ray.sprite
        .setPosition(sourceX + spreadX, sourceY + height * layout.y)
        .setDisplaySize(width * layout.w, height * layout.h)
        .setRotation(Phaser.Math.DegToRad(layout.angle + sourceLean));
    });
  }

  update(time, phase) {
    if (!this.lightRayContainer || !this.lightRays.length) return;

    const preset = this._getLightRayPreset(phase);
    const surfaceInfluence = this._getSurfaceInfluence();
    const cam = this.scene.cameras.main;
    const width = cam.width || this.config.viewportWidth || 1280;
    const height = cam.height || this.config.viewportHeight || 720;
    const sunlight = this._getSunlightSnapshot(width, height);
    const pulse = 0.92 + Math.sin(time * 0.0008) * 0.04;
    const baseAlpha = preset.alpha * sunlight.strength * surfaceInfluence * pulse;

    this.lightRayContainer.setAlpha(baseAlpha > 0.001 ? 1 : 0);

    const sourceX = sunlight.screenPosition.x;
    const sourceY = sunlight.screenPosition.y;
    const sourceLean = (sourceX / Math.max(1, width) - 0.5) * 18;
    const tint = this._multiplyTint(preset.tint, sunlight.tint);

    this.lightRays.forEach(ray => {
      const layout = ray.layout;
      const spreadX = (layout.x - 0.5) * width * 0.78;
      const drift = Math.sin(time * 0.001 * layout.speed + layout.phase) * 18;
      const wobble = Math.sin(time * 0.001 * layout.speed + layout.phase) * 0.7;

      ray.sprite
        .setTint(tint)
        .setAlpha(baseAlpha * layout.alpha)
        .setPosition(sourceX + spreadX + drift, sourceY + height * layout.y)
        .setRotation(Phaser.Math.DegToRad(layout.angle + sourceLean + wobble));
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

  _getSunlightSnapshot(width, height) {
    const live = this.scene.lightSystem?.getSunlightSnapshot?.();
    if (live) return live;

    const cycle = this.scene.dayNightCycle;
    const weather = this.scene.weatherSystem?.getLightingSnapshot?.() || {};
    const sun = cycle?.getSunState?.(width, height);
    const screenPosition = sun?.screenPosition
      || cycle?.getSunScreenPosition?.(width, height)
      || { x: width * 0.5, y: height * 0.2 };
    const sunAlpha = clamp01(sun?.alpha ?? cycle?.getSunAlpha?.() ?? 1);
    const transmittance = clamp01(weather.sunTransmittance ?? 1);
    const exposure = clamp01(weather.sunExposure ?? weather.exposure ?? 1);
    return {
      strength: clamp01(sunAlpha * transmittance * exposure),
      screenPosition,
      tint: weather.sunTint ?? weather.tint ?? 0xffffff,
    };
  }

  _multiplyTint(base, filter) {
    const channel = shift => Math.round(
      (((base >> shift) & 0xff) * ((filter >> shift) & 0xff)) / 255
    );
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
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
