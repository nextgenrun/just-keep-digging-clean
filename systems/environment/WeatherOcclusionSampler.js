const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class WeatherOcclusionSampler {
  constructor(scene, config, weatherConfig) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.samples = [];
    this.openSamples = [];
    this.coveredSamples = [];
    this.landingSamples = [];
    this._snapshot = this._emptySnapshot();
    this._nextSampleAt = 0;
    this._debugEnabled = Boolean(weatherConfig.debug?.enabled);
    this._debugGraphics = null;
  }

  update(time) {
    const cfg = this.weatherConfig.occlusion;
    if (time >= this._nextSampleAt || this.samples.length === 0) {
      this._sampleColumns();
      this._nextSampleAt = time + cfg.resampleMs;
    }
    this._drawDebug();
    return this._snapshot;
  }

  resize() {
    this.samples = [];
    this.openSamples = [];
    this.coveredSamples = [];
    this.landingSamples = [];
    this._nextSampleAt = 0;
    this._debugGraphics?.clear?.();
  }

  getSnapshot() {
    return this._snapshot;
  }

  setDebugEnabled(enabled) {
    this._debugEnabled = Boolean(enabled);
    if (!this._debugEnabled) this._debugGraphics?.clear?.();
  }

  destroy() {
    this._debugGraphics?.destroy?.();
    this._debugGraphics = null;
  }

  _sampleColumns() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const width = cam.width || this.config.viewportWidth || 1280;
    const height = cam.height || this.config.viewportHeight || 720;
    const worldView = {
      x: view?.x ?? cam.scrollX ?? 0,
      y: view?.y ?? cam.scrollY ?? 0,
      width: view?.width ?? width,
      height: view?.height ?? height,
    };
    const cfg = this.weatherConfig.occlusion;
    const spacing = Math.max(16, cfg.sampleSpacingPx || 56);
    const scanTop = Math.max(0, worldView.y - (cfg.scanAboveViewportPx || 1100));
    const scanBottom = worldView.y + worldView.height + (cfg.scanBelowViewportPx || 180);

    const samples = [];
    for (let screenX = -spacing; screenX <= width + spacing; screenX += spacing) {
      const worldX = worldView.x + (screenX / Math.max(1, width)) * worldView.width;
      const blocker = this._findFirstBlocker(worldX, scanTop, scanBottom);
      const blockerScreenY = blocker ? this._worldToScreenY(blocker.worldY, worldView, height) : height + cfg.fallPastViewportPx;
      const covered = Boolean(blocker && blocker.worldY <= worldView.y + cfg.coverTopPaddingPx);
      const landingScreenY = blocker ? blockerScreenY : height + cfg.fallPastViewportPx;
      samples.push({
        screenX,
        worldX,
        openToSky: !covered,
        covered,
        blocker,
        blockerScreenY,
        landingScreenY,
        landingWorldY: blocker?.worldY ?? scanBottom,
        source: blocker?.source || "air",
      });
    }

    this.samples = samples;
    this.openSamples = samples.filter((sample) => sample.openToSky);
    this.coveredSamples = samples.filter((sample) => sample.covered);
    this.landingSamples = samples.filter((sample) => sample.openToSky && sample.landingScreenY > -32 && sample.landingScreenY < height + 72);
    const total = Math.max(1, samples.length);
    this._snapshot = {
      samples,
      openSamples: this.openSamples,
      coveredSamples: this.coveredSamples,
      landingSamples: this.landingSamples,
      openSkyAmount: clamp01(this.openSamples.length / total),
      coveredAmount: clamp01(this.coveredSamples.length / total),
    };
  }

  _drawDebug() {
    if (!this._debugEnabled) return;
    const cfg = this.weatherConfig.debug;
    const cam = this.scene.cameras.main;
    if (!this._debugGraphics) {
      this._debugGraphics = this.scene.add.graphics()
        .setScrollFactor(0)
        .setDepth(cfg.drawDepth);
    }

    this._debugGraphics.clear();
    this.samples.forEach((sample) => {
      const color = sample.covered ? cfg.coveredColor : cfg.openSkyColor;
      this._debugGraphics.lineStyle(1, color, cfg.lineAlpha);
      this._debugGraphics.beginPath();
      this._debugGraphics.moveTo(sample.screenX, 0);
      this._debugGraphics.lineTo(sample.screenX, Math.min(cam.height, sample.landingScreenY));
      this._debugGraphics.strokePath();
      if (sample.landingScreenY >= 0 && sample.landingScreenY <= cam.height) {
        this._debugGraphics.fillStyle(cfg.landingColor, cfg.lineAlpha);
        this._debugGraphics.fillCircle(sample.screenX, sample.landingScreenY, 3);
      }
    });
  }

  _findFirstBlocker(worldX, scanTop, scanBottom) {
    const visual = this._findVisualBlocker(worldX, scanTop, scanBottom);
    const tile = this._findTileBlocker(worldX, scanTop, scanBottom);
    if (visual && tile) return visual.worldY <= tile.worldY ? visual : tile;
    return visual || tile;
  }

  _findVisualBlocker(worldX, scanTop, scanBottom) {
    let best = null;
    for (const rect of this._getVisualCoverRects()) {
      if (worldX < rect.x || worldX > rect.x + rect.width) continue;
      if (rect.y < scanTop || rect.y > scanBottom) continue;
      if (!best || rect.y < best.worldY) {
        best = { worldY: rect.y, undersideWorldY: rect.y + rect.height, source: rect.kind || "cover" };
      }
    }
    return best;
  }

  _findTileBlocker(worldX, scanTop, scanBottom) {
    const worldModel = this.scene.worldModel;
    if (!worldModel?.isSolid) return null;

    const tileSize = this.config.tileSize || 94;
    const tx = Math.floor(worldX / tileSize);
    const startTy = Math.max(0, Math.floor(scanTop / tileSize));
    const endTy = Math.min(this.config.worldDepthTiles || 2000, Math.ceil(scanBottom / tileSize));
    for (let ty = startTy; ty <= endTy; ty += 1) {
      if (worldModel.isSolid(tx, ty)) {
        return { worldY: ty * tileSize, undersideWorldY: (ty + 1) * tileSize, source: "tile" };
      }
    }
    return null;
  }

  _getVisualCoverRects() {
    const tileSize = this.config.tileSize || 94;
    const floorY = (this.config.topAirRows || 65) * tileSize;
    const spawnTileX = this.config.spawnTileX || 28;
    return (this.weatherConfig.visualCovers || []).map((cover) => {
      if (cover.kind === "townRoof") {
        const startTileX = cover.startTileX;
        const endTileX = spawnTileX + cover.endTileOffsetFromSpawn;
        return {
          kind: cover.kind,
          x: startTileX * tileSize,
          y: Math.round(floorY - tileSize * cover.yTilesAboveFloor),
          width: (endTileX - startTileX + 1) * tileSize,
          height: tileSize * cover.heightTiles,
        };
      }
      return {
        kind: cover.kind || "cover",
        x: cover.xTile * tileSize,
        y: cover.yTile * tileSize,
        width: cover.widthTiles * tileSize,
        height: cover.heightTiles * tileSize,
      };
    });
  }

  _worldToScreenY(worldY, worldView, screenHeight) {
    return ((worldY - worldView.y) / Math.max(1, worldView.height)) * screenHeight;
  }

  _emptySnapshot() {
    return {
      samples: [],
      openSamples: [],
      coveredSamples: [],
      landingSamples: [],
      openSkyAmount: 1,
      coveredAmount: 0,
    };
  }
}
