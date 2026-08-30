import { ASSET_KEYS } from "../../values/assetKeys.js";
import { clamp01, lerp } from "../../values/mathUtils.js";
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
    this.config = weatherConfig.audio?.recorded || {
      ...WEATHER_CONFIG.audio.recorded,
      enabled: false,
    };
    this.assets = assets;
    this.tracks = new Map();
    this.pending = new Map();
    this.failedAt = new Map();
    this.selectedRainRole = null;
    this.selectedWindRole = null;
    this._destroyed = false;
    this._snapshot = this._emptySnapshot();
  }

  update(state) {
    const soundSystem = this.scene.soundSystem;
    const canPlay = Boolean(
      soundSystem?.audioInitialized
      && soundSystem?.sfxEnabled
      && this.scene.sound?.context,
    );
    const mix = canPlay
      ? resolveWeatherAmbienceMix(
        state,
        this.config,
        this.selectedRainRole,
        this.selectedWindRole,
      )
      : { rainRole: null, rainVolume: 0, windRole: null, windVolume: 0 };
    this.selectedRainRole = mix.rainRole;
    this.selectedWindRole = mix.windRole;

    if (mix.rainRole) this._ensureTrack(mix.rainRole);
    if (mix.windRole) this._ensureTrack(mix.windRole);

    const targets = new Map();
    if (mix.rainRole) targets.set(mix.rainRole, mix.rainVolume * soundSystem.sfxVolume);
    if (mix.windRole) targets.set(mix.windRole, mix.windVolume * soundSystem.sfxVolume);
    const delta = Math.min(
      Math.max(Number(state.delta) || 0, 0),
      this.config.maxDeltaMs,
    );
    this._updateTracks(targets, delta);

    const rainCurrent = this._sumVolumes(RAIN_ROLES);
    const windCurrent = this._sumVolumes(WIND_ROLES);
    const rainTarget = (mix.rainVolume || 0) * (soundSystem?.sfxVolume ?? 1);
    const windTarget = (mix.windVolume || 0) * (soundSystem?.sfxVolume ?? 1);
    this._snapshot = {
      rainRole: mix.rainRole,
      windRole: mix.windRole,
      rainManaged: Boolean(mix.rainRole),
      windManaged: Boolean(mix.windRole),
      rainCoverage: rainTarget > 0 ? clamp01(rainCurrent / rainTarget) : 0,
      windCoverage: windTarget > 0 ? clamp01(windCurrent / windTarget) : 0,
      stormCoverage: mix.rainRole === "stormOpen" && rainTarget > 0
        ? clamp01(rainCurrent / rainTarget)
        : 0,
      loadedRoles: [...this.tracks.keys()],
      pendingRoles: [...this.pending.keys()],
    };
    return this._snapshot;
  }

  getSnapshot() {
    return { ...this._snapshot };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const handle of this.pending.values()) handle?.cancel?.();
    this.pending.clear();
    for (const track of this.tracks.values()) this._disposeTrack(track);
    this.tracks.clear();
    this._snapshot = this._emptySnapshot();
  }

  _ensureTrack(role) {
    if (this._destroyed || this.tracks.has(role) || this.pending.has(role)) return;
    const asset = this.assets?.[role];
    if (!asset) return;
    const now = Number(this.scene.time?.now) || 0;
    if (now - (this.failedAt.get(role) ?? -Infinity) < this.config.loadRetryMs) return;
    if (this.scene.cache?.audio?.exists?.(asset.key)) {
      this._startTrack(role, asset);
      return;
    }

    const manager = this.scene.soundSystem?.runtimeAudioAssetManager;
    const handle = manager?.ensure?.(asset, {
      onReady: () => {
        this.pending.delete(role);
        if (!this._destroyed && (this.selectedRainRole === role || this.selectedWindRole === role)) {
          this._startTrack(role, asset);
        }
      },
      onError: (_failedAsset, error) => {
        this.pending.delete(role);
        this.failedAt.set(role, Number(this.scene.time?.now) || 0);
        console.warn(`[WeatherRecordedAmbienceController] Load failed: ${asset.key}`, error);
      },
    });
    if (handle) this.pending.set(role, handle);
  }

  _startTrack(role, asset) {
    if (this._destroyed || this.tracks.has(role)) return;
    try {
      const sound = this.scene.sound.add(asset.key, { loop: true, volume: 0 });
      sound.play();
      this.tracks.set(role, { role, sound, volume: 0 });
    } catch (error) {
      this.failedAt.set(role, Number(this.scene.time?.now) || 0);
      console.warn(`[WeatherRecordedAmbienceController] Playback failed: ${asset.key}`, error);
    }
  }

  _updateTracks(targets, delta) {
    for (const [role, track] of this.tracks) {
      const target = targets.get(role) || 0;
      const rate = target > track.volume
        ? this.config.fadeInRatePerSecond
        : this.config.fadeOutRatePerSecond;
      const blend = 1 - Math.exp(-rate * delta / 1000);
      track.volume = lerp(track.volume, target, blend);
      try {
        track.sound.volume = clamp01(track.volume);
      } catch (_) {
        this._disposeTrack(track);
        this.tracks.delete(role);
        continue;
      }
      if (target <= 0 && track.volume <= this.config.stopVolumeEpsilon) {
        this._disposeTrack(track);
        this.tracks.delete(role);
      }
    }
  }

  _sumVolumes(roles) {
    return roles.reduce(
      (total, role) => total + (this.tracks.get(role)?.volume || 0),
      0,
    );
  }

  _disposeTrack(track) {
    try { track.sound.stop(); } catch (_) {}
    try { track.sound.destroy(); } catch (_) {}
  }

  _emptySnapshot() {
    return {
      rainRole: null,
      windRole: null,
      rainManaged: false,
      windManaged: false,
      rainCoverage: 0,
      windCoverage: 0,
      stormCoverage: 0,
      loadedRoles: [],
      pendingRoles: [],
    };
  }
}
