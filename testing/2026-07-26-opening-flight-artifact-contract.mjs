import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { OpeningFlightArtifactSystem } from "../systems/onboarding/OpeningFlightArtifactSystem.js";
import { prepareOpeningFlightStarterSeam } from "../systems/onboarding/OpeningFlightStarterSeam.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";
import {
  OPENING_FLIGHT_ARTIFACT_CONFIG,
  sanitizeOpeningFlightArtifactData,
} from "../values/openingFlightArtifact.js";
import { TILE_TYPES } from "../values/tileTypes.js";

assert.equal(
  OPENING_FLIGHT_ARTIFACT_CONFIG.enabled,
  false,
  "the rejected buried-artifact intro must remain disabled",
);

const freshUpgrades = new UpgradeSystem();
assert.equal(
  freshUpgrades.isGemPowerUnlocked(),
  false,
  "new saves must begin with permanent flight locked",
);

const legacyUpgrades = new UpgradeSystem();
legacyUpgrades.fromJSON({ upgradeLevels: {} });
assert.equal(
  legacyUpgrades.isGemPowerUnlocked(),
  true,
  "legacy saves without an explicit flight field must keep their old unlock",
);

const lockedSaveUpgrades = new UpgradeSystem();
lockedSaveUpgrades.fromJSON({ upgradeLevels: { gemPowerUnlock: 0 } });
assert.equal(
  lockedSaveUpgrades.isGemPowerUnlocked(),
  false,
  "new saves must preserve an explicit locked flight state",
);
assert.equal(
  lockedSaveUpgrades.grantUpgrade(OPENING_FLIGHT_ARTIFACT_CONFIG.upgradeId).success,
  true,
  "the artifact upgrade must use the production upgrade id",
);
assert.equal(lockedSaveUpgrades.isGemPowerUnlocked(), true);

const starterLevelToasts = [];
const starterLevelSystem = new OpeningFlightArtifactSystem({
  playerLevelSystem: { level: 2 },
  uiNotifications: {
    success(message) {
      starterLevelToasts.push(message);
    },
  },
});
assert.equal(
  starterLevelSystem.handleStarterLevelUp({
    levelUp: true,
    newLevel: 2,
    hasChoice: false,
  }),
  false,
  "the dormant intro must not intercept production level-up handling",
);
assert.equal(starterLevelToasts.length, 0);
assert.equal(
  starterLevelSystem.handleStarterLevelUp({
    levelUp: true,
    newLevel: 3,
    hasChoice: true,
  }),
  false,
  "choice-based level-ups must stay with the normal production flow",
);
assert.equal(
  starterLevelSystem.isOpeningGraceActive(),
  false,
  "the rejected intro must not keep a hidden hazard-grace runtime alive",
);

function makeAbilities(upgradeSystem) {
  const body = {
    x: 0,
    y: 0,
    w: 32,
    h: 48,
    vy: 0,
    setClimbing(value) {
      this.climbing = value;
    },
  };
  const sprite = {
    scene: {
      hudSystem: {
        flashStatus() {},
      },
    },
  };
  const worldModel = {
    isSolid() {
      return false;
    },
  };
  const config = {
    tileSize: 94,
    climbSpeedPxPerSec: 252,
  };
  return new PlayerAbilities(sprite, worldModel, config, upgradeSystem, body);
}

const flightInput = {
  getFlyInput() {
    return true;
  },
  getFlyDownInput() {
    return false;
  },
  getQuickslashInput() {
    return false;
  },
  isUp() {
    return false;
  },
};

const lockedAbilities = makeAbilities(new UpgradeSystem());
lockedAbilities.gemPower = lockedAbilities.getGemPowerMax();
lockedAbilities.update(1, flightInput, false, true);
assert.equal(
  lockedAbilities.isFlying(),
  false,
  "having raw GP must not bypass the permanent artifact lock",
);

const unlockedUpgrades = new UpgradeSystem();
unlockedUpgrades.grantUpgrade(OPENING_FLIGHT_ARTIFACT_CONFIG.upgradeId);
const trialAbilities = makeAbilities(unlockedUpgrades);
trialAbilities.fillGemPower();
const trialGpBefore = trialAbilities.gemPower;
trialAbilities.setFreeFlightProvider(() => true);
trialAbilities.update(1, flightInput, false, true);
assert.equal(trialAbilities.isFlying(), true, "the free-flight provider must permit launch");
assert.equal(
  trialAbilities.gemPower,
  trialGpBefore,
  "free flight must spend neither startup GP nor per-second drain",
);

trialAbilities.resetFlyingState();
trialAbilities.setFreeFlightProvider(() => false);
trialAbilities.gemPower = trialAbilities.getGemPowerMax();
trialAbilities.update(1, flightInput, false, true);
assert.equal(trialAbilities.isFlying(), true, "permanent flight must remain after the trial");
assert.ok(
  trialAbilities.gemPower < trialAbilities.getGemPowerMax(),
  "normal flight must resume startup and ongoing GP consumption",
);

const clampedState = sanitizeOpeningFlightArtifactData({
  artifactCollected: true,
  trialStarted: true,
  trialRemainingMs: OPENING_FLIGHT_ARTIFACT_CONFIG.trialDurationMs * 4,
});
assert.equal(
  clampedState.trialRemainingMs,
  OPENING_FLIGHT_ARTIFACT_CONFIG.trialDurationMs,
  "saved trial time must be clamped to the one-time budget",
);

const mutations = [];
const rendererUpdates = [];
const seamScene = {
  config: {
    spawnTileX: 28,
    topAirRows: 65,
  },
  worldModel: {
    dugTiles: new Map([["28,68", { source: "player" }]]),
    setTile(tx, ty, type, hp) {
      mutations.push({ tx, ty, type, hp });
    },
  },
  worldRenderer: {
    applyTileUpdate(tx, ty) {
      rendererUpdates.push({ tx, ty });
    },
  },
};
prepareOpeningFlightStarterSeam(seamScene, OPENING_FLIGHT_ARTIFACT_CONFIG);
assert.deepEqual(
  mutations.map(({ ty, type, hp }) => ({ ty, type, hp })),
  [
    { ty: 67, type: TILE_TYPES.DIRT, hp: 1 },
    { ty: 69, type: TILE_TYPES.DIRT, hp: 1 },
    { ty: 70, type: TILE_TYPES.DIRT, hp: 1 },
    { ty: 71, type: TILE_TYPES.BEDROCK, hp: 0 },
  ],
  "the starter seam must preserve surface/clearance rows, remain one-hit, and preserve already-dug cells",
);
assert.equal(rendererUpdates.length, mutations.length);

const saveStore = new DugTilesSaveStore();
const worldIdentity = {
  seed: 133742,
  width: 280,
  depth: 5065,
  topAirRows: 65,
};
const savedArtifactState = {
  artifactCollected: true,
  trialStarted: true,
  trialRemainingMs: 12500,
  trialComplete: false,
  surfaceReturnCelebrated: false,
};
const payload = saveStore.createPayload(
  worldIdentity,
  [],
  undefined,
  null,
  null,
  null,
  null,
  null,
  [],
  null,
  null,
  null,
  savedArtifactState,
);
assert.ok(payload.version >= 8, "the save payload version must include onboarding state");
assert.equal(payload.openingFlightArtifactData.trialRemainingMs, 12500);
const legacyPayload = { ...payload };
delete legacyPayload.openingFlightArtifactData;
assert.equal(
  saveStore.normalizePayload(legacyPayload).openingFlightArtifactData,
  null,
  "missing onboarding data must remain distinguishable for legacy unlock migration",
);

const [
  setupSource,
  updateSource,
  uiSource,
  artifactSystemSource,
  legacyRuntimeSource,
] = await Promise.all([
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightArtifactSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/onboarding/OpeningFlightLegacyRuntime.js", import.meta.url), "utf8"),
]);
assert.match(setupSource, /new OpeningFlightArtifactSystem\(this\)/);
assert.match(setupSource, /openingFlightArtifactSystem\?\.create\(\)/);
assert.match(setupSource, /openingFlightArtifactSystem\?\.destroy\(\)/);
assert.match(updateSource, /openingFlightArtifactSystem\?\.update\(delta\)/);
assert.match(updateSource, /openingFlightArtifactSystem\?\.handleStarterLevelUp/);
assert.match(uiSource, /openingFlightArtifactSystem\?\.loadSaveData/);
assert.match(uiSource, /openingFlightArtifactSystem\?\.getSaveData/);
assert.match(artifactSystemSource, /new OpeningFlightLegacyRuntime/);
assert.match(artifactSystemSource, /if \(!this\.enabled\) return false/);
assert.match(artifactSystemSource, /this\.runtime = !this\.enabled/);
assert.match(
  legacyRuntimeSource,
  /earthquakeSystem\?\.\s*setPaused\(this\.isOpeningGraceActive\(\)\)/,
);
assert.match(
  legacyRuntimeSource,
  /surfaceReturnCelebrated = true;[\s\S]*?earthquakeSystem\?\.\s*setPaused\(false\)/,
);

console.log("dormant opening flight artifact compatibility contract: PASS");
