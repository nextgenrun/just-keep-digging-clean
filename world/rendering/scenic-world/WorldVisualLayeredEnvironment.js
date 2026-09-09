import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { TIME_CONFIG } from "../../../values/timeConfig.js";
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
export function mixLayeredColor(from, to, amount) {
  const t = clamp(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

// Reads the authoritative clock and weather; never advances either simulation.
export function sampleLayeredEnvironment(scene, lighting = {}) {
  const cfg = CONFIG.environment, clock = scene.dayNightCycle;
  const weather = scene.weatherSystem?.getLightingSnapshot?.() || {};
  const phases = clock?.timeConfig?.phases || TIME_CONFIG.phases;
  const time = clock?.currentTime ?? TIME_CONFIG.initialTime;
  const centers = phases.map(phase => (phase.start + phase.end) / 2);
  let index = centers.findIndex(center => center > time);
  if (index < 0) index = 0;
  const previous = (index + phases.length - 1) % phases.length;
  const start = centers[previous], end = centers[index] + (index === 0 ? 1 : 0);
  const position = time < start ? time + 1 : time;
  const fraction = clamp((position - start) / (end - start));
  const t = fraction * fraction * (3 - 2 * fraction);
  const from = phases[previous], to = phases[index];
  const night = clamp(clock?.getNightAmount?.() ?? lighting.night);
  const cover = clamp(weather.cloudCoverAmount), fog = clamp(weather.fogAmount ?? lighting.fog);
  const rain = clamp(weather.precipitationAmount), storm = clamp(weather.stormAmount);
  const flash = clamp(weather.lightningFlashAmount ?? lighting.lightning);
  const obscured = clamp(cover * cfg.coverDarkening + storm * cfg.stormDarkening);
  const sky = mixLayeredColor(mixLayeredColor(from.skyColor, to.skyColor, t), cfg.stormSky, obscured);
  const horizon = mixLayeredColor(mixLayeredColor(from.horizonGlow, to.horizonGlow, t), cfg.stormHorizon, obscured);
  const stars = Math.min(night, from.starAlpha + (to.starAlpha - from.starAlpha) * t)
    * (1 - cover) * (1 - fog) * (1 - storm);
  const phaseTint = mixLayeredColor(cfg.dayTerrainTint, horizon, cfg.terrainWarmth * (1 - night));
  const terrainTint = mixLayeredColor(mixLayeredColor(phaseTint, cfg.nightTerrainTint, night),
    cfg.stormTerrainTint, obscured);
  const sun = clock?.getSunState?.();
  const warmth = sun?.aboveHorizon ? 1 - clamp(sun.elevation) : 0;
  const cloudLight = mixLayeredColor(mixLayeredColor(cfg.dayCloudTint, horizon, cfg.cloudWarmth * warmth),
    cfg.nightCloudTint, night);
  return {
    phase: clock?.getCurrentPhaseName?.() || from.name, time, night, cover, fog, rain, storm, stars,
    skyTop: mixLayeredColor(sky, cfg.lightningTint, flash * cfg.skyFlash),
    skyHorizon: mixLayeredColor(horizon, cfg.lightningTint, flash * cfg.skyFlash),
    terrainTint: mixLayeredColor(terrainTint, cfg.lightningTint, flash),
    cloudTint: mixLayeredColor(mixLayeredColor(cloudLight, cfg.stormCloudTint, obscured), cfg.lightningTint, flash),
    cloudThickness: cfg.clearCloudThickness + cover * cfg.coverThicknessGain,
    cloudOpacity: cfg.clearCloudOpacity + cover * cfg.coverCloudGain,
    mistOpacity: cfg.clearMistOpacity + fog * cfg.fogMistGain + rain * cfg.rainMistGain,
    wind: Number(weather.wind ?? lighting.wind) || 0,
    gust: clamp(weather.windGustAmount),
  };
}

// An opaque atmospheric gradient under the generated night sky prevents daylight stars.
export class WorldVisualLayeredSkyGradient {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(CONFIG.environment.skyDepth);
    this.graphics.name = "regenerated-sky:daylight";
  }
  update(camera, state, visible) {
    const graphics = this.graphics;
    graphics.clear().setVisible(visible);
    if (!visible) return;
    const view = camera.worldView;
    const width = camera.width ?? view.width, height = camera.height ?? view.height;
    const x = (width - view.width) / 2, y = (height - view.height) / 2;
    const surface = this.scene.config.topAirRows * this.scene.config.tileSize;
    const glow = coordinate => clamp(1 - (surface - coordinate) / CONFIG.environment.horizonHeightPx);
    const top = mixLayeredColor(state.skyTop, state.skyHorizon, glow(view.y));
    const bottom = mixLayeredColor(state.skyTop, state.skyHorizon, glow(view.bottom));
    graphics.fillGradientStyle(top, top, bottom, bottom, 1);
    graphics.fillRect(x, y, view.width, view.height);
  }
  destroy() { this.graphics.destroy(); }
}
