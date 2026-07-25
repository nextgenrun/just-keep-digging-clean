import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lab = path.join(root, "testing", "animation-sandbox", "ual-animation-tuning-lab-v2");
const required = [
  "index.html", "lab.css", "controls.css", "lab.js", "labConfig.js", "labAssets.js",
  "labScenarios.js", "labPlayback.js", "labRenderer.js", "labTelemetry.js", "labUi.js", "readme.md",
];

for (const file of required) {
  assert.equal((await stat(path.join(lab, file))).isFile(), true, `${file} must exist`);
}

const files = await readdir(lab);
assert.equal(files.some((file) => /\.(webp|png|jpg|jpeg)$/i.test(file)), false, "lab must not duplicate production images");

for (const file of files.filter((entry) => /\.(js|css|html|md)$/i.test(entry))) {
  const source = await readFile(path.join(lab, file), "utf8");
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} exceeds the 300-line module budget (${lines})`);
}

const index = await readFile(path.join(lab, "index.html"), "utf8");
for (const id of [
  "play", "restart", "step-back", "step-forward", "timeline", "speed", "stride",
  "cadence-mode", "cadence-min", "cadence-max", "start-trim", "stop-trim", "facing",
  "zoom", "guides", "collider", "rig", "contact", "onion", "library-action",
  "telemetry", "event-track", "export-draft", "draft-json",
  "run-enter", "run-exit", "landing-frames", "flight-hover", "flight-travel",
  "combo-gap", "contact-offset", "contact-scale", "body-width", "body-height",
]) {
  assert.match(index, new RegExp(`id=["']${id}["']`), `missing control #${id}`);
}

const config = await readFile(path.join(lab, "labConfig.js"), "utf8");
const valuesPath = path.join(root, "values", "ualAnimationTuningLab.js");
const valuesSource = await readFile(valuesPath, "utf8");
assert.ok(valuesSource.split(/\r?\n/).length <= 300, "ualAnimationTuningLab.js exceeds line budget");
for (const scenario of ["locomotion", "ladder", "air", "flight", "mining", "library"]) {
  assert.match(valuesSource, new RegExp(`scenario\\(["']${scenario}["']`), `missing ${scenario} scenario`);
}

const assetsSource = await readFile(path.join(lab, "labAssets.js"), "utf8");
const bootstrap = await readFile(path.join(lab, "lab.js"), "utf8");
assert.match(valuesSource, /ual-native-player-v1\/runtime\/manifest\.json/, "values SSOT must point at the production manifest");
assert.match(config, /UAL_ANIMATION_TUNING_LAB_CONFIG/, "sandbox must consume the lab values SSOT");
assert.match(assetsSource, /fetch\(LAB_PATHS\.manifest/, "must load the configured production manifest");
assert.match(assetsSource, /UAL_NATIVE_PLAYER_ASSET_PROFILE/, "must import the production profile");
assert.match(assetsSource, /\["walk", clip\("walk", "walk"/, "Option C must load from the promoted walk action");

const renderer = await readFile(path.join(lab, "labRenderer.js"), "utf8");
assert.match(renderer, /RIG MARKERS MISSING/, "missing marker evidence must be explicit on stage");
assert.match(renderer, /rig_markers/, "renderer must read production marker metadata");
assert.match(renderer, /buildAttackContactBox/, "contact volume must use production geometry");
assert.match(renderer, /buildTargetFaceBands/, "tile faces must use production geometry");
assert.match(renderer, /resolveTileFaceAlignmentOffset/, "mining preview must use production tile-face alignment");
assert.match(renderer, /alignment\.responsePerSecond/, "mining preview must use production alignment response timing");

const scenarios = await readFile(path.join(lab, "labScenarios.js"), "utf8");
assert.match(scenarios, /calculateStrideMatchedTimeScale/, "locomotion must use production cadence math");
assert.match(scenarios, /resolveUalActionTimeScale/, "actions must use production timing math");
assert.match(scenarios, /resolveUalFlightTimeScale/, "flight must use production timing math");
assert.match(scenarios, /state\.landingFrameCount/, "landing frame trim must be draft-tunable");
assert.match(scenarios, /state\.comboGapMs/, "combo recovery gap must be draft-tunable");
assert.match(renderer, /state\.contactFrameOffset/, "contact cue offset must be draft-tunable");
assert.match(renderer, /state\.contactScale/, "contact reach must be draft-tunable");
assert.match(bootstrap, /collisionDraft/, "export must retain collision/contact draft values");
assert.match(bootstrap, /runEnterSpeedPxPerSec/, "export must retain run-threshold draft values");
assert.match(valuesSource, /\["jab", "cross", "jab", "cross"\]/, "punch-only combo order drifted");
assert.match(valuesSource, /upComboClipIds/, "rejected UP source must be replaced in the lab");
assert.doesNotMatch(assetsSource, /\["kick", clip\(/, "rejected kick remained active in the lab");
assert.doesNotMatch(assetsSource, /\["dig-up", clip\(/, "rejected Sword UP motion remained active in the lab");

const manifestPath = path.join(root, "sprites", "character", "ual-native-player-v1", "runtime", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(Object.keys(manifest.actions).length, 23, "production action library count drifted");
assert.equal(Object.values(manifest.actions).reduce((total, action) => total + action.frame_count, 0), 987, "production frame total drifted");
assert.equal(manifest.actions["pickaxe-mining"].source_clip, "TreeChopping_Loop", "rejected mining review source drifted");
assert.equal(manifest.actions["pickaxe-mining"].frame_count, 29, "rejected mining review frame count drifted");
assert.equal(manifest.actions["punch-uppercut"].source_clip, "Melee_Hook", "promoted uppercut source drifted");
assert.equal(manifest.actions["punch-uppercut"].frame_count, 15, "promoted uppercut frame count drifted");
assert.equal(manifest.actions["melee-kick"].source_clip, "Authored_Grounded_Side_Kick_v1", "kick source drifted");
assert.equal(manifest.actions.walk.source_clip, "Jog_Fwd_Loop", "promoted Option C source clip drifted");
assert.equal(manifest.actions.walk.frame_count, 28, "promoted Option C frame count drifted");
assert.equal(Object.keys(manifest.actions.walk.rig_markers?.frames || {}).length, 28, "walk marker coverage must include all 28 frames");
const markerCount = (action) => Object.keys(action.rig_markers?.frames || {}).length;
assert.equal(markerCount(manifest.actions["melee-kick"]), 26, "kick marker coverage must include all 26 frames");
const missingMarkers = Object.values(manifest.actions).filter((action) => markerCount(action) === 0).length;
const partialMarkers = Object.values(manifest.actions).filter((action) => {
  const count = markerCount(action);
  return count > 0 && count < action.frame_count;
}).length;
assert.ok(missingMarkers > 0, "contract expects honest missing-marker coverage to be surfaced");
assert.ok(partialMarkers > 0, "contract expects partial marker coverage to be surfaced");
assert.match(renderer, /markerCoverage === "partial"/, "renderer must distinguish partial marker coverage");

const sha = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const productionWalk = path.join(root, "sprites", "character", "ual-native-player-v1", "runtime", "ual-native-player-v1-walk-sheet.webp");
const reviewJog = path.join(root, "testing", "animation-sandbox", "ual-walk-review-v1", "assets", "ual-native-player-v1-walk-review-jog-sheet.webp");
assert.equal(await sha(productionWalk), await sha(reviewJog), "promoted walk is no longer identical to reviewed Option C");

console.log(`UAL animation tuning lab v2 contract passed (${required.length} files, 6 scenarios, ${missingMarkers} missing and ${partialMarkers} partial marker actions).`);
