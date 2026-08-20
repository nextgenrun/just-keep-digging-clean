import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  UNDERSTAR_ENDING_CONFIG,
  UNDERSTAR_ENDING_STATES,
  sanitizeUnderstarEndingData,
} from "../values/understarEnding.js";
import {
  createDugTilesSavePayload,
  normalizeDugTilesSavePayload,
} from "../world/model/DugTilesSaveCodec.js";
import { resolveInteractionPriorities } from "../world/playScene/interactionPriority.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const assetPath = path.join(root, ASSET_KEYS.background.understarEnding.path);

assert.equal(UNDERSTAR_ENDING_CONFIG.triggerDepthMeters, 2000);
assert.ok(UNDERSTAR_ENDING_CONFIG.prefetchDepthMeters < 2000);
assert.equal(
  sanitizeUnderstarEndingData({ state: UNDERSTAR_ENDING_STATES.COMPLETED }).state,
  UNDERSTAR_ENDING_STATES.LOCKED,
  "an awakened state without a valid anchor must fail closed",
);

const completed = sanitizeUnderstarEndingData({
  state: UNDERSTAR_ENDING_STATES.COMPLETED,
  anchorTileX: 22,
});
const payload = createDugTilesSavePayload({
  worldIdentity: { seed: 1, width: 280, depth: 5065, topAirRows: 65 },
  dugTileKeys: [],
  resources: {},
  understarEndingData: completed,
});
assert.deepEqual(normalizeDugTilesSavePayload(payload)?.understarEndingData, completed);

assert.ok(fs.statSync(assetPath).size > 400_000);
assert.deepEqual(
  readWebpMetadata(assetPath),
  { width: 1672, height: 941, alphaFlag: false, hasAlpha: false },
);

const priorities = resolveInteractionPriorities({
  understar: 0,
  milestone: 0,
  npc: 1,
});
assert.equal(priorities.understar, true);
assert.equal(priorities.milestone, false);

const setupSource = read("world/playScene/PlaySceneSetup.js");
assert.match(setupSource, /WORLD_DEPTH_CONFIG\.topAirRows[\s\S]*levelOneRuntimeDepthTiles/);
assert.ok(
  setupSource.indexOf("createPlaySceneSaveCoordinator(this)")
    < setupSource.indexOf("installJkdE2EHarness(this)"),
  "the E2E save guard must install after the coordinator owns save methods",
);

const updateSource = read("world/playScene/PlaySceneUpdate.js");
assert.match(updateSource, /priority\.understar/);
assert.match(updateSource, /understarEndingSystem\?\.isFinaleDepth/);
assert.match(read("world/playScene/PlaySceneSaveRuntime.js"), /understarEndingData/);
assert.match(read("world/playScene/PlaySceneUI.js"), /loadSaveData\?\.\(savedData\.understarEndingData\)/);

for (const relativePath of [
  "systems/demo/UnderstarEndingSystem.js",
  "ui/overlays/UnderstarEndingOverlay.js",
]) {
  const source = read(relativePath);
  assert.ok(source.split(/\r?\n/).length <= 300, `${relativePath} exceeds 300 lines`);
  assert.doesNotMatch(source, /add\.(?:graphics|rectangle|circle)\s*\(/i);
}

console.log("Understar ending contract passed: 2,000 m, art, save, UI and E2E safety verified");
