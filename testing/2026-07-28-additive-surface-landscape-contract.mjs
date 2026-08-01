import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { ASSET_KEYS, getSurfacePropPreloadAssets } from "../values/assetKeys.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import {
  WORLD_VISUAL_SURFACE_ATMOSPHERE,
  resolveWorldVisualSurfaceAtmosphereEnabled,
} from "../values/worldVisualSurfaceAtmosphere.js";
import { WORLD_VISUAL_SURFACE_PROP_ASSETS } from "../values/worldVisualSurfacePropAssets.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from "../values/worldVisualSurfacePropLayout.js";
import { WORLD_VISUAL_SURFACE_PROPS } from "../values/worldVisualSurfaceProps.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../values/ualNativePlayerAssetProfile.js";
import { WorldVisualSurfaceAtmosphereLayer } from "../world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js";
import {
  resolveSurfacePropDisplayGeometry,
  resolveSurfacePropScaleMultiplier,
} from "../world/rendering/scenic-world/surfacePropGeometry.js";

const ADDITIVE_IDS = Object.freeze([
  "forgeShelter",
  "campKitchen",
  "herbStation",
  "timberGantry",
  "observatory",
  "surveyStation",
  "expeditionShelter",
]);

const manifestUrl = new URL(
  "../sprites/environment/surface-props-v2/2026-07-28-surface-props-v2-manifest.json",
  import.meta.url,
);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));
assert.equal(manifest.additive, true);
assert.equal(manifest.replacesExistingAssets, false);
assert.equal(manifest.backgroundChanged, false);
assert.equal(manifest.bakedCelestialBodies, false);
assert.equal(manifest.runtimeAssetCount, ADDITIVE_IDS.length);
assert.deepEqual(manifest.assets.map(asset => asset.id), ADDITIVE_IDS);

const preloads = getSurfacePropPreloadAssets();
assert.equal(preloads.length, 25);
for (const asset of manifest.assets) {
  const definition = WORLD_VISUAL_SURFACE_PROP_ASSETS.level2[asset.id];
  const runtimeAsset = ASSET_KEYS.environment.surfaceProps.level2[asset.id];
  assert.ok(definition, asset.id);
  assert.ok(runtimeAsset.path.startsWith("sprites/environment/surface-props-v2/"));
  assert.equal(runtimeAsset.path, asset.runtimePath);
  assert.deepEqual(definition.expectedSource, asset.runtimeDimensions);
  assert.equal(definition.heightMeters, asset.heightMeters);
  const fileUrl = new URL(`../${runtimeAsset.path}`, import.meta.url);
  const payload = fs.readFileSync(fileUrl);
  assert.equal(crypto.createHash("sha256").update(payload).digest("hex"), asset.sha256);
}

const additivePlacements = WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements
  .filter(item => ADDITIVE_IDS.includes(item.assetId));
assert.equal(additivePlacements.length, ADDITIVE_IDS.length);
assert.deepEqual(
  new Set(additivePlacements.map(item => item.assetId)),
  new Set(ADDITIVE_IDS),
);
assert.equal(
  WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements
    .filter(item => item.level === "level1").length,
  12,
  "existing low props may decorate verified Titan gaps without replacing Level 1 owners",
);

for (const item of WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements) {
  const definition = WORLD_VISUAL_SURFACE_PROP_ASSETS[item.level][item.assetId];
  const multiplier = resolveSurfacePropScaleMultiplier(item, WORLD_VISUAL_SURFACE_PROPS);
  const geometry = resolveSurfacePropDisplayGeometry(
    definition,
    GAME_CONFIG.tileSize,
    UAL_NATIVE_PLAYER_ASSET_PROFILE,
    multiplier,
  );
  const leftTile = item.tileX - geometry.widthTiles / 2;
  const rightTile = item.tileX + geometry.widthTiles / 2;
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    assert.equal(
      rightTile > zone.leftTile && leftTile < zone.rightTile,
      false,
      `${item.id} must not overlap ${zone.id}`,
    );
  }
  for (const zone of WORLD_VISUAL_SURFACE_PROP_LAYOUT.lowProfileZones) {
    if (zone.levels && !zone.levels.includes(item.level)) continue;
    if (!(rightTile > zone.leftTile && leftTile < zone.rightTile)) continue;
    assert.ok(
      definition.heightMeters * multiplier <= zone.maximumRenderedHeightMeters,
      `${item.id} must remain low profile inside ${zone.id}`,
    );
  }
}

assert.equal(resolveWorldVisualSurfaceAtmosphereEnabled(WORLD_VISUAL_SURFACE_ATMOSPHERE, ""), true);
assert.equal(
  resolveWorldVisualSurfaceAtmosphereEnabled(
    WORLD_VISUAL_SURFACE_ATMOSPHERE,
    "?surfaceAtmosphere=0",
  ),
  false,
);
assert.equal(
  resolveWorldVisualSurfaceAtmosphereEnabled(WORLD_VISUAL_SURFACE_ATMOSPHERE, "?surfaceProps=0"),
  false,
);
assert.equal(WORLD_VISUAL_SURFACE_ATMOSPHERE.anchors.length, 6);
assert.ok(
  WORLD_VISUAL_SURFACE_ATMOSPHERE.anchors.every(anchor => anchor.alpha <= 0.19),
  "prop atmosphere must remain a restrained accent",
);
const atmosphereFrames = new Set(
  Object.values(SKYLINE_WEATHER_VFX.frames.atmosphere).flat(),
);
for (const anchor of WORLD_VISUAL_SURFACE_ATMOSPHERE.anchors) {
  assert.ok(atmosphereFrames.has(anchor.frameIndex), `${anchor.id} uses an approved atlas frame`);
}

function createSceneStub() {
  const frames = new Set();
  const texture = {
    getSourceImage: () => ({ width: 1200, height: 900 }),
    has: frame => frames.has(frame),
    add(frame) { frames.add(frame); },
  };
  const sprites = [];
  return {
    config: GAME_CONFIG,
    time: { now: 1400 },
    textures: { get: () => texture },
    add: {
      image(x, y, key, frame) {
        const sprite = {
          x,
          y,
          key,
          frame: { name: frame },
          visible: false,
          destroyed: false,
          setOrigin() { return this; },
          setDepth(value) { this.depth = value; return this; },
          setScrollFactor(value) { this.scrollFactor = value; return this; },
          setVisible(value) { this.visible = value; return this; },
          setBlendMode(value) { this.blendMode = value; return this; },
          setData(name, value) { this[name] = value; return this; },
          setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
          setDisplaySize(width, height) {
            this.displayWidth = width;
            this.displayHeight = height;
            return this;
          },
          setRotation(value) { this.rotation = value; return this; },
          setTint(value) { this.tint = value; return this; },
          setAlpha(value) { this.alpha = value; return this; },
          destroy() { this.destroyed = true; },
        };
        sprites.push(sprite);
        return sprite;
      },
    },
    sprites,
  };
}

const previousPhaser = globalThis.Phaser;
globalThis.Phaser = { BlendModes: { SCREEN: 7 } };
const scene = createSceneStub();
const atmosphere = new WorldVisualSurfaceAtmosphereLayer(scene);
assert.equal(atmosphere.create(""), true);
assert.equal(
  atmosphere.sync(
    { left: 150, right: 178, top: 58, bottom: 70 },
    {
      night: 0.7,
      wet: 0.2,
      fog: 0.1,
      wind: 12,
      farTint: 0xaaccee,
      terrainTint: 0xddeeff,
    },
  ),
  true,
);
assert.ok(atmosphere.active.size >= 2);
for (const { sprite } of atmosphere.active.values()) {
  assert.equal(sprite.blendMode, 7);
  assert.equal(sprite.scrollFactor, 1);
  assert.equal(sprite.visible, true);
  assert.ok(sprite.alpha > 0 && sprite.alpha < 0.3);
}
atmosphere.sync(
  { left: 150, right: 178, top: 90, bottom: 110 },
  { night: 0, wet: 0, fog: 0, wind: 0, farTint: 0xffffff, terrainTint: 0xffffff },
);
assert.equal(atmosphere.active.size, 0);
atmosphere.destroy();
assert.equal(globalThis.__jkdSurfaceAtmosphere, undefined);
globalThis.Phaser = previousPhaser;

const atmosphereSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js", import.meta.url),
  "utf8",
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8",
);
assert.match(atmosphereSource, /SkylineWeatherVfxAtlas/);
assert.match(atmosphereSource, /BlendModes\?\.SCREEN/);
assert.doesNotMatch(atmosphereSource, /graphics|fillStyle|generateTexture|Math\.random/);
assert.match(runtimeSource, /new WorldVisualSurfaceAtmosphereLayer/);
assert.match(runtimeSource, /surfaceAtmosphereLayer\?\.sync/);
assert.match(runtimeSource, /surfaceAtmosphereLayer\?\.destroy/);

console.log("Additive surface landscape assets, protected composition, and atmosphere contract passed");
