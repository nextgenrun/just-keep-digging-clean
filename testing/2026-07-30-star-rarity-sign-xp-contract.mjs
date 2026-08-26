import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import {
  STAR_RARITY_PROGRESSION_CONFIG,
} from "../values/starRarityProgression.js";
import {
  getSignLevelThresholds,
  getSignProgress,
  getStarRarityDistribution,
  migrateLegacyStarCountToXp,
  resolveStarRarityIndex,
  validateStarRarityProgressionConfig,
} from "../values/starRarityProgressionMath.js";
import {
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import {
  getRuntimeFeatureAssetGroup,
} from "../world/rendering/runtimeFeatureAssetGroups.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFileSync(path.join(root, relativePath), "utf8");
const config = STAR_RARITY_PROGRESSION_CONFIG;
const tiers = config.rarityTiers;
const health = validateStarRarityProgressionConfig();

assert.equal(health.ready, true);
assert.equal(health.thresholdsValid, true);
assert.equal(health.weightTotal, 10000);
assert.equal(config.spawn.currentRateReductionRatio, 0.65);
assert.equal(config.spawn.reductionRatio, 0.93);
assert.ok(Math.abs(config.spawn.probability - 0.00126) < 1e-12);
assert.ok(Math.abs(
  config.spawn.probability / config.spawn.previousProbability - 0.35,
) < 1e-12);
assert.equal("popup" in config, false);
assert.deepEqual(
  tiers.map(tier => tier.id),
  ["common", "uncommon", "rare", "epic", "mythic", "astral"],
);
assert.deepEqual(
  tiers.map(tier => tier.weight),
  [7200, 2000, 600, 160, 35, 5],
);
assert.deepEqual(
  tiers.map(tier => tier.signXp),
  [8, 18, 45, 120, 360, 1200],
);
assert.deepEqual(
  tiers.map(tier => tier.multiplier),
  [2, 3, 5, 8, 14, 25],
);
assert.deepEqual(
  CELESTIAL_ENGINE_CONFIG.charge.starChargeByRarity,
  tiers.map(tier => tier.engineCharge),
);

assert.equal(resolveStarRarityIndex(0, 0), 0);
assert.ok(resolveStarRarityIndex(1600, 0.999999) >= 4);
const surfaceDistribution = getStarRarityDistribution(0);
const deepDistribution = getStarRarityDistribution(2000);
assert.ok(deepDistribution.find(entry => entry.tier.id === "common").probability
  < surfaceDistribution.find(entry => entry.tier.id === "common").probability);
assert.ok(deepDistribution.find(entry => entry.tier.id === "rare").probability
  > surfaceDistribution.find(entry => entry.tier.id === "rare").probability * 3);
assert.ok(deepDistribution.some(entry => entry.tier.id === "astral"));
for (const resourceType of Object.keys(config.signProgression.xpTotals)) {
  const thresholds = getSignLevelThresholds(resourceType);
  assert.equal(thresholds.length, config.signProgression.maxLevel);
  assert.ok(thresholds.every((value, index) => (
    value > 0 && (index === 0 || value > thresholds[index - 1])
  )));
  const complete = getSignProgress(resourceType, Number.MAX_SAFE_INTEGER);
  assert.equal(complete.mastered, true);
  assert.equal(complete.level, config.signProgression.maxLevel);
}
assert.equal(
  migrateLegacyStarCountToXp("stone", 5),
  config.signProgression.xpTotals.stone,
);

for (const groupId of [
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx,
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight,
]) {
  const group = getRuntimeFeatureAssetGroup(groupId);
  assert.ok(group);
  assert.equal(
    group.assets.some(asset => /star-discovery-v1/.test(asset.path)),
    false,
  );
}

const runtimeSources = [
  read("ui/scenes/BootScene.js"),
  read("systems/visual/FloatingTextSystem.js"),
  read("systems/UserSettings.js"),
  read("world/rendering/runtimeFeatureAssetGroups.js"),
].join("\n");
assert.doesNotMatch(runtimeSources, /getStarDiscoveryPreloadAssets/);
assert.doesNotMatch(runtimeSources, /showStarDiscoveryPopups/);
assert.doesNotMatch(runtimeSources, /STAR_RARITY_PROGRESSION_CONFIG\.popup/);

const xpBarSource = read("ui/overlays/starlightSignXpBar.js");
assert.match(xpBarSource, /starlightTalentTree\.progressPlaque/);
assert.doesNotMatch(xpBarSource, /starRarityProgression|add\.(graphics|rectangle|circle)/);

for (const retiredPath of [
  "systems/visual/StarDiscoveryPopupView.js",
  "systems/visual/starDiscoveryPopupPolicy.js",
]) {
  assert.equal(existsSync(path.join(root, retiredPath)), false);
}

console.log("star rarity and Sign XP contract: PASS (popup retired)");
