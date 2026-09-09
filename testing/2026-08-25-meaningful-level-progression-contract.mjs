import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SoundSystem } from "../sound/SoundSystem.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import {
  APPROVED_SFX_FAMILIES,
  AUDIO_CONFIG,
} from "../values/audioConfig.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { CELESTIAL_TALENT_BRANCHES } from "../values/celestialTalentBranches.js";
import { validateSaveSnapshotIntegrity } from "../values/progressionInvariants.js";
import {
  createHardcoreModeData,
  HARDCORE_MODE_CONFIG,
} from "../values/hardcoreMode.js";

globalThis.Phaser = {
  Math: {
    Clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
    Linear: (from, to, amount) => from + (to - from) * amount,
    Vector2: class Vector2 {},
  },
};

assert.equal(LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL, 10);
assert.equal(LEVEL_CONFIG.HARDCAP, 99);
const expectedFirstThreshold = Array.from(
  { length: LEVEL_CONFIG.LEGACY_LEVELS_PER_LEVEL },
  (_, index) => LEVEL_CONFIG.getXPRequiredForLegacyLevel(index + 2),
).reduce((total, value) => total + value, 0);
assert.equal(LEVEL_CONFIG.getXPRequiredForLevel(2), expectedFirstThreshold);
assert.equal(expectedFirstThreshold, 2417);

const levels = new PlayerLevelSystem();
levels.currentXP = expectedFirstThreshold - LEVEL_CONFIG.TILE_XP.dirt;
const levelUp = levels.gainXP("dirt");
assert.equal(levelUp.newLevel, 2);
assert.equal(levelUp.levelsGained, 1);
assert.equal(levelUp.automaticReward.count, 2);
assert.deepEqual(levelUp.rewardSummary, {
  level: 2,
  levelsGained: 1,
  talentPointsGain: 0,
  panicResistanceGainMeters: 20,
  panicResistanceMeters: 20,
  miningPowerGainPercent: 56,
  maxHpGain: 50,
  gemPowerMaxGain: 100,
});
assert.equal(levels.currentXP, 0);
assert.equal(levels.getMiningDamageMultiplier(), 1.56);

const gains = [2, 10, 25, 50, 99]
  .map(level => LEVEL_CONFIG.getPanicResistanceGainMeters(level));
assert.equal(gains[0], 20);
assert.equal(gains.at(-1), 50);
assert.ok(gains.every(gain => gain >= 20 && gain <= 50));
assert.ok(gains.every((gain, index) => index === 0 || gain >= gains[index - 1]));
assert.ok(LEVEL_CONFIG.getPanicResistanceMeters(99) > 4000);

const migrated = new PlayerLevelSystem();
assert.equal(migrated.fromJSON({
  level: 10,
  currentXP: 0,
  totalXP: 1000,
  automaticMilestoneRewards: 2,
  choiceSelections: { miningPower: 0 },
}), true);
assert.equal(migrated.level, 1);
assert.equal(
  migrated.currentXP,
  Array.from({ length: 9 }, (_, index) => (
    LEVEL_CONFIG.getXPRequiredForLegacyLevel(index + 2)
  )).reduce((total, value) => total + value, 0),
);
assert.equal(migrated.toJSON().progressionVersion, LEVEL_CONFIG.PROGRESSION_VERSION);
const migratedRoundTrip = new PlayerLevelSystem();
assert.equal(migratedRoundTrip.fromJSON(migrated.toJSON()), true);
assert.equal(migratedRoundTrip.automaticMilestoneRewards, 2);
assert.equal(validateSaveSnapshotIntegrity({
  worldIdentity: { seed: 1, width: 1, depth: 1, topAirRows: 1 },
  resources: {},
  upgrades: { money: 0 },
  levelData: { level: 999, currentXP: 0, totalXP: 0 },
}).ok, true);

function makeLight(levelSystem) {
  const light = Object.create(LightSystem.prototype);
  light.config = LIGHT_CONFIG;
  light.scene = {
    playerLevelSystem: levelSystem,
    upgradeSystem: null,
    cameras: { main: { width: 1280, height: 720 } },
    config: { viewportWidth: 1280, viewportHeight: 720 },
  };
  light.weatherSystem = null;
  light.dayNightCycle = null;
  light._playerLightProfileId = "v2";
  light._torchActive = false;
  light._lightingState = "undergroundDarkness";
  light._randomEventPresentation = null;
  return light;
}

const baselineLight = makeLight(new PlayerLevelSystem());
const levelTwoLight = makeLight(levels);
const baselineAt100 = baselineLight._resolveLightingState(100);
const levelTwoAt100 = levelTwoLight._resolveLightingState(100);
assert.equal("darknessResistanceMeters" in levelTwoAt100, false);
assert.equal(levelTwoAt100.visibilityDepth, 100);
assert.equal(levelTwoAt100.depth, 100);
assert.equal(
  levelTwoLight._computeVisibilityRadius(levelTwoAt100),
  baselineLight._computeVisibilityRadius(baselineAt100),
  "player level must not change visual darkness",
);
assert.equal(
  levelTwoAt100.torchDrainPerSecond,
  levelTwoLight._getTorchDrainPerSecond(100),
  "actual depth, not resisted depth, still owns torch cost",
);

function makeHardcore() {
  const system = new HardcoreModeSystem({
    ...createHardcoreModeData("hardcore", 1),
    armed: true,
    armedAt: 2,
  });
  return system;
}

const levelOnePanic = makeHardcore().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: 0,
});
const levelTwoPanic = makeHardcore().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: levels.getPanicResistanceMeters(),
});
assert.equal(levelOnePanic.panicStartDepth, HARDCORE_MODE_CONFIG.stress.panicStartDepthTiles);
assert.equal(levelTwoPanic.panicStartDepth, 42);
assert.equal(levelTwoPanic.effectivePanicDepth, 80);
assert.ok(levelTwoPanic.stressGainPerSecond < levelOnePanic.stressGainPerSecond);

const beforePanicLine = makeHardcore().update(100, {
  gameplayActive: true,
  depth: 41,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: 20,
});
const atPanicLine = makeHardcore().update(100, {
  gameplayActive: true,
  depth: 42,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: 20,
});
assert.equal(beforePanicLine.stressGainPerSecond, 0);
assert.ok(atPanicLine.stressGainPerSecond > 0);

assert.equal(UPGRADES.thunderStrikeAbility.requiresLevel, undefined);
assert.equal(UPGRADES.dragonPickaxe.requiresLevel, undefined);
assert.ok(CELESTIAL_TALENT_BRANCHES.every(branch => (
  branch.nodes.every(node => node.requiredLevel === 3)
)));

const played = [];
const timers = [];
const soundScene = {
  cache: {
    audio: {
      exists: key => APPROVED_SFX_FAMILIES.levelUpReward
        .some(asset => asset.key === key),
    },
  },
  sound: {
    add(key, config) {
      const sound = {
        key,
        config,
        manager: {},
        pendingDestroy: false,
        stopped: false,
        destroyed: false,
        once() { return this; },
        play() { played.push(this); },
        stop() { this.stopped = true; },
        destroy() { this.destroyed = true; },
      };
      return sound;
    },
  },
  time: {
    delayedCall(delay, callback) {
      const timer = { delay, callback, remove() {} };
      timers.push(timer);
      return timer;
    },
  },
};
const sound = new SoundSystem(soundScene);
sound.audioInitialized = true;
sound.soundLibraryManager.libraries.levelUpReward.push(
  ...APPROVED_SFX_FAMILIES.levelUpReward,
);
const originalRandom = Math.random;
const randomValues = [0, 0, 0.99];
Math.random = () => randomValues.shift() ?? 0.99;
let firstLevelCue;
let secondLevelCue;
try {
  firstLevelCue = sound.playLevelUpReward();
  secondLevelCue = sound.playLevelUpReward();
} finally {
  Math.random = originalRandom;
}
assert.ok(firstLevelCue);
assert.ok(secondLevelCue);
assert.equal(played.length, 2, "one sound must play per explicit level event");
assert.equal(timers.length, 0, "level audio must not schedule stacked follow-up cues");
assert.notEqual(firstLevelCue.key, secondLevelCue.key);
assert.equal(firstLevelCue.stopped, true);
assert.equal(firstLevelCue.destroyed, true);
for (const cue of played) {
  const asset = APPROVED_SFX_FAMILIES.levelUpReward
    .find(candidate => candidate.key === cue.key);
  assert.ok(asset);
  assert.equal(
    cue.config.volume,
    AUDIO_CONFIG.masterVolume
      * AUDIO_CONFIG.sfxVolume
      * AUDIO_CONFIG.levelUpRewardVolume
      * asset.volumeMultiplier,
  );
}

const [presentationSource, updateSource, reviewSource] = await Promise.all([
  readFile(new URL("../systems/visual/LevelUpRewardPresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("./UiReviewHarness.js", import.meta.url), "utf8"),
]);
assert.match(presentationSource, /ASSET_KEYS\.ui\.approvedHud\.levelUpShell/);
assert.match(presentationSource, /ASSET_KEYS\.ui\.xpGathering\.levelUp/);
assert.doesNotMatch(presentationSource, /add\.graphics|add\.rectangle|add\.circle/);
assert.match(updateSource, /fillGemPower/);
assert.match(updateSource, /levelUpRewardPresentation\?\.show/);
assert.match(updateSource, /playLevelUpReward/);
assert.match(reviewSource, /levelUpRewardPresentation\?\.show/);

console.log("MEANINGFUL_LEVEL_PROGRESSION_CONTRACT_OK", {
  firstThresholdXP: expectedFirstThreshold,
  firstReward: levelUp.rewardSummary,
  lateGamePanicResistanceMeters: LEVEL_CONFIG.getPanicResistanceMeters(99),
});
