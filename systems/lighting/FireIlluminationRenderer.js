import { clampFireLight01, mixFireLight } from "./fireLightMath.js";
import {
  resolveFireIlluminationEnvironmentAlpha,
  resolveFireIlluminationFrame,
  resolveFireIlluminationFuelScale,
  resolveFireIlluminationMotion,
  resolveFireIlluminationStateFrame,
} from "./fireIlluminationMath.js";

export class FireIlluminationRenderer {
  constructor(scene, config, enabled = true) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(enabled);
    this.available = false;
    this.layers = {};
    this._snapshot = {
      available: false,
      enabled: this.enabled,
      active: false,
      state: "off",
      visibleLayerCount: 0,
      frames: {},
    };
    this._create();
  }

  _create() {
    if (!this.enabled || !this.scene.add?.image) return;
    const keys = this.config.assetKeys;
    if (!Object.values(keys).every(key => this.scene.textures?.exists?.(key))) {
      return;
    }
    try {
      for (const name of [
        ...this.config.layerOrder,
        "environment",
      ]) {
        const layer = this.config.layers[name];
        this.layers[name] = this._makeImage(
          keys[name],
          layer.originY,
          this.config.renderDepth[name]
        );
      }
      this.available = true;
      this._snapshot.available = true;
    } catch (error) {
      console.warn(
        "[FireIlluminationRenderer] Authored light textures unavailable.",
        error
      );
      this.destroy();
    }
  }

  _makeImage(key, originY, depth) {
    const image = this.scene.add.image(0, 0, key, 0)
      .setOrigin(0.5, originY)
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
    fireState,
    reducedFlicker,
  }) {
    if (!this.available || !this.enabled) return false;
    if (!active || !source) {
      this.hide();
      return true;
    }

    const config = this.config;
    const safeTileSize = Math.max(1, Number(tileSize) || 1);
    const safeRadius = Math.max(safeTileSize, Number(radiusWorld) || safeTileSize);
    const power = clampFireLight01(strength);
    const fuel = clampFireLight01(fuelRatio);
    const rain = clampFireLight01(lighting?.weather?.rainAmount);
    const environmentAlpha = resolveFireIlluminationEnvironmentAlpha(
      lighting,
      config.environmentIntensity
    );
    const fuelScale = resolveFireIlluminationFuelScale(
      fuel,
      config.environmentIntensity
    );
    const motion = resolveFireIlluminationMotion(
      time,
      reducedFlicker,
      config.motion
    );
    const baseAlpha = power * fuelScale * environmentAlpha * motion.alphaPulse;
    const frames = {};
    let visibleLayerCount = 0;

    for (const name of config.layerOrder) {
      const layer = config.layers[name];
      const frame = resolveFireIlluminationFrame(
        motion.animationTime,
        layer.framesPerSecond,
        config.atlas.frameCount,
        layer.framePhaseOffset
      );
      frames[name] = frame;
      visibleLayerCount += this._applyLayer({
        name,
        frame,
        source,
        tileSize: safeTileSize,
        radiusWorld: safeRadius,
        alpha: baseAlpha * layer.alpha
          * mixFireLight(1, layer.rainMultiplier, rain),
        scalePulse: motion.scalePulse,
        flipX: layer.flipWithFacing && source.facingSign < 0,
      });
    }

    const environmentState = resolveFireIlluminationStateFrame(
      motion.animationTime,
      fireState,
      config.layers.environment,
      config.atlas
    );
    frames.environment = environmentState.frame;
    if (environmentState.frame === null) {
      this.layers.environment?.setVisible(false)?.setAlpha(0);
    } else {
      visibleLayerCount += this._applyLayer({
        name: "environment",
        frame: environmentState.frame,
        source,
        tileSize: safeTileSize,
        radiusWorld: safeRadius,
        alpha: baseAlpha * environmentState.alpha,
        scalePulse: motion.scalePulse,
        flipX: source.facingSign < 0,
      });
    }

    this._snapshot = {
      available: true,
      enabled: true,
      active: visibleLayerCount > 0,
      state: fireState || "steady",
      visibleLayerCount,
      frames,
      fuelRatio: fuel,
      totalAuthoredLightFrameCount: config.atlas.totalAuthoredLightFrameCount,
    };
    return true;
  }

  _applyLayer({
    name,
    frame,
    source,
    tileSize,
    radiusWorld,
    alpha,
    scalePulse,
    flipX,
  }) {
    const image = this.layers[name];
    const layer = this.config.layers[name];
    const safeAlpha = clampFireLight01(alpha);
    if (!image || safeAlpha <= 0) {
      image?.setVisible(false)?.setAlpha(0);
      return 0;
    }
    image
      .setFrame(frame)
      .setPosition(
        source.x,
        source.y + layer.verticalOffsetTiles * tileSize
      )
      .setDisplaySize(
        radiusWorld * layer.widthRadiusScale * scalePulse,
        radiusWorld * layer.heightRadiusScale * scalePulse
      )
      .setFlipX(Boolean(flipX))
      .setAlpha(safeAlpha)
      .setVisible(true);
    return 1;
  }

  hide() {
    for (const image of Object.values(this.layers)) {
      image?.setVisible(false)?.setAlpha(0);
    }
    this._snapshot = {
      ...this._snapshot,
      active: false,
      state: "off",
      visibleLayerCount: 0,
    };
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      frames: { ...this._snapshot.frames },
    };
  }

  destroy() {
    for (const image of Object.values(this.layers)) image?.destroy?.();
    this.layers = {};
    this.available = false;
  }
}
