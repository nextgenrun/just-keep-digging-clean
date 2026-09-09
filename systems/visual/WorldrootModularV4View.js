import {
  WORLDROOT_MODULAR_V4_CONFIG,
  isWorldrootModularV4Enabled,
} from "../../values/worldrootModularV4.js?rev=20260901-worldroot-v4-clean-matte-v2";
import { WORLDROOT_WHITEBOX_CONFIG } from "../../values/worldrootWhitebox.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function resolveWorldrootModularV4ModuleBounds(geometry, moduleId) {
  const xValues = [];
  const yValues = [];
  geometry.silhouettes
    .filter(entry => entry.moduleId === moduleId)
    .forEach(entry => entry.points.forEach(point => {
      xValues.push(point.x);
      yValues.push(point.y);
    }));
  geometry.connectors
    .filter(entry => entry.moduleId === moduleId)
    .forEach(entry => entry.points.forEach(point => {
      const radius = entry.widthTiles / 2;
      xValues.push(point.x - radius, point.x + radius);
      yValues.push(point.y - radius, point.y + radius);
    }));
  if (!xValues.length || !yValues.length) return null;
  return Object.freeze({
    leftTile: Math.min(...xValues),
    rightTile: Math.max(...xValues),
    topTile: Math.min(...yValues),
    bottomTile: Math.max(...yValues),
  });
}

export function resolveWorldrootModularV4ModulePosition(
  module,
  geometryBounds,
  widthPx,
  heightPx,
  tileSize,
  runtimeScale = 1,
) {
  const centerX = (geometryBounds.leftTile + geometryBounds.rightTile) * tileSize / 2;
  const bottomY = geometryBounds.bottomTile * tileSize;
  return Object.freeze({
    x: Math.round(centerX - widthPx * runtimeScale / 2 + module.offsetXPx),
    y: Math.round(bottomY - heightPx * runtimeScale + module.offsetYPx),
  });
}

/** Native-pixel Worldroot modules. Progression and save authority remain external. */
export class WorldrootModularV4View {
  constructor(
    scene,
    config = WORLDROOT_MODULAR_V4_CONFIG,
    geometry = WORLDROOT_WHITEBOX_CONFIG,
  ) {
    this.scene = scene;
    this.config = config;
    this.geometry = geometry;
    this.enabled = isWorldrootModularV4Enabled(globalThis.location?.search || "", config);
    this.reason = null;
    this.tileSize = scene?.config?.tileSize || config.sourceTileSizePx;
    this.growthStage = -1;
    this.signature = "";
    this.entries = [];
  }

  create(snapshot = null) {
    if (!this.enabled || !this.scene?.add) return this;
    if (this.tileSize !== this.config.sourceTileSizePx) {
      this.enabled = false;
      this.reason = `Worldroot V4 requires ${this.config.sourceTileSizePx}px tiles for native alignment.`;
      return this;
    }
    for (const [index, module] of this.config.modules.entries()) {
      if (!this.scene.textures?.exists?.(module.living.key)
        || !this.scene.textures?.exists?.(module.consumed.key)) {
        this.reason = `Missing Worldroot V4 texture pair: ${module.id}`;
        this.destroy();
        this.enabled = false;
        return this;
      }
      const geometryBounds = resolveWorldrootModularV4ModuleBounds(
        this.geometry,
        module.moduleId,
      );
      if (!geometryBounds) {
        this.reason = `Missing Worldroot V4 geometry: ${module.moduleId}`;
        this.destroy();
        this.enabled = false;
        return this;
      }
      const living = this.scene.add.image(0, 0, module.living.key).setOrigin(0, 0);
      const consumed = this.scene.add.image(0, 0, module.consumed.key).setOrigin(0, 0);
      if (living.width !== consumed.width || living.height !== consumed.height) {
        living.destroy();
        consumed.destroy();
        this.reason = `Mismatched Worldroot V4 texture pair: ${module.id}`;
        this.destroy();
        this.enabled = false;
        return this;
      }
      const { x, y } = resolveWorldrootModularV4ModulePosition(
        module,
        geometryBounds,
        living.width,
        living.height,
        this.tileSize,
        this.config.runtimeScale,
      );
      const depth = this.config.presentation.depth + index * this.config.presentation.layerStep;
      living.setPosition(x, y).setScale(this.config.runtimeScale).setDepth(depth);
      consumed.setPosition(x, y).setScale(this.config.runtimeScale).setDepth(depth + 0.001);
      this.entries.push({
        module,
        geometryBounds,
        living,
        consumed,
        consumedBlend: 0,
        baseAlpha: 0,
      });
    }
    this.sync(snapshot, true);
    return this;
  }

  sync(snapshot = null, force = false) {
    if (!this.enabled || !snapshot) return false;
    const growthStage = clamp(Math.floor(Number(snapshot.growthStage) || 0), 0, 6);
    const signature = `${snapshot.signature || ""}|${growthStage}`;
    if (!force && signature === this.signature) return false;
    const regions = new Map(
      (snapshot.regionMemories || []).map(region => [region.id, region]),
    );
    const knownStars = Math.max(0, Number(snapshot.knownStarCount) || 0);
    const aggregateConsumed = knownStars > 0
      ? clamp((Number(snapshot.consumedStarCount) || 0) / knownStars, 0, 1)
      : 0;
    for (const entry of this.entries) {
      const baseAlpha = entry.module.stage <= growthStage
        ? this.config.presentation.activeAlpha
        : this.config.presentation.dormantAlpha;
      const regionRatio = entry.module.regionId
        ? Number(regions.get(entry.module.regionId)?.consumedRatio) || 0
        : aggregateConsumed;
      const consumedBlend = Math.sqrt(clamp(regionRatio, 0, 1));
      entry.baseAlpha = baseAlpha;
      entry.consumedBlend = consumedBlend;
      entry.living.setAlpha(baseAlpha * (1 - consumedBlend));
      entry.consumed.setAlpha(baseAlpha * consumedBlend);
    }
    this.growthStage = growthStage;
    this.signature = signature;
    return true;
  }

  getTransform() {
    const bounds = this.geometry.bounds;
    return {
      left: bounds.leftTile * this.tileSize,
      top: bounds.topTile * this.tileSize,
      width: (bounds.rightTile - bounds.leftTile) * this.tileSize,
      height: (bounds.bottomTile - bounds.topTile) * this.tileSize,
      scaleX: 1,
      scaleY: 1,
      tileSize: this.tileSize,
      surfaceY: bounds.bottomTile * this.tileSize,
    };
  }

  pointToWorld(sourcePoint, kind = "") {
    const authored = kind === "root"
      ? this.geometry.interaction.rootTalent
      : kind === "crown" ? this.geometry.interaction.crownStar : null;
    const point = authored || sourcePoint || { x: 0.5, y: 0.5 };
    if (authored) return { x: point.x * this.tileSize, y: point.y * this.tileSize };
    const bounds = this.geometry.bounds;
    return {
      x: (bounds.leftTile + clamp(Number(point.x) || 0.5, 0, 1)
        * (bounds.rightTile - bounds.leftTile)) * this.tileSize,
      y: (bounds.topTile + clamp(Number(point.y) || 0.5, 0, 1)
        * (bounds.bottomTile - bounds.topTile)) * this.tileSize,
    };
  }

  getOneWayPlatforms() {
    if (!this.enabled) return [];
    return this.entries.flatMap(entry => entry.module.platforms.map(platform => ({
      id: `worldroot-${platform.id}`,
      leftX: entry.living.x + platform.leftPx * this.config.runtimeScale,
      rightX: entry.living.x + platform.rightPx * this.config.runtimeScale,
      y: entry.living.y + platform.yPx * this.config.runtimeScale,
      ...(platform.dropGroup ? { dropGroup: platform.dropGroup } : {}),
      source: "worldroot-modular-v4-sprite-alpha",
      moduleId: entry.module.moduleId,
      stage: Number.isFinite(platform.stage) ? platform.stage : entry.module.stage,
    })));
  }

  getDebugSnapshot() {
    return {
      enabled: this.enabled,
      reason: this.reason,
      runtimeScale: this.config.runtimeScale,
      growthStage: this.growthStage,
      moduleCount: this.entries.length,
      platformCount: this.getOneWayPlatforms().length,
      modules: this.entries.map(entry => ({
        id: entry.module.id,
        regionId: entry.module.regionId,
        livingAlpha: entry.living.alpha,
        consumedAlpha: entry.consumed.alpha,
        consumedBlend: entry.consumedBlend,
        x: entry.living.x,
        y: entry.living.y,
        width: entry.living.displayWidth,
        height: entry.living.displayHeight,
        geometryBounds: entry.geometryBounds,
      })),
    };
  }

  destroy() {
    this.entries.forEach(entry => {
      entry.living?.destroy();
      entry.consumed?.destroy();
    });
    this.entries = [];
    this.signature = "";
  }
}
