import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { JourneyLedger, sanitizeJourneySaveData } from "../systems/progression/JourneyLedger.js";
import { resolveJourneyGoals } from "../systems/progression/JourneyGoalResolver.js";
import { JourneySystem } from "../systems/progression/JourneySystem.js";
import {
  createResolvedMovementSnapshot,
  resolveMovementSpeed,
} from "../systems/progression/ResolvedPlayerStats.js";
import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import { JOURNEY_CONFIG } from "../values/journeyConfig.js";
import {
  createGameplayCapabilities,
  GAMEPLAY_PROFILE_IDS,
} from "../values/gameplayCapabilities.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

function createSnapshot(progress = {}, stats = {}) {
  return {
    stats: {
      baseMovementSpeedPxPerSec: 200,
      movementSpeedPxPerSec: 200,
      permanentMovementSpeedPxPerSec: 200,
      movementSpeedBonusPxPerSec: 0,
      movementSpeedBonusPercent: 0,
      mineCooldownMs: 500,
      miningRatePerSecond: 2,
      pickaxePower: 1,
      gemPowerMax: 100,
      ...stats,
    },
    upgradeEffects: {},
    progress: {
      bestDepth: 0,
      playerLevel: 1,
      acceptedDepthGates: [],
      portalLabels: [],
      campfireLevel: 1,
      ancientRelics: 0,
      constellationCount: 0,
      installedHeavenblockPartIds: [],
      openedArcVaultIds: [],
      discoveredTitanIds: [],
      upgradeLevels: {},
      ownedUpgradeCount: 0,
      ...progress,
    },
  };
}

const fullReviewCapabilities = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW);

// Movement display and physics share one resolved authority.
assert.equal(resolveMovementSpeed({ baseSpeed: 200, flatBonus: 5 }), 205);
assert.equal(
  resolveMovementSpeed({
    baseSpeed: 200,
    flatBonus: 5,
    multiplier: 1.1,
    actionBonus: 40,
  }),
  265.5,
);
const movementSnapshot = createResolvedMovementSnapshot({
  baseSpeed: 200,
  flatBonus: 5,
  multiplier: 1.1,
});
assert.ok(Math.abs(movementSnapshot.movementSpeedPxPerSec - 225.5) < 1e-9);
assert.ok(Math.abs(movementSnapshot.movementSpeedBonusPxPerSec - 25.5) < 1e-9);

// A player beyond the old 1950m dead-end is sent to the actual cross-system
// requirement, not told to dig into another invisible barrier.
const blockedAtWorldTwo = createSnapshot({
  bestDepth: 1950,
  acceptedDepthGates: [100, 300, 1000],
  worldTwoRequirementCount: 5,
  worldTwoRequirementsMet: 3,
  worldTwoNextRequirement: "40 obsidian",
});
const blockedGoals = resolveJourneyGoals(blockedAtWorldTwo, fullReviewCapabilities);
assert.equal(blockedGoals[0].id, "world-two-key");
assert.match(blockedGoals[0].detail, /40 obsidian/);
assert.doesNotMatch(blockedGoals[0].title, /reach \d+m/i);
assert.ok(blockedGoals.length <= JOURNEY_CONFIG.maxVisibleGoals);

const forgeGoals = resolveJourneyGoals(createSnapshot({
  bestDepth: 1950,
  acceptedDepthGates: [100, 300, 1000],
  upgradeLevels: { worldTwoTunnelAccess: 1 },
  discoveredHeavenblockParts: 3,
  installedHeavenblockParts: 3,
  installedHeavenblockPartIds: ["left", "middle", "right"],
  arcCoreForge: {
    ready: false,
    met: 4,
    total: 6,
    nextRequirement: "Ancient Relic x3",
  },
}), fullReviewCapabilities);
assert.equal(forgeGoals[0].id, "arc-core-forge");
assert.match(forgeGoals[0].detail, /Ancient Relic x3/);

// "What changed" stores exact permanent values, while remaining bounded and
// deliberately excluding transient GP totals.
let liveSnapshot = createSnapshot();
const journey = new JourneySystem({
  snapshotProvider: () => liveSnapshot,
});
journey.seedCurrentState();
liveSnapshot = createSnapshot({}, {
  movementSpeedPxPerSec: 205,
  permanentMovementSpeedPxPerSec: 205,
  movementSpeedBonusPxPerSec: 5,
  movementSpeedBonusPercent: 2.5,
});
const movementEvent = journey.recordUpgradePurchase({
  upgrade: UPGRADES.agility,
  beforeSnapshot: createSnapshot(),
  afterSnapshot: liveSnapshot,
  beforeLevel: 0,
  afterLevel: 1,
});
assert.deepEqual(
  {
    title: movementEvent.title,
    before: movementEvent.before,
    after: movementEvent.after,
    unit: movementEvent.unit,
  },
  {
    title: "Movement Speed",
    before: 200,
    after: 205,
    unit: "px/s",
  },
);
assert.doesNotMatch(JSON.stringify(journey.getSaveData()), /gemPower|GP @/i);

const ledger = new JourneyLedger();
for (let index = 0; index < JOURNEY_CONFIG.maxStoredEvents + 8; index += 1) {
  ledger.record({
    type: "level",
    title: `Milestone ${index}`,
    before: index,
    after: index + 1,
    unit: "level",
  });
}
assert.equal(
  ledger.getSaveData().events.length,
  JOURNEY_CONFIG.maxStoredEvents,
);
assert.equal(
  sanitizeJourneySaveData({
    events: [{ type: "unknown", title: "Rejected" }],
  }).events.length,
  0,
);

// Loaded active combos do not repay every earlier GP checkpoint on the next hit.
const combo = new ComboSystem();
combo.fromJSON({ comboCount: 50, currentMultiplier: 1.1, lastComboTime: 1000 });
const restoredMilestones = [];
combo.setMilestoneReachedCallback(milestone => restoredMilestones.push(milestone));
combo.incrementCombo(1001);
assert.deepEqual(restoredMilestones, []);
combo.resetCombo();
combo.addCombo(50, 1002);
assert.deepEqual(restoredMilestones, [10, 25, 50]);

// Campfire is inside town but retains a six-tile buffer after the final merchant.
const finalMerchantX = Math.max(
  ...Object.values(TOWN_SQUARE_CONFIG.merchantSlots).map(slot => slot.tileX),
);
assert.equal(finalMerchantX, 17);
assert.equal(CAMPFIRE_CONFIG.surfaceTileX - finalMerchantX, 6);

// Additive save fields round-trip through manual import/export normalization.
const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};
globalThis.window = { localStorage };
globalThis.localStorage = localStorage;

const store = new DugTilesSaveStore({ slotId: 8 });
const world = {
  seed: 280726,
  width: 320,
  depth: 2400,
  topAirRows: 65,
};
const createSave = (dugTiles, campfireData, journeyData) => store.createPayload(
  world,
  dugTiles,
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
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  campfireData,
  journeyData,
);
const currentSave = createSave(["1,1"], { level: 2 }, null);
const importedSave = createSave(
  ["9,9"],
  { level: 4 },
  journey.getSaveData(),
);
assert.equal(store.saveToLocalStorage(currentSave), true);
const failedImport = await store.importSave({
  text: async () => JSON.stringify({ nope: true }),
});
assert.equal(failedImport.success, false);
assert.deepEqual(store.loadForDisplay().dugTiles, ["1,1"]);

const importResult = await store.importSave({
  text: async () => JSON.stringify({
    version: importedSave.version,
    exportedAt: "2026-07-28T12:00:00.000Z",
    slotId: 2,
    saveData: importedSave,
  }),
});
assert.equal(importResult.success, true);
assert.deepEqual(importResult.saveData.campfireData, { level: 4 });
assert.equal(importResult.saveData.journeyData.events.length, 1);
assert.deepEqual(store.loadForDisplay().dugTiles, ["9,9"]);
assert.deepEqual(store.getBackups()[0].data.dugTiles, ["1,1"]);

const legacyPayload = { ...importedSave };
delete legacyPayload.campfireData;
delete legacyPayload.journeyData;
const normalizedLegacy = store.normalizePayload(legacyPayload);
assert.equal(normalizedLegacy.campfireData, null);
assert.equal(normalizedLegacy.journeyData, null);

// Rejected player-facing copy stays absent from the active integration.
const [
  playerSource,
  shopSource,
  hudSource,
  setupSource,
  updateSource,
  pauseSource,
  saveRuntimeSource,
] = await Promise.all([
  readFile(new URL("../player/PlayerController.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/ShopOverlay.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/HUDSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSaveRuntime.js", import.meta.url), "utf8"),
]);
assert.match(playerSource, /createResolvedMovementSnapshot/);
assert.match(playerSource, /getResolvedStatsSnapshot/);
assert.match(playerSource, /_getWalkSpeed\(\)\s*\/\s*baseSpeed/);
assert.doesNotMatch(shopSource, /_buildMiningPreview|\bHITS\b|hits\s*(?:→|->)/);
assert.doesNotMatch(hudSource, /getNextComboGpCheckpoint|GP\s*@/);
assert.doesNotMatch(setupSource, /\+\$\{restored\}\s*GP|GP\s*@/);
assert.doesNotMatch(updateSource, /Total:\s*\+\$\{bonuses\.gpMaxBonus\}\s*GP/);
assert.match(pauseSource, /key:\s*"journey",\s*label:\s*JOURNEY_CONFIG\.copy\.tabLabel/);
assert.match(saveRuntimeSource, /scene\.journeySystem\?\.getSaveData/);

console.log("Journey integration contract OK", {
  movementSpeed: movementSnapshot.movementSpeedPxPerSec,
  blockedGoal: blockedGoals[0].id,
  historyEvents: journey.getSaveData().events.length,
  campfireTileX: CAMPFIRE_CONFIG.surfaceTileX,
  importedJourneyEvents: importResult.saveData.journeyData.events.length,
});
