import assert from 'node:assert/strict';
import {
  HEAVENBLOCKS_PROGRESSION_CONFIG,
  HEAVENBLOCK_OMEGA_VAULT_IDS,
  HEAVENBLOCK_PART_IDS,
  HEAVENBLOCK_REGION_IDS,
  sanitizeHeavenblocksProgressionData,
} from '../values/heavenblocksProgressionConfig.js';
import {
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
} from '../values/gameplayCapabilities.js';
import HeavenblocksProgressionSystem from
  '../systems/progression/HeavenblocksProgressionSystem.js';

const config = HEAVENBLOCKS_PROGRESSION_CONFIG;
const lowerSky = HEAVENBLOCK_REGION_IDS.LOWER_SKY;
const angel = HEAVENBLOCK_REGION_IDS.ANGEL;
const devil = HEAVENBLOCK_REGION_IDS.DEVIL;
const allParts = Object.values(HEAVENBLOCK_PART_IDS);
const allVaults = Object.values(HEAVENBLOCK_OMEGA_VAULT_IDS);

assert.equal(config.version, 1);
assert.equal(config.relicMilestones[0].requiredRelics, 3);
assert.equal('resources' in config, false);
assert.equal('skyMaterials' in config, false);

const gameplayCapabilities = createGameplayCapabilities(
  GAMEPLAY_PROFILE_IDS.FULL_REVIEW,
);
const progression = new HeavenblocksProgressionSystem({ gameplayCapabilities });
assert.deepEqual(progression.getSaveData(), {
  version: 1,
  metRelicMilestoneIds: [],
  skyGateActivated: false,
  unlockedRegionIds: [],
  visitedRegionIds: [],
  completedRegionIds: [],
  discoveredPartIds: [],
  installedPartIds: [],
  openedOmegaVaultIds: [],
  zenithKeystone: false,
});

assert.equal(progression.activateSkyGate(2).success, false);
assert.equal(progression.syncRelicEligibility(3).changed, true);
assert.equal(progression.isSkyGateEligible(), true);
assert.equal(progression.syncRelicEligibility(0).changed, false);
assert.equal(progression.isSkyGateEligible(), true);

assert.equal(progression.activateSkyGate().changed, true);
assert.equal(progression.isRegionUnlocked(lowerSky), true);
assert.equal(progression.activateSkyGate().changed, false);
assert.equal(progression.visitRegion(angel).reason, 'region-locked');
assert.equal(progression.visitRegion(lowerSky).changed, true);

const lowerCompletion = progression.completeRegion(lowerSky);
assert.equal(lowerCompletion.changed, true);
assert.deepEqual(lowerCompletion.newlyUnlockedRegionIds, [angel, devil]);
assert.equal(progression.isRegionVisited(lowerSky), true);
assert.equal(progression.completeRegion(lowerSky).changed, false);

assert.equal(progression.installPart(allParts[0]).reason, 'part-undiscovered');
assert.equal(progression.discoverPart(allParts[0]).changed, true);
assert.equal(progression.discoverPart(allParts[0]).changed, false);
assert.equal(progression.installPart(allParts[0]).changed, true);
assert.equal(progression.installPart(allParts[0]).changed, false);

assert.equal(progression.completeRegion(angel).changed, true);
assert.equal(progression.completeRegion(devil).changed, true);
allParts.slice(1).forEach((partId) => progression.discoverPart(partId));
assert.equal(progression.isArcCoreBlueprintEligible(), true);

allVaults.slice(0, -1).forEach((vaultId) => {
  assert.equal(progression.openOmegaVault(vaultId).changed, true);
});
assert.equal(progression.hasZenithKeystone(), false);
const finalVault = progression.openOmegaVault(allVaults.at(-1));
assert.equal(finalVault.zenithKeystoneGranted, true);
assert.equal(progression.hasZenithKeystone(), true);
assert.equal(progression.openOmegaVault(allVaults.at(-1)).changed, false);

const saved = progression.getSaveData();
assert.equal('resources' in saved, false);
assert.equal('resourceTotals' in saved, false);
const restored = new HeavenblocksProgressionSystem({
  initialData: saved,
  gameplayCapabilities,
});
assert.deepEqual(restored.getSaveData(), saved);

const sanitized = sanitizeHeavenblocksProgressionData({
  version: -10,
  metRelicMilestoneIds: ['unknown'],
  skyGateActivated: true,
  unlockedRegionIds: ['unknown'],
  visitedRegionIds: [angel, angel],
  completedRegionIds: [lowerSky, 'unknown'],
  discoveredPartIds: ['unknown'],
  installedPartIds: [allParts[1], allParts[1]],
  openedOmegaVaultIds: [...allVaults, allVaults[0], 'unknown'],
  resources: { gold: 999 },
});
assert.equal(sanitized.version, 1);
assert.deepEqual(sanitized.metRelicMilestoneIds, ['sky-gate']);
assert.deepEqual(sanitized.unlockedRegionIds, [lowerSky, angel, devil]);
assert.deepEqual(sanitized.visitedRegionIds, [lowerSky, angel]);
assert.deepEqual(sanitized.completedRegionIds, [lowerSky]);
assert.deepEqual(sanitized.discoveredPartIds, [allParts[1]]);
assert.deepEqual(sanitized.installedPartIds, [allParts[1]]);
assert.deepEqual(sanitized.openedOmegaVaultIds, allVaults);
assert.equal(sanitized.zenithKeystone, true);
assert.equal('resources' in sanitized, false);

const legacyEligible = new HeavenblocksProgressionSystem();
legacyEligible.loadSaveData(null, { relicCount: 3 });
assert.equal(legacyEligible.isSkyGateEligible(), true);
assert.equal(legacyEligible.isSkyGateActivated(), false);

let existingRelicCount = 3;
const providerBacked = new HeavenblocksProgressionSystem({
  relicCountProvider: () => existingRelicCount,
});
assert.equal(providerBacked.isSkyGateEligible(), true);
existingRelicCount = 0;
providerBacked.loadSaveData(providerBacked.getSaveData());
assert.equal(providerBacked.isSkyGateEligible(), true);

console.log('Heavenblocks progression core contract passed.');
