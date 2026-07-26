import {
  ARC_CORE_PURCHASE_COST,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_PURCHASE_COST,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "./arcCoreConfig.js";
import { ASSET_KEYS } from "./assetKeys.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "./heavenblocksProgressionConfig.js";

export const CRAFTING_RECIPE_IDS = Object.freeze({
  ARC_CORE: "arcCoreCraft",
  OMEGA_ARC_CORE: "omegaArcCoreCraft",
});

export const CRAFTING_REQUIREMENTS = Object.freeze({
  arcCoreRelics: 3,
  omegaArcCoreRelics: 18,
  skyIslandRelics: 3,
});

const freezeRecipe = (recipe) => Object.freeze({
  ...recipe,
  ingredients: recipe.ingredients,
  requirements: Object.freeze({
    ...recipe.requirements,
    requiredUpgradeIds: Object.freeze([...(recipe.requirements.requiredUpgradeIds || [])]),
    requiredInstalledPartIds: Object.freeze([
      ...(recipe.requirements.requiredInstalledPartIds || []),
    ]),
  }),
  output: Object.freeze({ ...recipe.output }),
  ui: Object.freeze({
    ...recipe.ui,
    requirementCopy: Object.freeze([...(recipe.ui.requirementCopy || [])]),
  }),
});

const requiredArcPartIds = HEAVENBLOCKS_PROGRESSION_CONFIG.arcCoreBlueprint.requiredPartIds;

export const CRAFTING_RECIPES = Object.freeze({
  [CRAFTING_RECIPE_IDS.ARC_CORE]: freezeRecipe({
    id: CRAFTING_RECIPE_IDS.ARC_CORE,
    name: "Arc Core",
    ingredients: ARC_CORE_PURCHASE_COST,
    requirements: {
      minimumAncientRelics: CRAFTING_REQUIREMENTS.arcCoreRelics,
      requiredUpgradeIds: ["worldTwoTunnelAccess"],
      requireArcCoreBlueprint: true,
      requiredInstalledPartIds: requiredArcPartIds,
      requireZenithKeystone: false,
    },
    output: {
      type: "upgrade",
      upgradeId: ARC_CORE_UPGRADE_ID,
      level: 1,
    },
    ui: {
      category: "Heavenblock Vehicle Core",
      description:
        "Fuse all three attuned Heavenblock components into the small Arc Core chassis.",
      iconAssetKey: ASSET_KEYS.ui.heavenblocks.aetherTurbine,
      successCopy: "ARC CORE FORGED  •  Vehicle systems online",
      requirementCopy: [
        "3 Ancient Relics found (permanent)",
        "World Two Tunnel Key",
        "All three Heavenblocks completed",
        "Aether Turbine, Halo Regulator, Eclipse Crucible installed",
      ],
    },
  }),
  [CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE]: freezeRecipe({
    id: CRAFTING_RECIPE_IDS.OMEGA_ARC_CORE,
    name: "Omega Arc Core",
    ingredients: OMEGA_ARC_CORE_PURCHASE_COST,
    requirements: {
      minimumAncientRelics: CRAFTING_REQUIREMENTS.omegaArcCoreRelics,
      requiredUpgradeIds: [ARC_CORE_UPGRADE_ID],
      requireArcCoreBlueprint: false,
      requiredInstalledPartIds: [],
      requireZenithKeystone: true,
    },
    output: {
      type: "upgrade",
      upgradeId: OMEGA_ARC_CORE_UPGRADE_ID,
      level: 1,
    },
    ui: {
      category: "Zenith Vehicle Core",
      description:
        "Temper the Arc Core with all three reopened sky vaults and the permanent Zenith Keystone.",
      iconAssetKey: ASSET_KEYS.ui.heavenblocks.eclipseCrucible,
      successCopy: "OMEGA ARC CORE FORGED  •  Zenith drive online",
      requirementCopy: [
        "Arc Core owned",
        "18 Ancient Relics found (permanent)",
        "Zenith Keystone forged from all three Arc Vaults",
      ],
    },
  }),
});

export const CRAFT_ONLY_UPGRADE_IDS = Object.freeze(
  [...new Set(Object.values(CRAFTING_RECIPES).map((recipe) => recipe.output.upgradeId))],
);

const CRAFT_ONLY_UPGRADE_ID_SET = new Set(CRAFT_ONLY_UPGRADE_IDS);

export function getCraftingRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}

export function isCraftOnlyUpgrade(upgradeId) {
  return CRAFT_ONLY_UPGRADE_ID_SET.has(upgradeId);
}
