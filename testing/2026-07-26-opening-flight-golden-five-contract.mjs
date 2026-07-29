import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  createOpeningFlightRuntimeScene,
  createOpeningFlightViewStub,
  createOpeningFlightWorldScene,
} from "./openingFlightGoldenFiveFixture.mjs";

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
};

const [
  { ASSET_KEYS },
  {
    OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
    OPENING_FLIGHT_STAGES,
    resolveOpeningFlightGoldenFiveEnabled,
    shouldUseOpeningFlightGoldenSpawn,
    OPENING_FLIGHT_ARTIFACT_CONFIG,
    sanitizeOpeningFlightArtifactData,
  },
  {
    getOpeningFlightGoldenFiveAnchors,
    openOpeningFlightGoldenFiveEscape,
    prepareOpeningFlightGoldenFiveDescent,
    prepareOpeningFlightGoldenFiveRewardLedge,
  },
  { OpeningFlightGoldenFiveRuntime },
  { TILE_TYPES },
] = await Promise.all([
  import("../values/assetKeys.js"),
  import("../values/openingFlightArtifact.js"),
  import("../systems/onboarding/OpeningFlightStarterSeam.js"),
  import("../systems/onboarding/OpeningFlightGoldenFiveRuntime.js"),
  import("../values/tileTypes.js"),
]);

const cfg = OPENING_FLIGHT_GOLDEN_FIVE_CONFIG;
assert.equal(
  OPENING_FLIGHT_ARTIFACT_CONFIG.enabled,
  false,
  "the rejected Golden Five intro must remain dormant in production",
);
assert.equal(cfg.freeFlightBankMs, 30000);
assert.equal(cfg.layout.path.length, 14);
assert.equal(cfg.layout.artifactDepthTiles, 13);
assert.equal(cfg.cache.money, 125);
assert.equal(cfg.cache.gpCapacityAmount, 40);
assert.equal(cfg.cache.resources.dirt, 40);
assert.equal(cfg.cache.resources.stone, 25);
assert.equal(cfg.cache.resources.copper, 12);
assert.equal(cfg.openingWeather.durationMs, 300000);
assert.equal(cfg.presentation.ringDiameterPx, 188);
assert.equal(cfg.presentation.cacheWidthPx, 132);
assert.ok(
  cfg.presentation.rewardReveal.holdDurationMs >= 5000,
  "the centered reward summary must remain readable",
);
assert.equal(resolveOpeningFlightGoldenFiveEnabled(cfg, "?openingFlightV2=0"), false);
assert.equal(resolveOpeningFlightGoldenFiveEnabled(cfg, "?openingFlightV2=1"), true);

assert.equal(shouldUseOpeningFlightGoldenSpawn(null, cfg, ""), true);
assert.equal(shouldUseOpeningFlightGoldenSpawn({
  openingFlightArtifactData: {
    artifactCollected: false,
    onboardingComplete: false,
  },
}, cfg, ""), true);
assert.equal(shouldUseOpeningFlightGoldenSpawn({
  openingFlightArtifactData: {
    artifactCollected: true,
    surfaceReturnCelebrated: false,
    onboardingComplete: false,
  },
}, cfg, ""), true, "mid-ascent saves must resume at the special shaft");
assert.equal(shouldUseOpeningFlightGoldenSpawn({
  openingFlightArtifactData: {
    artifactCollected: true,
    surfaceReturnCelebrated: true,
    cacheCollected: false,
    onboardingComplete: false,
  },
}, cfg, ""), true, "cache-pending saves must remain beside the reward route");
assert.equal(shouldUseOpeningFlightGoldenSpawn({
  openingFlightArtifactData: {
    artifactCollected: true,
    cacheCollected: true,
    onboardingComplete: true,
  },
}, cfg, ""), false);
assert.equal(shouldUseOpeningFlightGoldenSpawn({
  upgrades: { upgradeLevels: {} },
}, cfg, ""), false, "legacy saves must not be pulled into the new opening");

const worldFixture = createOpeningFlightWorldScene();
const anchors = prepareOpeningFlightGoldenFiveDescent(worldFixture.scene, cfg);
assert.deepEqual(anchors, {
  tileX: 28,
  surfaceRow: 65,
  artifactTileY: 78,
  bottomTileY: 79,
  cacheX: 33,
  platformRow: 62,
});
for (const entry of cfg.layout.path) {
  if (entry.depth <= 1) continue;
  assert.deepEqual(
    worldFixture.cells.get(`28,${65 + entry.depth}`),
    {
      type: TILE_TYPES[entry.typeName],
      hp: entry.hp,
    },
  );
}
assert.deepEqual(worldFixture.cells.get("28,65"), {
  type: TILE_TYPES.FLOOR_TOWN_1,
  hp: 0,
}, "opening-flight setup may not replace the Town Square platform");
for (let tx = 27; tx <= 29; tx += 1) {
  assert.deepEqual(worldFixture.cells.get(`${tx},66`), {
    type: TILE_TYPES.AIR,
    hp: 0,
  }, "opening-flight setup may not refill the shared clearance row");
}
assert.deepEqual(worldFixture.cells.get("27,70"), {
  type: TILE_TYPES.DIRT,
  hp: cfg.layout.sideWallHp,
});
assert.deepEqual(worldFixture.cells.get("29,70"), {
  type: TILE_TYPES.DIRT,
  hp: cfg.layout.sideWallHp,
});
assert.deepEqual(worldFixture.cells.get("28,79"), {
  type: TILE_TYPES.BEDROCK,
  hp: 0,
});

openOpeningFlightGoldenFiveEscape(worldFixture.scene, cfg);
for (let ty = 66; ty <= 78; ty += 1) {
  for (let tx = 27; tx <= 29; tx += 1) {
    assert.equal(
      worldFixture.cells.get(`${tx},${ty}`)?.type,
      TILE_TYPES.AIR,
      "artifact collection must open a forgiving three-wide escape shaft",
    );
  }
}
prepareOpeningFlightGoldenFiveRewardLedge(worldFixture.scene, cfg);
for (let tx = 32; tx <= 34; tx += 1) {
  assert.equal(worldFixture.cells.get(`${tx},62`)?.type, TILE_TYPES.BEDROCK);
}
assert.deepEqual(
  getOpeningFlightGoldenFiveAnchors(worldFixture.scene, cfg),
  anchors,
);

const runtimeFixture = createOpeningFlightRuntimeScene();
const runtime = new OpeningFlightGoldenFiveRuntime(
  runtimeFixture.scene,
  OPENING_FLIGHT_ARTIFACT_CONFIG,
  cfg,
);
runtime.view = createOpeningFlightViewStub();

runtime.state = sanitizeOpeningFlightArtifactData(null);
runtime._bindFreeFlightProvider();
const freeFlightProvider = runtimeFixture.scene.playerController.abilities.provider;
assert.equal(typeof freeFlightProvider, "function");
assert.equal(runtime.isFreeFlightActive(), false);
assert.equal(freeFlightProvider(), false);
runtime.flight.collectArtifact();
assert.equal(runtime.state.artifactCollected, true);
assert.equal(runtime.state.stage, OPENING_FLIGHT_STAGES.ESCAPE);
assert.equal(runtime.state.trialRemainingMs, 30000);
assert.deepEqual(
  runtimeFixture.rewards.upgrades.at(-1),
  [OPENING_FLIGHT_ARTIFACT_CONFIG.upgradeId, 1],
  "the obvious artifact must grant the permanent production flight upgrade",
);
assert.equal(
  runtime.isFreeFlightActive(),
  true,
  "the first ascent must be protected immediately after artifact collection",
);
assert.equal(freeFlightProvider(), true);
runtime.state = sanitizeOpeningFlightArtifactData({
  ...runtime.state,
  artifactCollected: true,
  surfaceReturnCelebrated: false,
  trialRemainingMs: 0,
});
assert.equal(runtime.state.trialComplete, true);
assert.equal(
  runtime.isFreeFlightActive(),
  true,
  "escape flight must remain protected even if the saved timer is zero",
);
runtime._celebrateSurfaceReturn();
assert.equal(runtime.state.stage, OPENING_FLIGHT_STAGES.FREE_FLIGHT);
assert.equal(runtime.state.surfaceReturnCelebrated, true);
assert.equal(runtime.state.trialRemainingMs, 30000);
assert.equal(runtime.state.trialStarted, false);
assert.equal(runtimeFixture.rewards.quakePaused.at(-1), false);

runtimeFixture.setFlying(true);
runtime._updateFreeFlight(1250, { x: 0, y: 0 });
assert.equal(runtime.state.trialStarted, true);
assert.equal(runtime.state.trialRemainingMs, 28750);
runtimeFixture.setFlying(false);
runtime._updateFreeFlight(1500, { x: 0, y: 0 });
assert.equal(
  runtime.state.trialRemainingMs,
  28750,
  "the one-time flight bank must pause whenever the player stops flying",
);

runtime.state.cacheCollected = true;
runtime.state.rewardGranted = false;
runtime._grantCacheReward();
assert.deepEqual(
  runtimeFixture.rewards.upgrades.at(-1),
  [cfg.cache.tankUpgradeId, cfg.cache.tankUpgradeLevel],
);
assert.equal(runtimeFixture.rewards.money, 125);
assert.equal(runtimeFixture.rewards.resources.dirt, 42);
assert.equal(runtimeFixture.rewards.resources.stone, 28);
assert.equal(runtimeFixture.rewards.resources.copper, 16);
assert.equal(runtimeFixture.scene.playerLevelSystem.level, 2);
assert.equal(
  runtime.view.rewardReveals.length,
  0,
  "completion must not stack a separate reward-reveal popup",
);
assert.deepEqual(runtimeFixture.rewards.notifications.at(-1), [
  "FIRST ASCENT CACHE — +40 GP capacity, 125 M, and starter resources!"
    + "  •  +40 DIRT  •  +25 STONE  •  +12 COPPER"
    + "  •  LEVEL 2 GUARANTEED  •  FLIGHT USES GP  •  GP REFILLS WHILE GROUNDED",
  {
    title: "FIRST ASCENT CACHE — REWARD SECURED",
    key: cfg.feedback.cacheNotificationKey,
  },
]);
assert.equal(runtime.state.onboardingComplete, true);
assert.equal(runtime.state.stage, OPENING_FLIGHT_STAGES.COMPLETE);
assert.equal(runtime.state.trialRemainingMs, 0);
assert.equal(runtime.state.trialComplete, true);
assert.equal(
  runtime.isFreeFlightActive(),
  false,
  "cache completion must restore normal Gem Power flight drain",
);
assert.equal(
  freeFlightProvider(),
  false,
  "the provider bound into PlayerAbilities must stop bypassing GP drain",
);
runtime._grantCacheReward();
assert.equal(runtimeFixture.rewards.money, 125, "the starter cache must be idempotent");

const sanitized = sanitizeOpeningFlightArtifactData({
  version: 2,
  artifactCollected: true,
  firstDigCelebrated: true,
  ringsPassed: 9,
  surfaceReturnCelebrated: true,
  cacheCollected: true,
  rewardGranted: true,
  onboardingComplete: true,
  trialRemainingMs: cfg.freeFlightBankMs,
});
assert.equal(sanitized.ringsPassed, 3);
assert.equal(sanitized.stage, OPENING_FLIGHT_STAGES.COMPLETE);
assert.equal(sanitized.rewardGranted, true);
assert.equal(
  sanitized.trialRemainingMs,
  0,
  "completed saves must repair leaked tutorial flight time on load",
);
assert.equal(sanitized.trialComplete, true);

const runtimeAssetPaths = [
  "flight-artifact-v2.webp",
  "shaft-marker-v2.webp",
  "flight-ring-v2.webp",
  "first-ascent-cache-compact-v3.webp",
  "objective-hud-frame-v2.webp",
];
for (const file of runtimeAssetPaths) {
  const info = await stat(new URL(
    `../sprites/onboarding/opening-flight-v2/runtime/${file}`,
    import.meta.url,
  ));
  assert.ok(info.size > 100000, `${file} must be a production-quality runtime asset`);
}
assert.equal(
  ASSET_KEYS.onboarding.openingFlightV2.artifact,
  "opening-flight-v2-artifact",
);

const [
  bootSource,
  assetKeysSource,
  setupSource,
  systemSource,
  welcomeSource,
  uiSource,
  routeViewSource,
  rewardRevealSource,
  rewardControllerSource,
] = await Promise.all([
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../values/assetKeys.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightArtifactSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/model/WelcomeMessageGenerator.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightGoldenFiveRouteView.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightGoldenFiveRewardRevealView.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightGoldenFiveRewardController.js", import.meta.url), "utf8"),
]);
assert.match(bootSource, /preloadOpeningFlightSprites\(\)/);
assert.match(bootSource, /opening\.paths/);
assert.match(assetKeysSource, /flight-artifact-v2\.webp/);
assert.match(assetKeysSource, /first-ascent-cache-compact-v3\.webp/);
assert.match(assetKeysSource, /objective-hud-frame-v2\.webp/);
assert.doesNotMatch(
  setupSource,
  /shouldUseOpeningFlightGoldenSpawn/,
  "PlayScene must never route a fresh or resumed save into the rejected shaft",
);
assert.match(setupSource, /new TownSquareTutorialSystem\(this\)/);
assert.match(setupSource, /townSquareTutorialSystem\?\.create\(\)/);
assert.match(systemSource, /resolveOpeningFlightGoldenFiveEnabled/);
assert.match(systemSource, /this\.enabled = config\.enabled === true/);
assert.match(systemSource, /applyChoiceReward\?\.\("miningPower"\)/);
assert.doesNotMatch(welcomeSource, /FLIGHT IS BURIED BELOW THE HUGE ARROWS/);
assert.match(welcomeSource, /LEARN THE TOWN LOOP TO UNLOCK FLIGHT/);
assert.doesNotMatch(uiSource, /FLIGHT LOCKED  •  DIG BELOW/);
assert.match(uiSource, /FLIGHT UNLOCKS AFTER TRAINING/);
assert.match(routeViewSource, /cacheGroundInsetPx/);
assert.match(routeViewSource, /cacheSettleDurationMs/);
assert.doesNotMatch(routeViewSource, /bobDistancePx/);
assert.match(rewardRevealSource, /objectiveHudFrame/);
assert.match(rewardRevealSource, /rewardFooterSize/);
assert.doesNotMatch(rewardControllerSource, /showRewardReveal\(\{/);
assert.doesNotMatch(rewardControllerSource, /showFloatingText/);
assert.doesNotMatch(rewardControllerSource, /flashStatus/);

console.log("dormant opening flight Golden Five rollback contract: PASS");
