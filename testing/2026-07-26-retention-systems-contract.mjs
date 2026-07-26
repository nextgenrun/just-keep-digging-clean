import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { PlayerLevelSystem } from "../systems/progression/PlayerLevelSystem.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { sanitizeRetentionProgressData } from "../systems/progression/retentionProgressState.js";
import { ANCIENT_RELIC_CONFIG } from "../values/ancientRelics.js";
import { COMBO_CONFIG, getNextComboGpCheckpoint } from "../values/comboConfig.js";
import { getResourceRarityDescriptor } from "../values/dynamicSoil.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import { getCargoSellValue } from "../values/resourcePrices.js";
import { getTeleportPortalLabel } from "../values/teleportPortalConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TREASURE_CHEST_CONFIG } from "../values/treasureChestConfig.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

// GP checkpoints are additions to the unchanged six-second combo window.
const combo = new ComboSystem();
assert.equal(combo.comboDurationMs, 6000);
assert.deepEqual(getNextComboGpCheckpoint(0), { milestone: 10, gpRestore: 2 });
assert.deepEqual(getNextComboGpCheckpoint(25), { milestone: 50, gpRestore: 4 });
assert.equal(getNextComboGpCheckpoint(5000), null);
assert.ok(
  Object.values(COMBO_CONFIG.milestoneRewards)
    .every(reward => reward.gpRestore > 0 && reward.gpRestore <= 15),
  "combo GP restoration must remain restrained",
);

// Routine levels stay non-choice while authored five-level milestones preserve
// their selection and survive later recalculation and save restoration.
assert.equal(LEVEL_CONFIG.hasChoiceReward(4), false);
assert.equal(LEVEL_CONFIG.hasChoiceReward(5), true);
const levels = new PlayerLevelSystem();
const milestone = levels.gainLevel(4);
assert.equal(milestone.newLevel, 5);
assert.equal(milestone.hasChoice, true);
const selected = levels.applyChoiceReward("miningPower");
assert.equal(selected.count, 1);
const chosenDamage = levels.getMiningDamageMultiplier();
levels.gainLevel(1);
assert.ok(levels.getMiningDamageMultiplier() > chosenDamage);
const restoredLevels = new PlayerLevelSystem();
restoredLevels.fromJSON(levels.toJSON());
assert.deepEqual(restoredLevels.choiceSelections, { miningPower: 1, resourceLuck: 0 });
assert.equal(restoredLevels.getMiningDamageMultiplier(), levels.getMiningDamageMultiplier());

// Persistent records, first-run loop, discoveries, expedition comparison data,
// session objective state, and depth-chase states remain bounded and coherent.
const retention = new RetentionProgressSystem({ saveSlot: 1 });
retention.loadSaveData({
  stats: { bestDepth: 100 },
  discoveries: { materials: ["stone"], portals: [], journal: [] },
  tutorialStage: "mine",
});
retention.updateDepth(75);
assert.deepEqual(retention.getDepthChase(), {
  state: "approaching",
  current: 75,
  target: 100,
  remaining: 25,
});
retention.updateDepth(100);
assert.equal(retention.getDepthChase().state, "matching");
retention.updateDepth(101);
assert.equal(retention.getDepthChase().state, "beaten");
assert.ok(retention.drainEvents().some(event => event.type === "personalBest"));

retention.recordMiningResult({
  success: true,
  destroyed: true,
  resourceType: "copper",
  resourceAmount: 2,
  resourceLabel: "Copper",
  isCriticalHit: true,
  isLuckyDrop: true,
});
assert.equal(retention.getJournalSnapshot().tutorialStage, "sell");
retention.recordSale(30, 2);
assert.equal(retention.getJournalSnapshot().tutorialStage, "upgrade");
retention.recordUpgrade("Mining Power", {
  beforeHits: 3,
  afterHits: 2,
  beforeDamage: 10,
  afterDamage: 12,
});
assert.equal(retention.getJournalSnapshot().tutorialStage, "complete");
assert.equal(retention.consumeUpgradePayoff().afterHits, 2);
assert.equal(retention.hasDiscoveredMaterial("copper"), true);
retention.recordChest({ money: 45, star: false });
retention.recordStar(1);
retention.recordPortalActivated("L2 Core Expanse");
retention.recordEarthquake({ passagesOpened: 3, intensity: "major", distanceEndured: 12 });
retention.updateDepth(0, { isTown: true });
const eventTypes = retention.drainEvents().map(event => event.type);
assert.ok(eventTypes.includes("expeditionSummary"));
assert.ok(eventTypes.includes("earthquakeRecap"));

const objectiveRetention = new RetentionProgressSystem({ saveSlot: 1 });
for (let index = 0; index < 35; index += 1) {
  objectiveRetention.recordMiningResult({ success: true, destroyed: true });
}
assert.equal(objectiveRetention.getObjective().complete, true);
assert.ok(
  objectiveRetention.drainEvents().some(event => event.type === "objectiveComplete"),
);

const sanitized = sanitizeRetentionProgressData({
  stats: { bestDepth: -20, moneyEarned: Number.POSITIVE_INFINITY },
  discoveries: { materials: ["stone", "stone", 4] },
  tutorialStage: "invalid",
});
assert.equal(sanitized.stats.bestDepth, 0);
assert.equal(sanitized.stats.moneyEarned, 0);
assert.deepEqual(sanitized.discoveries.materials, ["stone"]);
assert.equal(sanitized.tutorialStage, "mine");

// Chest duration/reward scope, cargo preview, rarity readability, Level 2
// portal labels, and Level 2 relic cadence are configuration contracts.
assert.equal(TREASURE_CHEST_CONFIG.critBuff.durationMs, 20000);
assert.equal(TREASURE_CHEST_CONFIG.critBuff.criticalDamageMultiplierBonus, 2);
assert.ok(TREASURE_CHEST_CONFIG.star.chance > 0 && TREASURE_CHEST_CONFIG.star.chance < 0.5);
retention.activateChestCritBuff(1000);
assert.equal(retention.getChestCritBuffRemaining(1000), 20000);
assert.equal(retention.getChestCritDamageBonus(21001), 0);
assert.equal(
  getCargoSellValue({ dirt: 10, copper: 2 }, { marketBonus: 0 }),
  40,
);
const rarity = getResourceRarityDescriptor(TILE_TYPES.GOLD, 12, 700, 635241, 133742);
assert.ok(["normal", "rich", "packed", "ancient"].includes(rarity.id));
assert.ok([1, 2, 5, 12].includes(rarity.multiplier));
assert.match(getTeleportPortalLabel(2, 3500), /^L2 .*3500m/);
assert.ok(ANCIENT_RELIC_CONFIG.levelTwoWorldCaches.count > 0);
assert.ok(ANCIENT_RELIC_CONFIG.levelTwoWorldCaches.minTileX >= 121);

// Retention state is present in version 10 payloads and legacy payloads default
// safely without changing world compatibility.
const saveStore = new DugTilesSaveStore();
const payload = saveStore.createPayload(
  { seed: 133742, width: 280, depth: 5065, topAirRows: 65 },
  [],
  undefined,
  null,
  levels.toJSON(),
  null,
  null,
  null,
  [],
  null,
  null,
  null,
  null,
  null,
  retention.getSaveData(),
);
assert.equal(payload.version, 10);
assert.equal(payload.retentionData.stats.bestDepth, 101);
assert.equal(payload.retentionData.stats.chestsOpened, 1);
const legacyPayload = { ...payload };
delete legacyPayload.retentionData;
assert.equal(saveStore.normalizePayload(legacyPayload).retentionData.stats.bestDepth, 0);

// Keep the broad runtime wiring visible to this pure contract without needing
// to boot Phaser.
const [setupSource, updateSource, specialTileSource, pillarSource, settingsSource] =
  await Promise.all([
    readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
    readFile(new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/mining/SpecialTileSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../systems/visual/MilestonePillarModal.js", import.meta.url), "utf8"),
    readFile(new URL("../ui/overlays/SettingsPanelContent.js", import.meta.url), "utf8"),
  ]);
assert.match(setupSource, /new RetentionProgressSystem/);
assert.match(setupSource, /restoreGemPower/);
assert.match(updateSource, /resolveStableMineTarget/);
assert.match(updateSource, /abilityInputBufferMs/);
assert.match(specialTileSource, /quickResumeDeepestPortal/);
assert.match(specialTileSource, /TREASURE_CHEST_CONFIG/);
assert.match(pillarSource, /MINER JOURNAL/);
assert.match(settingsSource, /showExpeditionSummaries/);
assert.match(settingsSource, /showMaterialDiscoveryCards/);

console.log("retention systems contract: progression, promises, feedback, saves, and guardrails passed");
