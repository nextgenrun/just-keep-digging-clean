import { CRAFTING_RECIPE_IDS } from "../../values/craftingRecipes.js";
import { UPGRADES } from "../../values/upgradeDefinitions.js";
import { JourneySystem } from "../../systems/progression/JourneySystem.js";

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function summarizeForgeStatus(status) {
  const checks = Array.isArray(status?.checks) ? status.checks : [];
  return {
    ready: status?.canCraft === true,
    met: checks.filter(check => check?.met === true).length,
    total: Math.max(1, checks.length),
    nextRequirement: checks.find(check => check?.met !== true)?.label || null,
  };
}

function summarizeWorldTwoRequirements(scene, acceptedDepthGates, resources) {
  const definition = UPGRADES.worldTwoTunnelAccess;
  const checks = [
    {
      label: `${definition.requiresDepthGateAccepted}m depth gate`,
      met: acceptedDepthGates.includes(definition.requiresDepthGateAccepted),
    },
    {
      label: `${number(definition.goldCost).toLocaleString()} M`,
      met: number(scene.upgradeSystem?.getMoney?.()) >= number(definition.goldCost),
    },
    ...Object.entries(definition.resources || {}).map(([resource, required]) => ({
      label: `${required} ${resource}`,
      met: number(resources?.[resource]) >= required,
    })),
  ];
  return {
    count: checks.length,
    met: checks.filter(check => check.met).length,
    next: checks.find(check => !check.met)?.label || null,
  };
}

export function createJourneySnapshot(scene) {
  const upgradeEffects = scene.upgradeSystem?.getUpgradeEffects?.() || {};
  const levelBonuses = scene.playerLevelSystem?.getBonusesSummary?.() || {};
  const movement = scene.playerController?.getResolvedStatsSnapshot?.({
    includeTemporary: false,
  }) || {};
  const retention = scene.retentionProgressSystem?.getJournalSnapshot?.() || {};
  const retentionStats = retention.stats || {};
  const discoveries = retention.discoveries || {};
  const upgradeLevels = scene.upgradeSystem?.getUpgradeLevels?.() || {};
  const resources = scene.digSystem?.getResourceTotals?.() || {};
  const portals = scene.specialTileSystem?.getActivatedPortals?.() || [];
  const acceptedDepthGates = scene.depthGateSystem?.getSaveData?.().acceptedThresholds || [];
  const heavenblocks = scene.heavenblocksProgressionSystem?.getSaveData?.() || {};
  const arcStatus = scene.craftingSystem?.getRecipeStatus?.(
    CRAFTING_RECIPE_IDS.ARC_CORE,
  );
  const omegaStatus = scene.craftingSystem?.getRecipeStatus?.(
    CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE,
  );
  const worldTwo = summarizeWorldTwoRequirements(scene, acceptedDepthGates, resources);
  const activeTitanId = scene.titanClueSystem?.getActiveClueId?.() || null;
  const activeTitanState = activeTitanId
    ? scene.titanClueSystem?.getClueState?.(activeTitanId)
    : null;
  const ownedPickaxe = scene.upgradeSystem?.ownedPickaxe || null;
  const mineCooldownMs = scene.upgradeSystem?.getEffectiveMineCooldown?.(
    scene.config.mineCooldownMs,
  ) ?? scene.config.mineCooldownMs;
  const flightSpeed = scene.upgradeSystem?.getEffectiveLevitationSpeed?.(
    scene.config.climbSpeedPxPerSec,
  ) ?? scene.config.climbSpeedPxPerSec;

  return {
    stats: {
      ...movement,
      mineCooldownMs,
      miningRatePerSecond: mineCooldownMs > 0 ? 1000 / mineCooldownMs : 0,
      pickaxePower: number(upgradeEffects.pickaxeDamage),
      gemPowerMax: number(scene.playerController?.getGemPowerMax?.()),
      flightSpeedPxPerSec: flightSpeed,
      criticalChancePercent: number(
        scene.playerLevelSystem?.getCriticalHitChance?.(),
      ) * 100,
      resourceLuckPercent: number(levelBonuses.resourceLuck) * 100,
    },
    upgradeEffects: { ...upgradeEffects },
    progress: {
      bestDepth: number(retentionStats.bestDepth),
      currentDepth: number(retentionStats.currentDepth),
      playerLevel: number(levelBonuses.level, 1),
      money: number(scene.upgradeSystem?.getMoney?.()),
      upgradeLevels: { ...upgradeLevels },
      ownedUpgradeCount: Object.values(upgradeLevels)
        .filter(level => number(level) > 0).length,
      currentPickaxeName: UPGRADES[ownedPickaxe]?.name || null,
      flightUnlocked: scene.upgradeSystem?.isGemPowerUnlocked?.() === true,
      acceptedDepthGates: [...acceptedDepthGates],
      portalLabels: portals.map(portal => portal.label),
      campfireLevel: number(scene.campfireSystem?.getCampfireLevel?.(), 1),
      ancientRelics: number(scene.ancientRelicSystem?.getCount?.()),
      starsCollected: number(retentionStats.starsCollected),
      constellationCount: number(
        scene.floatingTextSystem?.getUnlockedConstellations?.().length,
      ),
      discoveredHeavenblockParts: Array.isArray(heavenblocks.discoveredPartIds)
        ? heavenblocks.discoveredPartIds.length
        : 0,
      installedHeavenblockParts: Array.isArray(heavenblocks.installedPartIds)
        ? heavenblocks.installedPartIds.length
        : 0,
      installedHeavenblockPartIds: [...(heavenblocks.installedPartIds || [])],
      openedArcVaults: Array.isArray(heavenblocks.openedOmegaVaultIds)
        ? heavenblocks.openedOmegaVaultIds.length
        : 0,
      openedArcVaultIds: [...(heavenblocks.openedOmegaVaultIds || [])],
      discoveredTitanIds: [...(discoveries.titans || [])],
      activeTitanName: activeTitanState?.definition?.name || activeTitanId,
      activeTitanDiscovered: activeTitanState?.discovered === true,
      worldTwoRequirementCount: worldTwo.count,
      worldTwoRequirementsMet: worldTwo.met,
      worldTwoNextRequirement: worldTwo.next,
      arcCoreForge: summarizeForgeStatus(arcStatus),
      omegaArcCoreForge: summarizeForgeStatus(omegaStatus),
    },
  };
}

export function createJourneyRuntime(scene) {
  return new JourneySystem({
    snapshotProvider: () => createJourneySnapshot(scene),
    onChanged: () => scene.queueDugTilesSave?.(),
  });
}
