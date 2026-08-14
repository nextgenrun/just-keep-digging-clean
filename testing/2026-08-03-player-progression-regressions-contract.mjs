import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { FIRST_FIVE_MINUTES_CONFIG } from "../values/firstFiveMinutes.js";
import { getMaterialFeedback } from "../values/materialFeedback.js";
import { SYSTEM_INTRODUCTION_CONFIG } from "../values/systemIntroduction.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const gameplayPrototype = {};
setupGameplayMethods(gameplayPrototype);
const calls = {
  dig: [],
  breaks: [],
  star: 0,
  blocked: 0,
};
const audioScene = {
  soundSystem: {
    playDig: options => calls.dig.push(options),
    playTileBreak: options => calls.breaks.push(options),
    playStarDig: () => { calls.star += 1; },
    playTileHit: () => { calls.blocked += 1; },
  },
};
const hardMaterials = [
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.BRONZE,
  TILE_TYPES.STEEL,
  TILE_TYPES.IRON,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
  TILE_TYPES.ANCIENT_RELIC_CACHE,
];
for (const tileType of hardMaterials) {
  gameplayPrototype.playMineFeedbackAudio.call(
    audioScene,
    { success: true, destroyed: false },
    tileType,
  );
}
assert.deepEqual(
  calls.dig,
  hardMaterials.map(tileType => ({ rate: getMaterialFeedback(tileType).digRate })),
  "every successful hard-block hit must emit material-pitched dig audio",
);
gameplayPrototype.playMineFeedbackAudio.call(
  audioScene,
  { success: true, destroyed: true },
  TILE_TYPES.GOLD,
);
assert.deepEqual(calls.breaks, [{
  rate: getMaterialFeedback(TILE_TYPES.GOLD).breakRate,
  volume: getMaterialFeedback(TILE_TYPES.GOLD).breakVolume,
}]);
gameplayPrototype.playMineFeedbackAudio.call(
  audioScene,
  { success: true, destroyed: false },
  TILE_TYPES.SKY_TILE,
);
assert.equal(calls.star, 1);
assert.equal(calls.dig.length, hardMaterials.length + 1);
gameplayPrototype.playMineFeedbackAudio.call(
  audioScene,
  { success: false, reason: "blocked" },
  TILE_TYPES.BEDROCK,
);
assert.equal(calls.blocked, 1);

assert.equal(FIRST_FIVE_MINUTES_CONFIG.firstPortal.depthMeters, 15);
const tutorialSource = await readFile(
  new URL("../systems/onboarding/TownSquareTutorialSystem.js", import.meta.url),
  "utf8",
);
assert.equal(
  tutorialSource.match(/firstSessionPortalSystem\?\.ensure\?\.\(\)/g)?.length,
  2,
  "the tutorial must repair its deterministic portal both on entry and while active",
);

const pauseSource = await readFile(
  new URL("../world/playScene/PlaySceneUI.js", import.meta.url),
  "utf8",
);
assert.match(pauseSource, /\{\s*key:\s*"talents",\s*label:\s*"STARS"/);
assert.match(pauseSource, /createCelestialTalentTreeView|setTalentImmersive/);
assert.match(pauseSource, /\{\s*key:\s*"titans",\s*label:\s*"TITANS"/);
assert.match(pauseSource, /new TitanArchiveView/);
assert.doesNotMatch(
  pauseSource,
  /resolveTitanDiscoveriesEnabled\(\)\s*&&\s*systemFeatureAvailable\("titans"\)/,
);

const runtimeAssetGroupsSource = await readFile(
  new URL("../world/rendering/runtimeFeatureAssetGroups.js", import.meta.url),
  "utf8",
);
assert.match(
  runtimeAssetGroupsSource,
  /getTitanArchivePreloadAssets\(\)/,
  "the ESC Titan archive portraits must be owned by the on-demand archive pack",
);
const unlocks = SYSTEM_INTRODUCTION_CONFIG.upgradeUnlocks;
assert.equal(SYSTEM_INTRODUCTION_CONFIG.featureUnlocks.milestones, "always");
assert.equal(unlocks.strength, "core");
assert.equal(unlocks.bronzePickaxe, "core");
assert.equal(unlocks.quickReflexes, "firstReturn");
assert.equal(unlocks.steelPickaxe, "portalRun");
assert.equal(unlocks.mithrilPickaxe, "caveRun");
assert.equal(unlocks.heavyPunch, "relicRun");
assert.equal(unlocks.seismicSuppression, "hazardRun");
assert.equal(unlocks.worldTwoTunnelAccess, "lateRun");

console.log("Player progression regression contract passed.");
