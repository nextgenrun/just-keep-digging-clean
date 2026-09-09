import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX } from "../../values/reviewedAudioMix.js";
import { AudioLayerBus } from "../../sound/AudioLayerBus.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { clamp01 } from "../../values/mathUtils.js";
import { WEATHER_CONFIG } from "../../values/weatherConfig.js";


const RAIN_ROLES = Object.freeze([
  "rainOpen",
  "rainRoof",
  "rainShelter",
  "stormOpen",
]);
const WIND_ROLES = Object.freeze(["windOpen", "windStrong"]);

function retainThreshold(previousRole, matchingRoles, enterAmount, exitAmount, amount) {
  const active = matchingRoles.includes(previousRole);
  return amount >= (active ? exitAmount : enterAmount);
}

export function resolveWeatherAmbienceMix(
  state,
  config,
  previousRainRole = null,
  previousWindRole = null,
) {
  if (!config?.enabled) {
    return { rainRole: null, rainVolume: 0, windRole: null, windVolume: 0 };
  }

  const surfaceAmount = clamp01(state.depth?.surfaceAmount ?? 0);
  const rainAmount = clamp01(state.rainAmount ?? 0) * surfaceAmount;
  const stormAmount = clamp01(state.stormAmount ?? 0) * surfaceAmount;
  const coveredAmount = clamp01(state.occlusion?.coveredAmount ?? 0);
  const sheltered = retainThreshold(
    previousRainRole,
    ["rainRoof", "rainShelter"],
    config.shelterEnterAmount,
    config.shelterExitAmount,
    coveredAmount,
  );
  const storming = retainThreshold(
    previousRainRole,
    ["stormOpen", "rainShelter"],
    config.stormEnterAmount,
    config.stormExitAmount,
    stormAmount,
  );

  let rainRole = null;
  let rainVolume = 0;
  if (rainAmount >= config.activationAmount) {
    rainRole = sheltered
      ? (storming ? "rainShelter" : "rainRoof")
      : (storming ? "stormOpen" : "rainOpen");
    rainVolume = rainAmount * config.volumes[rainRole];
  }

  const windSpeed = Math.abs(Number(state.wind) || 0) / config.windReferenceSpeed;
  const gustSpeed = Math.abs(Number(state.gust) || 0) / config.windReferenceSpeed;
  let windAmount = clamp01(
    (windSpeed + gustSpeed * config.gustContribution) * surfaceAmount,
  );
  if (rainRole) windAmount *= config.rainWindMultiplier;
  const strongWind = retainThreshold(
    previousWindRole,
    ["windStrong"],
    config.strongWindEnterAmount,
    config.strongWindExitAmount,
    windAmount,
  );
  const windRole = windAmount >= config.windActivationAmount
    ? (strongWind ? "windStrong" : "windOpen")
    : null;
  const windVolume = windRole ? windAmount * config.volumes[windRole] : 0;

  return { rainRole, rainVolume, windRole, windVolume };
}

export class WeatherRecordedAmbienceController {
  constructor(scene, weatherConfig, assets = ASSET_KEYS.audio.weatherAmbience) {
    this.scene = scene;
    this.config = weatherConfig.audio?.recorded || { ...WEATHER_CONFIG.audio.recorded, enabled: false };
    this.assets = assets;
    this.bus = null;
    this.variants = new Map();
    this.selectedRainRole = null;
    this.selectedWindRole = null;
    this._destroyed = false;
    this._snapshot = this._emptySnapshot();
  }

  update(state) {
    if (this._destroyed) return this._snapshot;
    const system = this.scene.soundSystem;
    if (!this.bus && system) this.bus = new AudioLayerBus(system, REVIEWED_AUDIO_MIX.weather);
    const canPlay = Boolean(system?.audioInitialized && system.sfxEnabled && this.scene.sound?.context
      && this.scene.gameState !== "paused");
    const mix = resolveWeatherAmbienceMix(state, { ...this.config, enabled: this.config.enabled && canPlay },
      this.selectedRainRole, this.selectedWindRole);
    this.selectedRainRole = mix.rainRole;
    this.selectedWindRole = mix.windRole;
    const targets = [];
    const shelteredWindGain = 1 - clamp01(state.occlusion?.coveredAmount ?? 0)
      * (1 - REVIEWED_AUDIO_MIX.weather.coveredWindMultiplier);
    for (const kind of ["rain", "wind"]) {
      const role = mix[kind + "Role"];
      if (!role) continue;
      if (kind === "wind" && targets.some(layer => layer.asset.id === "rainReference")) continue;
      const asset = this._select(role, state);
      if (!asset) continue;
      const amount = mix[kind + "Volume"] / Math.max(0.0001, this.config.volumes[role]);
      targets.push({ asset, gain: asset.gain * amount * (kind === "wind" ? shelteredWindGain : 1), role, kind });
      // This reviewed mix includes wind; it replaces, rather than stacks with,
      // the separately selected wind bed. Both stems load atomically.
      if (asset.id === "rainReference") targets.push({
        asset: { ...REVIEWED_AUDIO_ASSETS.windReference, weatherRole: "windOpen" },
        gain: REVIEWED_AUDIO_ASSETS.windReference.gain * amount * shelteredWindGain, role: "windOpen", kind: "wind",
      });
    }
    this.bus?.update(targets, state.delta);
    const snapshot = this.bus?.snapshot() || { active: [], pending: [] };
    const coverage = kind => {
      const target = targets.find(layer => layer.kind === kind);
      if (!target || target.gain <= 0) return 0;
      // Include the outgoing bed during crossfade; do not re-enable procedural
      // noise just because a new recorded variant has not reached full gain.
      const keys = kind === "rain" ? RAIN_ROLES : WIND_ROLES;
      const gain = [...(this.bus?.tracks.values() || [])].reduce((sum, track) => {
        const role = this._roleForAsset(track.asset);
        return sum + (keys.includes(role) ? track.effectiveGain : 0);
      }, 0);
      return clamp01(gain / target.gain);
    };
    this._snapshot = {
      rainRole: mix.rainRole, windRole: mix.windRole,
      rainManaged: Boolean(mix.rainRole), windManaged: Boolean(mix.windRole),
      rainCoverage: coverage("rain"), windCoverage: coverage("wind"),
      stormCoverage: mix.rainRole === "stormOpen" ? coverage("rain") : 0,
      loadedRoles: snapshot.active.map(row => row.id || row.key),
      pendingRoles: snapshot.pending, layers: snapshot.active,
    };
    return this._snapshot;
  }

  _select(role, state) {
    const cfg = REVIEWED_AUDIO_MIX.weather;
    const night = (this.scene.dayNightCycle?.getNightAmount?.() ?? 0) >= 0.5;
    const profile = role === "windOpen" ? (night ? "windNight" : "windDay")
      : role === "rainOpen" && state.kind === "drizzle" ? "drizzle" : role;
    const ids = cfg[profile];
    if (!Array.isArray(ids)) {
      const old = this.assets[role];
      return old ? { ...old, id: role, gain: this.config.volumes[role], peak: 1, weatherRole: role } : null;
    }
    const now = Number(this.scene.time?.now) || 0;
    let selected = this.variants.get(profile);
    if (!selected || now >= selected.until) {
      const pool = ids.filter(id => id !== selected?.id);
      const choices = pool.length ? pool : ids;
      selected = { id: choices[Math.floor(Math.random() * choices.length)], until: now + cfg.variantHoldMs };
      this.variants.set(profile, selected);
    }
    return { ...REVIEWED_AUDIO_ASSETS[selected.id], weatherRole: role };
  }

  _roleForAsset(asset) { return asset.weatherRole; }
  getSnapshot() { return { ...this._snapshot }; }
  stop() { this.bus?.stop(); this._snapshot = this._emptySnapshot(); }
  destroy() { this._destroyed = true; this.bus?.destroy(); this._snapshot = this._emptySnapshot(); }
  _emptySnapshot() {
    return { rainRole: null, windRole: null, rainManaged: false, windManaged: false,
      rainCoverage: 0, windCoverage: 0, stormCoverage: 0, loadedRoles: [], pendingRoles: [], layers: [] };
  }
}
