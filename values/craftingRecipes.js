import {
  ARC_CORE_PURCHASE_COST,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_PURCHASE_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "./arcCoreConfig.js";

export const CRAFTING_RECIPE_IDS = Object.freeze({
  ARC_CORE: "arcCoreCraft",
  OMEGA_ARC_CORE: "omegaArcCoreCraft",
});

export const CRAFTING_PROGRESS_FLAGS = Object.freeze({
  SKY_ISLANDS_UNLOCKED: "skyIslandsUnlocked",
});

export const CRAFTING_REQUIREMENTS = Object.freeze({
  skyIslandRelics: 3,
});

function freezeRequirements(requirements) {
  return Object.freeze({
    ...requirements,
    progressFlags: Object.freeze([...(requirements.progressFlags || [])]),
  });
}

function freezeOutput(output) {
  return Object.freeze({ ...output });
}

export const CRAFTING_RECIPES = Object.freeze({
  [CRAFTING_RECIPE_IDS.ARC_CORE]: Object.freeze({
    id: CRAFTING_RECIPE_IDS.ARC_CORE,
    name: "Arc Core",
    ingredients: ARC_CORE_PURCHASE_COST,
    requirements: freezeRequirements({
      minimumAncientRelics: CRAFTING_REQUIREMENTS.skyIslandRelics,
      progressFlags: [CRAFTING_PROGRESS_FLAGS.SKY_ISLANDS_UNLOCKED],
    }),
    output: freezeOutput({
      type: "upgrade",
      upgradeId: ARC_CORE_UPGRADE_ID,
      level: 1,
    }),
  }),
  [CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE]: Object.freeze({
    id: CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE,
    name: "Omega Arc Core",
    ingredients: OMEGA_ARC_CORE_PURCHASE_COST,
    requirements: freezeRequirements({
      minimumAncientRelics: CRAFTING_REQUIREMENTS.skyIslandRelics,
      progressFlags: [CRAFTING_PROGRESS_FLAGS.SKY_ISLANDS_UNLOCKED],
    }),
    output: freezeOutput({
      type: "upgrade",
      upgradeId: OMEGA_ARC_CORE_UPGRADE_ID,
      level: 1,
    }),
  }),
});

export const CRAFT_ONLY_UPGRADE_IDS = Object.freeze(
  [...new Set(Object.values(CRAFTING_RECIPES).map(recipe => recipe.output.upgradeId))]
);

const CRAFT_ONLY_UPGRADE_ID_SET = new Set(CRAFT_ONLY_UPGRADE_IDS);

export function getCraftingRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}

export function isCraftOnlyUpgrade(upgradeId) {
  return CRAFT_ONLY_UPGRADE_ID_SET.has(upgradeId);
}
