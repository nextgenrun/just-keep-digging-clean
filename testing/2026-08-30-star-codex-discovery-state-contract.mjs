import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FloatingTextSystem } from "../systems/visual/FloatingTextSystem.js";
import { sanitizeStarCollectionData } from "../values/savePayloadV15.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../values/starIdentityLibrary.js";
import { getStarIdentitiesForRarity } from
  "../values/starIdentityLibraryMath.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const saveReasons = [];
const scene = {
  ancientRelicSystem: { getCount: () => 0 },
  queueDugTilesSave: reason => saveReasons.push(reason),
};
const commonIdentities = getStarIdentitiesForRarity(0);
const collectedIdentity = commonIdentities[5];
const recoveredIdentity = commonIdentities[8];
const system = new FloatingTextSystem(scene, 1);

const first = system._recordCollectedStar("dirt", 0, {
  identityIndex: collectedIdentity.index,
});
assert.equal(first.identityIndex, collectedIdentity.index);
assert.equal(first.identityEncounterCount, 1);
assert.equal(first.identityNewlyDiscovered, true);

const repeat = system._recordCollectedStar("dirt", 0, {
  identityIndex: collectedIdentity.index,
});
assert.equal(repeat.identityEncounterCount, 2);
assert.equal(repeat.identityNewlyDiscovered, false);
assert.equal(system.getStarIdentityCounts()[collectedIdentity.index], 2);
assert.deepEqual(saveReasons, ["star-collected", "star-collected"]);

const saved = system.getSaveData();
assert.equal(saved.identityCounts.length, STAR_IDENTITY_LIBRARY_CONFIG.identities.length);
assert.equal(saved.identityCounts[collectedIdentity.index], 2);
const restored = new FloatingTextSystem(scene, 1, saved);
assert.equal(restored.getStarIdentityCounts()[collectedIdentity.index], 2);

const recovered = restored.recoverStarIdentityCountsFromWorld({
  dugTileSource: new Map([
    ["10,20", { tx: 10, ty: 20, type: TILE_TYPES.SKY_TILE }],
    ["11,20", { tx: 11, ty: 20, type: TILE_TYPES.SKY_TILE }],
    ["12,20", { tx: 12, ty: 20, type: TILE_TYPES.DIRT }],
  ]),
  getSkyTileIdentity: tx => (
    tx === 10 ? collectedIdentity.index : recoveredIdentity.index
  ),
});
assert.equal(recovered.changed, true);
assert.equal(recovered.recovered, 2);
assert.equal(restored.getStarIdentityCounts()[collectedIdentity.index], 2);
assert.equal(restored.getStarIdentityCounts()[recoveredIdentity.index], 1);

const sanitized = sanitizeStarCollectionData({
  identityCounts: [2, -1, 1.5, Number.POSITIVE_INFINITY, 4],
});
assert.deepEqual(sanitized.identityCounts, [2, 0, 0, 0, 4]);

const playSceneUiSource = readFileSync(
  new URL("../world/playScene/PlaySceneUI.js", import.meta.url),
  "utf8",
);
assert.ok(
  playSceneUiSource.indexOf("loadSaveData?.(savedData.starCollectionData)")
    < playSceneUiSource.indexOf("recoverStarIdentityCountsFromWorld?.(this.worldModel)"),
  "legacy recovery must run after persisted identity counts are restored",
);

console.log(
  "Star Codex discovery state contract passed: exact collection counts persist, "
  + "repeats stay explicit, and deterministic legacy Star digs recover safely",
);
