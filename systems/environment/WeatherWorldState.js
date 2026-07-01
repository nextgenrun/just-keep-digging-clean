const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class WeatherWorldState {
  constructor(scene, config, weatherConfig) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.worldWetnessAmount = 0;
    this.playerShelterAmount = 0;
    this.playerExposure = "exposed";
    this._wetColumns = new Map();
    this._playerState = this._emptyPlayerState();
  }

  update(delta, state) {
    const dt = Math.min(Math.max(delta || 0, 0), 100) / 1000;
    const wetCfg = this.weatherConfig.worldWetness;
    const rain = state.isRainKind ? state.intensity * state.depth.surfaceAmount : 0;
    const wetTarget = clamp01(rain * state.occlusion.openSkyAmount);
    const wetRate = wetTarget > this.worldWetnessAmount ? wetCfg.fillRatePerSecond : wetCfg.dryRatePerSecond;
    this.worldWetnessAmount = lerp(this.worldWetnessAmount, wetTarget, 1 - Math.exp(-wetRate * dt));

    this._updateColumns(dt, state);
    this._updatePlayerState(state);
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      worldWetnessAmount: this.worldWetnessAmount,
      playerShelterAmount: this.playerShelterAmount,
      playerExposure: this.playerExposure,
      playerWeatherState: this._playerState,
    };
  }

  getPlayerWeatherState() {
    return this._playerState;
  }

  getWeatherAtWorldPoint(x, y) {
    const tileSize = this.config.tileSize || 94;
    const tx = Math.floor(x / tileSize);
    const wetness = this._wetColumns.get(tx) || 0;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;
    const depthTiles = Math.max(0, (y - surfaceY) / tileSize);
    const undergroundAmount = clamp01(depthTiles / this.weatherConfig.depth.undergroundFullTiles);
    return {
      wetness,
      exposed: wetness > this.weatherConfig.worldWetness.exposedWetnessThreshold && undergroundAmount < 0.15,
      undergroundAmount,
    };
  }

  _updateColumns(dt, state) {
    const cfg = this.weatherConfig.worldWetness;
    state.occlusion.landingSamples.forEach((sample) => {
      const tx = Math.floor(sample.worldX / (this.config.tileSize || 94));
      const current = this._wetColumns.get(tx) || 0;
      const next = Math.min(1, current + state.intensity * cfg.columnFillPerSecond * dt);
      this._wetColumns.set(tx, next);
    });
    for (const [tx, value] of this._wetColumns.entries()) {
      const next = Math.max(0, value - cfg.columnDryPerSecond * dt);
      if (next <= 0.002) this._wetColumns.delete(tx);
      else this._wetColumns.set(tx, next);
    }
  }

  _updatePlayerState(state) {
    const player = this.scene.playerController?.physicsBody;
    const tileSize = this.config.tileSize || 94;
    const playerX = player ? player.x + player.w * 0.5 : this.scene.player?.x;
    const playerY = player ? player.y + player.h : this.scene.player?.y;
    const sample = Number.isFinite(playerX) ? this._nearestSample(state.occlusion.samples, playerX) : null;
    const point = Number.isFinite(playerX) && Number.isFinite(playerY)
      ? this.getWeatherAtWorldPoint(playerX, playerY)
      : { wetness: this.worldWetnessAmount, undergroundAmount: state.depth.undergroundAmount };
    const depthShelter = clamp01(point.undergroundAmount);
    const roofShelter = sample?.covered ? 1 : 0;
    this.playerShelterAmount = Math.max(depthShelter, roofShelter);
    this.playerExposure = this._resolveExposure(this.playerShelterAmount, point.undergroundAmount);
    this._playerState = {
      exposure: this.playerExposure,
      shelterAmount: this.playerShelterAmount,
      wetness: point.wetness,
      onWetSurface: point.wetness > this.weatherConfig.worldWetness.exposedWetnessThreshold && this.playerShelterAmount < 0.35,
      worldX: playerX || 0,
      worldY: playerY || 0,
      tileX: Math.floor((playerX || 0) / tileSize),
      tileY: Math.floor((playerY || 0) / tileSize),
    };
  }

  _nearestSample(samples, worldX) {
    let best = null;
    let bestDistance = Infinity;
    samples.forEach((sample) => {
      const distance = Math.abs(sample.worldX - worldX);
      if (distance < bestDistance) {
        best = sample;
        bestDistance = distance;
      }
    });
    return best;
  }

  _resolveExposure(shelter, underground) {
    if (underground > 0.72) return "deepUnderground";
    if (underground > 0.20) return "underground";
    if (shelter > 0.82) return "sheltered";
    if (shelter > 0.25) return "partial";
    return "exposed";
  }

  _emptyPlayerState() {
    return {
      exposure: "exposed",
      shelterAmount: 0,
      wetness: 0,
      onWetSurface: false,
      worldX: 0,
      worldY: 0,
      tileX: 0,
      tileY: 0,
    };
  }
}
