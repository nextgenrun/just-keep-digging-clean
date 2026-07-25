import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createInitialState, LAB_CONTROL_BOUNDS } from "./animation-sandbox/ual-animation-tuning-lab-v2/labConfig.js";
import { LabEditorModel } from "./animation-sandbox/ual-animation-tuning-lab-v2/labEditorModel.js";
import {
  createEditorPatch,
  resolveContact,
  resolveMarker,
  resolvePose,
  hasMarkerOverrides,
  setScopedField,
} from "./animation-sandbox/ual-animation-tuning-lab-v2/labEditorPatch.js";
import {
  parseEditorPatch,
  serializeEditorPatch,
} from "./animation-sandbox/ual-animation-tuning-lab-v2/labEditorPatchIo.js";
import {
  adjacentFrameTime,
  buildFrameHolds,
  frameDurationSeconds,
  frameIndexAtUnits,
  weightedFrameSnapshot,
} from "./animation-sandbox/ual-animation-tuning-lab-v2/labFrameTiming.js";
import { inverseScreenDelta } from "./animation-sandbox/ual-animation-tuning-lab-v2/labStageGeometry.js";
import { hitBox } from "./animation-sandbox/ual-animation-tuning-lab-v2/labDirectManipulation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lab = path.join(root, "testing", "animation-sandbox", "ual-animation-tuning-lab-v2");
const manifest = JSON.parse(await readFile(path.join(
  root,
  "sprites",
  "character",
  "ual-native-player-v1",
  "runtime",
  "manifest.json",
), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const near = (actual, expected, epsilon = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`);
};

function freshEditor() {
  const state = createInitialState();
  const model = new LabEditorModel(state);
  return { state, model };
}

// Reused source frames remain independently editable by clip sequence occurrence.
{
  const patch = createEditorPatch({ widthPx: 31, heightPx: 75, offsetXPx: 0, offsetYPx: 0 });
  const first = { actionId: "walk", clipId: "reverse-test", sequenceIndex: 0, sourceFrame: 0 };
  const recovery = { ...first, sequenceIndex: 2 };
  setScopedField(patch, "poses", first, "frame", "hold", 3);
  setScopedField(patch, "poses", recovery, "frame", "hold", 5);
  assert.equal(resolvePose(patch, first).hold, 3);
  assert.equal(resolvePose(patch, recovery).hold, 5);
  assert.deepEqual(buildFrameHolds({ actionId: "walk", id: "reverse-test", animationKey: "reverse", frames: [0, 1, 0] }, patch), [3, 1, 5]);
}

// Scope preview, body reset, center-handle priority, and bounded range copy are safety contracts.
{
  const { state, model } = freshEditor();
  model.setContext({ actionId: "walk", clipId: "walk", sequenceIndex: 0, sourceFrame: 0 });
  state.editorScope = "action"; model.setScoped("poses", "offsetXPx", 4);
  state.editorScope = "frame"; model.setScoped("poses", "offsetXPx", 10);
  state.editorScope = "action"; assert.equal(model.resolved().pose.offsetXPx, 4);
  state.editorScope = "frame"; assert.equal(model.resolved().pose.offsetXPx, 10);
  state.editorTool = "body"; model.updateBody({ offsetXPx: 12 }); model.resetScope();
  assert.equal(state.editorDraft.body.offsetXPx, 0);
  assert.equal(hitBox({ x: 15.5, y: 37.5 }, { x: 0, y: 0, width: 31, height: 75 }), "move");
  model.copyToRange(-100, 99999, [0, 1, 2], new Set([0, 1, 2]));
  assert.equal(Object.keys(state.editorDraft.poses.frames).length, 3);
  assert.equal(hasMarkerOverrides(state.editorDraft), true);
  assert.doesNotThrow(() => parseEditorPatch(JSON.stringify(serializeEditorPatch(state.editorDraft)), manifest));
}

// Action defaults must be inherited, while a current-frame record wins only on that frame.
{
  const patch = createEditorPatch({ widthPx: 31, heightPx: 75, offsetXPx: 0, offsetYPx: 0 });
  const frameThree = { actionId: "walk", sourceFrame: 3 };
  setScopedField(patch, "poses", frameThree, "action", "offsetXPx", 4);
  setScopedField(patch, "poses", frameThree, "frame", "offsetXPx", 9);
  setScopedField(patch, "contacts", frameThree, "action", "widthScale", 1.25);
  setScopedField(patch, "contacts", frameThree, "frame", "widthScale", 1.75);
  setScopedField(patch, "markers", frameThree, "action", "offsetXPx", 6, "hand_r");
  setScopedField(patch, "markers", frameThree, "frame", "offsetXPx", 11, "hand_r");

  assert.equal(resolvePose(patch, "walk", 3).offsetXPx, 9, "frame pose must override action pose");
  assert.equal(resolvePose(patch, "walk", 4).offsetXPx, 4, "action pose must flow to other frames");
  assert.equal(resolveContact(patch, "walk", 3).widthScale, 1.75, "frame contact must override action contact");
  assert.equal(resolveContact(patch, "walk", 4).widthScale, 1.25, "action contact must flow to other frames");
  assert.equal(resolveMarker(patch, "walk", 3, "hand_r").offsetXPx, 11, "frame marker must override action marker");
  assert.equal(resolveMarker(patch, "walk", 4, "hand_r").offsetXPx, 6, "action marker must flow to other frames");
}

// Body edits update both the patch and the legacy live fields used by the stage/runtime preview.
{
  const { state, model } = freshEditor();
  model.updateBody({ widthPx: 38, heightPx: 72, offsetXPx: 3.5, offsetYPx: -2 });
  assert.deepEqual(state.editorDraft.body, {
    widthPx: 38,
    heightPx: 72,
    offsetXPx: 3.5,
    offsetYPx: -2,
  });
  assert.equal(state.bodyWidthPx, 38);
  assert.equal(state.bodyHeightPx, 72);
  assert.equal(state.bodyOffsetXPx, 3.5);
  assert.equal(state.bodyOffsetYPx, -2);
  model.setBody("widthPx", LAB_CONTROL_BOUNDS.bodyWidth.maximum + 100);
  assert.equal(state.editorDraft.body.widthPx, LAB_CONTROL_BOUNDS.bodyWidth.maximum, "body mutation must clamp to SSOT bounds");
}

// A continuous drag is one transaction regardless of the number of live pointer samples.
{
  const { state, model } = freshEditor();
  const original = state.editorDraft.body.offsetXPx;
  model.beginTransaction("Drag body");
  model.updateBody({ offsetXPx: 1 }, true);
  model.updateBody({ offsetXPx: 5 }, true);
  model.updateBody({ offsetXPx: 12 }, true);
  assert.equal(model.commitTransaction(), true);
  assert.equal(state.editorDraft.body.offsetXPx, 12);
  assert.equal(model.undo(), true);
  assert.equal(state.editorDraft.body.offsetXPx, original, "one undo must revert the complete drag");
  assert.equal(model.undo(), false, "coalesced drag must create exactly one undo entry");
  assert.equal(model.redo(), true);
  assert.equal(state.editorDraft.body.offsetXPx, 12, "redo must restore the complete drag");
}

// Logical hand edits retain immutable production/raster truth flags.
{
  const { state, model } = freshEditor();
  model.setContext("walk", 3);
  state.editorScope = "frame";
  model.setScoped("markers", "offsetXPx", 8, "hand_r");
  assert.equal(state.editorDraft.requiresSourceRigRerender, true);
  assert.equal(state.editorDraft.productionChanged, false);
  assert.equal(state.editorDraft.visualHandPixelsChanged, false);
}

// Import accepts a patch or full export wrapper, clones it, and rejects invalid input before model replacement.
{
  const body = { widthPx: 31, heightPx: 75, offsetXPx: 0, offsetYPx: 0 };
  const patch = createEditorPatch(body);
  setScopedField(patch, "poses", { actionId: "walk", sourceFrame: 2 }, "frame", "hold", 2.5);
  const exported = serializeEditorPatch(patch);
  const parsed = parseEditorPatch(JSON.stringify({ editorPatch: exported }), manifest);
  assert.deepEqual(parsed, exported, "full export wrapper must round-trip its editor patch");
  assert.notEqual(parsed, exported, "validated import must be a defensive clone");

  const { state, model } = freshEditor();
  model.replacePatch(parsed);
  const acceptedSnapshot = JSON.stringify(state.editorDraft);
  const invalid = clone(exported);
  invalid.body.widthPx = LAB_CONTROL_BOUNDS.bodyWidth.maximum + 1;
  assert.throws(
    () => parseEditorPatch(JSON.stringify(invalid), manifest),
    /outside/,
    "out-of-bounds import must be rejected",
  );
  assert.equal(JSON.stringify(state.editorDraft), acceptedSnapshot, "failed validation must leave the active patch unchanged");

  const productionClaim = clone(exported);
  productionClaim.productionChanged = true;
  assert.throws(() => parseEditorPatch(JSON.stringify(productionClaim), manifest), /productionChanged false/);
  const rasterClaim = clone(exported);
  rasterClaim.visualHandPixelsChanged = true;
  assert.throws(() => parseEditorPatch(JSON.stringify(rasterClaim), manifest), /cannot claim raster changes/);
  const markerTruth = createEditorPatch(body);
  setScopedField(markerTruth, "markers", { actionId: "walk", sourceFrame: 0 }, "frame", "offsetXPx", 2, "hand_r");
  markerTruth.requiresSourceRigRerender = false;
  assert.equal(parseEditorPatch(JSON.stringify(markerTruth), manifest).requiresSourceRigRerender, true);
  const missingMarker = createEditorPatch(body);
  setScopedField(missingMarker, "markers", { actionId: "idle", sourceFrame: 0 }, "frame", "offsetXPx", 2, "hand_r");
  assert.throws(() => parseEditorPatch(JSON.stringify(missingMarker), manifest), /no production source/);
}

// Screen-space hand dragging maps back to packed-frame pixels and mirrors only X when flipX is active.
{
  const action = { frame_width: 256, frame_height: 256 };
  const geometry = { rotation: 0, scaleX: 1, scaleY: 1, flipX: false, displaySize: 128 };
  assert.deepEqual(inverseScreenDelta({ x: 10, y: 5 }, geometry, action), { x: 20, y: 10 });
  assert.deepEqual(inverseScreenDelta({ x: 10, y: 5 }, { ...geometry, flipX: true }, action), { x: -20, y: 10 });
}

// Frame holds obey the same precedence and weighted stepping lands on exact adjacent frame boundaries.
{
  const patch = createEditorPatch({ widthPx: 31, heightPx: 75, offsetXPx: 0, offsetYPx: 0 });
  setScopedField(patch, "poses", { actionId: "walk", sourceFrame: 0 }, "action", "hold", 2);
  setScopedField(patch, "poses", { actionId: "walk", sourceFrame: 1 }, "frame", "hold", 4);
  assert.deepEqual(buildFrameHolds({ actionId: "walk", frames: [0, 1, 2] }, patch), [2, 4, 2]);

  const holds = [1, 3, 1];
  near(frameDurationSeconds(holds, 1), 5 / 30);
  assert.equal(frameIndexAtUnits(holds, 0.99, false), 0);
  assert.equal(frameIndexAtUnits(holds, 1, false), 1);
  assert.equal(frameIndexAtUnits(holds, 3.99, false), 1);
  assert.equal(frameIndexAtUnits(holds, 4, false), 2);
  const segment = {
    start: 0,
    end: 5 / 30,
    frameHolds: holds,
    timeScale: 1,
    loop: false,
    clip: { frames: [10, 11, 12] },
  };
  const timeline = { segments: [segment], duration: segment.end };
  const second = adjacentFrameTime(timeline, 0.00001, 1);
  const third = adjacentFrameTime(timeline, second, 1);
  near(second, 1 / 30 + 0.00001);
  near(third, 4 / 30 + 0.00001);
  assert.equal(weightedFrameSnapshot(segment, second).sourceFrame, 11);
  assert.equal(weightedFrameSnapshot(segment, third).sourceFrame, 12);
  assert.equal(weightedFrameSnapshot(segment, adjacentFrameTime(timeline, third, -1)).sourceFrame, 11);
}

const requiredModules = [
  "editor.css",
  "labDirectManipulation.js",
  "labEditorModel.js",
  "labEditorOverlay.js",
  "labEditorPatch.js",
  "labEditorPatchIo.js",
  "labEditorUi.js",
  "labFrameTiming.js",
  "labStageGeometry.js",
];
for (const file of requiredModules) {
  assert.equal((await stat(path.join(lab, file))).isFile(), true, `${file} must exist`);
}

const labFiles = await readdir(lab);
for (const file of labFiles.filter((entry) => /\.(js|css|html|md)$/i.test(entry))) {
  const source = await readFile(path.join(lab, file), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 300, `${file} exceeds the 300-line module budget`);
}
const selfSource = await readFile(fileURLToPath(import.meta.url), "utf8");
assert.ok(selfSource.split(/\r?\n/).length <= 300, "editor v3 contract exceeds the 300-line budget");

const index = await readFile(path.join(lab, "index.html"), "utf8");
for (const id of [
  "tool-body", "tool-contact", "tool-hand", "tool-pose", "editor-scope", "hand-marker",
  "body-width", "body-height", "body-offset-x", "body-offset-y",
  "contact-forward", "contact-normal", "contact-width-scale", "contact-height-scale", "contact-marker",
  "hand-offset-x", "hand-offset-y", "pose-offset-x", "pose-offset-y", "pose-rotation",
  "pose-scale-x", "pose-scale-y", "frame-hold", "range-start", "range-end", "apply-range",
  "snap-enabled", "production-ghost", "bypass-edits", "undo-edit", "redo-edit",
  "copy-override", "paste-override", "clear-override", "reset-action",
  "import-json", "apply-import", "import-error",
]) {
  assert.match(index, new RegExp(`id=["']${id}["']`), `missing editor control #${id}`);
}
assert.match(index, /id=["']stage["'][^>]*tabindex=["']0["']/, "interactive stage must be keyboard focusable");

const directSource = await readFile(path.join(lab, "labDirectManipulation.js"), "utf8");
for (const token of ["pointerdown", "pointermove", "pointerup", "pointercancel", "setPointerCapture", "getBoundingClientRect", "inverseScreenDelta"]) {
  assert.match(directSource, new RegExp(token), `direct manipulation must include ${token}`);
}
assert.match(directSource, /if \(this\.state\.bypassEdits\) return/, "bypass must reject direct edits");
const editorUiSource = await readFile(path.join(lab, "labEditorUi.js"), "utf8");
assert.ok(
  editorUiSource.indexOf("parseEditorPatch") < editorUiSource.indexOf("replacePatch(patch)"),
  "editor import must validate before replacing the active patch",
);
assert.match(editorUiSource, /this\.state\.playing = false/, "numeric edits must pause playback");
assert.match(editorUiSource, /if \(!editingField\) this\.model\.setContext/, "numeric transaction context must stay locked");
const playbackSource = await readFile(path.join(lab, "labPlayback.js"), "utf8");
assert.match(playbackSource, /adjacentFrameTime/, "frame stepping must consume weighted frame boundaries");
const scenariosSource = await readFile(path.join(lab, "labScenarios.js"), "utf8");
assert.match(scenariosSource, /buildFrameHolds/, "timelines must build per-frame holds from the editor patch");
assert.match(scenariosSource, /weightedFrameSnapshot/, "timeline playback must resolve weighted frames");
assert.match(scenariosSource, /options\.holdSeconds \?\? naturalDuration/, "zero combo gap must remain zero");

const bootstrap = await readFile(path.join(lab, "lab.js"), "utf8");
for (const truth of [
  /productionChanged:\s*false/,
  /productionRasterChanged:\s*false/,
  /visualHandPixelsChanged:\s*false/,
  /logicalMarkerEditsMoveRasterPixels:\s*false/,
]) {
  assert.match(bootstrap, truth, `export truth flag missing: ${truth}`);
}

console.log(`UAL animation editor v3 contract passed (${requiredModules.length} editor modules, behavioral patch/history/import/flip/timing coverage).`);
