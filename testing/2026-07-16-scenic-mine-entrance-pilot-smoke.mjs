import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_LANDMARKS,
  getWorldVisualLandmarkPreloadAssets,
  resolveWorldVisualLandmarksEnabled,
} from "../values/worldVisualLandmarks.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { resolveWorldVisualLandmarkAnchor } from "../world/rendering/scenic-world/WorldVisualLandmarkLayer.js";

assert.equal(resolveWorldVisualLandmarksEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualLandmarksEnabled(undefined, "?mineEntrancePilot=0"), false);
assert.equal(resolveWorldVisualLandmarksEnabled(undefined, "?mineEntrancePilot=off"), false);
assert.equal(getWorldVisualLandmarkPreloadAssets(undefined, "?mineEntrancePilot=0").length, 0);
assert.equal(getWorldVisualLandmarkPreloadAssets().length, 2);

const [entry] = WORLD_VISUAL_LANDMARKS.entries;
const worldModel = new WorldModel(GAME_CONFIG);
const anchor = resolveWorldVisualLandmarkAnchor({ config: GAME_CONFIG }, worldModel, entry);
assert.equal(entry.anchor.kind, "shallowestSafeCaveMouth");
assert.ok(
  worldModel.caveZones.some(zone => zone.id === anchor.zoneId),
  "the landmark must resolve to an authoritative cave zone",
);
assert.ok(Number.isFinite(anchor.tileX));
assert.ok(Number.isFinite(anchor.floorTileY));
assert.equal(worldModel.isSolid(Math.ceil(anchor.tileX), anchor.floorTileY - 1), false);
assert.equal(worldModel.isSolid(Math.ceil(anchor.tileX), anchor.floorTileY), true);
assert.equal(entry.crop.y + entry.crop.height, 1020, "measured alpha bottom must remain the floor contact");
assert.ok(entry.beautyDepth > 0);
assert.ok(entry.emissiveDepth > entry.beautyDepth);
assert.ok(entry.displayWidthTiles >= 3 && entry.displayWidthTiles <= 3.3);

for (const asset of Object.values(WORLD_VISUAL_LANDMARKS.assets)) {
  assert.equal(fs.existsSync(new URL(`../${asset.path}`, import.meta.url)), true, asset.path);
}

const layerSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualLandmarkLayer.js", import.meta.url),
  "utf8"
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
const bootSource = fs.readFileSync(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");

assert.match(layerSource, /setCrop\(/);
assert.match(layerSource, /Phaser\.BlendModes\.ADD/);
assert.match(layerSource, /lighting\.night/);
assert.match(layerSource, /lighting\.wet/);
assert.match(layerSource, /lighting\.lightning/);
assert.doesNotMatch(layerSource, /setTile|damageTile|digTile|createTilemap/);
assert.match(runtimeSource, /new WorldVisualLandmarkLayer/);
assert.match(runtimeSource, /landmarkLayer\?\.update/);
assert.match(runtimeSource, /landmarkLayer\?\.destroy/);
assert.match(bootSource, /getWorldVisualLandmarkPreloadAssets/);

console.log("Scenic mine-entrance pilot contract passed");
