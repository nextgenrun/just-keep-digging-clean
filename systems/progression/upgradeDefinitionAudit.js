import { MINING_CONFIG } from "../../values/miningConfig.js";
import { UPGRADES } from "../../values/upgradeDefinitions.js";
import {
  MONEY_MONSTER_RESOURCE_KEYS,
  RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
} from "../../values/resourceTypes.js";

const PICKAXE_ORDER = Object.freeze([
  "bronzePickaxe",
  "ironPickaxe",
  "steelPickaxe",
  "mithrilPickaxe",
  "adamantPickaxe",
  "runePickaxe",
  "dragonPickaxe",
]);
const SOFT_RESOURCES = new Set(["dirt", "darkDirtNormal", "darkDirtStrong"]);

function pushFinding(target, id, message, details = {}) {
  target.push(Object.freeze({ id, message, ...details }));
}

function effectivePickaxeDamage(upgrade, resource) {
  const base = SOFT_RESOURCES.has(resource)
    ? MINING_CONFIG.baseDamage
    : MINING_CONFIG.baseDamageHard;
  const multiplier = upgrade.damageMultipliers?.[resource]
    ?? upgrade.damageMultipliers?.default
    ?? 1;
  return Math.max(base, upgrade.baseDamage * multiplier);
}

function auditPickaxes(errors) {
  const matrix = {};
  for (const resource of RESOURCE_KEYS) {
    let previous = 0;
    matrix[resource] = [];
    for (const id of PICKAXE_ORDER) {
      const upgrade = UPGRADES[id];
      const damage = effectivePickaxeDamage(upgrade, resource);
      matrix[resource].push(Object.freeze({ id, damage }));
      if (damage < previous) {
        pushFinding(errors, "pickaxe-downgrade", `${id} is weaker on ${resource}`, {
          upgradeId: id,
          resource,
          previous,
          damage,
        });
      }
      previous = damage;
    }
  }
  for (const id of PICKAXE_ORDER) {
    const upgrade = UPGRADES[id];
    const described = Number.parseInt(/^([0-9]+) flat damage/.exec(
      upgrade.description,
    )?.[1], 10);
    if (described !== upgrade.baseDamage) {
      pushFinding(errors, "pickaxe-description-mismatch", `${id} damage copy is stale`, {
        upgradeId: id,
        described,
        actual: upgrade.baseDamage,
      });
    }
  }
  return Object.freeze(matrix);
}

export function auditUpgradeDefinitions(definitions = UPGRADES) {
  const errors = [];
  const warnings = [];
  for (const [key, upgrade] of Object.entries(definitions)) {
    if (upgrade.id !== key) {
      pushFinding(errors, "id-mismatch", `${key} does not own its registry id`);
    }
    if (!upgrade.name || !upgrade.description || !upgrade.merchant) {
      pushFinding(errors, "missing-player-copy", `${key} lacks name, description, or merchant`);
    }
    const cost = upgrade.goldCost ?? upgrade.baseCost;
    if (!Number.isFinite(cost) || cost < 0) {
      pushFinding(errors, "invalid-cost", `${key} has no valid currency cost`);
    }
    if (!upgrade.effectType && upgrade.category !== "pickaxes") {
      pushFinding(warnings, "implicit-effect", `${key} relies on a special transaction`);
    }
  }

  if (UPGRADES.gemPowerRegeneration.baseCost !== 250) {
    pushFinding(errors, "gp-regeneration-cost", "GP regeneration must cost 250");
  }
  if (UPGRADES.quickslashAbility.merchant !== "boboMerchant") {
    pushFinding(errors, "quickslash-owner", "Quickslash must unlock through Bobo");
  }
  for (const id of ["torchDrainEfficiency", "torchRange", "boboCaveEyes"]) {
    if (UPGRADES[id].requiresLevel || UPGRADES[id].requiresDepthGateAccepted) {
      pushFinding(errors, "survival-tool-too-late", `${id} is depth or level locked`);
    }
  }
  const leakedResources = SECOND_WORLD_RESOURCE_KEYS.filter(resource => (
    MONEY_MONSTER_RESOURCE_KEYS.includes(resource)
  ));
  if (leakedResources.length) {
    pushFinding(errors, "merchant-resource-leak", "Money Monster owns red-area resources", {
      resources: leakedResources,
    });
  }

  const pickaxeMatrix = auditPickaxes(errors);
  return Object.freeze({
    ready: errors.length === 0,
    definitionCount: Object.keys(definitions).length,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    pickaxeMatrix,
  });
}
