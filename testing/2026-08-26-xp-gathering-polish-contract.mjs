import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createFreesoundFixture } from "./audio-review-2026-09-03/freesound-fixture.mjs";
import {
  isNearXpViewport,
  resolveXpGatheringVariation,
  resolveXpRewardEntry,
  resolveXpSourceColor,
} from "../systems/visual/XPGatheringFxMath.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CORE_ACTION_AUDIO } from "../values/coreActionAudio.js";
import { RESOURCE_ORE_COLOR_INTS } from "../values/resourceTypes.js";
import { XP_GATHERING_CONFIG } from "../values/xpGathering.js";

assert.equal(XP_GATHERING_CONFIG.segments.count, 10);
assert.equal(XP_GATHERING_CONFIG.pickup.maxActiveSprites, 10);
assert.ok(XP_GATHERING_CONFIG.pickup.coalesceWindowMs <= 50);
assert.equal(XP_GATHERING_CONFIG.pickup.variations.routine.pickupCount, 1);
assert.equal(XP_GATHERING_CONFIG.pickup.variations.cluster.pickupCount, 2);
assert.equal(XP_GATHERING_CONFIG.pickup.variations.special.showLabel, true);
assert.equal(XP_GATHERING_CONFIG.pickup.variations.levelUp.pickupCount, 3);
assert.ok(XP_GATHERING_CONFIG.pickup.variations.routine.alpha < 0.7);

assert.equal(resolveXpGatheringVariation([{ xpGained: 1 }]), "routine");
assert.equal(resolveXpGatheringVariation([{ xpGained: 1 }, { xpGained: 2 }]), "cluster");
assert.equal(resolveXpGatheringVariation([{ specialBlockEffect: "levelProgress" }]), "special");
assert.equal(resolveXpGatheringVariation([{ levelUp: true }]), "levelUp");

const colorScene = {
  config: {
    skyTileRarities: [
      { palette: { glowColor: 0x87ceeb } },
      { palette: { glowColor: 0xcc44ff } },
    ],
  },
};
assert.equal(
  resolveXpSourceColor(colorScene, { resourceType: "copper", skyTileRarity: null }),
  RESOURCE_ORE_COLOR_INTS.copper,
);
assert.equal(resolveXpSourceColor(colorScene, { skyTileRarity: 1 }), 0xcc44ff);
assert.equal(
  resolveXpSourceColor(colorScene, { specialBlockEffect: "legendLevelProgress" }),
  XP_GATHERING_CONFIG.sourceColors.legendBlock,
);

const entry = resolveXpRewardEntry(
  { config: { tileSize: 64 } },
  { xpGained: 18, resourceType: "gold", skyTileRarity: 2 },
  { tx: 3, ty: 4 },
);
assert.deepEqual(entry, {
  worldX: 224,
  worldY: 288,
  xpGained: 18,
  resourceType: "gold",
  skyTileRarity: 2,
  specialBlockEffect: undefined,
  levelUp: false,
});
assert.equal(isNearXpViewport({ scale: { width: 1280, height: 720 } }, { x: -12, y: 400 }), true);
assert.equal(isNearXpViewport({ scale: { width: 1280, height: 720 } }, { x: -100, y: 400 }), false);

for (const [id, path] of Object.entries(XP_GATHERING_CONFIG.assetPaths)) {
  assert.ok(ASSET_KEYS.ui.xpGathering[id]);
  const png = await readFile(new URL(`../${path}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png[25], 6, `${id} XP icon must retain true RGBA transparency`);
}

const audioFixture = createFreesoundFixture();
const sound = audioFixture.system;
assert.equal(sound.playXpGather({ segmentIndex: 4 }), null);
assert.equal(sound.playXpGather({ levelUp: true }), null);
assert.equal(sound.playXpGather({ special: true, segmentIndex: 9 }), null);
assert.ok(sound.playResourcePickup({ special: true }));
audioFixture.tick(CORE_ACTION_AUDIO.pickups.pickupGapMs);
assert.ok(sound.playResourcePickup());
assert.equal(audioFixture.played.length, 2);
assert.ok(audioFixture.played.every(event => event.key === "approved-review-libResourcePop"));
assert.ok(sound.reviewedSfx.history.every(event => event.rate === 1));
sound.destroy();

const [barSource, gameplaySource, updateSource, engineSource] = await Promise.all([
  readFile(new URL("../ui/hud/XPProgressBar.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneGameplay.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/CelestialEngineController.js", import.meta.url), "utf8"),
]);
assert.match(barSource, /segments\.count/);
assert.match(barSource, /_animateLevelAdvance/);
assert.match(barSource, /XPGatheringFxSystem/);
assert.doesNotMatch(barSource, /this\._fillPercent = newPct/);
assert.match(gameplaySource, /showXpGatheringFeedback/);
assert.match(updateSource, /showXpGatheringFeedback/);
assert.match(engineSource, /showXpGatheringFeedback/);

console.log("XP_GATHERING_POLISH_CONTRACT_OK");
