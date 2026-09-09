import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AUDIO_MIX_REVIEW } from "../values/audioMixReview.js";
import { AUDIO_MIX_REVIEW_FLOW } from "../values/audioMixReviewFlow.js";
import { AudioReviewDecisionStore } from "./animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewDecisionStore.js";
import {
  createAudioReviewFlowSnapshot,
  findAudioReviewCategory,
  getAudioReviewItemKind,
} from "./animation-sandbox/2026-08-31-audio-mix-review-v1/audioReviewFlowState.js";
import {
  estimateAudioMixReviewPeak,
  estimateAudioMixReviewTransitionPeak,
  getAudioMixReviewPreloadAssets,
  resolveAudioMixReviewSourceId,
} from "./animation-sandbox/2026-08-31-audio-mix-review-v1/audioMixReviewMath.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

const rootUrl = new URL("../", import.meta.url);
const toPath = relativePath => fileURLToPath(
  new URL(relativePath.replace(/\?.*$/, ""), rootUrl),
);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

assert.equal(AUDIO_MIX_REVIEW.reviewOnly, true);
assert.equal(AUDIO_MIX_REVIEW.runtimeEligible, false);
assert.equal(AUDIO_MIX_REVIEW.policy.productionImportsAllowed, false);
assert.equal(AUDIO_MIX_REVIEW.policy.automaticVoice, false);
assert.equal(AUDIO_MIX_REVIEW.policy.interruptVoice, false);
assert.equal(AUDIO_MIX_REVIEW.policy.rawRedistributionAllowed, false);
assert.equal(
  AUDIO_MIX_REVIEW.thresholds.warning,
  HARDCORE_MODE_CONFIG.stress.warningThreshold,
);
assert.equal(
  AUDIO_MIX_REVIEW.thresholds.critical,
  HARDCORE_MODE_CONFIG.stress.criticalThreshold,
);
assert.equal(
  AUDIO_MIX_REVIEW.thresholds.noticeCooldownMs,
  HARDCORE_MODE_CONFIG.stress.thresholdNoticeCooldownMs,
);

const preloadAssets = getAudioMixReviewPreloadAssets(AUDIO_MIX_REVIEW);
assert.equal(preloadAssets.length, Object.keys(AUDIO_MIX_REVIEW.sources).length);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, preloadAssets.length);
for (const asset of preloadAssets) {
  assert.ok(existsSync(toPath(asset.path)), `missing audio preview: ${asset.path}`);
}

for (const [scenarioId, scenario] of Object.entries(AUDIO_MIX_REVIEW.scenarios)) {
  assert.ok(
    scenario.loops.length <= AUDIO_MIX_REVIEW.output.maxConcurrentLoops,
    `${scenarioId} exceeds the loop-bed limit`,
  );
  for (const entry of [...scenario.loops, ...scenario.oneShots]) {
    assert.ok(entry.volume > 0 && entry.volume <= 1, `${scenarioId} has invalid gain`);
    const sourceId = resolveAudioMixReviewSourceId(
      entry.sourceId,
      AUDIO_MIX_REVIEW.defaultAmbience,
    );
    assert.ok(AUDIO_MIX_REVIEW.sources[sourceId], `${scenarioId} has unknown source`);
  }
  if (scenario.sequentialOneShots) {
    assert.ok(scenario.oneShots.length >= 2, `${scenarioId} needs a real sequence`);
    const delays = scenario.oneShots.map(entry => entry.delayMs || 0);
    for (let index = 1; index < delays.length; index += 1) {
      assert.ok(delays[index] > delays[index - 1], `${scenarioId} delays must increase`);
    }
  }
  const estimatedPeak = estimateAudioMixReviewPeak(AUDIO_MIX_REVIEW, scenarioId);
  assert.ok(
    estimatedPeak <= AUDIO_MIX_REVIEW.output.estimatedPeakBudget,
    `${scenarioId} estimate ${estimatedPeak} exceeds the review budget`,
  );
}

for (const fromScenarioId of Object.keys(AUDIO_MIX_REVIEW.scenarios)) {
  for (const toScenarioId of Object.keys(AUDIO_MIX_REVIEW.scenarios)) {
    const transitionPeak = estimateAudioMixReviewTransitionPeak(
      AUDIO_MIX_REVIEW,
      fromScenarioId,
      toScenarioId,
    );
    assert.ok(
      transitionPeak <= AUDIO_MIX_REVIEW.output.estimatedPeakBudget,
      `${fromScenarioId} -> ${toScenarioId} estimate ${transitionPeak} exceeds budget`,
    );
  }
}

assert.ok(
  AUDIO_MIX_REVIEW.sources.panicTimber.cooldownMs
    >= HARDCORE_MODE_CONFIG.stress.thresholdNoticeCooldownMs,
);
assert.ok(
  AUDIO_MIX_REVIEW.sources.panicDowner.cooldownMs
    >= HARDCORE_MODE_CONFIG.stress.thresholdNoticeCooldownMs,
);
assert.equal(
  AUDIO_MIX_REVIEW.currentRuntimeReference.rainOpenVolume,
  WEATHER_CONFIG.audio.recorded.volumes.rainOpen,
);
assert.equal(
  AUDIO_MIX_REVIEW.currentRuntimeReference.windOpenVolume,
  WEATHER_CONFIG.audio.recorded.volumes.windOpen,
);
assert.ok(existsSync(toPath(AUDIO_MIX_REVIEW.currentRuntimeReference.starDigLoaderPath)));
assert.equal(
  existsSync(toPath(AUDIO_MIX_REVIEW.currentRuntimeReference.starDigLibraryMetadataPath)),
  true,
  "Star loader and library metadata must resolve to the same .ogg asset",
);
assert.equal(
  AUDIO_MIX_REVIEW.diagnostics.some(item => item.id === "star-extension-mismatch"),
  false,
);
assert.equal(
  AUDIO_MIX_REVIEW.diagnostics.some(item => item.id === "approved-runtime-routing"),
  true,
);
assert.deepEqual(AUDIO_MIX_REVIEW.approvedRuntimeSourceIds, [
  "starDestruction",
  "levelUpShort",
  "levelUpEpic",
]);
for (const sourceId of AUDIO_MIX_REVIEW.approvedRuntimeSourceIds) {
  const source = AUDIO_MIX_REVIEW.sources[sourceId];
  assert.equal(source.runtimeEligible, true);
  assert.equal(source.approval, "approved-runtime");
  assert.ok(source.previewPath.includes("approved-sfx-findings-v1"));
}
for (const source of Object.values(AUDIO_MIX_REVIEW.sources)) {
  if (source.approval === "audition-only") assert.equal(source.runtimeEligible, false);
}

assert.equal(new Set(AUDIO_MIX_REVIEW_FLOW.reviewItemIds).size, AUDIO_MIX_REVIEW_FLOW.reviewItemIds.length);
assert.ok(AUDIO_MIX_REVIEW_FLOW.categories.some(
  category => category.id === AUDIO_MIX_REVIEW_FLOW.defaultCategoryId,
));
for (const itemId of AUDIO_MIX_REVIEW_FLOW.reviewItemIds) {
  assert.ok(AUDIO_MIX_REVIEW.scenarios[itemId], `review flow has unknown item ${itemId}`);
  assert.notEqual(itemId, AUDIO_MIX_REVIEW.defaultScenario);
}
assert.equal(
  AUDIO_MIX_REVIEW_FLOW.copy.boundary.includes("NOTHING AUTO-WIRES"),
  true,
);

assert.deepEqual(
  AUDIO_MIX_REVIEW.scenarios.deepCave.loops.map(entry => entry.sourceId),
  ["caveEerie", "miningMars", "evilSpell"],
);
assert.equal(AUDIO_MIX_REVIEW.scenarios.deepCave.oneShots[0].sourceId, "panicTimber");
for (const sourceId of ["caveEerie", "miningMars", "evilSpell", "panicTimber"]) {
  assert.equal(AUDIO_MIX_REVIEW.sources[sourceId].approval, "audition-only");
  assert.equal(AUDIO_MIX_REVIEW.sources[sourceId].runtimeEligible, false);
}
for (const [scenarioId, sourceId] of [
  ["creepyCaveSolo", "caveEerie"],
  ["creepyIndustrialSolo", "miningMars"],
  ["creepyDroneSolo", "evilSpell"],
]) {
  const scenario = AUDIO_MIX_REVIEW.scenarios[scenarioId];
  assert.equal(scenario.loops.length, 1);
  assert.equal(scenario.loops[0].sourceId, sourceId);
  assert.equal(scenario.loops[0].volume, 0.14);
  assert.equal(scenario.oneShots.length, 0);
}

const digSequence = AUDIO_MIX_REVIEW.scenarios.digSequence;
assert.equal(digSequence.hotkey, "D");
assert.equal(digSequence.sequentialOneShots, true);
assert.deepEqual(
  digSequence.oneShots.map(entry => entry.delayMs || 0),
  [0, 320, 640, 960],
);
assert.deepEqual(
  [...new Set(digSequence.oneShots.map(entry => entry.sourceId))],
  ["digOne", "digTwo"],
);
for (const sourceId of ["digOne", "digTwo"]) {
  const source = AUDIO_MIX_REVIEW.sources[sourceId];
  assert.equal(source.approval, "runtime-reference");
  assert.equal(source.runtimeEligible, true);
  assert.match(source.previewPath, /costume-sounds\/dig\/dig-[12]\.ogg$/);
}

assert.equal(getAudioReviewItemKind(AUDIO_MIX_REVIEW, "creepyCaveSolo"), "SANDBOX CANDIDATE");
assert.equal(getAudioReviewItemKind(AUDIO_MIX_REVIEW, "deepCave"), "SANDBOX MIX");
assert.equal(getAudioReviewItemKind(AUDIO_MIX_REVIEW, "digSequence"), "RUNTIME REFERENCE");
assert.equal(getAudioReviewItemKind(AUDIO_MIX_REVIEW, "starDestruction"), "APPROVED RUNTIME");
assert.equal(findAudioReviewCategory(AUDIO_MIX_REVIEW_FLOW, "deepCave").id, "creepy");

const memoryStorage = new MemoryStorage();
const decisionStore = new AudioReviewDecisionStore(AUDIO_MIX_REVIEW_FLOW, memoryStorage);
assert.equal(decisionStore.set("creepyCaveSolo", AUDIO_MIX_REVIEW_FLOW.decisions.approved), true);
assert.equal(decisionStore.set("deepCave", AUDIO_MIX_REVIEW_FLOW.decisions.rejected), true);
assert.equal(decisionStore.set("not-a-review-item", AUDIO_MIX_REVIEW_FLOW.decisions.approved), false);
assert.deepEqual(decisionStore.summary(), {
  approved: 1,
  rejected: 1,
  open: AUDIO_MIX_REVIEW_FLOW.reviewItemIds.length - 2,
  total: AUDIO_MIX_REVIEW_FLOW.reviewItemIds.length,
});
const restoredStore = new AudioReviewDecisionStore(AUDIO_MIX_REVIEW_FLOW, memoryStorage);
assert.equal(restoredStore.get("creepyCaveSolo"), AUDIO_MIX_REVIEW_FLOW.decisions.approved);
const flowSnapshot = createAudioReviewFlowSnapshot({
  config: AUDIO_MIX_REVIEW,
  flow: AUDIO_MIX_REVIEW_FLOW,
  scenarioId: "deepCave",
  categoryId: "creepy",
  decisionStore: restoredStore,
});
assert.equal(flowSnapshot.currentDecision, AUDIO_MIX_REVIEW_FLOW.decisions.rejected);
assert.equal(flowSnapshot.currentKind, "SANDBOX MIX");
assert.equal(flowSnapshot.itemIndex, 3);

for (const productionPath of [
  "sound/SoundSystem.js",
  "ui/scenes/BootScene.js",
  "world/playScene/HardcoreModeBridge.js",
]) {
  const source = readFileSync(toPath(productionPath), "utf8");
  assert.doesNotMatch(
    source,
    /audioMixReview|audioMixReviewFlow|AudioReviewDecisionStore|audio-mix-review-v1/i,
  );
}

for (const harnessPath of [
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/index.html",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/main.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/ReviewAudioBus.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewPanel.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewWorldView.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewDecisionStore.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioReviewFlowState.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioMixReviewMath.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioLibraryReviewConfig.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioReviewPanelLayout.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/readme.md",
]) {
  assert.ok(existsSync(toPath(harnessPath)), `missing review harness file: ${harnessPath}`);
}

const [
  valueSource,
  flowSource,
  mainSource,
  panelSource,
  panelLayoutSource,
  worldSource,
  htmlSource,
  busSource,
] = [
  "values/audioMixReview.js",
  "values/audioMixReviewFlow.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/main.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewPanel.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioReviewPanelLayout.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewWorldView.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/index.html",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/ReviewAudioBus.js",
].map(path => readFileSync(toPath(path), "utf8"));
assert.doesNotMatch(valueSource, /^import\s/m, "values files must not import project modules");
assert.doesNotMatch(flowSource, /^import\s/m, "review-flow values must not import modules");
assert.match(mainSource, /keys\.J\.on\("down", \(\) => this\.stepScenario\(-1\)\)/);
assert.match(mainSource, /keys\.K\.on\("down", \(\) => this\.stepScenario\(1\)\)/);
assert.match(mainSource, /keys\.Y\.on\("down"/);
assert.match(mainSource, /keys\.N\.on\("down"/);
assert.match(mainSource, /D: "digSequence"/);
assert.match(worldSource, /gridStartX = \(worldPaneWidth - gridWidth\) \/ 2/);
assert.match(worldSource, /dig: 0\.64/);
assert.match(panelSource, /buildAudioReviewPanelLayout/);
assert.match(panelLayoutSource, /1 · CHOOSE A CATEGORY/);
assert.match(panelLayoutSource, /2 · NOW PLAYING/);
assert.match(panelLayoutSource, /4 · DECIDE ON THE CURRENT ITEM/);
assert.match(panelLayoutSource, /✓ APPROVE/);
assert.match(panelLayoutSource, /× REJECT/);
assert.match(panelLayoutSource, /AUDIBLE NOW/);
assert.match(busSource, /if \(changedScenario \|\| playTransients\)/);
assert.match(busSource, /this\._clearPendingOneShots\(\)/);
assert.match(busSource, /stopAll\(\)/);
assert.match(mainSource, /this\.audioBus\.stopAll\(\)/);
assert.match(busSource, /pendingOneShotCount: this\.pendingOneShotTimers\.length/);
assert.match(busSource, /scenarioId,/);
assert.doesNotMatch(htmlSource, /max-width|max-height/);

console.log("AUDIO_MIX_REVIEW_CONTRACT_OK", JSON.stringify({
  sources: preloadAssets.length,
  scenarios: Object.keys(AUDIO_MIX_REVIEW.scenarios).length,
  reviewItems: AUDIO_MIX_REVIEW_FLOW.reviewItemIds.length,
  maxPeak: Math.max(
    ...Object.keys(AUDIO_MIX_REVIEW.scenarios)
      .map(scenarioId => estimateAudioMixReviewPeak(
        AUDIO_MIX_REVIEW,
        scenarioId,
      )),
  ),
  maxTransitionPeak: Math.max(
    ...Object.keys(AUDIO_MIX_REVIEW.scenarios).flatMap(fromScenarioId =>
      Object.keys(AUDIO_MIX_REVIEW.scenarios).map(toScenarioId =>
        estimateAudioMixReviewTransitionPeak(
          AUDIO_MIX_REVIEW,
          fromScenarioId,
          toScenarioId,
        ),
      ),
    ),
  ),
  productionWired: true,
}));
