import { clamp01 } from "../../values/mathUtils.js";
import { WeatherWorldCollision } from "./WeatherWorldCollision.js";

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
    this._worldPerScreenPixelX = 1;
    this._debugEnabled = Boolean(weatherConfig.debug?.enabled);
    this._debugGraphics = null;
    this._deepInactive = false;
    this._worldCollision = new WeatherWorldCollision(scene, config, weatherConfig);
  }

  update(time, state = {}) {
    // Past the existing full weather fade, no precipitation/shelter geometry
    // is visible or influences the fully underground player's exposure.
    const deepInactive = state.depth?.deepFade === 0 && !this._debugEnabled;
    if (deepInactive) {
      if (!this._deepInactive || !this._snapshot.worldView) {
        this.resize();
        this._snapshot = this._emptySnapshot();
        this._snapshot.openSkyAmount = 0;
        this._snapshot.coveredAmount = 1;
        this._snapshot.worldView = {};
      }
      this._deepInactive = true;
      const cam = this.scene.cameras.main;
      Object.assign(this._snapshot.worldView, {
        x: cam.worldView?.x ?? cam.scrollX ?? 0,
        y: cam.worldView?.y ?? cam.scrollY ?? 0,
        width: cam.worldView?.width ?? cam.width,
        height: cam.worldView?.height ?? cam.height,
      });
      return this._snapshot;
    }
    if (this._deepInactive) {
      this._deepInactive = false;
      this._nextSampleAt = 0;
    }
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
    this._worldPerScreenPixelX = 1;
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
    const worldPerScreenPixelX = worldView.width / Math.max(1, width);
    const worldPerScreenPixelY = worldView.height / Math.max(1, height);
    this._worldPerScreenPixelX = worldPerScreenPixelX;
    const scanTop = Math.max(0, worldView.y - (cfg.scanAboveViewportPx || 1100));
    const scanBottom = worldView.y + worldView.height + (cfg.scanBelowViewportPx || 180);

    const samples = [];
    for (let screenX = -spacing; screenX <= width + spacing; screenX += spacing) {
      const worldX = worldView.x + (screenX / Math.max(1, width)) * worldView.width;
      const blocker = this._worldCollision.findFirstBlocker(worldX, scanTop, scanBottom);
      const blockerScreenY = blocker ? this._worldToScreenY(blocker.worldY, worldView, height) : height + cfg.fallPastViewportPx;
      const covered = Boolean(blocker && blocker.worldY <= worldView.y + cfg.coverTopPaddingPx);
      const landingScreenY = blocker ? blockerScreenY : height + cfg.fallPastViewportPx;
      const impactScreenY = landingScreenY;
      const impactWorldY = blocker?.worldY ?? scanBottom;
      samples.push({
        screenX,
        worldX,
        openToSky: !covered,
        covered,
        blocker,
        blockerScreenY,
        blockerWorldY: blocker?.worldY ?? null,
        blockerUndersideWorldY: blocker?.undersideWorldY ?? null,
        landingScreenY,
        landingWorldY: blocker?.worldY ?? scanBottom,
        impactScreenY,
        impactWorldY,
        impactSource: blocker?.source || "air",
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
      worldView,
      worldPerScreenPixelX,
      worldPerScreenPixelY,
      supportsWorldRaycast: this._worldCollision.supportsRaycast,
      nearestImpactForScreenX: (screenX) => this._nearestImpactForScreenX(screenX),
      nearestImpactForWorldX: (worldX) => this._nearestImpactForWorldX(worldX),
      raycastWorldSegment: (startX, startY, endX, endY) => (
        this._worldCollision.raycastSegment(startX, startY, endX, endY)
      ),
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

  _nearestImpactForScreenX(screenX) {
    if (this.samples.length === 0) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const sample of this.samples) {
      if (!sample.openToSky) continue;
      const distance = Math.abs(sample.screenX - screenX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sample;
      }
    }
    const maxDistance = this.weatherConfig.rain?.impact?.maxNearestSampleDistancePx ?? Infinity;
    return best && bestDistance <= maxDistance ? best : null;
  }

  _nearestImpactForWorldX(worldX) {
    if (this.samples.length === 0) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const sample of this.samples) {
      const distance = Math.abs(sample.worldX - worldX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sample;
      }
    }
    const screenDistance = this.weatherConfig.rain?.impact?.maxNearestSampleDistancePx
      ?? this.weatherConfig.snow?.maxNearestSampleDistancePx
      ?? Infinity;
    const maxDistance = screenDistance * this._worldPerScreenPixelX;
    return best && bestDistance <= maxDistance ? best : null;
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
      worldView: null,
      worldPerScreenPixelX: 1,
      worldPerScreenPixelY: 1,
      supportsWorldRaycast: false,
      nearestImpactForScreenX: () => null,
      nearestImpactForWorldX: () => null,
      raycastWorldSegment: () => null,
    };
  }
}
