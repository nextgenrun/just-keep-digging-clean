import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ComboSystem } from "../systems/combo/ComboSystem.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { resolveFloatingTextPreference } from "../systems/UserSettings.js";
import {
  HARDCORE_MODE_CONFIG,
  createHardcoreModeData,
  resolveHardcoreTeleportCost,
} from "../values/hardcoreMode.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const combo = new ComboSystem();
combo.incrementCombo(1000);
combo.pause(2000);
assert.equal(combo.update(12000), true, "UI pause must freeze the combo timer");
combo.resume(12000);
assert.equal(combo.update(16000), true, "resuming must preserve remaining combo time");
assert.equal(combo.update(18001), false, "combo must expire after preserved time elapses");

const tutorial = new RetentionProgressSystem();
tutorial.configureTutorialChoice("yes");
tutorial.recordTutorialMovement(RETENTION_CONFIG.tutorial.moveDistanceTiles);
tutorial.onFirstTileBroken();
tutorial.claimTutorialFlightTraining();
assert.equal(tutorial.isTutorialFreeFlightActive(), true);
tutorial.recordTutorialFlight();
assert.equal(tutorial.isTutorialFreeFlightActive(), false);
assert.equal(tutorial.getTutorialState().freeFlightRemainingMs, 0);
const reloadedTutorial = new RetentionProgressSystem();
reloadedTutorial.loadSaveData(tutorial.getSaveData());
assert.equal(
  reloadedTutorial.isTutorialFreeFlightActive(),
  false,
  "completed tutorial Flight must remain expired after save/reload",
);

assert.equal(resolveFloatingTextPreference({}).mode, "full");
assert.equal(resolveFloatingTextPreference({
  floatingTextMode: "reduced",
  floatingTextPreferenceVersion: 2,
}).mode, "full", "stale enabled saves must migrate back to visible damage text");
assert.equal(resolveFloatingTextPreference({
  floatingTextMode: "off",
  floatingTextPreferenceVersion: 2,
}).mode, "off", "an explicit opt-out must remain respected");
assert.equal(resolveFloatingTextPreference({
  floatingTextMode: "full",
  floatingTextPreferenceVersion: RETENTION_CONFIG.floatingText.preferenceVersion,
}).mode, "full");

assert.equal(HARDCORE_MODE_CONFIG.teleport.free, true);
assert.equal(resolveHardcoreTeleportCost(5000, "quickResume"), 0);
assert.equal(
  HARDCORE_MODE_CONFIG.stress.intactStarLightRadiusTiles,
  1.5,
  "intact Stars must require close proximity instead of creating a broad safe zone",
);
const hardcoreBridgeSource = await readFile(
  new URL("../world/playScene/HardcoreModeBridge.js", import.meta.url),
  "utf8",
);
assert.match(
  hardcoreBridgeSource,
  /const scanRadius = Math\.ceil\(radiusTiles\)/,
  "fractional Star relief radii must still query integer world tiles",
);

const lowLevel = new HardcoreModeSystem(createHardcoreModeData("hardcore", 1));
lowLevel.arm("test", 2);
const lowSnapshot = lowLevel.update(100, {
  gameplayActive: true,
  depth: 900,
  darknessAlpha: 1,
  torchActive: false,
  playerLevel: 1,
});
const highLevel = new HardcoreModeSystem(createHardcoreModeData("hardcore", 1));
highLevel.arm("test", 2);
const highSnapshot = highLevel.update(100, {
  gameplayActive: true,
  depth: 900,
  darknessAlpha: 1,
  torchActive: false,
  playerLevel: 99,
});
assert.ok(highSnapshot.stressGainPerSecond < lowSnapshot.stressGainPerSecond);
const starSnapshot = highLevel.update(100, {
  gameplayActive: true,
  depth: 900,
  darknessAlpha: 1,
  torchActive: false,
  nearIntactStarLight: true,
  playerLevel: 99,
});
assert.equal(starSnapshot.nearIntactStarLight, true);

assert.ok(INVENTORY_SPECIAL_BLOCKS.entries.length >= 7);
assert.equal(UPGRADES.dragonPickaxe.goldCost, 360000);

const ghostSource = await readFile(
  new URL("../systems/onboarding/TutorialPortalGhostGuide.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(ghostSource, /_syncPlayerFrame/);
assert.match(ghostSource, /_syncReachableTarget/);
assert.match(ghostSource, /digDownAnim/);
assert.match(ghostSource, /stage === "portal" && this\.blockedByTy !== null/);
assert.match(RETENTION_CONFIG.tutorial.copy.portal.body, /\{down\}/);
assert.match(RETENTION_CONFIG.tutorial.copy.portal.body, /\{mine\}/);

const hudSource = await readFile(
  new URL("../systems/visual/HUDSystem.js", import.meta.url),
  "utf8",
);
const approvedHudSource = await readFile(
  new URL("../systems/visual/ApprovedHudSkin.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  hudSource,
  /weatherPanel|weatherText|weatherTemp|weatherSeason|weatherIntensity|LEGACY_WEATHER_ICONS/,
);
assert.doesNotMatch(
  approvedHudSource,
  /WEATHER_TEXTURE_KEYS|setWeatherKind|setWeatherVisible|weatherIcon/,
);

console.log("2026-08-18 feedback regression contract passed");
