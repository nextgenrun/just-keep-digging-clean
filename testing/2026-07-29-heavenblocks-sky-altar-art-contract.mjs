import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveHeavenblocksSurfaceAltarStageIndex } from
  "../systems/visual/heavenblocksAltarProgression.js";
import {
  ASSET_KEYS,
  getHeavenblocksSkyAltarPreloadAssets,
} from "../values/assetKeys.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../values/heavenblocksAccessConfig.js";
import { TITAN_DISCOVERY_CONFIG } from "../values/titanDiscoveries.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = getHeavenblocksSkyAltarPreloadAssets();

assert.equal(assets.length, 9, "three stages are required for each of three sky altars");
assert.equal(new Set(assets.map(asset => asset.key)).size, 9, "altar keys must be unique");
assert.equal(new Set(assets.map(asset => asset.path)).size, 9, "altar paths must be unique");

for (const asset of assets) {
  const file = path.join(ROOT, ...asset.path.split("/"));
  assert.equal(existsSync(file), true, `missing altar asset ${asset.path}`);
  assert.ok(statSync(file).size > 500_000, `altar asset is unexpectedly small: ${asset.path}`);
  const header = readFileSync(file).subarray(0, 26);
  assert.equal(header.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(header.readUInt32BE(16), 768, `${asset.path} width drift`);
  assert.equal(header.readUInt32BE(20), 768, `${asset.path} height drift`);
  assert.equal(header[25], 6, `${asset.path} must remain RGBA`);
}

assert.deepEqual(
  Object.keys(ASSET_KEYS.environment.heavenblocksSkyAltars),
  ["cloudReef", "angelHeavenblock", "devilEclipse"],
);
assert.deepEqual(
  HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates.map(gate => gate.altarAssetId),
  ["cloudReef", "angelHeavenblock", "devilEclipse"],
);
for (const gate of HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates) {
  assert.ok(
    Number.isFinite(gate.altarBaselineOffsetTiles)
      && gate.altarBaselineOffsetTiles >= 0.5
      && gate.altarBaselineOffsetTiles <= 1,
    `${gate.label} visible base must be planted on the surface`,
  );
}

const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
const finalTitanCenter = gallery.startTileX
  + (TITAN_DISCOVERY_CONFIG.definitions.length - 1) * gallery.spacingTiles;
const finalTitanRight = finalTitanCenter
  + gallery.maxWidthTiles * gallery.maximumScaleMultiplier / 2;
const firstGateCenter = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[0].tx + 0.5;
const firstAltarLeft = firstGateCenter
  - HEAVENBLOCKS_ACCESS_CONFIG.presentation.surfaceAltarDisplayWidthTiles / 2;
assert.ok(
  firstAltarLeft - finalTitanRight
    >= HEAVENBLOCKS_ACCESS_CONFIG.presentation.surfaceAltarMinimumTitanClearanceTiles,
  "sky altar bank must clear the final Titan statue footprint",
);

for (let index = 1; index < HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates.length; index += 1) {
  const previous = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[index - 1];
  const current = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[index];
  assert.ok(
    current.tx - previous.tx
      > HEAVENBLOCKS_ACCESS_CONFIG.presentation.surfaceAltarDisplayWidthTiles,
    "adjacent sky altars must not overlap",
  );
}

const relicGate = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[0];
let eligible = false;
let unlocked = false;
const relicProgression = {
  isSkyGateEligible: () => eligible,
  isRegionUnlocked: () => unlocked,
};
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: relicGate,
  progressionSystem: relicProgression,
  relicCount: 0,
}), 0);
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: relicGate,
  progressionSystem: relicProgression,
  relicCount: 2,
}), 1);
eligible = true;
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: relicGate,
  progressionSystem: relicProgression,
  relicCount: 3,
}), 2);

const routeGate = HEAVENBLOCKS_ACCESS_CONFIG.surfaceGates[1];
let routeUnlocked = false;
let routeCompleted = false;
const routeProgression = {
  isRegionUnlocked: () => routeUnlocked,
  isRegionCompleted: () => routeCompleted,
};
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: routeGate,
  progressionSystem: routeProgression,
}), 0);
routeUnlocked = true;
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: routeGate,
  progressionSystem: routeProgression,
}), 1);
routeCompleted = true;
assert.equal(resolveHeavenblocksSurfaceAltarStageIndex({
  gate: routeGate,
  progressionSystem: routeProgression,
}), 2);

console.log("heavenblocks sky altar art contract passed");
