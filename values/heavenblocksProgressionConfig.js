const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};

export const HEAVENBLOCK_REGION_IDS = Object.freeze({
  LOWER_SKY: 'lower-sky-cloud-reef',
  ANGEL: 'angel-heavenblock',
  DEVIL: 'devil-eclipse-scar',
});

export const HEAVENBLOCK_PART_IDS = Object.freeze({
  CLOUDHEART_DYNAMO: 'cloudheart-dynamo',
  HALO_LENS: 'halo-lens',
  ECLIPSE_CRUCIBLE: 'eclipse-crucible',
});

export const HEAVENBLOCK_OMEGA_VAULT_IDS = Object.freeze({
  LOWER_SKY: 'cloud-reef-omega-vault',
  ANGEL: 'angelic-omega-vault',
  DEVIL: 'eclipse-omega-vault',
});

export const HEAVENBLOCKS_PROGRESSION_CONFIG = deepFreeze({
  version: 1,
  relicMilestones: [
    {
      id: 'sky-gate',
      requiredRelics: 3,
    },
  ],
  skyGate: {
    milestoneId: 'sky-gate',
    initialRegionId: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
  },
  regions: [
    {
      id: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      uniquePartId: HEAVENBLOCK_PART_IDS.CLOUDHEART_DYNAMO,
      completionUnlocksRegionIds: [
        HEAVENBLOCK_REGION_IDS.ANGEL,
        HEAVENBLOCK_REGION_IDS.DEVIL,
      ],
    },
    {
      id: HEAVENBLOCK_REGION_IDS.ANGEL,
      uniquePartId: HEAVENBLOCK_PART_IDS.HALO_LENS,
      completionUnlocksRegionIds: [],
    },
    {
      id: HEAVENBLOCK_REGION_IDS.DEVIL,
      uniquePartId: HEAVENBLOCK_PART_IDS.ECLIPSE_CRUCIBLE,
      completionUnlocksRegionIds: [],
    },
  ],
  arcCoreBlueprint: {
    requiredRegionIds: [
      HEAVENBLOCK_REGION_IDS.LOWER_SKY,
      HEAVENBLOCK_REGION_IDS.ANGEL,
      HEAVENBLOCK_REGION_IDS.DEVIL,
    ],
    requiredPartIds: [
      HEAVENBLOCK_PART_IDS.CLOUDHEART_DYNAMO,
      HEAVENBLOCK_PART_IDS.HALO_LENS,
      HEAVENBLOCK_PART_IDS.ECLIPSE_CRUCIBLE,
    ],
  },
  omegaVaults: [
    {
      id: HEAVENBLOCK_OMEGA_VAULT_IDS.LOWER_SKY,
      regionId: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
    },
    {
      id: HEAVENBLOCK_OMEGA_VAULT_IDS.ANGEL,
      regionId: HEAVENBLOCK_REGION_IDS.ANGEL,
    },
    {
      id: HEAVENBLOCK_OMEGA_VAULT_IDS.DEVIL,
      regionId: HEAVENBLOCK_REGION_IDS.DEVIL,
    },
  ],
  zenithKeystone: {
    requiredOmegaVaultIds: [
      HEAVENBLOCK_OMEGA_VAULT_IDS.LOWER_SKY,
      HEAVENBLOCK_OMEGA_VAULT_IDS.ANGEL,
      HEAVENBLOCK_OMEGA_VAULT_IDS.DEVIL,
    ],
  },
});

const orderedKnownIds = (candidate, orderedIds) => {
  const supplied = new Set(Array.isArray(candidate) ? candidate : []);
  return orderedIds.filter((id) => supplied.has(id));
};

export const createDefaultHeavenblocksProgressionData = () => ({
  version: HEAVENBLOCKS_PROGRESSION_CONFIG.version,
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

export const sanitizeHeavenblocksProgressionData = (candidate) => {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  const config = HEAVENBLOCKS_PROGRESSION_CONFIG;
  const milestoneIds = config.relicMilestones.map(({ id }) => id);
  const regionIds = config.regions.map(({ id }) => id);
  const partIds = config.regions.map(({ uniquePartId }) => uniquePartId);
  const vaultIds = config.omegaVaults.map(({ id }) => id);

  const metMilestones = new Set(
    orderedKnownIds(source.metRelicMilestoneIds, milestoneIds),
  );
  const unlockedRegions = new Set(
    orderedKnownIds(source.unlockedRegionIds, regionIds),
  );
  const visitedRegions = new Set(
    orderedKnownIds(source.visitedRegionIds, regionIds),
  );
  const completedRegions = new Set(
    orderedKnownIds(source.completedRegionIds, regionIds),
  );
  const discoveredParts = new Set(
    orderedKnownIds(source.discoveredPartIds, partIds),
  );
  const installedParts = new Set(
    orderedKnownIds(source.installedPartIds, partIds),
  );
  const openedVaults = new Set(
    orderedKnownIds(source.openedOmegaVaultIds, vaultIds),
  );
  const skyGateActivated = source.skyGateActivated === true;

  if (skyGateActivated) {
    metMilestones.add(config.skyGate.milestoneId);
    unlockedRegions.add(config.skyGate.initialRegionId);
  }

  visitedRegions.forEach((id) => unlockedRegions.add(id));
  completedRegions.forEach((id) => {
    visitedRegions.add(id);
    unlockedRegions.add(id);
  });
  installedParts.forEach((id) => discoveredParts.add(id));

  config.regions.forEach((region) => {
    if (completedRegions.has(region.id)) {
      region.completionUnlocksRegionIds.forEach((id) => unlockedRegions.add(id));
    }
  });

  const allVaultsOpened = config.zenithKeystone.requiredOmegaVaultIds
    .every((id) => openedVaults.has(id));

  return {
    version: config.version,
    metRelicMilestoneIds: milestoneIds.filter((id) => metMilestones.has(id)),
    skyGateActivated,
    unlockedRegionIds: regionIds.filter((id) => unlockedRegions.has(id)),
    visitedRegionIds: regionIds.filter((id) => visitedRegions.has(id)),
    completedRegionIds: regionIds.filter((id) => completedRegions.has(id)),
    discoveredPartIds: partIds.filter((id) => discoveredParts.has(id)),
    installedPartIds: partIds.filter((id) => installedParts.has(id)),
    openedOmegaVaultIds: vaultIds.filter((id) => openedVaults.has(id)),
    zenithKeystone: source.zenithKeystone === true || allVaultsOpened,
  };
};
