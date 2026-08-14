import {
  HEAVENBLOCKS_PROGRESSION_CONFIG,
  sanitizeHeavenblocksProgressionData,
} from '../../values/heavenblocksProgressionConfig.js';
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from '../../values/gameplayDevFlags.js';
import { DEFAULT_GAMEPLAY_CAPABILITIES } from '../../values/gameplayCapabilities.js';

const success = (changed, details = {}) => ({
  success: true,
  changed,
  ...details,
});

const failure = (reason, details = {}) => ({
  success: false,
  changed: false,
  reason,
  ...details,
});

const normalizeRelicCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : null;
};

export class HeavenblocksProgressionSystem {
  constructor({
    relicCountProvider = null,
    initialData = null,
    relicCount,
    gameplayCapabilities = DEFAULT_GAMEPLAY_CAPABILITIES,
  } = {}) {
    this.config = HEAVENBLOCKS_PROGRESSION_CONFIG;
    this.gameplayCapabilities = gameplayCapabilities;
    this.relicCountProvider = typeof relicCountProvider === 'function'
      ? relicCountProvider
      : null;
    this.state = sanitizeHeavenblocksProgressionData(initialData);

    if (relicCount !== undefined || this.relicCountProvider) {
      this.syncRelicEligibility(relicCount);
    }
  }

  setRelicCountProvider(provider) {
    this.relicCountProvider = typeof provider === 'function' ? provider : null;
  }

  syncRelicEligibility(relicCount) {
    const suppliedCount = relicCount === undefined && this.relicCountProvider
      ? this.relicCountProvider()
      : relicCount;
    const currentRelicCount = normalizeRelicCount(suppliedCount);

    if (currentRelicCount === null) {
      return success(false, {
        currentRelicCount: null,
        newlyMetMilestoneIds: [],
      });
    }

    const metMilestones = new Set(this.state.metRelicMilestoneIds);
    const newlyMetMilestoneIds = [];
    this.config.relicMilestones.forEach((milestone) => {
      if (
        currentRelicCount >= milestone.requiredRelics
        && !metMilestones.has(milestone.id)
      ) {
        metMilestones.add(milestone.id);
        newlyMetMilestoneIds.push(milestone.id);
      }
    });

    if (newlyMetMilestoneIds.length > 0) {
      this.state = sanitizeHeavenblocksProgressionData({
        ...this.state,
        metRelicMilestoneIds: [...metMilestones],
      });
    }

    return success(newlyMetMilestoneIds.length > 0, {
      currentRelicCount,
      newlyMetMilestoneIds,
    });
  }

  activateSkyGate(relicCount) {
    this.syncRelicEligibility(relicCount);
    if (!this.isSkyGateEligible()) {
      return failure('relic-milestone-not-met');
    }
    if (this.state.skyGateActivated) {
      return success(false, {
        unlockedRegionIds: [...this.state.unlockedRegionIds],
      });
    }

    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      skyGateActivated: true,
    });
    return success(true, {
      unlockedRegionIds: [...this.state.unlockedRegionIds],
    });
  }

  unlockRegion(regionId) {
    if (!this.#isKnownRegion(regionId)) {
      return failure('unknown-region');
    }
    if (this.isRegionUnlocked(regionId)) {
      return success(false, { regionId });
    }

    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      unlockedRegionIds: [...this.state.unlockedRegionIds, regionId],
    });
    return success(true, { regionId });
  }

  visitRegion(regionId) {
    if (!this.#isKnownRegion(regionId)) {
      return failure('unknown-region');
    }
    if (!this.isRegionUnlocked(regionId)) {
      return failure('region-locked', { regionId });
    }
    if (this.isRegionVisited(regionId)) {
      return success(false, { regionId });
    }

    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      visitedRegionIds: [...this.state.visitedRegionIds, regionId],
    });
    return success(true, { regionId });
  }

  completeRegion(regionId) {
    if (!this.#isKnownRegion(regionId)) {
      return failure('unknown-region');
    }
    if (!this.isRegionUnlocked(regionId)) {
      return failure('region-locked', { regionId });
    }
    if (this.isRegionCompleted(regionId)) {
      return success(false, { regionId, newlyUnlockedRegionIds: [] });
    }

    const previouslyUnlocked = new Set(this.state.unlockedRegionIds);
    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      completedRegionIds: [...this.state.completedRegionIds, regionId],
    });
    const newlyUnlockedRegionIds = this.state.unlockedRegionIds
      .filter((id) => !previouslyUnlocked.has(id));
    return success(true, { regionId, newlyUnlockedRegionIds });
  }

  discoverPart(partId) {
    if (!this.#isKnownPart(partId)) {
      return failure('unknown-part');
    }
    if (this.isPartDiscovered(partId)) {
      return success(false, { partId });
    }

    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      discoveredPartIds: [...this.state.discoveredPartIds, partId],
    });
    return success(true, { partId });
  }

  installPart(partId) {
    if (!this.#isKnownPart(partId)) {
      return failure('unknown-part');
    }
    if (!this.isPartDiscovered(partId)) {
      return failure('part-undiscovered', { partId });
    }
    if (this.isPartInstalled(partId)) {
      return success(false, { partId });
    }

    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      installedPartIds: [...this.state.installedPartIds, partId],
    });
    return success(true, { partId });
  }

  openOmegaVault(vaultId) {
    if (!this.#isKnownVault(vaultId)) {
      return failure('unknown-omega-vault');
    }
    if (this.isOmegaVaultOpened(vaultId)) {
      return success(false, {
        vaultId,
        zenithKeystone: this.hasZenithKeystone(),
      });
    }

    const hadKeystone = this.hasZenithKeystone();
    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      openedOmegaVaultIds: [...this.state.openedOmegaVaultIds, vaultId],
    });
    return success(true, {
      vaultId,
      zenithKeystone: this.hasZenithKeystone(),
      zenithKeystoneGranted: !hadKeystone && this.hasZenithKeystone(),
    });
  }

  grantZenithKeystone() {
    if (this.hasZenithKeystone()) {
      return success(false, { zenithKeystone: true });
    }
    this.state = sanitizeHeavenblocksProgressionData({
      ...this.state,
      zenithKeystone: true,
    });
    return success(true, { zenithKeystone: true });
  }

  isRelicMilestoneMet(milestoneId) {
    return this.state.metRelicMilestoneIds.includes(milestoneId);
  }

  isSkyGateEligible() {
    return this.isRelicMilestoneMet(this.config.skyGate.milestoneId);
  }

  isSkyGateActivated() {
    return this.state.skyGateActivated;
  }

  isRegionUnlocked(regionId) {
    return this.state.unlockedRegionIds.includes(regionId);
  }

  isRegionVisited(regionId) {
    return this.state.visitedRegionIds.includes(regionId);
  }

  isRegionCompleted(regionId) {
    return this.state.completedRegionIds.includes(regionId);
  }

  isPartDiscovered(partId) {
    return this.state.discoveredPartIds.includes(partId);
  }

  isPartInstalled(partId) {
    return this.state.installedPartIds.includes(partId);
  }

  isOmegaVaultOpened(vaultId) {
    return this.state.openedOmegaVaultIds.includes(vaultId);
  }

  hasZenithKeystone() {
    return this.state.zenithKeystone;
  }

  isArcCoreBlueprintEligible() {
    if (!isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.ARC_CORES,
      this.gameplayCapabilities,
    )) return false;
    const blueprint = this.config.arcCoreBlueprint;
    return blueprint.requiredRegionIds.every((id) => this.isRegionCompleted(id))
      && blueprint.requiredPartIds.every((id) => this.isPartDiscovered(id));
  }

  getSaveData() {
    return sanitizeHeavenblocksProgressionData(this.state);
  }

  loadSaveData(data, options = {}) {
    this.state = sanitizeHeavenblocksProgressionData(data);
    const explicitRelicCount = typeof options === 'number'
      ? options
      : options?.relicCount;
    if (explicitRelicCount !== undefined || this.relicCountProvider) {
      this.syncRelicEligibility(explicitRelicCount);
    }
    return this.getSaveData();
  }

  #isKnownRegion(regionId) {
    return this.config.regions.some(({ id }) => id === regionId);
  }

  #isKnownPart(partId) {
    return this.config.regions.some(({ uniquePartId }) => uniquePartId === partId);
  }

  #isKnownVault(vaultId) {
    return this.config.omegaVaults.some(({ id }) => id === vaultId);
  }
}

export default HeavenblocksProgressionSystem;
