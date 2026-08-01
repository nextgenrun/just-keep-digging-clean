import { clampFireLight01, mixFireLight } from "./fireLightMath.js";

const frameAt = (time, fps, frameCount, offset = 0) => (
  (Math.floor(Math.max(0, time) * fps / 1000) + offset) % frameCount
);

export class OldSchoolLampLightRenderer {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.available = false;
    this.images = {};
    this._snapshot = {
      available: false,
      active: false,
      frames: {},
    };
    this._create();
  }

  _create() {
    const keys = this.config.assetKeys;
    if (!Object.values(keys).every(key => this.scene.textures?.exists?.(key))) return;
    try {
      this.images.penumbra = this._makeImage(keys.penumbra, 0.5, 0.5, "penumbra");
      this.images.volume = this._makeImage(keys.lightVolume, 0.5, 0.5, "lightVolume");
      this.images.bounce = this._makeImage(keys.bounce, 0.5, 0.5, "bounce");
      this.images.hotCore = this._makeImage(
        keys.hotCore,
        0.5,
        this.config.hotCore.originY,
        "hotCore"
      );
      this.images.atmosphere = this._makeImage(
        keys.atmosphere,
        0.5,
        this.config.atmosphere.originY,
        "atmosphere"
      );
      this.images.source = this._makeImage(
        keys.source,
        0.5,
        this.config.fixture.originY,
        "source"
      );
      this.available = true;
      this._snapshot.available = true;
    } catch (error) {
      console.warn("[OldSchoolLampLightRenderer] Authored lamp sprites unavailable.", error);
      this.destroy();
    }
  }

  _makeImage(key, originX, originY, depthKey) {
    const image = this.scene.add.image(0, 0, key, 0)
      .setOrigin(originX, originY)
      .setDepth(this.config.renderDepth[depthKey])
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
  }) {
    if (!this.available) return false;
    if (!active || !source) {
      this.hide();
      return true;
    }
    const tile = Math.max(1, Number(tileSize) || 1);
    const power = clampFireLight01(strength);
    const fuel = clampFireLight01(fuelRatio);
    const surface = clampFireLight01(lighting?.surfaceLightInfluence);
    const sun = clampFireLight01(lighting?.sunStrength);
    const rain = clampFireLight01(lighting?.weather?.rainAmount) * surface;
    const flickerScale = reducedFlicker ? this.config.flicker.reducedScale : 1;
    const phase = time * this.config.flicker.radiansPerMs;
    const pulse = Math.sin(phase)
      + Math.sin(
        phase * this.config.flicker.secondaryFrequency
        + this.config.flicker.secondaryPhase
      ) * 0.35;
    const alphaPulse = 1 + pulse * this.config.flicker.alphaAmount * flickerScale;
    const scalePulse = 1 + pulse * this.config.flicker.scaleAmount * flickerScale;
    const lowFuel = fuel >= this.config.fixture.lowFuelRatio
      ? 1
      : mixFireLight(
        this.config.fixture.lowFuelAlpha,
        1,
        fuel / this.config.fixture.lowFuelRatio
      );
    const lampX = source.x;
    const lampY = source.y + this.config.fixture.verticalOffsetTiles * tile;
    const dayAmount = surface * sun;
    const frameCount = this.config.atlas.frameCount;
    const frames = {
      source: frameAt(
        time,
        this.config.fixture.framesPerSecond,
        frameCount,
        this.config.fixture.framePhaseOffset
      ),
      volume: frameAt(
        time,
        this.config.lightVolume.framesPerSecond,
        frameCount,
        this.config.lightVolume.framePhaseOffset
      ),
      penumbra: frameAt(
        time,
        this.config.penumbra.framesPerSecond,
        frameCount,
        this.config.penumbra.framePhaseOffset
      ),
      bounce: frameAt(
        time,
        this.config.bounce.framesPerSecond,
        frameCount,
        this.config.bounce.framePhaseOffset
      ),
      hotCore: frameAt(
        time,
        this.config.hotCore.framesPerSecond,
        frameCount,
        this.config.hotCore.framePhaseOffset
      ),
      atmosphere: frameAt(
        time,
        this.config.atmosphere.framesPerSecond,
        frameCount,
        this.config.atmosphere.framePhaseOffset
      ),
    };
    const volumeAlpha = mixFireLight(
      1,
      this.config.lightVolume.surfaceDayAlpha,
      dayAmount
    );
    const penumbraAlpha = mixFireLight(
      1,
      this.config.penumbra.surfaceDayAlpha,
      dayAmount
    );

    this.images.penumbra
      .setFrame(frames.penumbra)
      .setPosition(lampX, lampY + this.config.penumbra.verticalOffsetTiles * tile)
      .setDisplaySize(
        radiusWorld * this.config.penumbra.diameterScale * scalePulse,
        radiusWorld
          * this.config.penumbra.diameterScale
          * this.config.penumbra.verticalScale
          * scalePulse
      )
      .setAlpha(clampFireLight01(
        this.config.penumbra.alpha * power * alphaPulse * penumbraAlpha
      ))
      .setVisible(true);
    this.images.volume
      .setFrame(frames.volume)
      .setPosition(lampX, lampY + this.config.lightVolume.verticalOffsetTiles * tile)
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
        * volumeAlpha
        * mixFireLight(1, this.config.lightVolume.rainAlphaMultiplier, rain)
      ))
      .setVisible(true);
    this.images.bounce
      .setFrame(frames.bounce)
      .setPosition(lampX, lampY + this.config.bounce.verticalOffsetTiles * tile)
      .setDisplaySize(
        radiusWorld * this.config.bounce.widthScale,
        radiusWorld * this.config.bounce.heightScale
      )
      .setAlpha(clampFireLight01(
        this.config.bounce.alpha * power * alphaPulse * lowFuel
      ))
      .setVisible(true);
    this.images.hotCore
      .setFrame(frames.hotCore)
      .setPosition(lampX, lampY + this.config.hotCore.verticalOffsetTiles * tile)
      .setDisplaySize(
        tile * this.config.hotCore.displayWidthTiles * scalePulse,
        tile * this.config.hotCore.displayHeightTiles * scalePulse
      )
      .setAlpha(clampFireLight01(
        this.config.hotCore.alpha * power * alphaPulse * lowFuel
      ))
      .setVisible(true);
    this.images.atmosphere
      .setFrame(frames.atmosphere)
      .setPosition(lampX, lampY + this.config.atmosphere.verticalOffsetTiles * tile)
      .setDisplaySize(
        tile * this.config.atmosphere.displayWidthTiles,
        tile * this.config.atmosphere.displayHeightTiles
      )
      .setFlipX(source.facingSign < 0)
      .setAlpha(clampFireLight01(
        this.config.atmosphere.alpha
        * power
        * lowFuel
        * mixFireLight(1, this.config.atmosphere.rainAlphaMultiplier, rain)
      ))
      .setVisible(true);
    this.images.source
      .setFrame(frames.source)
      .setPosition(lampX, lampY)
      .setDisplaySize(
        tile * this.config.fixture.displayWidthTiles * scalePulse,
        tile * this.config.fixture.displayHeightTiles * scalePulse
      )
      .setRotation(
        Math.sin(time * this.config.fixture.swayRadiansPerMs)
        * this.config.fixture.swayRadians
        * flickerScale
      )
      .setAlpha(clampFireLight01(
        this.config.fixture.alpha * power * alphaPulse * lowFuel
      ))
      .setVisible(true);

    this._snapshot = {
      available: true,
      active: true,
      frames,
      source: {
        x: lampX,
        y: lampY,
        anchorSource: source.source,
      },
      fuelRatio: fuel,
      stability: "shielded",
    };
    return true;
  }

  hide() {
    for (const image of Object.values(this.images)) {
      image?.setVisible(false)?.setAlpha(0);
    }
    this._snapshot = { ...this._snapshot, active: false };
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      frames: { ...this._snapshot.frames },
      source: this._snapshot.source ? { ...this._snapshot.source } : null,
    };
  }

  destroy() {
    for (const image of Object.values(this.images)) image?.destroy?.();
    this.images = {};
    this.available = false;
  }
}
