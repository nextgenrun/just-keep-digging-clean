import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { LEVEL_ONE_GROUND_FACADE } from "../values/levelOneGroundFacade.js";
import {
  GEM_POWER_BLOCK_TIERS,
  getGemPowerBlockRestoreAmount,
  getGemPowerBlockTier,
} from "../values/specialBlocks.js";
import { TELEPORT_PORTAL_CONFIG } from "../values/teleportPortalConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_FEEDBACK } from "../values/worldVisualFeedback.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  getWorldVisualSemanticPreloadAssets,
  resolveWorldVisualSemanticSpecialFrame,
} from "../values/worldVisualSemanticAssets.js";
import {
  TILE_RENDER_INDEX,
  getTileRenderIndex,
} from "../world/rendering/tileRenderMap.js";
import { resolveScenicFacadeMarker } from "../world/rendering/worldScenicFacadeHelpers.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fromRoot = relativePath => path.join(ROOT, ...relativePath.split("/"));
const cleanAssetPath = descriptor => descriptor.path.split(/[?#]/, 1)[0];
const RESOURCE_ORDER = [
  "copper",
  "bronze",
  "steel",
  "iron",
  "silver",
  "gold",
  "obsidian",
  "emberOre",
  "magmaCrystal",
  "stone",
];
const FILE_BY_RESOURCE = {
  copper: "copper",
  bronze: "bronze",
  steel: "steel",
  iron: "iron",
  silver: "silver",
  gold: "gold",
  obsidian: "obsidian",
  emberOre: "ember-ore",
  magmaCrystal: "magma-crystal",
  stone: "stone",
};

function assertFile(relativePath) {
  const file = fromRoot(relativePath);
  assert.equal(existsSync(file), true, `missing audited texture: ${relativePath}`);
  assert.ok(statSync(file).size > 0, `empty audited texture: ${relativePath}`);
  return file;
}

function pngInfo(relativePath) {
  const bytes = readFileSync(assertFile(relativePath));
  assert.equal(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    true,
    `${relativePath} must be PNG`,
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

function sha256(relativePath) {
  return createHash("sha256").update(readFileSync(assertFile(relativePath))).digest("hex");
}

const semanticAtlasPath =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/resource-ground-veins-imagegen-2d-v6.png";
const recognitionAtlasPath =
  "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v7.png";
const specialAtlasPath =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-blocks-imagegen-gp-tiers-v3.png";
assert.deepEqual(pngInfo(semanticAtlasPath), { width: 1128, height: 1880, colorType: 6 });
assert.deepEqual(pngInfo(recognitionAtlasPath), { width: 752, height: 940, colorType: 6 });
assert.deepEqual(pngInfo(specialAtlasPath), { width: 752, height: 564, colorType: 2 });

const packageRoot =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/imagegen-ground-veins-2d-v6";
for (const name of Object.values(FILE_BY_RESOURCE)) {
  assertFile(`${packageRoot}/sources/${name}-chroma.png`);
  assertFile(`${packageRoot}/alpha-sheets/${name}.png`);
  assertFile(`sprites/tiles/resource-ground-veins-imagegen-v6-2d/${name}.webp`);
}
assertFile(
  "visual-approval-previews/overground-texture-audit-v8-wide-embedded-runtime/01-common-six-variants-on-runtime-grounds.png",
);
assertFile(
  "visual-approval-previews/overground-texture-audit-v8-wide-embedded-runtime/02-deep-six-variants-on-runtime-grounds.png",
);

const manifest = JSON.parse(readFileSync(assertFile(`${packageRoot}/manifest.json`), "utf8"));
assert.equal(manifest.camera, "strict orthographic top-down 2D");
assert.equal(manifest.style, "natural ground-embedded resource formations");
assert.equal(manifest.variantsPerResource, 6);
assert.deepEqual(manifest.resourceFrameOrder, RESOURCE_ORDER);
assert.deepEqual(manifest.specialFrames, {
  preservedFromV6Start: 30,
  v7Start: 60,
  count: 18,
});
for (const [relativePath, digest] of Object.entries(manifest.sha256)) {
  assert.equal(sha256(relativePath), digest, `generated output drifted: ${relativePath}`);
}

const resourceConfig = WORLD_VISUAL_SEMANTIC_ASSETS.resources;
assert.equal(cleanAssetPath(resourceConfig.atlas), semanticAtlasPath);
assert.deepEqual(
  {
    columns: resourceConfig.atlas.columns,
    frameSizePx: resourceConfig.atlas.frameSizePx,
    frameCount: resourceConfig.atlas.frameCount,
    variants: resourceConfig.atlas.variants,
    scale: resourceConfig.scale,
    alpha: resourceConfig.alpha,
  },
  { columns: 6, frameSizePx: 188, frameCount: 60, variants: 6, scale: 1, alpha: 1 },
);
assert.deepEqual(Object.keys(resourceConfig.frameStarts), RESOURCE_ORDER);
assert.deepEqual(Object.values(resourceConfig.frameStarts), [0, 6, 12, 18, 24, 30, 36, 42, 48, 54]);
for (const profile of Object.values(resourceConfig.profiles)) {
  assert.deepEqual(profile, { scale: 1, alpha: 1 });
}
assert.equal(getWorldVisualSemanticPreloadAssets().every(Boolean), true);

assert.equal(
  LEVEL_ONE_GROUND_FACADE.recognitionAtlas.assetPath.split(/[?#]/, 1)[0],
  recognitionAtlasPath,
);
assert.equal(LEVEL_ONE_GROUND_FACADE.recognitionAtlas.frameCount, 78);
assert.equal(ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas, "bg-level1-ground-recognition-atlas-v7");
assert.equal(cleanAssetPath(WORLD_VISUAL_FEEDBACK.atlas), recognitionAtlasPath);
assert.equal(WORLD_VISUAL_FEEDBACK.atlas.frameCount, 78);
assert.equal(
  WORLD_VISUAL_FEEDBACK.embeddedResourceVeins.enabled,
  false,
  "procedural Phaser veins must never be the default",
);
for (const key of RESOURCE_ORDER) {
  assert.deepEqual(WORLD_VISUAL_FEEDBACK.resourceMarkers[key], LEVEL_ONE_GROUND_FACADE.resourceMarkers[key]);
}

const expectedSpecialFrames = {
  teleport: 60,
  gamble: 61,
  gemPower: 62,
  speed: 67,
  xp: 68,
  crit: 69,
  berserk: 70,
  combo: 71,
  legend: 72,
  geodeInterior: 73,
  geodeWall: 74,
  chest: 75,
  ancientRelic: 76,
  glowCrystal: 77,
};
for (const [key, frame] of Object.entries(expectedSpecialFrames)) {
  assert.equal(WORLD_VISUAL_FEEDBACK.specialMarkers[key].frame, frame);
  assert.equal(LEVEL_ONE_GROUND_FACADE.specialMarkers[key].frame, frame);
}
assert.deepEqual(
  WORLD_VISUAL_FEEDBACK.specialMarkers.gemPowerTiers,
  LEVEL_ONE_GROUND_FACADE.specialMarkers.gemPowerTiers,
);

const specialConfig = WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks;
assert.equal(cleanAssetPath(specialConfig.beautyAtlas), specialAtlasPath);
assert.equal(specialConfig.beautyAtlas.frameCount, 12);
assert.equal(specialConfig.emissiveAtlas, null);
assert.deepEqual(
  Object.values(specialConfig.frameByTileType),
  [5, 6, 7, 8, 9, 10, 11],
);
assert.equal(specialConfig.frameByTileType[TILE_TYPES.ANCIENT_RELIC_CACHE], 11);
assert.deepEqual(
  GEM_POWER_BLOCK_TIERS.map(({ id, restoreAmount, semanticFrame, recognitionFrame }) => (
    { id, restoreAmount, semanticFrame, recognitionFrame }
  )),
  [
    { id: "gp100", restoreAmount: 100, semanticFrame: 0, recognitionFrame: 62 },
    { id: "gp250", restoreAmount: 250, semanticFrame: 1, recognitionFrame: 63 },
    { id: "gp500", restoreAmount: 500, semanticFrame: 2, recognitionFrame: 64 },
    { id: "gp1000", restoreAmount: 1000, semanticFrame: 3, recognitionFrame: 65 },
    { id: "gp1700", restoreAmount: 1700, semanticFrame: 4, recognitionFrame: 66 },
  ],
);
for (const tier of GEM_POWER_BLOCK_TIERS) assertFile(tier.assetPath);
const gpBehaviorCases = [
  { depth: 0, id: "gp100", restore: 100, semantic: 0, recognition: 62, render: TILE_RENDER_INDEX.GEM_POWER_BLOCK },
  { depth: 250, id: "gp250", restore: 250, semantic: 1, recognition: 63, render: TILE_RENDER_INDEX.GEM_POWER_BLOCK_250 },
  { depth: 500, id: "gp500", restore: 500, semantic: 2, recognition: 64, render: TILE_RENDER_INDEX.GEM_POWER_BLOCK_500 },
  { depth: 1000, id: "gp1000", restore: 1000, semantic: 3, recognition: 65, render: TILE_RENDER_INDEX.GEM_POWER_BLOCK_1000 },
  { depth: 1500, id: "gp1700", restore: 1700, semantic: 4, recognition: 66, render: TILE_RENDER_INDEX.GEM_POWER_BLOCK_1700 },
];
for (const expected of gpBehaviorCases) {
  const tier = getGemPowerBlockTier(expected.depth);
  assert.equal(tier.id, expected.id);
  assert.equal(getGemPowerBlockRestoreAmount(expected.depth), expected.restore);
  assert.equal(
    resolveWorldVisualSemanticSpecialFrame(TILE_TYPES.GEM_POWER_BLOCK, expected.depth),
    expected.semantic,
  );
  assert.equal(
    resolveScenicFacadeMarker(
      LEVEL_ONE_GROUND_FACADE,
      TILE_TYPES.GEM_POWER_BLOCK,
      null,
      expected.depth,
      0,
    ).frame,
    expected.recognition,
  );
  assert.equal(
    resolveScenicFacadeMarker(
      WORLD_VISUAL_FEEDBACK,
      TILE_TYPES.GEM_POWER_BLOCK,
      null,
      expected.depth,
      0,
    ).frame,
    expected.recognition,
  );
  assert.equal(
    getTileRenderIndex(TILE_TYPES.GEM_POWER_BLOCK, 100, 100, 0, 0, expected.depth),
    expected.render,
  );
}
assert.equal(getGemPowerBlockTier(249).id, "gp100");
assert.equal(getGemPowerBlockTier(499).id, "gp250");
assert.equal(getGemPowerBlockTier(999).id, "gp500");
assert.equal(getGemPowerBlockTier(1499).id, "gp1000");

const bootSource = readFileSync(fromRoot("ui/scenes/BootScene.js"), "utf8");
assert.match(bootSource, /sprites\/tiles\/special-tiles-v2\/teleport-tile\.webp/);
assert.doesNotMatch(bootSource, /special-tile-teleport-up-\.webp/);
assert.match(bootSource, /sprites\/tiles\/resource-tiles-imagegen-v3\/\$\{fileName\}\.webp/);
assert.match(bootSource, /GEM_POWER_BLOCK_TIERS/);

for (const configFile of [
  "values/worldVisualSemanticAssets.js",
  "values/levelOneGroundFacade.js",
  "values/worldVisualFeedback.js",
]) {
  const source = readFileSync(fromRoot(configFile), "utf8");
  assert.doesNotMatch(source, /resource-blocks-imagegen-opaque-v2/);
}
const semanticLayerSource = readFileSync(
  fromRoot("world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js"),
  "utf8",
);
assert.match(semanticLayerSource, /this\.scene\.add\.image/);
assert.doesNotMatch(semanticLayerSource, /this\.scene\.add\.graphics/);
assert.doesNotMatch(semanticLayerSource, /specialConfig\.emissiveAlpha/);

assert.equal(
  TELEPORT_PORTAL_CONFIG.canonicalAssetPath,
  "exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1/prop_048_eclipse_gate.webp",
);
assert.equal(TELEPORT_PORTAL_CONFIG.maxActiveSkyPortalsPerLevel, 4);

console.log(
  "Wide embedded ImageGen resource contract passed: six variants each, preserved GP tiers, latest Teleport Up, and gameplay portal rules are intact",
);
