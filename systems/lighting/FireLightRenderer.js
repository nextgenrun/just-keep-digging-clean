import { clampFireLight01, mixFireLight } from "./fireLightMath.js";
const frameAt = (time, fps, frameCount, offset = 0) => (
  (Math.floor(Math.max(0, time) * fps / 1000) + offset) % frameCount
);
export class FireLightRenderer {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.available = false;
    this.volume = null;
    this.flame = null;
    this.atmosphere = null;
    this._flameTextureKey = null;
    this._lastActive = false;
    this._rekindleStartedAt = Number.NEGATIVE_INFINITY;
    this._snapshot = {
      available: false,
      active: false,
      state: "off",
      flameFrame: 0,
    };
    this._create();
  }

  _create() {
    const keys = this.config.assetKeys;
    const required = [
      keys.steadyFlame,
      keys.stateFlame,
      keys.lightVolume,
      keys.atmosphere,
    ];
    if (!required.every(key => this.scene.textures?.exists?.(key))) return;

    try {
      this.volume = this._makeImage(
        keys.lightVolume,
        0.5,
        0.5,
        this.config.renderDepth.lightVolume
      );
      this.atmosphere = this._makeImage(
        keys.atmosphere,
        0.5,
        this.config.atmosphere.originY,
        this.config.renderDepth.atmosphere
      );
      this.flame = this._makeImage(
        keys.steadyFlame,
        0.5,
        this.config.flame.originY,
        this.config.renderDepth.flame
      );
      this._flameTextureKey = keys.steadyFlame;
      this.available = true;
      this._snapshot.available = true;
    } catch (error) {
      console.warn("[FireLightRenderer] Authored fire sprites unavailable.", error);
      this.destroy();
    }
  }

  _makeImage(key, originX, originY, depth) {
    const image = this.scene.add.image(0, 0, key, 0)
      .setOrigin(originX, originY)
      .setDepth(depth)
      .setVisible(false)
      .setAlpha(0);
    const blend = globalThis.Phaser?.BlendModes?.ADD;
    if (blend !== undefined) image.setBlendMode(blend);
    return image;
  }

  render({
    time,
    active,
    source,
    tileSize,
    radiusWorld,
    strength,
    fuelRatio,
    lighting,
    reducedFlicker,
    volumeAlphaScale = 1,
    flameAlphaScale = 1,
    atmosphereAlphaScale = 1,
  }) {
    if (!this.available) return false;
    if (!active || !source) {
      this.hide();
      this._lastActive = false;
      return true;
    }
    if (!this._lastActive) this._rekindleStartedAt = time;
    this._lastActive = true;

    const safeTileSize = Math.max(1, Number(tileSize) || 1);
    const power = clampFireLight01(strength);
    const fuel = clampFireLight01(fuelRatio);
    const weather = lighting?.weather || {};
    const surface = clampFireLight01(lighting?.surfaceLightInfluence);
    const rain = clampFireLight01(weather.rainAmount) * surface;
    const wind = clampFireLight01(
      Math.abs(Number(weather.wind) || 0) / this.config.flame.windReferenceSpeed
    ) * surface;
    const flickerScale = reducedFlicker ? this.config.flicker.reducedScale : 1;
    const phase = time * this.config.flicker.radiansPerMs;
    const secondary = Math.sin(
      phase * this.config.flicker.secondaryFrequency
      + this.config.flicker.secondaryPhase
    );
    const pulse = (
      Math.sin(phase) * (1 - this.config.flicker.verticalFlutterRatio)
      + secondary * this.config.flicker.verticalFlutterRatio
    );
    const sourceX = source.x
      + pulse * this.config.flicker.positionFlutterTiles * safeTileSize * flickerScale;
    const sourceY = source.y
      - Math.abs(secondary)
      * this.config.flicker.positionFlutterTiles
      * safeTileSize
      * this.config.flicker.verticalFlutterRatio
      * flickerScale;
    const alphaPulse = 1 + pulse * this.config.flicker.alphaAmount * flickerScale;
    const scalePulse = 1 + secondary * this.config.flicker.scaleAmount * flickerScale;
    const state = this._resolveState(time, fuel, rain, wind);
    const flameFrame = this._resolveFlameFrame(time, state);
    const volumeFrame = frameAt(
      time,
      this.config.lightVolume.framesPerSecond,
      this.config.atlas.frameCount,
      this.config.lightVolume.framePhaseOffset
    );
    const atmosphereFrame = frameAt(
      time,
      this.config.atmosphere.framesPerSecond,
      this.config.atlas.frameCount,
      this.config.atmosphere.framePhaseOffset
    );
    const daylightAlpha = mixFireLight(
      1,
      this.config.lightVolume.surfaceDayAlpha,
      surface * clampFireLight01(lighting?.sunStrength)
    );
    const rainVolumeAlpha = mixFireLight(
      1,
      this.config.lightVolume.rainAlphaMultiplier,
      rain
    );
    const lowFuelScale = fuel >= this.config.flame.lowFuelRatio
      ? 1
      : mixFireLight(0.58, 1, fuel / this.config.flame.lowFuelRatio);
    const alphaPulseFloor = reducedFlicker
      ? this.config.flame.reducedFlickerAlphaFloor
      : 0;
    const flameAlpha = this.config.flame.alpha
      * clampFireLight01(flameAlphaScale)
      * power
      * lowFuelScale
      * Math.max(alphaPulseFloor, alphaPulse);

    this.volume
      .setFrame(volumeFrame)
      .setPosition(sourceX, sourceY + this.config.lightVolume.verticalOffsetTiles * safeTileSize)
      .setDisplaySize(
        radiusWorld * this.config.lightVolume.diameterScale * scalePulse,
        radiusWorld
          * this.config.lightVolume.diameterScale
          * this.config.lightVolume.verticalScale
          * scalePulse
      )
      .setAlpha(clampFireLight01(
        this.config.lightVolume.alpha
        * power
        * alphaPulse
        * daylightAlpha
        * rainVolumeAlpha
        * clampFireLight01(volumeAlphaScale)
      ))
      .setVisible(clampFireLight01(volumeAlphaScale) > 0);

    this._setFlameFrame(state, flameFrame);
    this.flame
      .setPosition(sourceX, sourceY)
      .setDisplaySize(
        safeTileSize * this.config.flame.displayWidthTiles * scalePulse * lowFuelScale,
        safeTileSize * this.config.flame.displayHeightTiles * scalePulse * lowFuelScale
      )
      .setFlipX(source.facingSign < 0)
      .setAlpha(clampFireLight01(flameAlpha))
      .setVisible(true);

    const atmosphereAlpha = this.config.atmosphere.alpha
      * clampFireLight01(atmosphereAlphaScale)
      * power
      * mixFireLight(1, this.config.atmosphere.rainAlphaMultiplier, rain)
      * mixFireLight(
        this.config.atmosphere.lowFuelAlphaMultiplier,
        1,
        fuel / this.config.flame.lowFuelRatio
      );
    this.atmosphere
      .setFrame(atmosphereFrame)
      .setPosition(
        sourceX,
        sourceY + this.config.atmosphere.verticalOffsetTiles * safeTileSize
      )
      .setDisplaySize(
        safeTileSize * this.config.atmosphere.displayWidthTiles,
        safeTileSize * this.config.atmosphere.displayHeightTiles
      )
      .setFlipX(source.facingSign < 0)
      .setAlpha(clampFireLight01(atmosphereAlpha))
      .setVisible(clampFireLight01(atmosphereAlphaScale) > 0);

    this._snapshot = {
      available: true,
      active: true,
      state,
      flameFrame,
      volumeFrame,
      atmosphereFrame,
      volumeAlphaScale: clampFireLight01(volumeAlphaScale),
      flameAlphaScale: clampFireLight01(flameAlphaScale),
      atmosphereAlphaScale: clampFireLight01(atmosphereAlphaScale),
      visibleLayerCount: 1
        + (volumeAlphaScale > 0 ? 1 : 0)
        + (atmosphereAlphaScale > 0 ? 1 : 0),
      source: { x: sourceX, y: sourceY, anchorSource: source.source },
      fuelRatio: fuel,
    };
    return true;
  }

  _resolveState(time, fuel, rain, wind) {
    if (time - this._rekindleStartedAt < this.config.flame.rekindleDurationMs) return "rekindle";
    if (fuel <= this.config.flame.lowFuelRatio) return "lowFuel";
    if (rain >= this.config.flame.rainStateThreshold) return "rain";
    if (wind >= this.config.flame.windStateThreshold) return "wind";
    return "steady";
  }

  _resolveFlameFrame(time, state) {
    if (state === "steady") {
      return frameAt(
        time,
        this.config.flame.framesPerSecond,
        this.config.atlas.frameCount
      );
    }
    const row = this.config.flame.stateRows[state] ?? 0;
    const localFrame = frameAt(
      time,
      this.config.flame.stateFramesPerSecond,
      this.config.atlas.columns
    );
    return row * this.config.atlas.columns + localFrame;
  }

  _setFlameFrame(state, frame) {
    const key = state === "steady"
      ? this.config.assetKeys.steadyFlame
      : this.config.assetKeys.stateFlame;
    if (this._flameTextureKey !== key) {
      this.flame.setTexture(key, frame);
      this._flameTextureKey = key;
      return;
    }
    this.flame.setFrame(frame);
  }

  hide() {
    for (const image of [this.volume, this.flame, this.atmosphere]) {
      image?.setVisible(false)?.setAlpha(0);
    }
    this._snapshot = {
      ...this._snapshot,
      active: false,
      state: "off",
    };
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      source: this._snapshot.source ? { ...this._snapshot.source } : null,
    };
  }

  destroy() {
    this.volume?.destroy?.();
    this.flame?.destroy?.();
    this.atmosphere?.destroy?.();
    this.volume = null;
    this.flame = null;
    this.atmosphere = null;
    this.available = false;
  }
}
