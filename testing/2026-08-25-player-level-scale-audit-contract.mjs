import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import {
  sanitizeHardcoreMemorialRecord,
} from "../systems/hardcore/hardcoreMemorialRecord.js";
import { WelcomeMessageGenerator } from "../world/model/WelcomeMessageGenerator.js";
import { CELESTIAL_TALENT_BRANCHES } from "../values/celestialTalentBranches.js";
import {
  CELESTIAL_TALENT_PROGRESSION_CONFIG,
} from "../values/celestialTalentProgression.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../values/hardcoreMemorials.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { JOURNEY_CONFIG } from "../values/journeyConfig.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import {
  OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
} from "../values/openingFlightArtifact.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { SYSTEM_INTRODUCTION_CONFIG } from "../values/systemIntroduction.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const playerLevelGates = Object.values(UPGRADES)
  .filter(upgrade => Number.isFinite(upgrade.requiresLevel))
  .map(upgrade => [upgrade.id, upgrade.requiresLevel])
  .sort(([left], [right]) => left.localeCompare(right));
assert.deepEqual(playerLevelGates, [
  ["adamantPickaxe", 7],
  ["dragonPickaxe", 11],
  ["marketInsight", 6],
  ["mithrilPickaxe", 6],
  ["runePickaxe", 9],
  ["seismicSuppression", 11],
  ["thunderStrikeAbility", 3],
]);
assert.equal(SYSTEM_INTRODUCTION_CONFIG.thresholds.talentLevel, 3);
assert.equal(CELESTIAL_TALENT_PROGRESSION_CONFIG.access.requiredPlayerLevel, 3);
assert.deepEqual(
  [...new Set(CELESTIAL_TALENT_BRANCHES.flatMap(
    branch => branch.nodes.map(node => node.requiredLevel),
  ))],
  [3, 4, 5],
);
assert.deepEqual(JOURNEY_CONFIG.playerLevelMilestones, [2, 3, 4, 6, 11]);
assert.equal(OPENING_FLIGHT_GOLDEN_FIVE_CONFIG.cache.minimumPlayerLevel, 1);
assert.equal(HARDCORE_MODE_CONFIG.stress.panicStartDepthTiles, 22);
assert.equal(LEVEL_CONFIG.getPanicResistanceMeters(2), 20);

const xpEffect = SPECIAL_BLOCKS_CONFIG.effects.xpBlock;
const legendEffect = SPECIAL_BLOCKS_CONFIG.effects.legendBlock;
assert.deepEqual(
  [xpEffect.effect, xpEffect.value, legendEffect.effect, legendEffect.value],
  ["addLevelProgress", 0.1, "addLevelProgress", 0.5],
);
const firstThreshold = LEVEL_CONFIG.getXPRequiredForLevel(2);
const fractional = new PlayerLevelSystem();
const xpBlockResult = fractional.gainLevelProgress(xpEffect.value);
assert.equal(xpBlockResult.xpGained, Math.round(firstThreshold * 0.1));
assert.equal(xpBlockResult.levelUp, false);
assert.equal(fractional.currentXP, xpBlockResult.xpGained);

const legend = new PlayerLevelSystem();
const legendResult = legend.gainLevelProgress(legendEffect.value);
assert.equal(legendResult.xpGained, Math.round(firstThreshold * 0.5));
assert.equal(legendResult.levelUp, false);

const crossing = new PlayerLevelSystem();
crossing.currentXP = firstThreshold - xpBlockResult.xpGained;
const crossingResult = crossing.gainLevelProgress(xpEffect.value);
assert.equal(crossingResult.levelUp, true);
assert.equal(crossingResult.newLevel, 2);
assert.equal(crossingResult.levelsGained, 1);
assert.equal(crossingResult.rewardSummary.panicResistanceGainMeters, 20);

const inventoryEffects = Object.fromEntries(
  INVENTORY_SPECIAL_BLOCKS.entries.map(entry => [entry.id, entry.effect]),
);
assert.match(inventoryEffects.xpBlock, /10% progress/);
assert.match(inventoryEffects.legendBlock, /50% progress/);

const welcome = WelcomeMessageGenerator.generateMessage({
  dugTiles: ["1,1"],
  resources: { dirt: 1 },
  levelData: { level: 50, currentXP: 0, totalXP: 0 },
  retentionData: { stats: {} },
});
assert.match(welcome.body, /WELCOME BACK  •  LEVEL 5/);

const legacyMemorial = sanitizeHardcoreMemorialRecord({
  version: 1,
  player: { progressionVersion: 1, level: 50 },
});
assert.equal(HARDCORE_MEMORIAL_CONFIG.version, 2);
assert.equal(legacyMemorial.player.level, 5);
assert.equal(legacyMemorial.player.progressionVersion, LEVEL_CONFIG.PROGRESSION_VERSION);

const [digSource, shopSource, campaignSource] = await Promise.all([
  readFile(new URL("../systems/mining/DigSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/ShopOverlay.js", import.meta.url), "utf8"),
  readFile(new URL(
    "../ai-tools/roboplaytest/2026-08-14-roboplaytest-human-campaign.mjs",
    import.meta.url,
  ), "utf8"),
]);
assert.doesNotMatch(digSource, /gainLevel\((?:1|5)\)/);
assert.match(digSource, /gainLevelProgress\(effect\?\.value\)/);
assert.match(shopSource, /playerLevelSystem\?\.level \|\| 1/);
assert.doesNotMatch(campaignSource, /state\.level (?:>=|<) 20/);
assert.match(campaignSource, /Thunder Strike requires level 3/);

console.log("PLAYER_LEVEL_SCALE_AUDIT_CONTRACT_OK", {
  playerLevelGates,
  xpBlockXP: xpBlockResult.xpGained,
  legendBlockXP: legendResult.xpGained,
  legacyWelcomeLevel: 5,
});
