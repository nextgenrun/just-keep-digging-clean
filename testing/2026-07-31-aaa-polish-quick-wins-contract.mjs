import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PlayerContactShadowSystem } from "../systems/visual/PlayerContactShadowSystem.js";
import { AUDIO_CONFIG } from "../values/audioConfig.js";
import { CAVE_LEVEL_CONFIG } from "../values/caveLevelConfig.js";
import { CAVE_SCENE_CONFIG } from "../values/caveSceneConfig.js";
import { LEVEL_CONFIG } from "../values/levelConfig.js";
import {
  PLAYER_CONTACT_SHADOW_CONFIG,
  resolvePlayerContactShadowEnabled,
} from "../values/playerContactShadow.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  getTileDestructionFxPreloadAssets,
  resolveTileDestructionFxEnabled,
} from "../values/tileDestructionFx.js";
import { UI_FONT_BOOT, UI_FONTS, waitForUiFonts } from "../values/uiLayout.js";
import { dispatchCaveMineFeedback } from "../world/playScene/caveMineFeedback.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");

// Dedicated reviewed UI audio assets and runtime routing.
for (const fileName of ["ui-select.wav", "ui-confirm.wav"]) {
  const path = resolve(root, "sound/soundEffects/ui", fileName);
  assert.equal(existsSync(path), true, `${fileName} missing`);
  assert.ok(statSync(path).size > 300_000, `${fileName} is unexpectedly small`);
  const bytes = readFileSync(path);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WAVE");
}
assert.equal(AUDIO_CONFIG.uiSelectMinIntervalMs, 70);
assert.ok(AUDIO_CONFIG.uiSelectVolumeMultiplier < AUDIO_CONFIG.uiConfirmVolumeMultiplier);
const bootSource = read("ui/scenes/BootScene.js");
assert.match(bootSource, /ASSET_KEYS\.audio\.sfx\.uiSelect, uiBasePath \+ 'ui-select\.wav'/);
assert.match(bootSource, /ASSET_KEYS\.audio\.sfx\.uiConfirm, uiBasePath \+ 'ui-confirm\.wav'/);
const soundSource = read("sound/SoundSystem.js");
const uiSelectMethod = soundSource.slice(
  soundSource.indexOf("playUiSelect()"),
  soundSource.indexOf("playUiConfirm()"),
);
assert.match(uiSelectMethod, /ASSET_KEYS\.audio\.sfx\.uiSelect/);
assert.doesNotMatch(uiSelectMethod, /footstep|digStep|tileHit/);

// Bundled deterministic font family and pre-game readiness gate.
for (const [fileName, minimumBytes] of [
  ["BarlowSemiCondensed-Regular.ttf", 100_000],
  ["BarlowSemiCondensed-SemiBold.ttf", 100_000],
  ["BarlowSemiCondensed-Bold.ttf", 100_000],
]) {
  const path = resolve(root, "assets/fonts/barlow-semi-condensed", fileName);
  assert.equal(existsSync(path), true, `${fileName} missing`);
  assert.ok(statSync(path).size > minimumBytes);
}
assert.match(read("assets/fonts/barlow-semi-condensed/OFL.txt"), /SIL OPEN FONT LICENSE Version 1\.1/);
const cssSource = read("css/style.css");
assert.equal((cssSource.match(/font-family:\s*"Barlow Semi Condensed"/g) || []).length >= 3, true);
assert.match(UI_FONTS.display, /Barlow Semi Condensed/);
assert.equal(UI_FONT_BOOT.boldWeight, 700);
const requestedFonts = [];
assert.equal(await waitForUiFonts({
  fonts: { load: descriptor => { requestedFonts.push(descriptor); return Promise.resolve([]); } },
}), true);
assert.deepEqual(requestedFonts.map(value => value.split(" ")[0]), ["400", "600", "700"]);
const mainSource = read("main.js");
assert.ok(mainSource.indexOf("await waitForUiFonts(document)") < mainSource.indexOf("new Phaser.Game"));

// Cave mode now shares mine weight, shake gating, audio identity, and approved HUD art.
assert.equal(CAVE_SCENE_CONFIG.feedback.mineShakeScale, 0.82);
assert.equal(CAVE_LEVEL_CONFIG.presentation.hudTextDepth, 1001);
assert.equal(CAVE_LEVEL_CONFIG.presentation.gpHud.frameWidthPx, 171);
const shakes = [];
const breaks = [];
const hits = [];
const caveScene = {
  game: { loop: { actualFps: 60 } },
  shakeSystem: { shake: (...args) => shakes.push(args) },
};
const originScene = { soundSystem: {
  playTileBreak: options => breaks.push(options),
  playTileHit: options => hits.push(options),
} };
assert.equal(dispatchCaveMineFeedback(caveScene, originScene, {
  success: true,
  destroyed: true,
  tileType: TILE_TYPES.GOLD,
}), true);
assert.equal(shakes.length, 1);
assert.equal(breaks.length, 1);
assert.ok(breaks[0].rate > 1);
caveScene.game.loop.actualFps = 20;
dispatchCaveMineFeedback(caveScene, originScene, {
  success: true,
  destroyed: false,
  tileType: TILE_TYPES.DIRT,
});
assert.equal(shakes.length, 1, "low-FPS cave hit should not shake");
assert.equal(hits.length, 1);
const cavePresentation = read("systems/visual/CaveLevelPresentationSystem.js");
assert.match(cavePresentation, /hasApprovedHudSkin/);
assert.match(cavePresentation, /ASSET_KEYS\.ui\.approvedHud\.buffChip/);

// Final tile destruction is a compact animated library pack, not earthquake art.
const destructionAssets = getTileDestructionFxPreloadAssets();
for (const asset of destructionAssets) {
  assert.equal(existsSync(resolve(root, asset.path)), true, `${asset.path} missing`);
}
assert.ok(TILE_DESTRUCTION_FX_CONFIG.core.displayWidthTiles <= 1.1);
assert.equal(TILE_DESTRUCTION_FX_CONFIG.core.phases.length, 4);
assert.equal(TILE_DESTRUCTION_FX_CONFIG.shards.count, 5);
assert.ok(
  TILE_DESTRUCTION_FX_CONFIG.shards.cameraScale
    > TILE_DESTRUCTION_FX_CONFIG.shards.midScale,
);
assert.equal(resolveTileDestructionFxEnabled("?authoredMineImpact=0"), false);
assert.equal(resolveTileDestructionFxEnabled(""), true);
const gameplaySource = read("world/playScene/PlaySceneGameplay.js");
const destroyMethod = gameplaySource.slice(
  gameplaySource.indexOf("prototype._applyDestroyParticles"),
  gameplaySource.indexOf("prototype._applyGlintBurst"),
);
assert.match(destroyMethod, /tileDestructionFxSystem\?\.play/);
assert.doesNotMatch(destroyMethod, /EARTHQUAKE_FEEDBACK_CONFIG/);
assert.doesNotMatch(destroyMethod, /fillCircle|this\.add\.graphics/);
const destructionSystem = read("systems/visual/TileDestructionFxSystem.js");
assert.match(destructionSystem, /setFlipX\?\.\(facing\.x > 0\)/);
assert.match(destructionSystem, /cameraScale/);
const tileRefreshMethod = gameplaySource.slice(
  gameplaySource.indexOf("prototype.playMineImpactFx"),
  gameplaySource.indexOf("prototype.applyMineFeedback"),
);
assert.doesNotMatch(tileRefreshMethod, /_applyDestroyParticles/);
assert.doesNotMatch(read("world/playScene/PlaySceneSetup.js"), /_gamefeel_particle/);

// Contact shadow fades in only when planted, stretches with travel, and tears down cleanly.
function createEllipse() {
  return {
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
    destroy() { this.active = false; },
  };
}
let grounded = true;
const ellipses = [];
const shadowPlayer = {
  x: 50,
  y: 80,
  visible: true,
  alpha: 1,
  body: { enable: true, center: { x: 54 }, bottom: 101, velocity: { x: 280 } },
};
const shadowSystem = new PlayerContactShadowSystem(
  { add: { ellipse: () => { const value = createEllipse(); ellipses.push(value); return value; } } },
  shadowPlayer,
  { isGrounded: () => grounded },
);
assert.equal(shadowSystem.create(), true);
shadowSystem.update(16.67);
assert.equal(ellipses.length, 2);
assert.equal(ellipses.every(ellipse => ellipse.visible && ellipse.alpha > 0), true);
assert.ok(ellipses[0].scaleX > 1);
assert.equal(ellipses[0].y, 101 + PLAYER_CONTACT_SHADOW_CONFIG.groundedOffsetYPx);
grounded = false;
for (let index = 0; index < 40; index += 1) shadowSystem.update(16.67);
assert.equal(ellipses.every(ellipse => !ellipse.visible && ellipse.alpha === 0), true);
shadowSystem.destroy();
assert.equal(ellipses.every(ellipse => !ellipse.active), true);

// Prominent UI placeholders now route to authored icons or deterministic text.
assert.equal(resolvePlayerContactShadowEnabled("?contactShadow=0"), false);
assert.equal(resolvePlayerContactShadowEnabled(""), true);
assert.equal(LEVEL_CONFIG.CHOICE_REWARDS.miningPower.icon, "pickaxe");
const startMenuSource = read("ui/scenes/StartMenuScene.js");
assert.match(startMenuSource, /createUiIcon\(this, 'play'/);
assert.match(startMenuSource, /createUiIcon\(this, 'save'/);
assert.doesNotMatch(startMenuSource, /▶  CONTINUE|＋|\+  NEW SAVE/);
assert.match(startMenuSource, /const targetAlpha = object\.alpha/);
const targetedUiSource = [
  read("values/hudLayout.js"),
  read("systems/visual/HUDSystem.js"),
  read("systems/environment/CampfireSystem.js"),
  read("ui/overlays/SleepingJackpotModalOverlay.js"),
].join("\n");
assert.doesNotMatch(targetedUiSource, /[🔥💪💥⛏🍀]/u);

console.log("AAA_POLISH_QUICK_WINS_CONTRACT_OK", {
  uiAudioAssets: 2,
  bundledFontWeights: requestedFonts.length,
  caveShakeSignature: shakes[0][0],
  authoredImpactKey: destructionAssets[0].key,
  contactShadowLayers: ellipses.length,
});
