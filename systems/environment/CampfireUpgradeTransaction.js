import { CAMPFIRE_CONFIG, CAMPFIRE_TIERS } from "../../values/campfireConfig.js";
import { getCampfireFeatureAssetGroupId } from "../../values/runtimeAssetLoading.js";

function failure(message, reason) {
  return Object.freeze({ success: false, message, reason });
}

export async function executeCampfireUpgrade(system) {
  const expectedLevel = system._campfireLevel;
  const nextTier = CAMPFIRE_TIERS[expectedLevel];
  if (!nextTier) return failure("Already max level!", "max-level");
  const wallet = system.scene.upgradeSystem;
  if ((wallet?.getMoney?.() || 0) < nextTier.cost) {
    return failure(`Need ${nextTier.cost} gold!`, "insufficient-funds");
  }

  const manager = system.scene.runtimeFeatureAssetManager;
  const groupId = getCampfireFeatureAssetGroupId(nextTier.level);
  const pendingConsumer = `${CAMPFIRE_CONFIG.runtimeResidency.consumerId}:purchase`;
  if (manager?.enabled) {
    const loaded = await manager.ensureGroup(groupId, { consumer: pendingConsumer });
    if (!loaded.ready) {
      manager.releaseGroup(groupId, pendingConsumer);
      return failure("Campfire art is still loading. No gold was spent.", "asset-unavailable");
    }
  }

  try {
    if (system._destroyed || system._campfireLevel !== expectedLevel) {
      return failure("Campfire changed before the upgrade completed.", "stale-upgrade");
    }
    if ((wallet?.getMoney?.() || 0) < nextTier.cost) {
      return failure(`Need ${nextTier.cost} gold!`, "insufficient-funds");
    }
    if (!wallet?.spendMoney?.(nextTier.cost)) {
      return failure("Campfire payment was rejected.", "payment-rejected");
    }
    system._campfireLevel = nextTier.level;
    await system._ensureCampfireTierTexture(nextTier.level);
    system._syncMoneyUi();
    system.scene.queueDugTilesSave?.("campfire-upgrade");
    return Object.freeze({
      success: true,
      message: `Campfire upgraded to ${nextTier.label}.`,
      tier: nextTier,
    });
  } finally {
    manager?.releaseGroup?.(groupId, pendingConsumer);
  }
}
