import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canCaptureCanvas,
  selectSupportedMimeType,
} from "../systems/visual/ScreenRecordSystem.js";
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

const inputSource = fs.readFileSync(new URL("../world/playScene/PlayerInputHandler.js", import.meta.url), "utf8");
const globalInputSource = fs.readFileSync(new URL("../world/playScene/GameInputHandler.js", import.meta.url), "utf8");
const setupSource = fs.readFileSync(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const keybindSource = fs.readFileSync(new URL("../values/keybindActions.js", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../serve.py", import.meta.url), "utf8");

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
assert.match(serverSource, /if self\.path != "\/screenrecord"/);
assert.match(serverSource, /"systems", "screenrecord"/);

console.log("screen-record contract: ok");
