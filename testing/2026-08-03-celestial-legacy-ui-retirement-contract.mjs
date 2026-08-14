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
  portsSource,
  pauseSource,
  bootSource,
  runtimeGroupSource,
] = await Promise.all([
  "../ui/overlays/UIInventoryPopup.js",
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/CelestialEngineController.js",
  "../values/keybindActions.js",
  "../systems/visual/StarPillarSystem.js",
  "../values/pillarVisuals.js",
  "../values/systemIntroduction.js",
  "../ui/scenes/PlayScenePorts.js",
  "../world/playScene/PlaySceneUI.js",
  "../ui/scenes/BootScene.js",
  "../world/rendering/runtimeFeatureAssetGroups.js",
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
for (const source of [portsSource, pauseSource, pillarSource, bootSource, runtimeGroupSource]) {
  assert.doesNotMatch(
    source,
    /StarlightTalentTreeView|starlight-mockup-foundation-v4/,
    "production routes must not import or preload the retired Starlight carousel",
  );
}
assert.match(portsSource, /CelestialTalentTreeView/);
assert.match(pillarSource, /createCelestialTalentTreeView/);
assert.match(pauseSource, /createCelestialTalentTreeView/);
assert.match(runtimeGroupSource, /CELESTIAL_TALENT_TREE_PRELOAD_ASSETS/);
assert.doesNotMatch(pillarSource, /StarTalentRevealState|starlightTalentTree\.js/);

console.log(
  "PASS celestial retirement: no legacy carousel/runtime preload; Celestial tree owns Pillar and ESC",
);
