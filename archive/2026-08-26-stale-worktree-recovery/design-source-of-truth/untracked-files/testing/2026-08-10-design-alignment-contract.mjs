import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { FIRST_FIVE_MINUTES_CONFIG } from "../values/firstFiveMinutes.js";
import {
  HARDCORE_MODE_CONFIG,
  createHardcoreModeData,
  isHardcoreModeArmed,
  isHardcoreModeExhausted,
  isOneLifeHardcoreMode,
  resolveHardcoreUpkeepGpFloor,
  sanitizeHardcoreModeData,
} from "../values/hardcoreMode.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = relativePath => readFileSync(resolve(root, relativePath), "utf8");

assert.equal(FIRST_FIVE_MINUTES_CONFIG.firstPortal.depthMeters, 15);
assert.equal(FIRST_FIVE_MINUTES_CONFIG.firstPortal.tileX, 12);

const casual = createHardcoreModeData(HARDCORE_MODE_CONFIG.modes.casual, 100);
assert.equal(casual.livesRemaining, 0);
assert.equal(casual.freeReviveAvailable, false);
assert.equal(casual.exhausted, false);

const standard = createHardcoreModeData(HARDCORE_MODE_CONFIG.modes.hardcore, 100);
assert.equal(standard.livesRemaining, 2);
assert.equal(standard.freeReviveAvailable, true);
assert.equal(standard.exhausted, false);

const legacyArmed = sanitizeHardcoreModeData({
  version: 3,
  mode: "hardcore",
  armed: true,
  stress: 28,
});
assert.equal(legacyArmed.livesRemaining, 2);
assert.equal(legacyArmed.freeReviveAvailable, true);
assert.equal(isHardcoreModeArmed(legacyArmed), true);
assert.equal(resolveHardcoreUpkeepGpFloor(legacyArmed, "flight"), 1);

const standardSystem = new HardcoreModeSystem(standard);
assert.equal(standardSystem.arm("contract", 200), true);
const freeFall = standardSystem.recordDeath("fallingRock", 300);
assert.deepEqual(
  {
    freeRevive: freeFall.freeRevive,
    lifeConsumed: freeFall.lifeConsumed,
    livesRemaining: freeFall.livesRemaining,
    exhausted: freeFall.exhausted,
  },
  { freeRevive: true, lifeConsumed: false, livesRemaining: 2, exhausted: false },
);
const firstLife = standardSystem.recordDeath("stress", 400);
assert.equal(firstLife.freeRevive, false);
assert.equal(firstLife.livesRemaining, 1);
assert.equal(firstLife.exhausted, false);
const finalLife = standardSystem.recordDeath("graveborerWurm", 500);
assert.equal(finalLife.livesRemaining, 0);
assert.equal(finalLife.exhausted, true);
assert.equal(isHardcoreModeExhausted(standardSystem.getSaveData()), true);
assert.equal(isHardcoreModeArmed(standardSystem.getSaveData()), false);
assert.equal(resolveHardcoreUpkeepGpFloor(standardSystem.getSaveData(), "flight"), 0);
assert.equal(standardSystem.recordDeath("unknown", 600), null);

const oneLife = createHardcoreModeData(
  HARDCORE_MODE_CONFIG.modes.oneLifeHardcore,
  100,
);
assert.equal(isOneLifeHardcoreMode(oneLife), true);
assert.equal(oneLife.livesRemaining, 1);
assert.equal(oneLife.freeReviveAvailable, false);
const oneLifeSystem = new HardcoreModeSystem(oneLife);
assert.equal(oneLifeSystem.arm("contract", 200), true);
const oneLifeFall = oneLifeSystem.recordDeath("caveHazard", 300);
assert.equal(oneLifeFall.lifeConsumed, true);
assert.equal(oneLifeFall.livesRemaining, 0);
assert.equal(oneLifeFall.exhausted, true);

const tutorialOverlay = source("ui/scenes/StartTutorialChoiceOverlay.js");
assert.match(tutorialOverlay, /typedSkipBuffer/);
assert.match(tutorialOverlay, /confirmationWord/);
assert.match(tutorialOverlay, /_beginSkipConfirmation/);

const startMenu = source("ui/scenes/StartMenuScene.js");
assert.ok(
  startMenu.indexOf("_showNewSaveTutorialChoice()")
    < startMenu.indexOf("_showNewSaveModeChoice(tutorialChoice)"),
  "new saves must choose Tutorial before save rules",
);
assert.match(startMenu, /isHardcoreModeExhausted/);
assert.match(startMenu, /CLEAR\s+EXHAUSTED\s+RUN/);

const inputHandler = source("world/playScene/PlayerInputHandler.js");
assert.match(inputHandler, /fixedMoveLeft/);
assert.match(inputHandler, /fixedMoveRight/);
assert.match(inputHandler, /fixedMoveUp/);
assert.match(inputHandler, /fixedMoveDown/);
assert.match(inputHandler, /fixedDig/);
assert.match(inputHandler, /KeyCodes\.SPACE/);

const hud = source("systems/visual/HUDSystem.js");
assert.match(hud, /_createPauseMenuTarget/);
assert.match(hud, /showPauseMenu/);
assert.match(
  hud,
  /this\.pauseMenuHit = this\.scene\.add\.rectangle[\s\S]*?\.setScrollFactor\(0\)[\s\S]*?\.setInteractive/,
);

const hardcoreRecapAction = source("ui/overlays/hardcoreRecapAction.js");
assert.match(hardcoreRecapAction, /if \(image\.input && image\.scene\?\.sys\)/);

const deathBridge = source("world/playScene/HardcoreDeathBridge.js");
assert.match(deathBridge, /recordDeath/);
assert.match(deathBridge, /RUN EXHAUSTED|exhaustedPresentation/);
assert.doesNotMatch(deathBridge, /\.preparePermanentDeath\(/);
assert.doesNotMatch(deathBridge, /\.purgePermanentDeath\(/);

console.log("design alignment contract: ok");
