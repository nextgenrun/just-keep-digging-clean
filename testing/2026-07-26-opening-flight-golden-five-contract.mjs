import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

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
assert.equal(cfg.freeFlightBankMs, 30000);
assert.equal(cfg.layout.path.length, 14);
assert.equal(cfg.layout.artifactDepthTiles, 13);
assert.equal(cfg.cache.money, 125);
assert.equal(cfg.cache.resources.dirt, 40);
assert.equal(cfg.cache.resources.stone, 25);
assert.equal(cfg.cache.resources.copper, 12);
assert.equal(cfg.openingWeather.durationMs, 300000);
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

function createWorldScene() {
  const cells = new Map();
  const rendererUpdates = [];
  const key = (tx, ty) => `${tx},${ty}`;
  const worldModel = {
    dugTiles: new Map(),
    inBounds(tx, ty) {
      return tx >= 0 && tx < 280 && ty >= 0 && ty < 5065;
    },
    setTile(tx, ty, type, hp) {
      cells.set(key(tx, ty), { type, hp });
      if (type !== TILE_TYPES.AIR) this.dugTiles.delete(key(tx, ty));
    },
    isSolid(tx, ty) {
      return (cells.get(key(tx, ty))?.type ?? TILE_TYPES.DIRT) !== TILE_TYPES.AIR;
    },
    tileToWorld(tx, ty) {
      return { x: tx * 94 + 47, y: ty * 94 + 47 };
    },
  };
  return {
    cells,
    rendererUpdates,
    scene: {
      config: {
        spawnTileX: 28,
        topAirRows: 65,
        tileSize: 94,
      },
      worldModel,
      worldRenderer: {
        applyTileUpdate(tx, ty) {
          rendererUpdates.push(key(tx, ty));
        },
      },
    },
  };
}

const worldFixture = createWorldScene();
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
  assert.deepEqual(
    worldFixture.cells.get(`28,${65 + entry.depth}`),
    {
      type: TILE_TYPES[entry.typeName],
      hp: entry.hp,
    },
  );
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

function createViewStub() {
  return {
    hud: [],
    passed: [],
    cachesShown: 0,
    cacheCelebrations: 0,
    setBuriedProximity() {},
    showHud(payload) { this.hud.push(payload); },
    showEscapeRings() {},
    passRing(index) { this.passed.push(index); },
    showCache() { this.cachesShown += 1; },
    celebrateCache() { this.cacheCelebrations += 1; },
    hideHud() {},
    destroy() {},
  };
}

function createRuntimeScene() {
  const fixture = createWorldScene();
  const rewards = {
    upgrades: [],
    money: 0,
    resources: {
      dirt: 2,
      stone: 3,
      copper: 4,
    },
    fills: 0,
    saves: 0,
    quakePaused: [],
    weather: [],
  };
  let flying = false;
  const scene = {
    ...fixture.scene,
    earthquakeSystem: {
      setPaused(value) { rewards.quakePaused.push(value); },
    },
    weatherSystem: {
      forceWeather(...args) { rewards.weather.push(args); },
    },
    upgradeSystem: {
      isGemPowerUnlocked() { return false; },
      grantUpgrade(id, level = 1) {
        rewards.upgrades.push([id, level]);
        return { success: true, level };
      },
      addMoney(amount) { rewards.money += amount; },
    },
    digSystem: {
      getResourceTotals() { return { ...rewards.resources }; },
      setResourceTotals(next) { rewards.resources = { ...next }; },
    },
    playerLevelSystem: {
      level: 1,
      gainLevel(count) {
        this.level += count;
        return { levelUp: true, newLevel: this.level };
      },
    },
    playerController: {
      physicsBody: { x: 0, y: 0, w: 32, h: 48 },
      getPlayerTile() { return { tx: 28, ty: 78 }; },
      input: {
        controlsEnabled: true,
        getVerticalAim() { return { down: true }; },
        setControlsEnabled() {},
      },
      abilities: {
        fillGemPower() { rewards.fills += 1; },
        isFlying() { return flying; },
        setFreeFlightProvider(provider) { this.provider = provider; },
      },
    },
    uiNotifications: {
      success() {},
      info() {},
    },
    hudSystem: { flashStatus() {} },
    floatingTextSystem: { showFloatingText() {} },
    uiResourceBar: { setResources() {} },
    uiInventoryPopup: { setResources() {} },
    soundSystem: { playUiConfirm() {} },
    time: {
      delayedCall(_delay, callback) {
        callback();
        return { remove() {} };
      },
    },
    queueDugTilesSave() { rewards.saves += 1; },
  };
  return {
    scene,
    rewards,
    setFlying(value) { flying = value; },
  };
}

const runtimeFixture = createRuntimeScene();
const runtime = new OpeningFlightGoldenFiveRuntime(
  runtimeFixture.scene,
  OPENING_FLIGHT_ARTIFACT_CONFIG,
  cfg,
);
runtime.view = createViewStub();

runtime.state = sanitizeOpeningFlightArtifactData(null);
assert.equal(runtime.isFreeFlightActive(), false);
runtime.state = {
  ...runtime.state,
  artifactCollected: true,
  surfaceReturnCelebrated: false,
  trialRemainingMs: 0,
};
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
assert.equal(runtime.state.onboardingComplete, true);
assert.equal(runtime.state.stage, OPENING_FLIGHT_STAGES.COMPLETE);
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
});
assert.equal(sanitized.ringsPassed, 3);
assert.equal(sanitized.stage, OPENING_FLIGHT_STAGES.COMPLETE);
assert.equal(sanitized.rewardGranted, true);

const runtimeAssetPaths = [
  "flight-artifact-v2.webp",
  "shaft-marker-v2.webp",
  "flight-ring-v2.webp",
  "first-ascent-cache-v2.webp",
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
] = await Promise.all([
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../values/assetKeys.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightArtifactSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/model/WelcomeMessageGenerator.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
]);
assert.match(bootSource, /preloadOpeningFlightSprites\(\)/);
assert.match(bootSource, /opening\.paths/);
assert.match(assetKeysSource, /flight-artifact-v2\.webp/);
assert.match(assetKeysSource, /objective-hud-frame-v2\.webp/);
assert.match(setupSource, /shouldUseOpeningFlightGoldenSpawn/);
assert.match(setupSource, /resumeProtectedEscape/);
assert.match(systemSource, /resolveOpeningFlightGoldenFiveEnabled/);
assert.match(systemSource, /applyChoiceReward\?\.\("miningPower"\)/);
assert.match(welcomeSource, /FLIGHT IS BURIED BELOW THE HUGE ARROWS/);
assert.match(uiSource, /FLIGHT LOCKED  •  DIG BELOW/);

console.log("opening flight Golden Five contract: PASS");
