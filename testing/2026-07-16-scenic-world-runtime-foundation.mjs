import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_RUNTIME_MODES,
  resolveWorldVisualRuntimeMode,
} from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_MATERIAL_BANDS,
  getWorldVisualMaterialAssets,
  getWorldVisualStartupMaterialAssets,
  resolveWorldVisualMaterialBand,
  validateWorldVisualMaterialCoverage,
} from "../values/worldVisualMaterials.js";
import { WORLD_GAMEPLAY_LAYOUT } from "../values/worldGameplayLayout.js";
import {
  WORLD_VISUAL_FEEDBACK,
  resolveWorldVisualFeedbackFrame,
} from "../values/worldVisualFeedback.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

assert.equal(resolveWorldVisualRuntimeMode(undefined, ""), WORLD_VISUAL_RUNTIME_MODES.scenic);
assert.equal(
  resolveWorldVisualRuntimeMode(undefined, "?worldVisualRuntime=legacy"),
  WORLD_VISUAL_RUNTIME_MODES.legacy
);
assert.equal(
  resolveWorldVisualRuntimeMode(undefined, "?worldVisualRuntime=scenic"),
  WORLD_VISUAL_RUNTIME_MODES.scenic
);
assert.equal(validateWorldVisualMaterialCoverage(65, 5065), true);
assert.equal(WORLD_VISUAL_MATERIAL_BANDS[0].topTile, 65);
assert.equal(WORLD_VISUAL_MATERIAL_BANDS.at(-1).bottomTileExclusive, 5065);
assert.equal(getWorldVisualStartupMaterialAssets().length, 1);
assert.ok(getWorldVisualMaterialAssets().length > getWorldVisualStartupMaterialAssets().length);
assert.equal(resolveWorldVisualMaterialBand(0).id, "surface-earth");
assert.equal(WORLD_VISUAL_FEEDBACK.atlas.frameCount, 78);
assert.equal(WORLD_VISUAL_FEEDBACK.atlas.columns, 8);
assert.ok(resolveWorldVisualFeedbackFrame(7, 66, 1, WORLD_VISUAL_FEEDBACK.resourceMarkers.copper) < 6);

const saveStore = new DugTilesSaveStore({ localStorageKey: "scenic-runtime-contract" });
const payload = saveStore.createPayload({
  seed: 133742,
  width: 280,
  depth: 5065,
  topAirRows: 65,
  layoutId: WORLD_GAMEPLAY_LAYOUT.id,
  layoutRevision: WORLD_GAMEPLAY_LAYOUT.revision,
}, []);
assert.equal(payload.version, 13);
assert.equal(payload.world.layoutId, WORLD_GAMEPLAY_LAYOUT.id);
assert.equal(payload.world.layoutRevision, WORLD_GAMEPLAY_LAYOUT.revision);
assert.deepEqual(saveStore.normalizePayload(payload).world, payload.world);

const setupSource = fs.readFileSync(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const bootSource = fs.readFileSync(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
const feedbackSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualFeedbackLayer.js", import.meta.url),
  "utf8"
);
assert.match(setupSource, /WORLD_VISUAL_RUNTIME_MODES\.legacy/);
assert.match(setupSource, /Scenic-v2 owns the complete visible world/);
assert.match(bootSource, /isScenicWorldVisualRuntime\(\)/);
assert.match(bootSource, /getWorldVisualStartupMaterialAssets/);
assert.doesNotMatch(bootSource, /getWorldVisualMaterialAssets/);
assert.doesNotMatch(runtimeSource, /createBlankLayer|TileSprite|createTilemap|new WorldRenderer/);
assert.match(feedbackSource, /worldVisualFeedback/);
assert.doesNotMatch(feedbackSource, /strokeCircle|lineBetween/);
for (const method of [
  "create",
  "updateRenderWindow",
  "applyTileUpdate",
  "refreshAllTiles",
  "setEmissiveRenderDepth",
  "destroy",
]) {
  assert.match(runtimeSource, new RegExp(`\\b${method}\\(`));
}

console.log("Scenic world runtime foundation contract passed");
