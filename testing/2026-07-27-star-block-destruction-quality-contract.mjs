import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";

import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  STAR_CONSTELLATION_CONFIG,
  getCollectedStarReleasePreloadAssets,
} from "../values/starConstellations.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";

const releaseFx = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
const assets = getCollectedStarReleasePreloadAssets();
const projectRoot = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(
  new URL(
    "../sprites/environment/star-block-crystal-v2/star-block-crystal-v2.manifest.json",
    import.meta.url
  ),
  "utf8"
));

function readPngSize(fileUrl) {
  const header = readFileSync(fileUrl).subarray(0, 26);
  assert.equal(
    header.subarray(1, 4).toString("ascii"),
    "PNG",
    `destruction sprite must remain a lossless PNG: ${fileUrl.pathname}`
  );
  return Object.freeze({
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  });
}

function sha256(fileUrl) {
  return createHash("sha256").update(readFileSync(fileUrl)).digest("hex");
}

assert.equal(
  releaseFx.artSource,
  "ImageGen",
  "Star Block destruction art must remain ImageGen-authored"
);
assert.equal(
  releaseFx.artRevision,
  "star-block-crystal-v2-20260728",
  "the approved Choice 1 crystal revision must remain active"
);
assert.equal(releaseFx.coreAssets.length, 6, "all six rarities need an authored core");
assert.equal(
  releaseFx.fractureAssets.length,
  6,
  "all six rarities need an authored fracture burst"
);
assert.equal(assets.length, 12, "the destruction package must preload twelve authored sprites");
assert.equal(
  new Set(assets.map(asset => asset.key)).size,
  assets.length,
  "every destruction sprite needs a unique texture key"
);

for (const asset of assets) {
  const cleanPath = asset.path.split("?")[0];
  const fileUrl = new URL(cleanPath, projectRoot);
  const isFracture = cleanPath.includes("star-fracture");
  assert.equal(existsSync(fileUrl), true, `missing ImageGen destruction sprite: ${cleanPath}`);
  const minimumSize = isFracture ? 1_200_000 : 150_000;
  assert.ok(
    statSync(fileUrl).size > minimumSize,
    `destruction art must retain its high-resolution ImageGen detail: ${cleanPath}`
  );

  const expectedSize = isFracture ? 1254 : manifest.coreSizePx;
  const pngSize = readPngSize(fileUrl);
  assert.equal(pngSize.width, expectedSize, `unexpected destruction width: ${cleanPath}`);
  assert.equal(pngSize.height, expectedSize, `unexpected destruction height: ${cleanPath}`);
}

assert.equal(manifest.version, 2);
assert.equal(manifest.artSource, "ImageGen");
assert.match(
  manifest.approvalReference,
  /2026-07-28-01-pure-crystal-star-v2\.png$/,
  "the production package must retain the selected Choice 1 approval reference"
);
assert.equal(manifest.tileDisplaySizePx, GAME_CONFIG.tileSize);
assert.equal(manifest.releaseStartScale, releaseFx.startScale);
assert.equal(manifest.popDisplayScale, releaseFx.flashScale);
assert.equal(manifest.growthDelayMs, releaseFx.growthDelayMs);
assert.equal(manifest.peakDisplayScale, releaseFx.peakScale);
assert.equal(manifest.releaseDurationMs, releaseFx.durationMs);
assert.deepEqual(
  manifest.cores.map(({ runtime }) => runtime),
  releaseFx.coreAssets.map(({ path }) => path.split("?")[0]),
  "the release must use the six normalized cores owned by the production manifest"
);
for (const core of manifest.cores) {
  const runtimeUrl = new URL(core.runtime, projectRoot);
  assert.equal(
    sha256(runtimeUrl),
    core.runtimeSha256,
    `normalized release core drifted from the production manifest: ${core.runtime}`
  );
}

const skyTileVisual = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile;
for (const [manifestKey, atlasConfig] of [
  ["beautyAtlas", skyTileVisual.beautyAtlas],
  ["emissiveAtlas", skyTileVisual.emissiveAtlas],
]) {
  const manifestAtlas = manifest[manifestKey];
  const cleanPath = atlasConfig.path.split("?")[0];
  assert.equal(
    cleanPath,
    manifestAtlas.path,
    `the live ${manifestKey} must use the Choice 1 production atlas`
  );
  const fileUrl = new URL(cleanPath, projectRoot);
  assert.equal(sha256(fileUrl), manifestAtlas.sha256, `${manifestKey} drifted from its manifest`);
  assert.deepEqual(
    readPngSize(fileUrl),
    { width: 768, height: 512 },
    `${manifestKey} must retain its six-frame 3x2 atlas`
  );
}
assert.equal(skyTileVisual.scale, 1, "the live block icon must fill one exact tile frame");
assert.equal(skyTileVisual.beautyBlendMode, "SCREEN");
assert.equal(
  skyTileVisual.beautyReceivesTerrainTint,
  false,
  "the six authored rarity colours must not inherit terrain tint"
);

const viewSource = readFileSync(
  new URL("../systems/visual/SkyStarReleaseView.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  viewSource,
  /createCanvas|add\.graphics|add\.circle|generateTexture|fillCircle|strokeCircle|setTint/,
  "the destruction view must only animate authored bitmap images"
);

const floatingTextSource = readFileSync(
  new URL("../systems/visual/FloatingTextSystem.js", import.meta.url),
  "utf8"
);
const releaseMethodSource = floatingTextSource.slice(
  floatingTextSource.indexOf("releaseCollectedSkyStar("),
  floatingTextSource.indexOf("grantCollectedStar(")
);
assert.doesNotMatch(
  releaseMethodSource,
  /add\.graphics|add\.circle|setTint|generateTexture/,
  "the Star Block release integration must not draw or tint replacement VFX"
);
assert.doesNotMatch(
  floatingTextSource,
  /_ensureSkyStarTextures|dig-game-sky-star-rarity-/,
  "the old procedurally generated release-star fallback must stay removed"
);
assert.doesNotMatch(
  floatingTextSource,
  /showSkyTileDestruction/,
  "the duplicate circle-and-text Star Block destruction overlay must stay removed"
);

const digSystemSource = readFileSync(
  new URL("../systems/mining/DigSystem.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  digSystemSource,
  /showSkyTileDestruction/,
  "mining must route Star Block destruction through the ImageGen release only"
);

const e2eHarnessSource = readFileSync(
  new URL("./JkdE2EHarness.js", import.meta.url),
  "utf8"
);
assert.match(
  e2eHarnessSource,
  /F5[\s\S]*showCollectedSkyStarRelease/,
  "the save-safe harness should expose the real ImageGen release for live visual QA"
);

const isolatedHarnessSource = readFileSync(
  new URL("./2026-07-28-star-block-release-visual-harness.js", import.meta.url),
  "utf8"
);
assert.match(isolatedHarnessSource, /import \{ FloatingTextSystem \}/);
assert.match(isolatedHarnessSource, /new FloatingTextSystem\(this,\s*99\)/);
assert.match(isolatedHarnessSource, /showCollectedSkyStarRelease\(/);
assert.doesNotMatch(
  isolatedHarnessSource,
  /releaseCollectedSkyStar\(/,
  "the isolated visual harness must never award or persist a star"
);

const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8"
);
assert.match(
  bootSource,
  /getCollectedStarReleasePreloadAssets\(\)/,
  "BootScene must preload every ImageGen core and fracture sprite"
);

assert.equal(releaseFx.tileDisplaySizePx, GAME_CONFIG.tileSize);
assert.ok(
  releaseFx.coreDisplaySizesPx.every(size => size === GAME_CONFIG.tileSize),
  "the released core must retain the live tile-size source envelope"
);
assert.equal(releaseFx.presentationRevision, "one-to-one-pop-v4-20260729");
assert.ok(
  releaseFx.startScale >= 0.85 && releaseFx.startScale <= 1,
  "the transparent fade-in may begin just below the live block icon scale"
);
assert.equal(
  releaseFx.flashScale,
  1,
  "the first fully visible released star must match the live block star one-to-one"
);
assert.equal(
  Math.round(releaseFx.tileDisplaySizePx * releaseFx.flashScale),
  GAME_CONFIG.tileSize,
  "the fully visible pop must retain the exact 94 px live tile envelope"
);
assert.ok(
  releaseFx.growthDelayMs >= releaseFx.liftDelayMs,
  "growth should wait until the one-to-one star has started lifting free"
);
assert.ok(
  releaseFx.peakScale >= 1.4 && releaseFx.peakScale <= 1.5,
  "the released star should grow clearly while staying smaller than the previous pass"
);
assert.ok(releaseFx.durationMs >= 10_500, "the collected core should levitate more slowly");
assert.ok(releaseFx.riseMinPx >= 350, "the collected core should travel a clearly readable distance");
assert.ok(releaseFx.echoCount >= 6, "the ascent should carry a heavy authored-image echo trail");
assert.ok(releaseFx.echoStartAlpha >= 0.22, "the first echo must remain visibly substantial");
assert.ok(
  releaseFx.sourceFractureAlpha <= 0.7,
  "the detailed fracture bloom should not overwhelm the mined tile"
);
assert.ok(
  releaseFx.sourcePulseAlpha <= 0.12,
  "the destruction pulse must remain quieter than the authored core"
);

console.log(
  "Star Block destruction quality contract passed: Choice 1 art, exact 94px one-to-one pop, delayed growth, heavy image echoes"
);
