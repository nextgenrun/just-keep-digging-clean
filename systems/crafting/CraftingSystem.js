import { UPGRADES } from "../../values/upgradeDefinitions.js";
import { getCraftingRecipe } from "../../values/craftingRecipes.js";

export class CraftingSystem {
  constructor({
    digSystem = null,
    upgradeSystem = null,
    ancientRelicSystem = null,
    progressionStateProvider = null,
  } = {}) {
    this.digSystem = digSystem;
    this.upgradeSystem = upgradeSystem;
    this.ancientRelicSystem = ancientRelicSystem;
    this.progressionStateProvider = typeof progressionStateProvider === "function"
      ? progressionStateProvider
      : null;
    this._craftInProgress = false;
  }

  setProgressionStateProvider(provider) {
    this.progressionStateProvider = typeof provider === "function" ? provider : null;
  }

  getRecipeStatus(recipeId) {
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) {
      return { canCraft: false, reason: "invalid_recipe", recipeId };
    }
    if (!this.digSystem?.getResourceTotals || !this.digSystem?.trySpendResources) {
      return { canCraft: false, reason: "resource_system_unavailable", recipeId };
    }
    if (
      !this.upgradeSystem?.getUpgradeLevel
      || !this.upgradeSystem?.grantUpgrade
      || !this.upgradeSystem?.getUpgradeLevels
      || !this.upgradeSystem?.setUpgradeLevels
    ) {
      return { canCraft: false, reason: "upgrade_system_unavailable", recipeId };
    }

    const output = recipe.output;
    const outputUpgrade = output?.type === "upgrade" ? UPGRADES[output.upgradeId] : null;
    if (!outputUpgrade) {
      return { canCraft: false, reason: "invalid_output", recipeId };
    }

    const outputLevel = this.upgradeSystem.getUpgradeLevel(output.upgradeId);
    if (outputUpgrade.oneTimePurchase && outputLevel > 0) {
      return {
        canCraft: false,
        reason: "already_owned",
        recipeId,
        outputUpgradeId: output.upgradeId,
      };
    }

    if (outputUpgrade.requires) {
      const requiredLevel = this.upgradeSystem.getUpgradeLevel(outputUpgrade.requires);
      if (requiredLevel <= 0) {
        return {
          canCraft: false,
          reason: "requires_upgrade",
          recipeId,
          requiredUpgradeId: outputUpgrade.requires,
        };
      }
    }

    const minimumRelics = recipe.requirements?.minimumAncientRelics || 0;
    const relicCount = this._getAncientRelicCount();
    if (relicCount < minimumRelics) {
      return {
        canCraft: false,
        reason: "not_enough_relics",
        recipeId,
        requiredRelics: minimumRelics,
        currentRelics: relicCount,
      };
    }

    const missingProgressFlags = (recipe.requirements?.progressFlags || [])
      .filter(flag => !this._hasProgressFlag(flag));
    if (missingProgressFlags.length > 0) {
      return {
        canCraft: false,
        reason: "requires_progress",
        recipeId,
        missingProgressFlags,
      };
    }

    const resources = this.digSystem.getResourceTotals();
    const missingResources = Object.entries(recipe.ingredients || {})
      .filter(([resourceType, amount]) => (resources[resourceType] || 0) < amount)
      .map(([resourceType, amount]) => ({
        resourceType,
        required: amount,
        have: resources[resourceType] || 0,
        needed: Math.max(0, amount - (resources[resourceType] || 0)),
      }));
    if (missingResources.length > 0) {
      return {
        canCraft: false,
        reason: "not_enough_resources",
        recipeId,
        missingResources,
      };
    }

    return {
      canCraft: true,
      reason: null,
      recipeId,
      recipe,
      outputUpgradeId: output.upgradeId,
      relicCount,
    };
  }

  craft(recipeId) {
    if (this._craftInProgress) {
      return { success: false, reason: "craft_in_progress", recipeId };
    }

    const status = this.getRecipeStatus(recipeId);
    if (!status.canCraft) {
      return { success: false, ...status };
    }

    const { recipe } = status;
    const resourceSnapshot = this.digSystem.getResourceTotals();
    const upgradeSnapshot = this.upgradeSystem.getUpgradeLevels();
    this._craftInProgress = true;

    try {
      const spendResult = this.digSystem.trySpendResources(recipe.ingredients);
      if (!spendResult.success) {
        return {
          success: false,
          reason: spendResult.reason || "resource_transaction_failed",
          recipeId,
          ...spendResult,
        };
      }

      const grantResult = this.upgradeSystem.grantUpgrade(
        recipe.output.upgradeId,
        recipe.output.level
      );
      const grantedLevel = this.upgradeSystem.getUpgradeLevel(recipe.output.upgradeId);
      if (!grantResult?.success || grantedLevel < recipe.output.level) {
        this._restoreSnapshots(resourceSnapshot, upgradeSnapshot);
        return {
          success: false,
          reason: grantResult?.reason || "upgrade_grant_failed",
          recipeId,
        };
      }

      return {
        success: true,
        recipeId,
        outputUpgradeId: recipe.output.upgradeId,
        level: grantedLevel,
        spent: spendResult.spent,
        relicsConsumed: 0,
      };
    } catch (error) {
      this._restoreSnapshots(resourceSnapshot, upgradeSnapshot);
      return {
        success: false,
        reason: "craft_transaction_failed",
        recipeId,
        error: error?.message || String(error),
      };
    } finally {
      this._craftInProgress = false;
    }
  }

  _getAncientRelicCount() {
    const count = this.ancientRelicSystem?.getCount?.();
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  _hasProgressFlag(flag) {
    const state = this.progressionStateProvider?.();
    if (!state) return false;
    if (typeof state.hasProgressFlag === "function") {
      return state.hasProgressFlag(flag) === true;
    }
    const flags = state.progressFlags ?? state.flags;
    if (flags instanceof Set) return flags.has(flag);
    if (Array.isArray(flags)) return flags.includes(flag);
    return state[flag] === true;
  }

  _restoreSnapshots(resources, upgradeLevels) {
    this.digSystem.setResourceTotals(resources);
    this.upgradeSystem.setUpgradeLevels(upgradeLevels);
  }
}
