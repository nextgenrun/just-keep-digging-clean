import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
  resolveWorldVisualSurfaceEdgeEnabled,
  resolveWorldVisualSurfaceGroundVariationEnabled,
} from "../../../values/worldVisualRuntime.js?rev=20260826-surface-motion-v2";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropBlendMask,
} from "../../../values/worldVisualDepthBackdrops.js?rev=20260729-native-density-v14";
import {
  resolveWorldVisualSurfaceMotion,
  resolveWorldVisualSurfacePack,
} from "../../../values/worldVisualSurfacePacks.js?rev=20260826-surface-motion-v2";
import { V11_SKY_ISLAND_LAYOUT } from "../../../values/v11SkyIslandLayout.js";
import { WorldVisualSurfacePackView } from "./WorldVisualSurfacePackView.js?rev=20260826-surface-motion-v2";
import {
  createWorldVisualBlendMask,
  resolveWorldVisualBlendBits,
} from
  "./worldVisualBlendMaskFrame.js?rev=20260729-native-density-v14";
import { setTintIfChanged } from "./worldVisualRenderState.js";

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
    this.farBlendMasks = [];
    this.surfaceEdges = [];
    this.town = null;
    this.surfacePack = null;
  }

  create() {
    const required = getWorldVisualPreloadAssets(this.config);
    for (const asset of required) {
      if (asset.type === "video") continue;
      if (!this.scene.textures.exists(asset.key)) {
        throw new Error(`[WorldVisualSurfaceStage] Required texture was not preloaded: ${asset.key}`);
      }
    }
    this._createFarSegments();
    const pack = resolveWorldVisualSurfacePack(this.config.surfacePacks);
    if (pack) {
      const motion = resolveWorldVisualSurfaceMotion(pack);
      this.surfacePack = new WorldVisualSurfacePackView(this.scene, pack, motion);
      this.surfacePack.create();
    } else {
      this._createTown();
    }
    if (resolveWorldVisualSurfaceEdgeEnabled(this.config)) {
      this._createSurfaceEdges();
      if (resolveWorldVisualSurfaceGroundVariationEnabled(this.config)) {
        this._createSurfaceGroundVariation();
      }
    }
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
    const blendAsset = resolveWorldVisualDepthBackdropBlendMask(
      WORLD_VISUAL_DEPTH_BACKDROPS
    );
    const blend = WORLD_VISUAL_DEPTH_BACKDROPS.blend;
    const addBand = (bottomY, name) => {
      for (let index = -1; index < count; index += 1) {
        const x = index * segmentWidth;
        const image = this.scene.add.image(
          x,
          bottomY,
          this.config.assets.far.key
        ).setOrigin(0, 1)
          .setDepth(this.config.render.farDepth)
          .setDisplaySize(displayWidth, segmentHeight)
          .setFlipX(Math.abs(index) % 2 === 1);
        const incomingEdgeBits = resolveWorldVisualBlendBits(
          blend,
          { left: index > -1 }
        );
        const mask = createWorldVisualBlendMask(
          this.scene,
          blendAsset,
          blend,
          incomingEdgeBits,
          x,
          bottomY - segmentHeight,
          displayWidth,
          segmentHeight
        );
        if (mask) {
          image.setMask(mask.bitmap);
          this.farBlendMasks.push(mask);
        }
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
    const requestedWidth = cfg.townWidthTiles * tileSize;
    const displayWidth = Math.min(
      requestedWidth,
      source.width * cfg.townMaxSourceScale,
    );
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
    const packBound = this.surfacePack?.bindTerrainMask(terrainMask) || false;
    this.surfaceEdges.forEach(image => image.setMask?.(terrainMask));
    return packBound || this.surfaceEdges.length > 0;
  }

  _createSurfaceEdges() {
    const { tileSize, worldWidthPx, topAirRows } = this.scene.config;
    const cfg = this.config.surface;
    const source = sourceSize(this.scene, this.config.assets.surfaceEdge.key);
    const requestedWidth = cfg.edgeSegmentWidthTiles * tileSize + cfg.edgeOverlapPx;
    const displayWidth = Math.min(
      requestedWidth,
      source.width * cfg.edgeMaxSourceScale,
    );
    const scale = displayWidth / source.width;
    const height = source.height * scale;
    const stride = Math.max(1, displayWidth - cfg.edgeOverlapPx);
    const count = Math.ceil(worldWidthPx / stride) + 1;
    for (let index = 0; index < count; index += 1) {
      const image = this.scene.add.image(
        index * stride,
        topAirRows * tileSize,
        this.config.assets.surfaceEdge.key,
      )
        .setOrigin(0, cfg.edgeTopFraction)
        .setDepth(this.config.render.surfaceEdgeDepth)
        .setDisplaySize(displayWidth, height)
        .setFlipX(index % 2 === 1);
      image.name = `world-visual-v2-surface-edge-${index}`;
      this.surfaceEdges.push(image);
    }
  }

  _createSurfaceGroundVariation() {
    const { tileSize, worldWidthPx, topAirRows } = this.scene.config;
    const feature = this.config.surface.surfaceGroundVariation;
    const assets = feature.assets;
    if (!assets?.length) return;
    const width = feature.expectedSourceWidthPx * feature.maxSourceScale;
    const height = feature.expectedSourceHeightPx * feature.maxSourceScale;
    const stride = feature.stridePx * feature.maxSourceScale;
    const count = Math.ceil(worldWidthPx / stride) + 2;
    for (let index = -1; index < count; index += 1) {
      // The library is authored west-to-east. Walk it in that order so rain
      // slate, roots, cobble, and expedition rock form a readable ground
      // journey instead of a prime-step shuffle.
      const assetIndex = ((index + 1) % assets.length + assets.length)
        % assets.length;
      const asset = assets[assetIndex];
      const source = sourceSize(this.scene, asset.key);
      if (
        source.width !== feature.expectedSourceWidthPx
        || source.height !== feature.expectedSourceHeightPx
      ) {
        throw new Error(
          `[WorldVisualSurfaceStage] Ground source changed: ${asset.key}`,
        );
      }
      const image = this.scene.add.image(
        index * stride,
        topAirRows * tileSize,
        asset.key
      )
        .setOrigin(0, feature.edgeTopFraction)
        .setDepth(this.config.render.surfaceEdgeDepth + 0.01)
        .setDisplaySize(width, height);
      image.name = `world-visual-v5-surface-ground-${index}-${assetIndex}`;
      image._worldVisualAsset = asset;
      this.surfaceEdges.push(image);
    }
  }

  update(time, lighting) {
    this.far.forEach(image => setTintIfChanged(image, lighting.farTint));
    setTintIfChanged(this.town, lighting.farTint);
    this.surfaceEdges.forEach(image => setTintIfChanged(image, lighting.terrainTint));
    this.surfacePack?.update(lighting);
  }

  destroy() {
    this.far.forEach(image => {
      image.clearMask?.(false);
      image.destroy();
    });
    this.farBlendMasks.forEach(mask => {
      mask.bitmap?.destroy?.();
      mask.image?.destroy?.();
    });
    this.surfaceEdges.forEach(image => image.destroy());
    this.town?.destroy();
    this.surfacePack?.destroy();
    this.far = [];
    this.farBlendMasks = [];
    this.surfaceEdges = [];
    this.town = null;
    this.surfacePack = null;
  }
}
