import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canCaptureCanvas,
  normalizeCaptureMode,
  selectSupportedMimeType,
} from "../systems/visual/ScreenRecordSystem.js";
import {
  isShortCaptureUiObject,
  ScreenRecordUiVisibility,
} from "../systems/visual/ScreenRecordUiVisibility.js";
import { SCREEN_RECORD_CONFIG } from "../values/screenRecordConfig.js";

const supportedRecorder = {
  isTypeSupported: type => type === "video/webm;codecs=vp8,opus",
};
assert.equal(
  selectSupportedMimeType(supportedRecorder, SCREEN_RECORD_CONFIG.preferredMimeTypes),
  "video/webm;codecs=vp8,opus",
);
assert.equal(selectSupportedMimeType(null, SCREEN_RECORD_CONFIG.preferredMimeTypes), "");
assert.equal(canCaptureCanvas({ captureStream() {} }, supportedRecorder), true);
assert.equal(canCaptureCanvas({}, supportedRecorder), false);
assert.equal(normalizeCaptureMode("SHORT"), "short");
assert.equal(normalizeCaptureMode(" portrait "), "short");
assert.equal(normalizeCaptureMode("2"), "broad");
assert.equal(normalizeCaptureMode("fullscreen"), "broad");
assert.equal(normalizeCaptureMode("square"), null);

function captureObject({ visible = true, depth = 998, scrollFactor = 0, keepVisible = false } = {}) {
  return {
    active: true,
    visible,
    depth,
    scrollFactorX: scrollFactor,
    scrollFactorY: scrollFactor,
    getData(key) {
      return key === SCREEN_RECORD_CONFIG.shortUi.keepVisibleDataKey && keepVisible;
    },
    setVisible(next) {
      this.visible = next;
      return this;
    },
  };
}

const hudObject = captureObject();
const environmentOverlay = captureObject({ depth: 60 });
const worldObject = captureObject({ depth: 1500, scrollFactor: 1 });
const retainedOverlay = captureObject({ keepVisible: true });
const lateHudObject = captureObject({ visible: false });
const uiVisibility = new ScreenRecordUiVisibility({
  children: { list: [hudObject, environmentOverlay, worldObject, retainedOverlay, lateHudObject] },
}, SCREEN_RECORD_CONFIG.shortUi);

assert.equal(isShortCaptureUiObject(hudObject, SCREEN_RECORD_CONFIG.shortUi), true);
assert.equal(isShortCaptureUiObject(environmentOverlay, SCREEN_RECORD_CONFIG.shortUi), false);
assert.equal(isShortCaptureUiObject(worldObject, SCREEN_RECORD_CONFIG.shortUi), false);
assert.equal(isShortCaptureUiObject(retainedOverlay, SCREEN_RECORD_CONFIG.shortUi), false);
uiVisibility.hide();
assert.equal(hudObject.visible, false);
assert.equal(environmentOverlay.visible, true);
assert.equal(worldObject.visible, true);
assert.equal(retainedOverlay.visible, true);
lateHudObject.visible = true;
uiVisibility.hide();
assert.equal(lateHudObject.visible, false);
uiVisibility.restore();
assert.equal(hudObject.visible, true);
assert.equal(lateHudObject.visible, true);

assert.equal(SCREEN_RECORD_CONFIG.modes.short.hideUi, true);
assert.equal(SCREEN_RECORD_CONFIG.modes.short.fit, "cover");
assert.equal(SCREEN_RECORD_CONFIG.modes.broad.requireFullscreen, true);
assert.equal(SCREEN_RECORD_CONFIG.modes.broad.captureSourceSize, true);

const inputSource = fs.readFileSync(new URL("../world/playScene/PlayerInputHandler.js", import.meta.url), "utf8");
const globalInputSource = fs.readFileSync(new URL("../world/playScene/GameInputHandler.js", import.meta.url), "utf8");
const setupSource = fs.readFileSync(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const keybindSource = fs.readFileSync(new URL("../values/keybindActions.js", import.meta.url), "utf8");
const gameConfigSource = fs.readFileSync(new URL("../values/gameConfig.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../main.js", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../serve.py", import.meta.url), "utf8");
const recordSource = fs.readFileSync(new URL("../systems/visual/ScreenRecordSystem.js", import.meta.url), "utf8");

assert.match(keybindSource, /id: "screenRecord"[\s\S]*defaultKey: "F9"/);
assert.match(
  keybindSource,
  /id: "fullscreen"[\s\S]*defaultKey: "F10"[\s\S]*rebindable: false/,
);
assert.match(inputSource, /addBoundKey\("screenRecord"\)/);
assert.match(globalInputSource, /justDown\(keys\.screenRecord\)/);
assert.match(globalInputSource, /screenRecordSystem\?\.toggle\(\)/);
assert.match(setupSource, /new ScreenRecordSystem\(this\)/);
assert.match(setupSource, /screenRecordSystem\?\.destroy\(\)/);
assert.match(gameConfigSource, /preserveDrawingBuffer: true/);
assert.match(
  mainSource,
  /preserveDrawingBuffer: GAME_CONFIG\.rendererQuality\.preserveDrawingBuffer/,
);
assert.match(recordSource, /uiNotifications\?\.\[kind\]/);
assert.doesNotMatch(recordSource, /notificationSystem\?\.\[kind\]/);
assert.match(recordSource, /__isGameFullscreen/);
assert.match(recordSource, /ScreenRecordUiVisibility/);
assert.match(recordSource, /renderEvents\.postRender/);
assert.match(serverSource, /if self\.path != "\/screenrecord"/);
assert.match(serverSource, /"systems", "screenrecord"/);

console.log("screen-record contract: ok");
