import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { SKYLINE_WEATHER_VFX } from "../../../values/skylineWeatherVfx.js";
import {
  WORLD_VISUAL_SURFACE_ATMOSPHERE,
  resolveWorldVisualSurfaceAtmosphereEnabled,
} from "../../../values/worldVisualSurfaceAtmosphere.js";
import { SkylineWeatherVfxAtlas } from "../../../systems/environment/SkylineWeatherVfxAtlas.js";
import {
  setAlphaIfChanged,
  setDisplaySizeIfChanged,
  setPositionIfChanged,
  setRotationIfChanged,
  setTintIfChanged,
  setVisibleIfChanged,
} from "./worldVisualRenderState.js";

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class WorldVisualSurfaceAtmosphereLayer {
  constructor(scene, config = WORLD_VISUAL_SURFACE_ATMOSPHERE) {
    this.scene = scene;
    this.config = config;
    this.textureKey = ASSET_KEYS.environment.skylineWeatherVfx[config.textureSheet];
    this.atlas = new SkylineWeatherVfxAtlas(
      scene,
      { [config.textureSheet]: this.textureKey },
      { sheets: { [config.textureSheet]: SKYLINE_WEATHER_VFX.sheets[config.textureSheet] } },
    );
    this.active = new Map();
    this.created = false;
    this.inspector = null;
  }

  create(search = globalThis.location?.search || "") {
    if (!resolveWorldVisualSurfaceAtmosphereEnabled(this.config, search)) return false;
    if (!this.atlas.register()) {
      console.warn("[WorldVisualSurfaceAtmosphereLayer] Approved atmosphere atlas unavailable");
      return false;
    }
    this._validateAnchors();
    this.created = true;
    this.inspector = Object.freeze({ snapshot: () => this.getSnapshot() });
    globalThis.__jkdSurfaceAtmosphere = this.inspector;
    console.info(
      `[WorldVisualSurfaceAtmosphereLayer] ${this.config.anchors.length} subtle prop anchors ready; `
      + "use ?surfaceAtmosphere=0 to roll back atmosphere only"
    );
    return true;
  }

  sync(bounds, lighting) {
    if (!this.created || !bounds) return false;
    const surfaceRow = this.scene.config.topAirRows;
    const verticalMargin = this.config.streaming.surfaceVisibilityMarginRows;
    const surfaceVisible = bounds.top <= surfaceRow + verticalMargin
      && bounds.bottom >= surfaceRow - verticalMargin;
    if (!surfaceVisible) {
      this._clearActive();
      return false;
    }

    const margin = this.config.streaming.horizontalMarginTiles;
    const desired = new Set(
      this.config.anchors
        .filter(anchor => (
          anchor.tileX >= bounds.left - margin
          && anchor.tileX <= bounds.right + margin
        ))
        .map(anchor => anchor.id)
    );
    for (const [id, actor] of this.active) {
      if (!desired.has(id)) {
        actor.sprite.destroy();
        this.active.delete(id);
      }
    }
    for (const anchor of this.config.anchors) {
      if (desired.has(anchor.id) && !this.active.has(anchor.id)) {
        this._createActor(anchor);
      }
    }
    this.update(this.scene.time?.now || 0, lighting);
    return true;
  }

  update(time, lighting) {
    if (!this.created || !lighting) return;
    const now = Number.isFinite(time) ? time : 0;
    const tileSize = this.scene.config.tileSize;
    const surfaceY = this.scene.config.topAirRows * tileSize;
    const weatherLift = 1 + lighting.fog * 0.22 + lighting.wet * 0.10;
    const nightLift = 1 + lighting.night * 0.12;
    for (const { anchor, sprite } of this.active.values()) {
      const angle = now / anchor.periodMs * TAU + anchor.phase * TAU;
      const wave = Math.sin(angle);
      const crossWave = Math.cos(angle * 0.73 + anchor.phase * Math.PI);
      const lift = (wave * 0.5 + 0.5) * anchor.riseTiles * tileSize;
      const authoredDrift = crossWave * anchor.driftTiles * tileSize;
      const windDrift = lighting.wind * this.config.motion.windWorldPxScale
        * anchor.driftTiles * tileSize;
      const pulse = Math.max(
        this.config.motion.minimumScale,
        Math.min(
          this.config.motion.maximumScale,
          1 + wave * this.config.motion.groundPulseAmount,
        ),
      );
      const alpha = clamp01(
        anchor.alpha
        * weatherLift
        * nightLift
        * (0.84 + (wave * 0.5 + 0.5) * 0.16),
      );
      setPositionIfChanged(
        sprite,
        anchor.tileX * tileSize + authoredDrift + windDrift,
        surfaceY + anchor.yOffsetTiles * tileSize - lift,
      );
      setDisplaySizeIfChanged(
        sprite,
        anchor.widthTiles * tileSize * pulse,
        anchor.heightTiles * tileSize / pulse,
      );
      setRotationIfChanged(sprite, crossWave * 0.018);
      setTintIfChanged(
        sprite,
        anchor.lane === "rear" ? lighting.farTint : lighting.terrainTint
      );
      setAlphaIfChanged(sprite, alpha);
      setVisibleIfChanged(sprite, true);
    }
  }

  _createActor(anchor) {
    const frame = this.atlas.frame(this.config.textureSheet, anchor.frameIndex);
    const sprite = this.scene.add.image(
      anchor.tileX * this.scene.config.tileSize,
      this.scene.config.topAirRows * this.scene.config.tileSize,
      this.textureKey,
      frame,
    )
      .setOrigin(0.5)
      .setDepth(this.config.renderDepths[anchor.lane])
      .setScrollFactor(1)
      .setVisible(false);
    const screenBlend = globalThis.Phaser?.BlendModes?.SCREEN;
    if (screenBlend !== undefined) sprite.setBlendMode(screenBlend);
    sprite.name = `surface-atmosphere-${anchor.id}`;
    sprite.setData("surfaceAtmosphereAnchorId", anchor.id);
    sprite.setData("surfaceAtmosphereKind", anchor.kind);
    this.active.set(anchor.id, { anchor, sprite });
    return sprite;
  }

  _validateAnchors() {
    const ids = new Set();
    const frameCount = SKYLINE_WEATHER_VFX.sheets[this.config.textureSheet]
      .layoutRows.reduce((sum, count) => sum + count, 0);
    for (const anchor of this.config.anchors) {
      if (ids.has(anchor.id)) {
        throw new Error(`[WorldVisualSurfaceAtmosphereLayer] Duplicate anchor ${anchor.id}`);
      }
      ids.add(anchor.id);
      if (!(anchor.lane in this.config.renderDepths)) {
        throw new Error(`[WorldVisualSurfaceAtmosphereLayer] Invalid lane for ${anchor.id}`);
      }
      if (anchor.frameIndex < 0 || anchor.frameIndex >= frameCount) {
        throw new Error(`[WorldVisualSurfaceAtmosphereLayer] Invalid frame for ${anchor.id}`);
      }
    }
  }

  _clearActive() {
    for (const { sprite } of this.active.values()) sprite.destroy();
    this.active.clear();
  }

  getSnapshot() {
    return Object.freeze({
      version: this.config.version,
      created: this.created,
      totalAnchors: this.config.anchors.length,
      activeAnchors: this.active.size,
      textureKey: this.textureKey,
    });
  }

  destroy() {
    this.created = false;
    this._clearActive();
    if (globalThis.__jkdSurfaceAtmosphere === this.inspector) {
      delete globalThis.__jkdSurfaceAtmosphere;
    }
    this.inspector = null;
  }
}
