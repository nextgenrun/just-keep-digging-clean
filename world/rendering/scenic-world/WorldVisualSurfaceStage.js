import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
  resolveWorldVisualSurfaceEdgeEnabled,
} from "../../../values/worldVisualRuntime.js";
import { resolveWorldVisualSurfacePack } from "../../../values/worldVisualSurfacePacks.js";
import { V11_SKY_ISLAND_LAYOUT } from "../../../values/v11SkyIslandLayout.js";
import { WorldVisualSurfacePackView } from "./WorldVisualSurfacePackView.js";

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) throw new Error(`[WorldVisualSurfaceStage] Missing source: ${key}`);
  return { width: source.width, height: source.height };
}

export class WorldVisualSurfaceStage {
  constructor(scene, config = WORLD_VISUAL_RUNTIME) {
    this.scene = scene;
    this.config = config;
    this.far = [];
    this.surfaceEdges = [];
    this.town = null;
    this.surfacePack = null;
  }

  create() {
    const required = getWorldVisualPreloadAssets(this.config);
    for (const asset of required) {
      if (!this.scene.textures.exists(asset.key)) {
        throw new Error(`[WorldVisualSurfaceStage] Required texture was not preloaded: ${asset.key}`);
      }
    }
    this._createFarSegments();
    const pack = resolveWorldVisualSurfacePack(this.config.surfacePacks);
    if (pack) {
      this.surfacePack = new WorldVisualSurfacePackView(this.scene, pack);
      this.surfacePack.create();
    } else {
      this._createTown();
    }
    if (resolveWorldVisualSurfaceEdgeEnabled(this.config)) this._createSurfaceEdges();
  }

  _createFarSegments() {
    const { tileSize, worldWidthPx, topAirRows } = this.scene.config;
    const source = sourceSize(this.scene, this.config.assets.far.key);
    const cfg = this.config.surface;
    const overlap = Math.max(0, cfg.farSegmentOverlapPx);
    const requestedDisplayWidth = cfg.farSegmentWidthTiles * tileSize + overlap;
    const maxDisplayWidth = source.width * cfg.farMaxSourceScale;
    const displayWidth = Math.min(requestedDisplayWidth, maxDisplayWidth);
    const segmentWidth = Math.max(1, displayWidth - overlap);
    const segmentHeight = displayWidth * source.height / source.width;
    const count = Math.ceil(worldWidthPx / segmentWidth) + 2;
    const addBand = (bottomY, name) => {
      for (let index = -1; index < count; index += 1) {
        const image = this.scene.add.image(
          index * segmentWidth,
          bottomY,
          this.config.assets.far.key
        ).setOrigin(0, 1)
          .setDepth(this.config.render.farDepth)
          .setDisplaySize(displayWidth, segmentHeight)
          .setFlipX(Math.abs(index) % 2 === 1);
        image.name = `world-visual-v2-${name}-${index}`;
        this.far.push(image);
      }
    };

    addBand(topAirRows * tileSize + tileSize * 0.42, "far");

    // The authored islands sit far above the surface composition. Reuse the
    // approved high-resolution scenic plate at that world altitude so the
    // island route never falls back to Phaser's empty clear color. Both v11
    // islands share a baseline, so one fixed band covers both without following
    // the camera or duplicating the ground-level town composition.
    if (V11_SKY_ISLAND_LAYOUT.enabled && V11_SKY_ISLAND_LAYOUT.levels.length > 0) {
      const islandBottomTile = Math.max(
        ...V11_SKY_ISLAND_LAYOUT.levels.map((level) => level.bottomTile)
      );
      addBand(islandBottomTile * tileSize, "sky-island-far");
    }
  }

  _createTown() {
    const { tileSize, topAirRows } = this.scene.config;
    const cfg = this.config.surface;
    const source = sourceSize(this.scene, this.config.assets.town.key);
    const displayWidth = cfg.townWidthTiles * tileSize;
    const scale = displayWidth / source.width;
    this.town = this.scene.add.image(
      cfg.townLeftTile * tileSize,
      topAirRows * tileSize,
      this.config.assets.town.key
    ).setOrigin(0, cfg.townBaselineFraction)
      .setDepth(this.config.render.townDepth)
      .setDisplaySize(displayWidth, source.height * scale);
    this.town.name = "world-visual-v2-town-hero";
  }

  bindTerrainMask(terrainMask) {
    return this.surfacePack?.bindTerrainMask(terrainMask) || false;
  }

  _createSurfaceEdges() {
    const { tileSize, worldWidthPx, topAirRows } = this.scene.config;
    const cfg = this.config.surface;
    const source = sourceSize(this.scene, this.config.assets.surfaceEdge.key);
    const width = cfg.edgeSegmentWidthTiles * tileSize;
    const scale = width / source.width;
    const height = source.height * scale;
    const count = Math.ceil(worldWidthPx / width) + 1;
    for (let index = 0; index < count; index += 1) {
      const image = this.scene.add.image(index * width, topAirRows * tileSize, this.config.assets.surfaceEdge.key)
        .setOrigin(0, cfg.edgeTopFraction)
        .setDepth(this.config.render.surfaceEdgeDepth)
        .setDisplaySize(width + cfg.edgeOverlapPx, height)
        .setFlipX(index % 2 === 1);
      image.name = `world-visual-v2-surface-edge-${index}`;
      this.surfaceEdges.push(image);
    }
  }

  update(time, lighting) {
    this.far.forEach(image => image.setTint(lighting.farTint));
    this.town?.setTint(lighting.farTint);
    this.surfaceEdges.forEach(image => image.setTint(lighting.terrainTint));
    this.surfacePack?.update(lighting);
  }

  destroy() {
    this.far.forEach(image => image.destroy());
    this.surfaceEdges.forEach(image => image.destroy());
    this.town?.destroy();
    this.surfacePack?.destroy();
    this.far = [];
    this.surfaceEdges = [];
    this.town = null;
    this.surfacePack = null;
  }
}
