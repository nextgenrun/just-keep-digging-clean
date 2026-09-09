import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import { TUTORIAL_NARRATION_CUES } from "../values/tutorialNarration.js";
import { CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG } from "../values/contextualMechanicTutorials.js";
import { JOURNEY_CONFIG } from "../values/journeyConfig.js";
import { LOADING_MESSAGES } from "../values/loadingMessages.js";
import { UI_INVENTORY_COPY } from "../values/uiIcons.js";
import { INVENTORY_CODEX_CONFIG } from "../values/inventoryCodex.js";
import { INVENTORY_RESOURCE_GUIDE } from "../values/inventoryResourceGuide.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../values/inventorySpecialBlocks.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../values/hardcoreMemorials.js";
import { CELESTIAL_ACTION_BAR_CONFIG } from "../values/celestialActionBar.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import { CELESTIAL_TALENT_BRANCHES } from "../values/celestialTalentBranches.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../values/celestialTalentTreeUi.js";
import { CRAFTING_RECIPES } from "../values/craftingRecipes.js";
import {
  MAIN_MENU_COPY,
  NEW_RUN_COPY,
  PAUSE_MENU_COPY,
  RECOVERY_COPY,
  SETTINGS_COPY,
  SHOP_COPY,
  STAR_SANCTUARY_COPY,
  WORLD_LOAD_COPY,
  WORLD_MAP_COPY,
} from "../values/playerFacingCopy.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach(entry => collectStrings(entry, result));
  else if (value && typeof value === "object") {
    Object.values(value).forEach(entry => collectStrings(entry, result));
  }
  return result;
}

const reviewedCopy = collectStrings([
  NEW_RUN_COPY,
  RETENTION_CONFIG.tutorial.choice,
  RETENTION_CONFIG.tutorial.copy,
  RETENTION_CONFIG.settings,
  TUTORIAL_NARRATION_CUES,
  CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG.entries,
  JOURNEY_CONFIG.copy,
  JOURNEY_CONFIG.eventCopy,
  LOADING_MESSAGES,
  UI_INVENTORY_COPY,
  INVENTORY_CODEX_CONFIG.copy,
  INVENTORY_RESOURCE_GUIDE.copy,
  INVENTORY_SPECIAL_BLOCKS,
  WORLD_MAP_COPY,
  HARDCORE_MODE_CONFIG.copy,
  HARDCORE_MEMORIAL_CONFIG.copy,
  CELESTIAL_ACTION_BAR_CONFIG.copy,
  CELESTIAL_ENGINE_CONFIG.copy,
  CELESTIAL_ENGINE_CONFIG.hud.stellarLanceBuff,
  Object.values(CELESTIAL_ENGINE_CONFIG.engines).map(engine => ({
    name: engine.name,
    role: engine.role,
    description: engine.description,
    capLabel: engine.capLabel,
  })),
  CELESTIAL_TALENT_BRANCHES.map(branch => branch.nodes.map(node => ({
    name: node.name,
    description: node.description,
  }))),
  CELESTIAL_TALENT_TREE_UI_CONFIG.copy,
  Object.values(CRAFTING_RECIPES).map(recipe => recipe.ui),
  MAIN_MENU_COPY,
  PAUSE_MENU_COPY,
  RECOVERY_COPY,
  SETTINGS_COPY,
  SHOP_COPY,
  STAR_SANCTUARY_COPY,
  WORLD_LOAD_COPY,
]).join("\n");

const implementationLanguage = /\b(?:runtime|subsystem|module|production|current build|next threads|life state|core loop|real cargo|modern depth economy|arms at flight|silently replaced)\b/i;
assert.doesNotMatch(
  reviewedCopy,
  implementationLanguage,
  "player-facing copy must not expose implementation or planning language",
);
assert.doesNotMatch(
  reviewedCopy,
  /world-bounded|target slots|unlock another root|vehicle systems online/i,
  "advanced tooltips must describe player effects instead of implementation structure",
);
assert.doesNotMatch(
  collectStrings(LOADING_MESSAGES).join("\n"),
  /RNG gods|patch notes|rubber chicken|magic 8-ball|dwarf power-nap|finding the 'any' key/i,
  "loading messages must teach real game knowledge instead of generic filler jokes",
);
assert.ok(LOADING_MESSAGES.length >= 60, "the loader keeps a useful variety of real tips");
assert.ok(
  LOADING_MESSAGES.filter(message => message.label.startsWith("Tip:")).length >= 40,
  "most rotating loader messages are actionable tips",
);

for (const token of ["{left}", "{right}", "{mine}", "{fly}", "{down}", "{interact}"]) {
  assert.match(reviewedCopy, new RegExp(token.replace(/[{}]/g, "\\$&")), `tutorial copy keeps ${token}`);
}

assert.match(reviewedCopy, /15m/i, "the guided route names the real 15m return gate");
assert.match(reviewedCopy, /GP/, "copy keeps the established GP term");
assert.match(reviewedCopy, /Flight/, "copy keeps the established Flight term");
assert.match(reviewedCopy, /Ember/i, "copy keeps the established Ember term");
assert.match(reviewedCopy, /WORLD EDGE/, "Stellar Lance explains its real range");
assert.match(NEW_RUN_COPY.subtitle, /permanent for this save/i);
assert.match(RETENTION_CONFIG.tutorial.choice.body, /start immediately with Flight unlocked/i);
assert.equal(INVENTORY_SPECIAL_BLOCKS.useTitle, "WHEN TO USE IT");
assert.equal(WORLD_LOAD_COPY.retry, "TRY AGAIN");
assert.match(RECOVERY_COPY.body.join(" "), /last valid save/i);

const sourceFiles = [
  "ui/scenes/MainMenuScene.js",
  "ui/scenes/StartMenuScene.js",
  "ui/scenes/PlaySceneRecoveryOverlay.js",
  "ui/scenes/WorldLoadScene.js",
  "ui/overlays/SettingsPanelContent.js",
  "ui/overlays/ShopOverlay.js",
  "ui/overlays/HardcoreDeathRecapView.js",
];
const source = sourceFiles
  .map(relativePath => fs.readFileSync(path.join(ROOT, relativePath), "utf8"))
  .join("\n");
assert.doesNotMatch(source, /FAILED SUBSYSTEM|modern depth economy|LIFE STATE SAVE FAILED|TOGGLE FULLSCREEN/);
assert.match(source, /playerFacingCopy\.js/, "shared copy is wired into player-facing screens");

console.log("player-facing-copy-contract: PASS");
