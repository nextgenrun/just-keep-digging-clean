import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getPauseFeatureLoadingPreloadAssets,
  PAUSE_FEATURE_LOADING_ART_CONFIG,
} from "../values/pauseFeatureLoading.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVE = path.join(
  ROOT,
  "archive",
  "2026-08-03-loading-mining-minigame",
);
const source = relativePath => readFileSync(path.join(ROOT, relativePath), "utf8");

const retiredTokens = Object.freeze([
  ["loading", "Mining", "Minigame"].join(""),
  ["Authored", "Loading"].join(""),
  ["loading", "Screen", "Presentation"].join(""),
  ["loading", "Mine"].join(""),
]);

function collectJavaScriptFiles(directory) {
  const results = [];
  for (const entry of readdirSync(directory)) {
    const candidate = path.join(directory, entry);
    if (statSync(candidate).isDirectory()) {
      results.push(...collectJavaScriptFiles(candidate));
    } else if (candidate.endsWith(".js")) {
      results.push(candidate);
    }
  }
  return results;
}

const activeJavaScript = [
  "ui",
  "systems",
  "values",
  "world",
].flatMap(directory => collectJavaScriptFiles(path.join(ROOT, directory)));

for (const activePath of activeJavaScript) {
  const activeSource = readFileSync(activePath, "utf8");
  for (const retiredToken of retiredTokens) {
    assert.equal(
      activeSource.includes(retiredToken),
      false,
      `active runtime still references retired token ${retiredToken}: ${activePath}`,
    );
  }
}

const loaderSource = source("ui/components/LoadingScreenView.js");
assert.match(loaderSource, /export function createMenuLoadingScreen/);
assert.match(loaderSource, /const setProgress = \(value\) =>/);
assert.match(loaderSource, /setFailure: showFailure/);
assert.match(loaderSource, /setRetryHandler/);
assert.match(loaderSource, /addMenuBackground/);
assert.doesNotMatch(loaderSource, /minigame/i);

const bootSource = source("ui/scenes/BootScene.js");
assert.match(bootSource, /getPauseFeatureLoadingPreloadAssets/);
assert.match(bootSource, /getPauseFeatureLoadingDecorationAssets/);
assert.doesNotMatch(
  bootSource,
  new RegExp(retiredTokens.map(token => token.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")).join("|")),
);

const worldLoadSource = source("ui/scenes/WorldLoadScene.js");
assert.match(worldLoadSource, /createMenuLoadingScreen/);

const pauseAssets = getPauseFeatureLoadingPreloadAssets();
assert.equal(pauseAssets.length, 3);
assert.equal(Object.keys(PAUSE_FEATURE_LOADING_ART_CONFIG.assets).length, 3);
for (const asset of pauseAssets) {
  assert.ok(existsSync(path.join(ROOT, asset.path)), `missing retained pause-loader asset: ${asset.path}`);
}
assert.match(
  source("ui/components/PauseFeatureLoadingView.js"),
  /PAUSE_FEATURE_LOADING_ART_CONFIG/,
);

const archivedPaths = Object.freeze([
  "INDEX.md",
  "values/loadingMiningMinigame.js",
  "values/loadingScreenPresentation.js",
  "systems/mining/LoadingMiningMinigameState.js",
  "ui/components/AuthoredLoadingFailureView.js",
  "ui/components/AuthoredLoadingMiningBoard.js",
  "ui/components/AuthoredLoadingMiningMinigame.js",
  "ui/components/AuthoredLoadingProgressMeters.js",
  "ui/components/AuthoredLoadingScreenView.js",
  "ui/components/LoadingMiningMinigame.js",
  "ui/components/LoadingMiningMinigameFx.js",
  "ui/components/LoadingMiningPickaxeFx.js",
  "sprites/UI/loading-screen-v1/readme.md",
  "sprites/UI/loading-screen-v1/loading-screen-foundation-v1.webp",
  "sprites/UI/loading-screen-v1/loading-progress-amber-v1.webp",
  "sprites/UI/loading-screen-v1/loading-progress-cyan-v1.webp",
  "sprites/UI/loading-screen-v1/loading-retry-plate-v1.webp",
  "testing/2026-07-30-loading-mining-minigame-contract.mjs",
  "testing/2026-07-30-loading-mining-minigame-harness.html",
  "testing/2026-07-30-loading-mining-minigame-harness.js",
  "testing/2026-07-30-loading-mining-minigame-live-qa.mjs",
  "testing/2026-07-31-loading-screen-before.png",
  "testing/2026-07-31-loading-screen-after.png",
  "testing/2026-07-31-loading-screen-production-boot.png",
  "markdown/2026-07-30-loading-mining-minigame-runtime.md",
  "markdown/2026-07-31-loading-screen-imagegen-redesign.md",
]);

for (const archivedPath of archivedPaths) {
  assert.ok(
    existsSync(path.join(ARCHIVE, archivedPath)),
    `archive is missing rollback file: ${archivedPath}`,
  );
}

assert.match(
  source("archive/INDEX.md"),
  /2026-08-03-loading-mining-minigame/,
);
assert.match(
  source("archive/2026-08-03-loading-mining-minigame/INDEX.md"),
  /1bbf068/,
);

console.log(
  "Loading minigame archive contract passed: regular loader restored, "
  + "active runtime clean, pause loader retained, archive complete.",
);
