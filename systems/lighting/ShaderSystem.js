import { SHADER_CONFIG } from "../../values/shaderConfig.js";
import {
  createCommonShaderUniforms,
  WEATHER_ATMOSPHERE_SHADER_KEY,
  WEATHER_ATMOSPHERE_FRAGMENT,
  DARKNESS_LIGHT_SHADER_KEY,
  DARKNESS_LIGHT_FRAGMENT,
  LIGHTNING_FLASH_SHADER_KEY,
  LIGHTNING_FLASH_FRAGMENT,
} from "./shaderIndex.js";

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function hexToVec3(hex, fallback = 0xffffff) {
  const color = Number.isFinite(hex) ? hex : fallback;
  return {
    x: ((color >> 16) & 0xff) / 255,
    y: ((color >> 8) & 0xff) / 255,
    z: (color & 0xff) / 255,
  };
}

function normalizedScreenPoint(point, width, height, fallbackX = 0.5, fallbackY = 0.5) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return { x: fallbackX, y: fallbackY };
  }

  return {
    x: clamp01(point.x / Math.max(1, width)),
    y: clamp01(point.y / Math.max(1, height)),
  };
}

export class ShaderSystem {
  constructor(scene, config = SHADER_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(config.enabled);
    this.available = false;
    this.disabledReason = "";
    this.layers = new Map();
    this._debugSnapshot = null;
  }

  create() {
    if (!this.enabled) {
      this.disabledReason = "config-disabled";
      return false;
    }

    if (!this._canUseShaders()) {
      this.enabled = false;
      this.disabledReason = "webgl-unavailable";
      return false;
    }

    try {
      this._createLayer(
        "weatherAtmosphere",
        WEATHER_ATMOSPHERE_SHADER_KEY,
        WEATHER_ATMOSPHERE_FRAGMENT,
        this.config.layers.weatherAtmosphere
      );
      this._createLayer(
        "darknessLight",
        DARKNESS_LIGHT_SHADER_KEY,
        DARKNESS_LIGHT_FRAGMENT,
        this.config.layers.darknessLight
      );
      this._createLayer(
        "lightningFlash",
        LIGHTNING_FLASH_SHADER_KEY,
        LIGHTNING_FLASH_FRAGMENT,
        this.config.layers.lightningFlash
      );

      this.available = this.layers.size > 0;
      this.resize();
      return this.available;
    } catch (error) {
      console.warn("[ShaderSystem] Disabled after shader setup error:", error);
      this._disable("shader-error");
      return false;
    }
  }

  update(time, delta) {
    if (!this.enabled || !this.available) return;

    try {
      const camera = this.scene.cameras.main;
      const width = camera.width || this.scene.config.viewportWidth || 1280;
      const height = camera.height || this.scene.config.viewportHeight || 720;
      const weather = this.scene.weatherSystem?.getLightingSnapshot?.() ?? this._fallbackWeatherSnapshot();
      const light = this.scene.lightSystem?.getShaderSnapshot?.() ?? this._fallbackLightSnapshot(width, height);
      const dayNight = this._getDayNightSnapshot(width, height);
      const seconds = Number.isFinite(time) ? time : this.scene.time.now || 0;

      const snapshot = {
        time: seconds,
        delta: Number.isFinite(delta) ? delta : 0,
        width,
        height,
        weather,
        light,
        dayNight,
      };

      this._debugSnapshot = snapshot;

      for (const [name, entry] of this.layers.entries()) {
        this._applyUniforms(entry.shader, snapshot);
        this._applyLayerUniforms(name, entry.shader, entry.config);
      }
    } catch (error) {
      console.warn("[ShaderSystem] Disabled after update error:", error);
      this._disable("update-error");
    }
  }

  resize() {
    const camera = this.scene.cameras.main;
    const width = camera.width || this.scene.config.viewportWidth || 1280;
    const height = camera.height || this.scene.config.viewportHeight || 720;

    if ([...this.layers.values()].some((entry) => entry.width !== width || entry.height !== height)) {
      this._recreateLayers();
      return;
    }

    for (const entry of this.layers.values()) {
      entry.shader
        .setPosition(width / 2, height / 2)
        .setSize(width, height);
      entry.image
        .setPosition(width / 2, height / 2)
        .setDisplaySize(width, height);
      entry.shader.setUniform("uResolution.value.x", width);
      entry.shader.setUniform("uResolution.value.y", height);
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled) && this.available;
    for (const entry of this.layers.values()) {
      entry.image.setVisible(this.enabled && entry.config.enabled !== false);
    }
  }

  getDebugSnapshot() {
    return {
      enabled: this.enabled,
      available: this.available,
      disabledReason: this.disabledReason,
      layers: [...this.layers.keys()],
      state: this._debugSnapshot,
    };
  }

  destroy() {
    for (const entry of this.layers.values()) {
      entry.image?.destroy?.();
      entry.shader?.destroy?.();
    }
    this.layers.clear();
    this.available = false;
  }

  _canUseShaders() {
    const renderer = this.scene.sys?.renderer;
    return Boolean(
      renderer?.gl
      && this.scene.add?.shader
      && Phaser.Display?.BaseShader
    );
  }

  _createLayer(name, shaderKey, fragmentSrc, layerConfig) {
    if (!layerConfig?.enabled) return;

    const camera = this.scene.cameras.main;
    const width = camera.width || this.scene.config.viewportWidth || 1280;
    const height = camera.height || this.scene.config.viewportHeight || 720;
    const textureKey = `__jkd_shader_layer_${name}`;
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }
    const baseShader = new Phaser.Display.BaseShader(
      shaderKey,
      fragmentSrc,
      "",
      createCommonShaderUniforms()
    );
    const shader = this.scene.add.shader(baseShader, width / 2, height / 2, width, height)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(true);
    shader.setRenderToTexture(textureKey);

    const image = this.scene.add.image(width / 2, height / 2, textureKey)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(layerConfig.depth)
      .setDisplaySize(width, height)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(true);

    this.layers.set(name, {
      shader,
      image,
      config: layerConfig,
      textureKey,
      width,
      height,
    });
  }

  _applyUniforms(shader, snapshot) {
    const { width, height, time, weather, light, dayNight } = snapshot;
    const torchPosition = normalizedScreenPoint(light.torchScreenPosition, width, height);
    const sunPosition = normalizedScreenPoint(dayNight.sunScreenPosition, width, height, 0.5, 0.2);
    const moonPosition = normalizedScreenPoint(dayNight.moonScreenPosition, width, height, 0.5, 0.2);
    const skyColor = hexToVec3(dayNight.skyColor, 0x5a7a9a);
    const horizonColor = hexToVec3(dayNight.horizonColor, 0xb0c0d0);
    const maxTorchScreenRadius = this.config.layers.darknessLight?.maxTorchScreenRadius ?? 1;
    const torchRadius = Math.min(
      clamp01(maxTorchScreenRadius),
      clamp01((light.torchRadiusPx || 0) / Math.max(width, height))
    );

    shader.setUniform("uGameTime.value", time);
    shader.setUniform("uResolution.value.x", width);
    shader.setUniform("uResolution.value.y", height);

    shader.setUniform("uWeatherIntensity.value", clamp01(weather.intensity));
    shader.setUniform("uRainAmount.value", clamp01(weather.rainAmount));
    shader.setUniform("uStormAmount.value", clamp01(weather.stormAmount));
    shader.setUniform("uWind.value", Number.isFinite(weather.wind) ? weather.wind : 0);
    shader.setUniform("uLightningFlash.value", clamp01(weather.lightningFlashAmount));
    shader.setUniform("uSurfaceAmount.value", clamp01(weather.surfaceAmount));
    shader.setUniform("uUndergroundAmount.value", clamp01(weather.undergroundAmount));
    shader.setUniform("uUndergroundSignal.value", clamp01(weather.undergroundSignal));
    shader.setUniform("uWeatherWetness.value", clamp01(weather.worldWetnessAmount ?? weather.surfaceWetness ?? 0));
    shader.setUniform("uWeatherVisibilityPenalty.value", clamp01(weather.visibilityPenalty));
    shader.setUniform("uWeatherShelterAmount.value", clamp01(weather.playerShelterAmount));
    shader.setUniform("uWeatherGustAmount.value", clamp01(weather.windGustAmount ?? weather.gustAmount ?? 0));

    shader.setUniform("uNightAmount.value", clamp01(dayNight.nightAmount));
    shader.setUniform("uSunAlpha.value", clamp01(dayNight.sunAlpha));
    shader.setUniform("uMoonAlpha.value", clamp01(dayNight.moonAlpha));
    shader.setUniform("uSunPosition.value.x", sunPosition.x);
    shader.setUniform("uSunPosition.value.y", sunPosition.y);
    shader.setUniform("uMoonPosition.value.x", moonPosition.x);
    shader.setUniform("uMoonPosition.value.y", moonPosition.y);
    shader.setUniform("uSkyColor.value.x", skyColor.x);
    shader.setUniform("uSkyColor.value.y", skyColor.y);
    shader.setUniform("uSkyColor.value.z", skyColor.z);
    shader.setUniform("uHorizonColor.value.x", horizonColor.x);
    shader.setUniform("uHorizonColor.value.y", horizonColor.y);
    shader.setUniform("uHorizonColor.value.z", horizonColor.z);

    shader.setUniform("uDarknessAlpha.value", clamp01(light.darknessAlpha));
    shader.setUniform("uDepthRatio.value", clamp01(light.depthRatio));
    shader.setUniform("uTorchActive.value", light.torchActive ? 1 : 0);
    shader.setUniform("uTorchPosition.value.x", torchPosition.x);
    shader.setUniform("uTorchPosition.value.y", torchPosition.y);
    shader.setUniform("uTorchRadius.value", torchRadius);
    shader.setUniform("uTorchGlow.value", clamp01(light.torchGlowStrength));
    shader.setUniform("uSurfaceLightInfluence.value", clamp01(light.surfaceLightInfluence));
    shader.setUniform("uUndergroundDarknessInfluence.value", clamp01(light.undergroundDarknessInfluence));
    shader.setUniform("uStormCavePulse.value", clamp01(light.stormCavePulse));
    shader.setUniform("uSunStrength.value", clamp01(light.sunStrength));
  }

  _applyLayerUniforms(name, shader, layerConfig) {
    let alpha = layerConfig.alpha ?? 0;

    if (name === "weatherAtmosphere") {
      const weather = this._debugSnapshot.weather;
      alpha *= clamp01(
        weather.rainAmount * 0.85
        + weather.stormAmount * 0.55
        + weather.undergroundSignal * 0.55
        + this._debugSnapshot.dayNight.nightAmount * weather.surfaceAmount * 0.25
      );
    } else if (name === "darknessLight") {
      const light = this._debugSnapshot.light;
      alpha *= clamp01(
        light.darknessAlpha * 0.85
        + light.torchGlowStrength * 0.45
        + light.undergroundDarknessInfluence * 0.30
        + this._debugSnapshot.dayNight.nightAmount * light.surfaceLightInfluence * 0.18
      );
    } else if (name === "lightningFlash") {
      const weather = this._debugSnapshot.weather;
      alpha *= clamp01(weather.lightningFlashAmount * (0.75 + weather.stormAmount * 0.25));
    }

    shader.setUniform("uLayerAlpha.value", clamp01(alpha));
    const entry = this.layers.get(name);
    entry?.image?.setVisible(this.enabled && layerConfig.enabled !== false && alpha > 0.001);
  }

  _recreateLayers() {
    if (!this.available && this.layers.size === 0) return;
    this.destroy();
    this.available = false;
    this.create();
  }

  _getDayNightSnapshot(width, height) {
    const cycle = this.scene.dayNightCycle;
    return {
      phase: cycle?.getCurrentPhaseName?.() ?? "unknown",
      nightAmount: clamp01(cycle?.getNightAmount?.() ?? 0),
      skyColor: cycle?.getSkyColor?.() ?? 0x5a7a9a,
      horizonColor: cycle?.getHorizonGlowColor?.() ?? 0xb0c0d0,
      sunAlpha: clamp01(cycle?.getSunAlpha?.() ?? 1),
      moonAlpha: clamp01(cycle?.getMoonAlpha?.() ?? 0),
      sunScreenPosition: cycle?.getSunScreenPosition?.(width, height) ?? { x: width * 0.5, y: height * 0.2 },
      moonScreenPosition: cycle?.getMoonScreenPosition?.(width, height) ?? { x: width * 0.5, y: height * 0.2 },
    };
  }

  _fallbackWeatherSnapshot() {
    return {
      kind: "clear",
      intensity: 0,
      targetIntensity: 0,
      wind: 0,
      rainAmount: 0,
      stormAmount: 0,
      surfaceAmount: 1,
      undergroundAmount: 0,
      undergroundSignal: 0,
      forecastKind: "clear",
      forecastProgress: 0,
      stormDistance: 1,
      playerShelterAmount: 0,
      visibilityPenalty: 0,
      movementWetnessPenalty: 0,
      campfireExposure: 0,
      windGustAmount: 0,
      worldWetnessAmount: 0,
      surfaceWetness: 0,
      lightningFlashAmount: 0,
      isStorming: false,
    };
  }

  _fallbackLightSnapshot(width, height) {
    return {
      state: "surfaceSunlight",
      darknessAlpha: 0,
      depthRatio: 0,
      torchActive: false,
      torchScreenPosition: { x: width * 0.5, y: height * 0.5 },
      torchRadiusPx: 0,
      torchGlowStrength: 0,
      surfaceLightInfluence: 1,
      undergroundDarknessInfluence: 0,
      nightAmount: 0,
      sunStrength: 1,
      stormCavePulse: 0,
    };
  }

  _disable(reason) {
    this.enabled = false;
    this.available = false;
    this.disabledReason = reason;
    this.destroy();
  }
}
