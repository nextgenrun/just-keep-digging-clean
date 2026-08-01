import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASSET_KEYS,
  getSurfaceSkyPropAtlasPreloadAssets,
} from "../values/assetKeys.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_PROP_ATLASES_V3,
  WORLD_VISUAL_SKY_PROP_ASSETS_V3,
  WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
} from "../values/generated/worldVisualPropLibraryV3/index.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from
  "../values/ualNativePlayerAssetProfile.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { WORLD_VISUAL_SKY_PROP_COMPOSITION_V3 } from
  "../values/worldVisualSkyPropCompositionV3.js";
import { WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3 } from
  "../values/worldVisualSurfacePropCompositionV3.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from
  "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from
  "../values/worldVisualSurfaceProps.js";
import {
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
  resolveWorldVisualSurfaceSkyPropsV3Enabled,
} from "../values/worldVisualSurfaceSkyPropsV3.js";
import { V11SkyPropSystem } from "../systems/environment/V11SkyPropSystem.js";
import { WorldVisualSurfacePropExpansionLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfacePropExpansionLayer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "sprites/environment/surface-sky-props-v3/2026-07-29-surface-sky-props-v3-manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const surfacePlacements = WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.placements;
const skyPlacements = WORLD_VISUAL_SKY_PROP_COMPOSITION_V3.placements;

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function intersects(left, right) {
  return (
    left.right > right.left
    && left.left < right.right
    && left.bottom > right.top
    && left.top < right.bottom
  );
}

function authoredScale(item) {
  return (
    WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.sizeVariants[item.sizeVariant]
    * WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.lanePerspective[item.lane]
  );
}

function retainedScale(item) {
  return (
    WORLD_VISUAL_SURFACE_PROPS.scale.sizeVariants[item.sizeVariant]
    * WORLD_VISUAL_SURFACE_PROPS.scale.lanePerspective[item.lane]
  );
}

function retainedBoundsFor(item) {
  const asset = WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId];
  const pixelsPerMeter = (
    UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles * 94
    / UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters
  );
  const heightTiles = asset.heightMeters * pixelsPerMeter * retainedScale(item) / 94;
  const widthTiles = heightTiles
    * asset.expectedSource.width
    / asset.expectedSource.height;
  return {
    left: item.tileX - widthTiles / 2,
    right: item.tileX + widthTiles / 2,
    top: -heightTiles,
    bottom: 0,
  };
}

function boundsFor(item) {
  const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
  const pixelsPerMeter = (
    UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles * 94
    / UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters
  );
  const heightTiles = asset.heightMeters * pixelsPerMeter * authoredScale(item) / 94;
  const widthTiles = heightTiles
    * asset.expectedSource.width
    / asset.expectedSource.height;
  return {
    left: item.tileX - widthTiles / 2,
    right: item.tileX + widthTiles / 2,
    top: (item.tileY || 0) - heightTiles,
    bottom: item.tileY || 0,
  };
}

assert.deepEqual(manifest.counts, {
  total: 200,
  surface: 140,
  sky: 60,
  atlases: 10,
  placements: 200,
});
assert.equal(WORLD_VISUAL_PROP_ATLASES_V3.length, 10);
assert.equal(WORLD_VISUAL_SURFACE_PROP_ASSETS_V3.length, 140);
assert.equal(WORLD_VISUAL_SKY_PROP_ASSETS_V3.length, 60);
assert.equal(Object.keys(WORLD_VISUAL_PROP_ASSET_BY_ID_V3).length, 200);
assert.equal(Object.keys(ASSET_KEYS.environment.surfacePropsV3).length, 140);
assert.equal(Object.keys(ASSET_KEYS.environment.skyPropsV3).length, 60);

const preloadAtlases = getSurfaceSkyPropAtlasPreloadAssets();
assert.equal(preloadAtlases.length, 10);
assert.equal(new Set(preloadAtlases.map(asset => asset.key)).size, 10);
for (const atlas of manifest.atlases) {
  const imagePath = path.join(ROOT, atlas.path);
  const dataPath = path.join(ROOT, atlas.dataPath);
  assert.equal(fs.existsSync(imagePath), true, atlas.path);
  assert.equal(fs.existsSync(dataPath), true, atlas.dataPath);
  assert.equal(sha256(imagePath), atlas.imageSha256);
  assert.equal(sha256(dataPath), atlas.dataSha256);
  const webp = fs.readFileSync(imagePath);
  assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(webp.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(webp.includes(Buffer.from("VP8L")), `${atlas.path} must be lossless`);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(dataPath, "utf8")).frames).length, 20);
}

// The 200 images are a palette. Runtime deliberately selects a sparse authored subset.
assert.equal(surfacePlacements.length, 38);
assert.equal(skyPlacements.length, 13);
const runtimePlacements = [...surfacePlacements, ...skyPlacements];
assert.equal(new Set(runtimePlacements.map(item => item.id)).size, runtimePlacements.length);
assert.equal(
  new Set(runtimePlacements.map(item => item.assetId)).size,
  runtimePlacements.length,
);
assert.ok(runtimePlacements.every(item => WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId]));
assert.ok(surfacePlacements.length < WORLD_VISUAL_SURFACE_PROP_ASSETS_V3.length / 3);
assert.ok(skyPlacements.length < WORLD_VISUAL_SKY_PROP_ASSETS_V3.length / 3);

assert.equal(WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.chapters.length, 7);
for (const chapter of WORLD_VISUAL_SURFACE_PROP_COMPOSITION_V3.chapters) {
  assert.ok(chapter.placements.length >= 4 && chapter.placements.length <= 6);
  assert.ok(new Set(chapter.placements.map(item => item.clusterId)).size <= 3);
  assert.ok(chapter.placements.every(item => (
    item.chapterId === chapter.id
    && item.tileX >= chapter.leftTile
    && item.tileX < chapter.rightTile
  )));
  assert.ok(
    chapter.placements.some(item => item.sizeVariant === "feature"),
    `${chapter.id} needs a deliberate feature silhouette`,
  );
  const laneCounts = chapter.placements.reduce((counts, item) => {
    counts[item.lane] += 1;
    return counts;
  }, { rear: 0, mid: 0, front: 0 });
  if (chapter.placements.length === 6) {
    assert.deepEqual(
      laneCounts,
      { rear: 2, mid: 2, front: 2 },
      `${chapter.id} should balance far, middle, and near depth`,
    );
  } else {
    assert.deepEqual(
      laneCounts,
      { rear: 1, mid: 1, front: 2 },
      `${chapter.id} should reserve foreground grounding without flattening depth`,
    );
  }
  assert.ok(chapter.openRanges.length >= 1);
  for (const open of chapter.openRanges) {
    assert.ok(open.rightTile - open.leftTile >= 1);
    for (const item of chapter.placements) {
      const bounds = boundsFor(item);
      assert.equal(
        bounds.right > open.leftTile && bounds.left < open.rightTile,
        false,
        `${item.id} fills authored breathing range`,
      );
    }
  }
}

assert.ok(surfacePlacements.every(item => item.level === "level2"));
for (const item of surfacePlacements) {
  const bounds = boundsFor(item);
  const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId];
  const displayHeightMeters = asset.heightMeters * authoredScale(item);
  assert.ok(
    displayHeightMeters < UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters,
    `${item.id} should support the player-scale hierarchy, not become a second hero`,
  );
  const sourcePixelsPerWorldPixel = asset.expectedSource.height / (
    asset.heightMeters
    * (
      UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles * 94
      / UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters
    )
    * authoredScale(item)
  );
  assert.ok(
    sourcePixelsPerWorldPixel
      >= WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.minimumSourcePixelsPerWorldPixel,
    `${item.id} falls below the authored density floor`,
  );
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    assert.equal(
      bounds.right > zone.leftTile && bounds.left < zone.rightTile,
      false,
      `${item.id} overlaps ${zone.id}`,
    );
  }
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.lowProfileZones || []) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    if (bounds.right <= zone.leftTile || bounds.left >= zone.rightTile) continue;
    assert.ok(
      displayHeightMeters <= zone.maximumRenderedHeightMeters,
      `${item.id} exceeds ${zone.id}`,
    );
  }
}

for (const item of WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements) {
  const bounds = retainedBoundsFor(item);
  const asset = WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId];
  const displayHeightMeters = asset.heightMeters * retainedScale(item);
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    assert.equal(
      bounds.right > zone.leftTile && bounds.left < zone.rightTile,
      false,
      `${item.id} overlaps ${zone.id}`,
    );
  }
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.lowProfileZones || []) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    if (bounds.right <= zone.leftTile || bounds.left >= zone.rightTile) continue;
    assert.ok(
      displayHeightMeters <= zone.maximumRenderedHeightMeters,
      `${item.id} exceeds ${zone.id}`,
    );
  }
}

const expectedHeroAnchors = Object.freeze({
  "l2-155-forge": Object.freeze({ lane: "mid", sizeVariant: "large" }),
  "l2-167-camp-kitchen": Object.freeze({ lane: "mid", sizeVariant: "large" }),
  "l2-194-herb-station": Object.freeze({ lane: "mid", sizeVariant: "large" }),
  "l2-208-timber-gantry": Object.freeze({ lane: "mid", sizeVariant: "large" }),
  "l2-230-observatory": Object.freeze({ lane: "mid", sizeVariant: "standard" }),
  "l2-248-survey": Object.freeze({ lane: "mid", sizeVariant: "large" }),
  "l2-272-expedition": Object.freeze({ lane: "mid", sizeVariant: "large" }),
});
for (const [id, expected] of Object.entries(expectedHeroAnchors)) {
  const item = WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.find(candidate => candidate.id === id);
  assert.ok(item, `${id} hero anchor missing`);
  assert.deepEqual(
    { lane: item.lane, sizeVariant: item.sizeVariant },
    expected,
    `${id} lost its camera-composed hierarchy`,
  );
  const asset = WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId];
  const displayHeightMeters = asset.heightMeters * retainedScale(item);
  assert.ok(
    displayHeightMeters > UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters,
    `${id} should read above the 0.8-tile player silhouette`,
  );
  assert.ok(
    displayHeightMeters <= UAL_NATIVE_PLAYER_ASSET_PROFILE.physicalHeightMeters * 2.25,
    `${id} overwhelms the player and camera`,
  );
}

const combinedLevelTwoProps = [
  ...surfacePlacements,
  ...WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.filter(item => item.level === "level2"),
];
let maximumPropsPerCamera = 0;
for (const anchor of combinedLevelTwoProps) {
  const rightTile = anchor.tileX + 14;
  maximumPropsPerCamera = Math.max(
    maximumPropsPerCamera,
    combinedLevelTwoProps.filter(item => (
      item.tileX >= anchor.tileX && item.tileX < rightTile
    )).length,
  );
}
assert.ok(
  maximumPropsPerCamera <= 11,
  `camera density regressed to ${maximumPropsPerCamera} props in 14 tiles`,
);

const portalIslandProps = skyPlacements.filter(
  item => item.worldRegion.startsWith("v11-level-"),
);
assert.equal(portalIslandProps.length, 4);
for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
  const levelProps = portalIslandProps.filter(
    item => item.worldRegion === `v11-level-${level.levelId}-sky-island`,
  );
  assert.equal(levelProps.length, 2);
  for (const item of levelProps) {
    const bounds = boundsFor(item);
    for (const slot of level.portalSlots) {
      assert.equal(intersects(bounds, {
        left: slot.leftTile,
        right: slot.leftTile + slot.widthTiles,
        top: slot.bottomTile - slot.heightTiles,
        bottom: slot.bottomTile,
      }), false, `${item.id} overlaps ${slot.id}`);
    }
  }
}

for (const region of HEAVENBLOCKS_ACCESS_CONFIG.regions) {
  const regionProps = skyPlacements.filter(item => item.worldRegion === region.id);
  assert.equal(regionProps.length, 3);
  for (const item of regionProps) {
    const bounds = boundsFor(item);
    const radius = HEAVENBLOCKS_ACCESS_CONFIG.interactionRadiusTiles;
    for (const center of [region.arrival.tx, region.returnAltar.tx, region.rewardShrine.tx]) {
      assert.equal(
        bounds.right > center - radius && bounds.left < center + radius,
        false,
        `${item.id} overlaps Heavenblock interaction ${center}`,
      );
    }
  }
}

assert.ok(
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.sizeVariants.feature
    > WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.sizeVariants.large,
);
assert.deepEqual(
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3.surface.alphaByLane,
  { rear: 0.82, mid: 0.95, front: 1 },
);
assert.deepEqual(
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3.scale.distanceByLane,
  { rear: "far", mid: "middle", front: "near" },
);
assert.ok(
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3.surface.alphaByLane.rear
  < WORLD_VISUAL_SURFACE_SKY_PROPS_V3.surface.alphaByLane.mid,
);
assert.ok(
  WORLD_VISUAL_SURFACE_SKY_PROPS_V3.surface.alphaByLane.mid
  < WORLD_VISUAL_SURFACE_SKY_PROPS_V3.surface.alphaByLane.front,
);
assert.deepEqual(
  resolveWorldVisualSurfaceSkyPropsV3Enabled(
    WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
    "?surfacePropsV3=0",
  ),
  { all: true, surface: false, sky: true },
);

function makeSprite(x, y, key, frame) {
  return {
    x,
    y,
    key,
    frame,
    displayWidth: 1,
    displayHeight: 1,
    alpha: 1,
    rotation: 0,
    transformWrites: 0,
    visualWrites: 0,
    destroyed: false,
    setOrigin() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) {
      this.visualWrites += 1;
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setAlpha(value) {
      this.visualWrites += 1;
      this.alpha = value;
      return this;
    },
    setFlipX(value) { this.flipX = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setData(name, value) { this[name] = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setPosition(nextX, nextY) {
      this.transformWrites += 1;
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    setRotation(value) {
      this.transformWrites += 1;
      this.rotation = value;
      return this;
    },
    destroy() { this.destroyed = true; },
  };
}

const allAssets = [
  ...WORLD_VISUAL_SURFACE_PROP_ASSETS_V3,
  ...WORLD_VISUAL_SKY_PROP_ASSETS_V3,
];
const frameByKey = new Map(
  allAssets.map(asset => [`${asset.atlasKey}:${asset.frame}`, asset.expectedSource]),
);
const textures = {
  exists: key => WORLD_VISUAL_PROP_ATLASES_V3.some(atlas => atlas.key === key),
  getFrame(key, frame) {
    const size = frameByKey.get(`${key}:${frame}`);
    return size ? { width: size.width, height: size.height } : null;
  },
};
const surfaceSprites = [];
const surfaceScene = {
  config: { tileSize: 94, topAirRows: 65 },
  time: { now: 1250 },
  textures,
  add: {
    image(x, y, key, frame) {
      const sprite = makeSprite(x, y, key, frame);
      surfaceSprites.push(sprite);
      return sprite;
    },
  },
};
const flatWorld = { tileSize: 94, isSolid: (_tx, ty) => ty >= 65 };
const surfaceLayer = new WorldVisualSurfacePropExpansionLayer(surfaceScene, flatWorld);
assert.equal(surfaceLayer.create(""), true);
surfaceLayer.sync(
  { left: 150, right: 178, top: 58, bottom: 70 },
  { terrainTint: 0xcceeff },
);
assert.ok(surfaceLayer.active.size > 0);
const surfaceVisualWrites = surfaceSprites.map(sprite => sprite.visualWrites);
surfaceLayer.update(999999, { terrainTint: 0xcceeff });
assert.ok(surfaceSprites.every(sprite => sprite.transformWrites === 0));
assert.deepEqual(
  surfaceSprites.map(sprite => sprite.visualWrites),
  surfaceVisualWrites,
  "surface props must not pulse or resize after creation",
);
surfaceLayer.destroy();

const skySprites = [];
const view = { x: 78 * 94, y: 10 * 94, width: 84 * 94, height: 14 * 94 };
const skyScene = {
  config: { tileSize: 94 },
  textures,
  cameras: {
    main: { worldView: view, scrollX: view.x, scrollY: view.y, width: view.width, height: view.height, zoom: 1 },
  },
  add: {
    image(x, y, key, frame) {
      const sprite = makeSprite(x, y, key, frame);
      skySprites.push(sprite);
      return sprite;
    },
  },
};
const skySystem = new V11SkyPropSystem(skyScene);
assert.equal(skySystem.create(""), true);
skySystem.update(999999);
assert.ok(skySystem.active.size > 0);
const skyVisualWrites = skySprites.map(sprite => sprite.visualWrites);
skySystem.update(1999999);
assert.ok(skySprites.every(sprite => sprite.transformWrites === 0));
assert.deepEqual(
  skySprites.map(sprite => sprite.visualWrites),
  skyVisualWrites,
  "sky props must not pulse or resize after creation",
);
skySystem.destroy();

for (const sourcePath of [
  "world/rendering/scenic-world/WorldVisualSurfacePropLayer.js",
  "world/rendering/scenic-world/WorldVisualSurfacePropExpansionLayer.js",
  "systems/environment/V11SkyPropSystem.js",
]) {
  const source = fs.readFileSync(path.join(ROOT, sourcePath), "utf8");
  assert.doesNotMatch(
    source,
    /worldPropLife|updateWorldPropLife|createWorldPropLifeState|tweens\.add|Math\.(?:sin|cos)|pulse|oscillat|\bbob\b/i,
  );
}

console.log(
  "Surface + sky V3 library, authored composition, static transforms, depth, and exclusions passed"
);
