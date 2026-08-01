import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FloatingTextSystem } from "../systems/visual/FloatingTextSystem.js";
import { USER_SETTINGS } from "../systems/UserSettings.js";
import { resolveStarDiscoveryPopupDecision } from "../systems/visual/starDiscoveryPopupPolicy.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import {
  getStarDiscoveryPreloadAssets,
  STAR_RARITY_PROGRESSION_CONFIG,
} from "../values/starRarityProgression.js";
import {
  getSignLevelThresholds,
  migrateLegacyStarCountToXp,
  resolveStarRarityIndex,
  validateStarRarityProgressionConfig,
} from "../values/starRarityProgressionMath.js";
import {
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import {
  getRuntimeFeatureAssetGroup,
} from "../world/rendering/runtimeFeatureAssetGroups.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = STAR_RARITY_PROGRESSION_CONFIG;
const tiers = config.rarityTiers;
const health = validateStarRarityProgressionConfig();

assert.equal(health.ready, true);
assert.equal(health.popupTimingValid, true);
assert.deepEqual(config.popup.holdMsByRarity, [3000, 3000, 3000, 3000, 3000, 3000]);
assert.equal(config.popup.minimumIntervalMs, 20000);
assert.equal(
  resolveStarDiscoveryPopupDecision({ enabled: false }).reason,
  "disabled",
);
assert.equal(
  resolveStarDiscoveryPopupDecision({
    nowMs: 1000,
    lastShownAtMs: 0,
    rarityEncounterCount: 2,
  }).reason,
  "cooldown",
);
assert.equal(
  resolveStarDiscoveryPopupDecision({
    activePriority: 1,
    incomingPriority: 2,
  }).reason,
  "higher-priority",
);
assert.equal(tiers.length, 6);
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
assert.equal(new Set(tiers.flatMap(tier => Object.values(tier.palette))).size, 40);
assert.ok(tiers.slice(2).every(tier => tier.wow));
assert.ok(tiers.slice(1).every((tier, index) => (
  tier.signXp > tiers[index].signXp
  && tier.multiplier > tiers[index].multiplier
  && tier.engineCharge > tiers[index].engineCharge
)));

assert.equal(config.spawn.legacyProbability, 0.018);
assert.ok(Math.abs(config.spawn.probability - 0.0036) < 1e-12);
assert.equal(config.spawn.reductionRatio, 0.8);
assert.equal(GAME_CONFIG.skyTileProbability, config.spawn.probability);
assert.equal(GAME_CONFIG.skyTileRarities, tiers);

const fullDepthBoundaries = [
  [0, 0],
  [0.719999, 0],
  [0.72, 1],
  [0.919999, 1],
  [0.92, 2],
  [0.979999, 2],
  [0.98, 3],
  [0.995999, 3],
  [0.996, 4],
  [0.999499, 4],
  [0.9995, 5],
];
for (const [roll, expected] of fullDepthBoundaries) {
  assert.equal(resolveStarRarityIndex(2000, roll), expected);
}
for (let sample = 0; sample < 1000; sample += 1) {
  const roll = sample / 1000;
  assert.ok(resolveStarRarityIndex(299, roll) <= 2);
  assert.ok(resolveStarRarityIndex(899, roll) <= 3);
  assert.ok(resolveStarRarityIndex(1599, roll) <= 4);
}

for (const [resourceType, totalXp] of Object.entries(config.signProgression.xpTotals)) {
  const thresholds = getSignLevelThresholds(resourceType);
  assert.equal(thresholds.length, config.signProgression.maxLevel);
  assert.equal(thresholds.at(-1), totalXp);
  assert.ok(thresholds.every((value, index) => (
    value > 0 && (index === 0 || value > thresholds[index - 1])
  )));
  const legacyNeeded = config.signProgression.legacyStarThresholds[resourceType];
  assert.equal(migrateLegacyStarCountToXp(resourceType, legacyNeeded), totalXp);
}

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};
globalThis.window = { localStorage: globalThis.localStorage };
const scene = {
  textures: { exists: () => true },
  ancientRelicSystem: { getCount: () => 0 },
};
const system = new FloatingTextSystem(scene, 2);
const common = system._recordCollectedStar("dirt", 0);
assert.equal(common.xpGained, 8);
assert.equal(common.count, 1);
assert.equal(common.rarityId, "common");
assert.equal(common.rarityEncounterCount, 1);
const rare = system._recordCollectedStar(
  "dirt",
  2,
  { materialMultiplier: 6, materialAmount: 12 },
);
assert.equal(rare.xpGained, 45);
assert.equal(rare.count, 2);
assert.equal(rare.rarityId, "rare");
assert.equal(rare.rarityEncounterCount, 1);
assert.equal(rare.materialMultiplier, 6);
assert.equal(rare.materialAmount, 12);
assert.equal(rare.levelsGained, 1);
const astral = system._recordCollectedStar("dirt", 5);
assert.equal(astral.xp, astral.totalXp);
assert.equal(astral.mastered, true);
assert.ok(astral.xpGained < tiers[5].signXp, "Sign XP must cap at mastery");
const savedXp = JSON.parse(storage.get("dig-game-sign-xp-v2-slot-2"));
assert.equal(savedXp.version, config.signProgression.saveVersion);
assert.equal(savedXp.xp.dirt, config.signProgression.xpTotals.dirt);
assert.equal(system.getStarProgressionHealthSnapshot().ready, true);
function createPopupScene() {
  const images = [];
  const texts = [];
  const containers = [];
  const tweens = [];
  function displayObject(properties = {}) {
    return {
      active: true,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      width: 768,
      height: 108,
      ...properties,
      setDepth(value) { this.depth = value; return this; },
      setScrollFactor(value) { this.scrollFactor = value; return this; },
      setAlpha(value) { this.alpha = value; return this; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setDisplaySize(width, height) {
        this.displayWidth = width;
        this.displayHeight = height;
        return this;
      },
      setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
      setCrop(x, y, width, height) {
        this.crop = { x, y, width, height };
        return this;
      },
      setBlendMode(value) { this.blendMode = value; return this; },
      add(children) {
        this.children ??= [];
        this.children.push(...(Array.isArray(children) ? children : [children]));
        return this;
      },
      destroy() { this.active = false; },
    };
  }
  const scene = {
    scale: { width: 1280, height: 720 },
    time: { now: 1000 },
    textures: { exists: () => true },
    add: {
      container(x, y) {
        const container = displayObject({ x, y, children: [] });
        containers.push(container);
        return container;
      },
      image(x, y, textureKey) {
        const image = displayObject({ x, y, textureKey });
        images.push(image);
        return image;
      },
      text(x, y, value) {
        const text = displayObject({ x, y, value });
        texts.push(text);
        return text;
      },
    },
    tweens: {
      add(settings) { tweens.push(settings); return { stop() {} }; },
      killTweensOf() {},
    },
  };
  return { scene, images, texts, containers, tweens };
}

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };
const popupHarness = createPopupScene();
const popupSystem = new FloatingTextSystem(popupHarness.scene, 8);
const commonPopupProgress = popupSystem._recordCollectedStar("dirt", 0);
const commonPopup = popupSystem._showStarDiscoveryPopup(commonPopupProgress, 0);
assert.equal(commonPopup?.active, true);
const rarePopupProgress = {
  ...commonPopupProgress,
  xpGained: 45,
  levelsGained: 0,
  rarity: 2,
  rarityId: "rare",
  rarityEncounterCount: 1,
  materialMultiplier: 7,
};
const rarePopup = popupSystem._showStarDiscoveryPopup(rarePopupProgress, 2);
assert.equal(commonPopup.active, false, "a higher rarity should replace a weaker popup");
assert.equal(rarePopup?.active, true);
assert.equal(popupSystem._showStarDiscoveryPopup(commonPopupProgress, 0), rarePopup);
assert.equal(popupHarness.containers.filter(item => item.active).length, 1);
assert.ok(popupHarness.images.some(
  image => image.textureKey === config.popup.plateAssets[2].key,
));
assert.ok(popupHarness.images.some(
  image => image.textureKey === config.popup.fillAssets[2].key,
));
assert.ok(popupHarness.texts.some(text => text.value === "WOW! RARE STAR"));
assert.ok(popupHarness.texts.some(text => text.value.includes("+45 SIGN XP")));
assert.ok(popupHarness.texts.some(text => text.value.includes("7x MATERIAL")));
assert.ok(popupHarness.tweens.every(tween => tween.repeat !== -1));
const popupExit = popupHarness.tweens.find(
  tween => tween.targets === rarePopup.container && tween.alpha === 0,
);
assert.equal(typeof popupExit?.onComplete, "function");
assert.equal(
  popupExit.delay,
  config.popup.enterMs + 3000,
  "the authored Star card must remain settled for exactly three seconds",
);
popupExit.onComplete();
assert.equal(rarePopup.active, false);
assert.equal(popupSystem._activeStarDiscoveryPopup, null);
assert.equal(
  popupSystem._showStarDiscoveryPopup(
    { ...commonPopupProgress, rarityEncounterCount: 2, levelsGained: 0 },
    0,
  ),
  null,
  "routine repeat Stars must respect the global popup cooldown",
);
popupHarness.scene.time.now += config.popup.minimumIntervalMs;
const bonusTextStart = popupHarness.texts.length;
const bonusPopup = popupSystem._showStarDiscoveryPopup(
  { ...commonPopupProgress, rarityEncounterCount: 2, rewardSource: "bonus" },
  1,
);
assert.equal(bonusPopup?.active, true);
assert.ok(
  popupHarness.texts.slice(bonusTextStart)
    .some(text => text.value.includes("BONUS STAR")),
);
USER_SETTINGS.updateDisplay({ showStarDiscoveryPopups: false });
popupSystem.applyDisplaySettings();
assert.equal(bonusPopup.active, false, "disabling Star popups must close the live card");
assert.equal(
  popupSystem._showStarDiscoveryPopup(commonPopupProgress, 0),
  null,
  "the persistent opt-out must block future Star cards",
);
assert.equal(
  JSON.parse(storage.get("jkd-settings-v2")).display.showStarDiscoveryPopups,
  false,
);
USER_SETTINGS.updateDisplay({ showStarDiscoveryPopups: true });

storage.set("dig-game-star-counts-slot-3", JSON.stringify({ stone: 5 }));
const migrated = new FloatingTextSystem(scene, 3);
assert.equal(
  migrated.getConstellationProgress().stone.xp,
  config.signProgression.xpTotals.stone,
  "legacy completed Signs must remain completed",
);

const preloadAssets = getStarDiscoveryPreloadAssets();
assert.equal(preloadAssets.length, 12);
const preloadKeys = new Set(preloadAssets.map(asset => asset.key));
for (const groupId of [
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx,
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight,
]) {
  const groupKeys = new Set(
    getRuntimeFeatureAssetGroup(groupId).assets.map(asset => asset.key),
  );
  assert.ok([...preloadKeys].every(key => groupKeys.has(key)));
}

const manifestPath = path.join(
  root,
  "sprites/UI/star-discovery-v1/star-discovery-v1.manifest.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.artSource, "ImageGen");
assert.deepEqual(manifest.runtimeTierOrder, tiers.map(tier => tier.id));
assert.equal(manifest.assets.length, 12);
for (const entry of manifest.assets) {
  const assetPath = path.join(root, "sprites/UI/star-discovery-v1", entry.file);
  const buffer = await readFile(assetPath);
  assert.ok((await stat(assetPath)).size > 5000);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  assert.equal(buffer.readUInt32BE(16), entry.width);
  assert.equal(buffer.readUInt32BE(20), entry.height);
  assert.deepEqual(entry.alphaRange, [0, 255]);
  assert.ok(entry.visibleCoverage > 0.03 && entry.visibleCoverage < 0.9);
  assert.equal(createHash("sha256").update(buffer).digest("hex"), entry.sha256);
}

const [
  worldSource,
  digSource,
  floatingSource,
  popupSource,
  xpBarSource,
  detailSource,
  healthSource,
  pillarSource,
  userSettingsSource,
  settingsPanelSource,
] = await Promise.all([
  readFile(new URL("../world/model/WorldModel.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/mining/DigSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/FloatingTextSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarDiscoveryPopupView.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/starlightSignXpBar.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/starlightTalentDetailPresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/health/runtimeCanaryChecks.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/UserSettings.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/SettingsPanelContent.js", import.meta.url), "utf8"),
]);
const generationSource = worldSource.slice(
  worldSource.indexOf("  generateSkyTiles() {"),
  worldSource.indexOf("  generateRootOverlays() {"),
);
assert.equal((generationSource.match(/this\.rng\.next\(\)/g) || []).length, 1);
assert.match(generationSource, /hash01\(/);
assert.match(generationSource, /resolveStarRarityIndex/);
assert.equal((digSource.match(/releaseCollectedSkyStar\(/g) || []).length, 2);
assert.match(digSource, /materialMultiplier:\s*skyTileMultiplier/);
assert.match(digSource, /materialMultiplier:\s*skyMultiplier/);
assert.match(floatingSource, /resolveStarDiscoveryPopupDecision/);
assert.match(userSettingsSource, /showStarDiscoveryPopups/);
assert.match(settingsPanelSource, /showStarDiscoveryPopups[\s\S]*applyDisplaySettings/);
assert.match(floatingSource, /getStarProgressionHealthSnapshot/);
assert.match(floatingSource, /source:\s*"bonus"/);
assert.doesNotMatch(`${popupSource}\n${xpBarSource}`, /add\.(graphics|rectangle|circle)/);
assert.doesNotMatch(`${popupSource}\n${xpBarSource}`, /setTint|generateTexture|repeat:\s*-1/);
assert.match(popupSource, /popup\.copy\.bonusReward/);
assert.match(detailSource, /createStarlightSignXpBar/);
assert.match(detailSource, /XP TO LV/);
assert.match(healthSource, /starProgressionFindings/);
const pillarStatusSource = pillarSource.slice(
  pillarSource.indexOf("  _getConstellationStatus("),
  pillarSource.indexOf("  _drawChartConstellationGlyph("),
);
assert.match(pillarSource, /getConstellationProgress/);
assert.doesNotMatch(pillarStatusSource, /STARS|need \$\{threshold\}S/);

function evaluateStarHealth(ready) {
  const playScene = {
    sys: { settings: { key: "PlayScene" }, isActive: () => true },
    scene: { isActive: () => true },
    floatingTextSystem: {
      getStarProgressionHealthSnapshot: () => ({ ready }),
    },
  };
  return evaluateRuntimeCanaries(
    {
      canvas: { isConnected: true },
      loop: { frame: 2, actualFps: 60, running: true, inFocus: true },
      scene: { getScenes: () => [playScene], scenes: [playScene] },
    },
    {
      noActiveSinceMs: null,
      lastFrame: 1,
      lastFrameChangedAtMs: 0,
      activeSinceByScene: new Map([["PlayScene", 0]]),
    },
    RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1,
    false,
  ).findings.some(
    finding => finding.code === RUNTIME_CANARY_CONFIG.events.starProgressionInvariant,
  );
}
assert.equal(evaluateStarHealth(true), false);
assert.equal(evaluateStarHealth(false), true);

assert.equal(config.popup.maximumActive, 1);
assert.ok(config.popup.holdMsByRarity.every(duration => duration === 3000));

console.log(
  "star rarity + Sign XP contract: 80% spawn reduction, six weighted rewards, "
    + "five-level capped progression, migration, ImageGen alpha assets, two preload "
    + "routes, two mining paths, three-second throttled popup, opt-out, and worker canary passed",
);
