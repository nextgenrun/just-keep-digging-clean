import { ASSET_KEYS } from "../values/assetKeys.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
  WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3,
  WORLD_VISUAL_PROP_RUNTIME_ASSETS_V3,
} from "../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from
  "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from "../values/worldVisualSurfaceProps.js";
import { WORLD_VISUAL_SURFACE_SKY_PROPS_V3 } from
  "../values/worldVisualSurfaceSkyPropsV3.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
} from "../values/worldVisualSurfaceHeroLandmarks.js";
import { resolveSurfacePropDisplayGeometry } from
  "../world/rendering/scenic-world/surfacePropGeometry.js";

function scaleFor(item, config) {
  return config.scale.sizeVariants[item.sizeVariant] * config.scale.lanePerspective[item.lane];
}

function geometryFor(asset, item, config, review) {
  return resolveSurfacePropDisplayGeometry(
    asset,
    review.tileSize,
    UAL_NATIVE_PLAYER_ASSET_PROFILE,
    scaleFor(item, config),
  );
}

function addLibrarySprite(scene, sprites, spec) {
  const { x, y, key, frame, geometry, depth, alpha, flipX, id, kind } = spec;
  const sprite = scene.add.image(x, y, key, frame)
    .setOrigin(0.5, 1)
    .setDisplaySize(geometry.width, geometry.height)
    .setDepth(depth)
    .setAlpha(alpha)
    .setFlipX(Boolean(flipX));
  sprite.name = id;
  sprite._reviewBounds = {
    left: x - geometry.width / 2,
    right: x + geometry.width / 2,
    top: y - geometry.height,
    bottom: y,
  };
  sprite.setData("completeMapKind", kind);
  sprites.push(sprite);
}

function addGeneratedSurfaceProps(scene, sprites, review) {
  const cfg = WORLD_VISUAL_SURFACE_SKY_PROPS_V3;
  for (const item of WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3) {
    const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
    const runtime = WORLD_VISUAL_PROP_RUNTIME_ASSETS_V3[item.assetId];
    addLibrarySprite(scene, sprites, {
      x: item.tileX * review.tileSize,
      y: review.surfaceTileY * review.tileSize,
      key: runtime.key,
      frame: runtime.frame,
      geometry: geometryFor(asset, item, cfg, review),
      depth: cfg.surface.renderDepths[item.lane],
      alpha: cfg.surface.alphaByLane[item.lane],
      flipX: item.flipX,
      id: item.id,
      kind: "generated-surface-prop",
    });
  }
}

function addGeneratedSkyProps(scene, sprites, review) {
  const cfg = WORLD_VISUAL_SURFACE_SKY_PROPS_V3;
  for (const item of WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3) {
    const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
    const runtime = WORLD_VISUAL_PROP_RUNTIME_ASSETS_V3[item.assetId];
    const depths = item.worldRegion.includes("sky-island")
      ? cfg.sky.portalIslandDepths : cfg.sky.heavenblockDepths;
    addLibrarySprite(scene, sprites, {
      x: item.tileX * review.tileSize,
      y: item.tileY * review.tileSize,
      key: runtime.key,
      frame: runtime.frame,
      geometry: geometryFor(asset, item, cfg, review),
      depth: depths[item.lane],
      alpha: cfg.sky.alphaByLane[item.lane],
      flipX: item.flipX,
      id: item.id,
      kind: "generated-sky-prop",
    });
  }
}

function addRetainedProps(scene, sprites, review) {
  const cfg = WORLD_VISUAL_SURFACE_PROPS;
  for (const item of WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements) {
    const asset = WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId];
    const runtime = ASSET_KEYS.environment.surfaceProps[item.level][item.assetId];
    addLibrarySprite(scene, sprites, {
      x: item.tileX * review.tileSize,
      y: review.surfaceTileY * review.tileSize,
      key: runtime.key,
      geometry: geometryFor(asset, item, cfg, review),
      depth: cfg.renderDepths[item.lane],
      alpha: cfg.alphaByLane[item.lane],
      flipX: item.flipX,
      id: item.id,
      kind: "retained-surface-prop",
    });
  }
}

function addHeroLandmarks(scene, sprites, review) {
  for (const item of WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements) {
    const asset = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[item.assetId];
    const profile = WORLD_VISUAL_SURFACE_HERO_LANDMARKS.distanceProfiles[item.distanceProfile];
    const geometry = resolveSurfacePropDisplayGeometry(
      asset,
      review.tileSize,
      UAL_NATIVE_PLAYER_ASSET_PROFILE,
      1,
    );
    addLibrarySprite(scene, sprites, {
      x: item.tileX * review.tileSize,
      y: review.surfaceTileY * review.tileSize,
      key: asset.key,
      geometry,
      depth: profile.depth,
      alpha: profile.alpha,
      id: item.id,
      kind: "hero-landmark",
    });
  }
}

export const COMPLETE_MAP_PROP_COUNTS = Object.freeze({
  generatedSurface: WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3.length,
  generatedSky: WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3.length,
  retained: WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.length,
  heroes: WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.length,
});

export function createCompleteMapPropSprites(scene, review) {
  const sprites = [];
  addGeneratedSurfaceProps(scene, sprites, review);
  addGeneratedSkyProps(scene, sprites, review);
  addRetainedProps(scene, sprites, review);
  addHeroLandmarks(scene, sprites, review);
  return sprites;
}
