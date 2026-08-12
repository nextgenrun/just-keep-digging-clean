import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RetentionProgressSystem } from
  "../systems/progression/RetentionProgressSystem.js";
import { NewRunSetupInputController } from
  "../ui/scenes/NewRunSetupInputController.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import {
  consumeHardcoreDeath,
  createHardcoreModeData,
  isHardcoreModeExhausted,
} from "../values/hardcoreMode.js";
import { HUD_QUICK_CONTROLS } from "../values/hudQuickControls.js";
import { NEW_RUN_SETUP_CONFIG } from "../values/newRunSetup.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => readFileSync(resolve(root, relativePath), "utf8");

assert.equal(
  APPROVED_HUD_SKIN.paths.inventory,
  "sprites/UI/loot-pickups/inventory-bag-approved-full.png",
);
assert.equal(existsSync(resolve(root, APPROVED_HUD_SKIN.paths.inventory)), true);
assert.equal(HUD_QUICK_CONTROLS.inventory.width, 94);
assert.equal(HUD_QUICK_CONTROLS.inventory.height, 94);
assert.equal(HUD_QUICK_CONTROLS.inventory.keyOffsetX, 27);
assert.equal(HUD_QUICK_CONTROLS.inventory.keyOffsetY, 25);
assert.equal(HUD_QUICK_CONTROLS.pause.label, "{key}  MENU");

assert.match(NEW_RUN_SETUP_CONFIG.copy.hardcoreBody, /2 lives.*first revive free/s);
assert.equal(NEW_RUN_SETUP_CONFIG.copy.skipConfirmation, "YES");
assert.equal(NEW_RUN_SETUP_CONFIG.copy.hiddenSequence, "ONELIFE");
assert.match(NEW_RUN_SETUP_CONFIG.copy.guidedBody, /Move.*Dig.*Flight.*Portal.*Sell.*Upgrade.*Resume/s);

const inputOwner = {
  scene: {},
  isVisible: true,
  config: NEW_RUN_SETUP_CONFIG,
  mode: "casual",
  tutorialChoice: TOWN_TUTORIAL_CHOICES.NO,
  skipConfirmation: "YE",
  hiddenSequence: "",
  _refresh() {},
};
const inputController = new NewRunSetupInputController(inputOwner);
inputController._handleKey({ key: "s", preventDefault() {}, stopPropagation() {} });
assert.equal(inputOwner.skipConfirmation, "YES", "Skip must accept S instead of navigating down");

assert.deepEqual(RETENTION_CONFIG.tutorial.activeStages, [
  TOWN_TUTORIAL_STAGES.MOVE,
  TOWN_TUTORIAL_STAGES.DIG,
  TOWN_TUTORIAL_STAGES.FLIGHT,
  TOWN_TUTORIAL_STAGES.PORTAL,
  TOWN_TUTORIAL_STAGES.SELL,
  TOWN_TUTORIAL_STAGES.UPGRADE,
  TOWN_TUTORIAL_STAGES.RESUME,
]);
const skip = new RetentionProgressSystem();
skip.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.NO);
assert.deepEqual(skip.claimTutorialFlightTraining(), {
  flightUpgradeId: "gemPowerUnlock",
  freeFlightMs: 0,
});

let hardcore = { ...createHardcoreModeData("hardcore"), armed: true };
let death = consumeHardcoreDeath(hardcore);
assert.deepEqual([death.outcome, death.livesRemaining], ["free-revive", 2]);
death = consumeHardcoreDeath(death.data);
assert.deepEqual([death.outcome, death.livesRemaining], ["life-lost", 1]);
death = consumeHardcoreDeath(death.data);
assert.deepEqual([death.outcome, death.livesRemaining], ["exhausted", 0]);
assert.equal(isHardcoreModeExhausted(death.data), true);

const startMenu = read("ui/scenes/StartMenuScene.js");
assert.match(startMenu, /new NewRunSetupOverlay\(this\)/);
assert.doesNotMatch(startMenu, /new StartModeSelectionOverlay|new StartTutorialChoiceOverlay/);
const quickControls = read("systems/visual/HudQuickControls.js");
assert.match(quickControls, /setInteractive\(\{ useHandCursor: true \}\)/);
assert.match(quickControls, /inventoryHit = this\.inventoryContainer/);
assert.match(quickControls, /getKeyLabel\("inventory"\)/);
assert.match(quickControls, /getKeyLabel\("pause"\)/);
const playUi = read("world/playScene/PlaySceneUI.js");
assert.match(playUi, /toggleInventoryFromHud/);
assert.match(playUi, /togglePauseMenuFromHud/);
const deathBridge = read("world/playScene/HardcoreDeathBridge.js");
assert.match(deathBridge, /recordDeath\(source\)/);
assert.doesNotMatch(deathBridge, /preparePermanentDeath|purgePermanentDeath|markDeathTombstone/);

for (const designDoc of [
  "markdown/design-documents/readme.md",
  "markdown/design-documents/2026-08-10-player-journey.md",
  "markdown/design-documents/2026-08-10-controls-and-interface.md",
  "markdown/design-documents/2026-08-10-runtime-alignment-register.md",
]) {
  assert.equal(existsSync(resolve(root, designDoc)), true, `Missing ${designDoc}`);
}

console.log("Demo intro recovery contract passed: aligned HUD, integrated choices, seven beats, durable lives.");
