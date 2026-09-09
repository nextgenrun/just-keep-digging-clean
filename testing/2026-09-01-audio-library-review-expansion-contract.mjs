import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { AUDIO_LIBRARY_REVIEW_EXPANSION } from "../values/audioLibraryReviewExpansion.js";
import { AUDIO_MIX_REVIEW } from "../values/audioMixReview.js";
import { AUDIO_MIX_REVIEW_FLOW } from "../values/audioMixReviewFlow.js";
import { createAudioLibraryReviewConfig } from
  "./animation-sandbox/2026-08-31-audio-mix-review-v1/audioLibraryReviewConfig.js";
import {
  estimateAudioMixReviewPeak,
  estimateAudioMixReviewTransitionPeak,
  getAudioMixReviewPreloadAssets,
} from "./animation-sandbox/2026-08-31-audio-mix-review-v1/audioMixReviewMath.js";

const rootUrl = new URL("../", import.meta.url);
const toPath = relativePath => fileURLToPath(new URL(relativePath, rootUrl));
const { config, flow } = createAudioLibraryReviewConfig(
  AUDIO_MIX_REVIEW,
  AUDIO_MIX_REVIEW_FLOW,
  AUDIO_LIBRARY_REVIEW_EXPANSION,
);

assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.reviewOnly, true);
assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.runtimeEligible, false);
assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.runtimeWired, false);
assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.sourceApprovalIsRuntimeApproval, false);
assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.localCandidateCount, 69);
assert.equal(AUDIO_LIBRARY_REVIEW_EXPANSION.onlineCandidateCount, 24);
assert.equal(Object.keys(AUDIO_LIBRARY_REVIEW_EXPANSION.sources).length, 69);
assert.equal(Object.keys(AUDIO_LIBRARY_REVIEW_EXPANSION.scenarios).length, 69);

assert.equal(Object.keys(config.sources).length, 85);
assert.equal(Object.keys(config.scenarios).length, 83);
assert.equal(flow.reviewItemIds.length, 82);
assert.equal(flow.categories.length, 8);
assert.equal(flow.itemPageSize, 6);
assert.equal(flow.categoryColumns, 4);
assert.equal(new Set(flow.reviewItemIds).size, flow.reviewItemIds.length);
assert.deepEqual(
  flow.categories.map(category => [category.id, category.itemIds.length]),
  [
    ["panic", 10],
    ["cave", 16],
    ["mining", 9],
    ["star", 6],
    ["movement", 13],
    ["ui", 6],
    ["reward", 6],
    ["weather", 16],
  ],
);
for (const baseItemId of AUDIO_MIX_REVIEW_FLOW.reviewItemIds) {
  assert.ok(flow.reviewItemIds.includes(baseItemId), `base review item lost: ${baseItemId}`);
}

let playableBytes = 0;
for (const [sourceId, source] of Object.entries(
  AUDIO_LIBRARY_REVIEW_EXPANSION.sources,
)) {
  assert.equal(source.runtimeEligible, false, `${sourceId} escaped review-only`);
  assert.equal(source.approval, "sandbox-candidate");
  assert.ok(source.collection);
  const path = toPath(source.previewPath);
  assert.ok(existsSync(path), `missing local candidate: ${source.previewPath}`);
  playableBytes += readFileSync(path).byteLength;
}
assert.ok(playableBytes > 20 * 1024 * 1024);
assert.ok(playableBytes < 40 * 1024 * 1024);

const preloadAssets = getAudioMixReviewPreloadAssets(config);
assert.equal(preloadAssets.length, 85);
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, 85);
for (const asset of preloadAssets) {
  assert.ok(existsSync(toPath(asset.path)), `missing preload asset: ${asset.path}`);
}

for (const [scenarioId, scenario] of Object.entries(config.scenarios)) {
  assert.ok(scenario.loops.length <= config.output.maxConcurrentLoops);
  assert.ok(
    estimateAudioMixReviewPeak(config, scenarioId)
      <= config.output.estimatedPeakBudget,
    `${scenarioId} exceeds the mix budget`,
  );
}
let maxTransitionPeak = 0;
for (const fromId of Object.keys(config.scenarios)) {
  for (const toId of Object.keys(config.scenarios)) {
    const peak = estimateAudioMixReviewTransitionPeak(config, fromId, toId);
    maxTransitionPeak = Math.max(maxTransitionPeak, peak);
    assert.ok(
      peak <= config.output.estimatedPeakBudget,
      `${fromId} -> ${toId} exceeds the transition budget`,
    );
  }
}

const manifestPath = toPath(AUDIO_LIBRARY_REVIEW_EXPANSION.onlineManifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.runtimeWired, false);
assert.equal(manifest.runtimeEligible, false);
assert.equal(manifest.downloadedCount, 0);
assert.equal(manifest.candidateCount, 24);
assert.equal(manifest.candidates.length, 24);
assert.equal(
  new Set(manifest.candidates.map(candidate => candidate.sourceUrl)).size,
  24,
);
for (const candidate of manifest.candidates) {
  assert.match(candidate.sourceUrl, /^https:\/\/freesound\.org\/people\//);
  assert.equal(candidate.licenseDeclared, "CC0-1.0");
  assert.equal(candidate.downloadStatus, "not-downloaded");
}
assert.ok(manifest.candidates.some(candidate => candidate.sourceUrl.endsWith("/421826/")));
assert.ok(manifest.candidates.some(candidate => candidate.sourceUrl.endsWith("/639429/")));
assert.equal(
  manifest.candidates.filter(candidate => (
    candidate.licenseReview === "creator-page-also-links-separate-terms"
  )).length,
  2,
);
const onlineDir = fileURLToPath(new URL(".", new URL(
  AUDIO_LIBRARY_REVIEW_EXPANSION.onlineManifestPath,
  rootUrl,
)));
assert.deepEqual(
  readdirSync(onlineDir).sort(),
  ["manifest.json", "readme.md"],
  "online leads must remain links and metadata only",
);

for (const productionPath of [
  "sound/SoundSystem.js",
  "ui/scenes/BootScene.js",
  "world/PlayScene.js",
]) {
  const source = readFileSync(toPath(productionPath), "utf8");
  assert.doesNotMatch(
    source,
    /audioLibraryReviewExpansion|public-candidate-index-2026-09-01/i,
  );
}

const [valuesSource, mainSource, panelSource, layoutSource] = [
  "values/audioLibraryReviewExpansion.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/main.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/AudioReviewPanel.js",
  "testing/animation-sandbox/2026-08-31-audio-mix-review-v1/audioReviewPanelLayout.js",
].map(path => readFileSync(toPath(path), "utf8"));
assert.doesNotMatch(valuesSource, /^import\s/m, "values files must remain import-free");
assert.match(mainSource, /createAudioLibraryReviewConfig/);
assert.match(mainSource, /keys\.J\.on\("down"/);
assert.match(mainSource, /keys\.K\.on\("down"/);
assert.match(panelSource, /_stepItemPage/);
assert.match(layoutSource, /PAGE →/);
assert.match(layoutSource, /AUDIO|view\.flow\.copy\.title/);

console.log("AUDIO_LIBRARY_REVIEW_EXPANSION_OK", JSON.stringify({
  playableSources: Object.keys(config.sources).length,
  reviewItems: flow.reviewItemIds.length,
  categories: flow.categories.length,
  onlineLeads: manifest.candidateCount,
  playableMiB: Number((playableBytes / 1024 / 1024).toFixed(2)),
  maxTransitionPeak,
  runtimeWired: false,
}));
