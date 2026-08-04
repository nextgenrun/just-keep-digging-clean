import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  inventorySource,
  setupSource,
  controllerSource,
  keybindSource,
  pillarSource,
  pillarVisualSource,
  introductionSource,
] = await Promise.all([
  "../ui/overlays/UIInventoryPopup.js",
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/CelestialEngineController.js",
  "../values/keybindActions.js",
  "../systems/visual/StarPillarSystem.js",
  "../values/pillarVisuals.js",
  "../values/systemIntroduction.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));

assert.match(
  inventorySource,
  /renderInventoryStarAtlas/,
  "the manual I-menu Star Atlas remains available after legacy popup retirement",
);
assert.doesNotMatch(setupSource, /STAR HEART FORGED|constellation mastered/);
assert.doesNotMatch(controllerSource, /keys\?\.celestialEngine|keys\.celestialEngine/);
assert.doesNotMatch(keybindSource, /id:\s*["']celestialEngine["']/);
assert.match(pillarSource, /syncTalentProgress/);
assert.doesNotMatch(pillarSource, /onConstellationUnlocked\(/);
assert.match(pillarVisualSource, /promptText:\s*["']Open Celestial Talents["']/);
assert.match(introductionSource, /constellations:\s*["']talentRun["']/);

console.log(
  "PASS celestial retirement: manual Star Atlas retained, no legacy popups/X key, talent-driven Pillar",
);
