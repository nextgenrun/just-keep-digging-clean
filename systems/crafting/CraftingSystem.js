import { UPGRADES } from "../../values/upgradeDefinitions.js";
import {
  CRAFTING_RECIPES,
  getCraftingRecipe,
} from "../../values/craftingRecipes.js";
import { getResourceDisplayName } from "../../values/resourceTypes.js";
import { isGameplayUpgradeEnabled } from "../../values/gameplayDevFlags.js";

const prettyId = (value) => String(value || "")
  .replace(/[-_]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const check = (id, label, met, details = {}) => ({
  id,
  label,
  met: met === true,
  ...details,
});

export class CraftingSystem {
  constructor({
    digSystem = null,
    upgradeSystem = null,
    ancientRelicSystem = null,
    heavenblocksProgressionSystem = null,
    progressionStateProvider = null,
  } = {}) {
    this.digSystem = digSystem;
    this.upgradeSystem = upgradeSystem;
    this.ancientRelicSystem = ancientRelicSystem;
    this.heavenblocksProgressionSystem = heavenblocksProgressionSystem;
    this.progressionStateProvider = typeof progressionStateProvider === "function"
      ? progressionStateProvider
      : null;
    this._craftInProgress = false;
  }

  setProgressionStateProvider(provider) {
    this.progressionStateProvider = typeof provider === "function" ? provider : null;
  }

  getRecipes() {
    return Object.values(CRAFTING_RECIPES).filter(recipe => (
      recipe.output?.type !== "upgrade"
      || isGameplayUpgradeEnabled(recipe.output.upgradeId)
    ));
  }

  getRecipeStatus(recipeId) {
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return { canCraft: false, reason: "invalid_recipe", recipeId, checks: [] };
    if (
      recipe.output?.type === "upgrade"
      && !isGameplayUpgradeEnabled(recipe.output.upgradeId)
    ) {
      return {
        canCraft: false,
        reason: "gameplay_mode_disabled",
        recipeId,
        recipe,
        checks: [],
      };
    }
    const systemsFailure = this._getSystemsFailure(recipeId);
    if (systemsFailure) return systemsFailure;

    const outputUpgrade = recipe.output?.type === "upgrade"
      ? UPGRADES[recipe.output.upgradeId]
      : null;
    if (!outputUpgrade) {
      return { canCraft: false, reason: "invalid_output", recipeId, recipe, checks: [] };
    }

    const outputLevel = this.upgradeSystem.getUpgradeLevel(recipe.output.upgradeId);
    if (outputUpgrade.oneTimePurchase && outputLevel > 0) {
      return {
        canCraft: false,
        reason: "already_owned",
        recipeId,
        recipe,
        checks: [check("ownership", "Already forged", true)],
        outputUpgradeId: recipe.output.upgradeId,
      };
    }

    const requirements = recipe.requirements || {};
    const progression = this._getProgressionSystem();
    const relicCount = this._getAncientRelicCount();
    const checks = [];

    const relicRequired = requirements.minimumAncientRelics || 0;
    checks.push(check(
      "ancient-relics",
      `Ancient Relics  ${relicCount} / ${relicRequired}`,
      relicCount >= relicRequired,
      { current: relicCount, required: relicRequired },
    ));

    for (const upgradeId of requirements.requiredUpgradeIds || []) {
      const level = this.upgradeSystem.getUpgradeLevel(upgradeId);
      checks.push(check(
        `upgrade:${upgradeId}`,
        `${UPGRADES[upgradeId]?.name || prettyId(upgradeId)}  ${level > 0 ? "OWNED" : "REQUIRED"}`,
        level > 0,
        { upgradeId, current: level, required: 1 },
      ));
    }

    if (requirements.requireArcCoreBlueprint) {
      const met = progression?.isArcCoreBlueprintEligible?.() === true;
      checks.push(check(
        "arc-core-blueprint",
        `Heavenblock blueprint  ${met ? "COMPLETE" : "INCOMPLETE"}`,
        met,
      ));
    }

    for (const partId of requirements.requiredInstalledPartIds || []) {
      const installed = progression?.isPartInstalled?.(partId) === true;
      checks.push(check(
        `part:${partId}`,
        `${prettyId(partId)}  ${installed ? "INSTALLED" : "MISSING"}`,
        installed,
        { partId },
      ));
    }

    if (requirements.requireZenithKeystone) {
      const met = progression?.hasZenithKeystone?.() === true;
      checks.push(check(
        "zenith-keystone",
        `Zenith Keystone  ${met ? "FORGED" : "REQUIRED"}`,
        met,
      ));
    }

    const resources = this.digSystem.getResourceTotals();
    for (const [resourceType, amount] of Object.entries(recipe.ingredients || {})) {
      const have = resources[resourceType] || 0;
      checks.push(check(
        `resource:${resourceType}`,
        `${getResourceDisplayName(resourceType)}  ${have.toLocaleString()} / ${amount.toLocaleString()}`,
        have >= amount,
        { resourceType, current: have, required: amount, needed: Math.max(0, amount - have) },
      ));
    }

    const failure = this._resolveFailure(recipe, checks, progression);
    return {
      canCraft: !failure,
      reason: failure?.reason || null,
      recipeId,
      recipe,
      checks,
      relicCount,
      outputUpgradeId: recipe.output.upgradeId,
      ...(failure?.details || {}),
    };
  }

  craft(recipeId) {
    if (this._craftInProgress) {
      return { success: false, reason: "craft_in_progress", recipeId };
    }
    const status = this.getRecipeStatus(recipeId);
    if (!status.canCraft) return { success: false, ...status };

    const resourceSnapshot = this.digSystem.getResourceTotals();
    const upgradeSnapshot = this.upgradeSystem.getUpgradeLevels();
    this._craftInProgress = true;
    try {
      const spendResult = this.digSystem.trySpendResources(status.recipe.ingredients);
      if (!spendResult?.success) {
        this._restoreSnapshots(resourceSnapshot, upgradeSnapshot);
        return {
          success: false,
          reason: spendResult?.reason || "resource_transaction_failed",
          recipeId,
          ...(spendResult || {}),
        };
      }
      const grantResult = this.upgradeSystem.grantUpgrade(
        status.recipe.output.upgradeId,
        status.recipe.output.level,
      );
      const grantedLevel = this.upgradeSystem.getUpgradeLevel(status.recipe.output.upgradeId);
      if (!grantResult?.success || grantedLevel < status.recipe.output.level) {
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
        recipe: status.recipe,
        outputUpgradeId: status.recipe.output.upgradeId,
        level: grantedLevel,
        spent: spendResult.spent,
        relicsConsumed: 0,
        progressionItemsConsumed: 0,
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

  getRecipeIngredientConflicts(resourceKeys = []) {
    const requested = new Set(Array.isArray(resourceKeys) ? resourceKeys : []);
    const conflicts = new Map();
    for (const recipe of this.getRecipes()) {
      if ((this.upgradeSystem?.getUpgradeLevel?.(recipe.output.upgradeId) || 0) > 0) continue;
      for (const [resourceKey, required] of Object.entries(recipe.ingredients || {})) {
        if (!requested.has(resourceKey)) continue;
        const entry = conflicts.get(resourceKey) || {
          resourceKey,
          recipeIds: [],
          recipeNames: [],
          requiredByRecipe: {},
        };
        entry.recipeIds.push(recipe.id);
        entry.recipeNames.push(recipe.name);
        entry.requiredByRecipe[recipe.id] = required;
        conflicts.set(resourceKey, entry);
      }
    }
    return [...conflicts.values()];
  }

  getHealthSnapshot() {
    return {
      ready: this._getSystemsFailure(null) === null,
      recipeCount: this.getRecipes().length,
      craftInProgress: this._craftInProgress,
    };
  }

  _getSystemsFailure(recipeId) {
    if (
      !this.digSystem?.getResourceTotals
      || !this.digSystem?.setResourceTotals
      || !this.digSystem?.trySpendResources
    ) {
      return { canCraft: false, reason: "resource_system_unavailable", recipeId, checks: [] };
    }
    if (
      !this.upgradeSystem?.getUpgradeLevel
      || !this.upgradeSystem?.grantUpgrade
      || !this.upgradeSystem?.getUpgradeLevels
      || !this.upgradeSystem?.setUpgradeLevels
    ) {
      return { canCraft: false, reason: "upgrade_system_unavailable", recipeId, checks: [] };
    }
    return null;
  }

  _getProgressionSystem() {
    return this.progressionStateProvider?.() || this.heavenblocksProgressionSystem || null;
  }

  _getAncientRelicCount() {
    const count = this.ancientRelicSystem?.getCount?.();
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  _resolveFailure(recipe, checks, progression) {
    const requirements = recipe.requirements || {};
    if (
      (requirements.requireArcCoreBlueprint
        || requirements.requireZenithKeystone
        || (requirements.requiredInstalledPartIds || []).length > 0)
      && !progression
    ) {
      return { reason: "progression_system_unavailable" };
    }
    const failed = checks.find((entry) => !entry.met);
    if (!failed) return null;
    if (failed.id === "ancient-relics") {
      return {
        reason: "not_enough_relics",
        details: { requiredRelics: failed.required, currentRelics: failed.current },
      };
    }
    if (failed.id.startsWith("upgrade:")) {
      return {
        reason: "requires_upgrade",
        details: { requiredUpgradeId: failed.upgradeId },
      };
    }
    if (failed.id === "arc-core-blueprint") return { reason: "requires_blueprint" };
    if (failed.id.startsWith("part:")) {
      return { reason: "requires_installed_parts", details: { missingPartId: failed.partId } };
    }
    if (failed.id === "zenith-keystone") return { reason: "requires_zenith_keystone" };
    if (failed.id.startsWith("resource:")) {
      const missingResources = checks
        .filter((entry) => entry.id.startsWith("resource:") && !entry.met)
        .map((entry) => ({
          resourceType: entry.resourceType,
          required: entry.required,
          have: entry.current,
          needed: entry.needed,
        }));
      return { reason: "not_enough_resources", details: { missingResources } };
    }
    return { reason: "requirements_not_met" };
  }

  _restoreSnapshots(resources, upgradeLevels) {
    this.digSystem.setResourceTotals(resources);
    this.upgradeSystem.setUpgradeLevels(upgradeLevels);
  }
}
