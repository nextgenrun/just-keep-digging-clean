import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";

export class ArcCoreCraftingSystem {
  constructor(options = {}) {
    this.digSystem = options.digSystem || null;
    this.upgradeSystem = options.upgradeSystem || null;
    this.progressionSystem = options.progressionSystem || null;
    this.onCrafted = options.onCrafted || null;
    this.craftedRecipes = new Set();
  }

  getRecipeState(recipeId) {
    const recipe = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes[recipeId];
    if (!recipe) return { recipeId, exists: false, canCraft: false, reason: "unknown-recipe" };
    const resources = this.digSystem?.getResourceTotals?.() || {};
    const missingResources = Object.entries(recipe.resources)
      .filter(([resourceKey, amount]) => (resources[resourceKey] || 0) < amount)
      .map(([resourceKey, amount]) => ({
        resourceKey,
        have: resources[resourceKey] || 0,
        required: amount,
      }));
    const missingHearts = recipe.requiredHearts.filter(
      (regionId) => !this.progressionSystem?.isHeartAttuned?.(regionId)
    );
    const missingRecipe = recipe.requiresRecipeId
      && !this.isRecipeCrafted(recipe.requiresRecipeId)
      ? recipe.requiresRecipeId
      : null;
    const alreadyOwned = (this.upgradeSystem?.getUpgradeLevel?.(recipe.upgradeId) || 0) > 0;
    const canCraft = !alreadyOwned
      && missingResources.length === 0
      && missingHearts.length === 0
      && !missingRecipe;
    return {
      recipeId,
      exists: true,
      recipe,
      canCraft,
      alreadyOwned,
      missingResources,
      missingHearts,
      missingRecipe,
      resources,
    };
  }

  isRecipeCrafted(recipeId) {
    const recipe = HEAVENBLOCKS_PROGRESSION_CONFIG.recipes[recipeId];
    return this.craftedRecipes.has(recipeId)
      || Boolean(recipe && (this.upgradeSystem?.getUpgradeLevel?.(recipe.upgradeId) || 0) > 0);
  }

  craft(recipeId) {
    const state = this.getRecipeState(recipeId);
    if (!state.exists) return { success: false, reason: "unknown-recipe", state };
    if (!state.canCraft) return { success: false, reason: "requirements", state };

    const before = this.digSystem.getResourceTotals();
    for (const [resourceKey, amount] of Object.entries(state.recipe.resources)) {
      if (this.digSystem.spendResource(resourceKey, amount)) continue;
      this.digSystem.setResourceTotals(before);
      return { success: false, reason: "atomic-spend-failed", resourceKey };
    }

    const granted = this.upgradeSystem.grantUpgrade(state.recipe.upgradeId, 1);
    if (!granted.success) {
      this.digSystem.setResourceTotals(before);
      return { success: false, reason: "grant-failed", granted };
    }

    this.craftedRecipes.add(recipeId);
    const result = {
      success: true,
      recipeId,
      recipe: state.recipe,
      remainingResources: this.digSystem.getResourceTotals(),
    };
    this.onCrafted?.(result);
    return result;
  }

  getSaveData() {
    return { craftedRecipes: [...this.craftedRecipes] };
  }

  loadSaveData(data) {
    const validIds = new Set(Object.keys(HEAVENBLOCKS_PROGRESSION_CONFIG.recipes));
    this.craftedRecipes = new Set(
      (Array.isArray(data?.craftedRecipes) ? data.craftedRecipes : [])
        .filter((recipeId) => validIds.has(recipeId))
        .slice(0, HEAVENBLOCKS_PROGRESSION_CONFIG.persistence.maxRecipeIds)
    );
    for (const recipeId of validIds) {
      if (this.isRecipeCrafted(recipeId)) this.craftedRecipes.add(recipeId);
    }
  }

  getHealthSnapshot() {
    return {
      recipeCount: Object.keys(HEAVENBLOCKS_PROGRESSION_CONFIG.recipes).length,
      craftedRecipes: [...this.craftedRecipes],
      hasDigSystem: Boolean(this.digSystem),
      hasUpgradeSystem: Boolean(this.upgradeSystem),
      hasProgressionSystem: Boolean(this.progressionSystem),
    };
  }
}
