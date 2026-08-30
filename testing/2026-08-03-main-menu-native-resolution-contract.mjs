import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  MAIN_MENU_PRESENTATION,
  resolveMainMenuArtEnabled,
} from "../values/mainMenuPresentation.js";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readPng(path) {
  const bytes = fs.readFileSync(new URL(`../${path}`, import.meta.url));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    bytes,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

const manifest = JSON.parse(fs.readFileSync(
  new URL("../sprites/UI/main-menu-v1/manifest-v1.json", import.meta.url),
  "utf8",
));
const { button } = MAIN_MENU_PRESENTATION;

assert.equal(resolveMainMenuArtEnabled(""), true);
assert.equal(resolveMainMenuArtEnabled("?mainMenuArt=1"), true);
assert.equal(resolveMainMenuArtEnabled("?mainMenuArt=0"), false);
assert.equal(button.widthPx, manifest.displayContract.widthPx);
assert.equal(button.heightPx, manifest.displayContract.heightPx);
assert.ok(manifest.displayContract.sourceDensityAtUltra >= 4);
assert.equal(manifest.displayContract.centerExtensionOnly, true);

for (const [state, path] of [["idle", button.idlePath], ["selected", button.selectedPath]]) {
  const png = readPng(path);
  assert.equal(png.width, manifest.assets[state].width);
  assert.equal(png.height, manifest.assets[state].height);
  assert.equal(png.width / png.height, 5);
  assert.equal(png.bitDepth, 8);
  assert.equal(png.colorType, 6, `${state} must remain true RGBA`);
  assert.equal(sha256(png.bytes), manifest.assets[state].sha256);
  assert.deepEqual(manifest.assets[state].cornerAlpha, [0, 0, 0, 0]);
}

const sceneSource = fs.readFileSync(
  new URL("../ui/scenes/MainMenuScene.js", import.meta.url),
  "utf8",
);
assert.match(sceneSource, /resolveMainMenuArtEnabled/);
assert.match(sceneSource, /this\.load\.image\(button\.idleKey, button\.idlePath\)/);
assert.match(sceneSource, /this\.add\.image\(x, y, button\.idleKey\)/);
assert.match(sceneSource, /this\.add\.image\(x, y, button\.selectedKey\)/);
assert.match(sceneSource, /this\._buildGraphicsButtonLayers\(x, y\)/);
assert.match(sceneSource, /setDisplaySize\(BTN_W, BTN_H\)/);
assert.doesNotMatch(sceneSource, /targets:\s*\[hoverLayer,\s*text\]/);
assert.doesNotMatch(sceneSource, /scaleX:\s*0\.97/);
assert.doesNotMatch(sceneSource, /scaleY:\s*0\.97/);
assert.match(sceneSource, /targets:\s*hoverLayer,\s*\n\s*alpha:\s*0\.82/);

const gameConfigSource = fs.readFileSync(
  new URL("../values/gameConfig.js", import.meta.url),
  "utf8",
);
assert.match(gameConfigSource, /defaultDensityPreset:\s*"high"/);
assert.match(gameConfigSource, /high:\s*1\.5/);
assert.match(gameConfigSource, /ultra:\s*2/);

console.log("main-menu native-resolution contract: PASS");
