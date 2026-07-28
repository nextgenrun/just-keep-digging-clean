import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";

import {
  STAR_CONSTELLATION_CONFIG,
  getCollectedStarReleasePreloadAssets,
} from "../values/starConstellations.js";

const releaseFx = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
const assets = getCollectedStarReleasePreloadAssets();
const projectRoot = new URL("../", import.meta.url);

assert.equal(
  releaseFx.artSource,
  "ImageGen",
  "Star Block destruction art must remain ImageGen-authored"
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
  assert.equal(existsSync(fileUrl), true, `missing ImageGen destruction sprite: ${cleanPath}`);
  const minimumSize = cleanPath.includes("star-fracture") ? 1_200_000 : 800_000;
  assert.ok(
    statSync(fileUrl).size > minimumSize,
    `destruction art must retain its high-resolution ImageGen detail: ${cleanPath}`
  );

  const header = readFileSync(fileUrl).subarray(0, 26);
  assert.equal(
    header.subarray(1, 4).toString("ascii"),
    "PNG",
    `destruction sprite must remain a lossless PNG: ${cleanPath}`
  );
  assert.equal(header.readUInt32BE(16), 1254, `unexpected destruction width: ${cleanPath}`);
  assert.equal(header.readUInt32BE(20), 1254, `unexpected destruction height: ${cleanPath}`);
}

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

const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8"
);
assert.match(
  bootSource,
  /getCollectedStarReleasePreloadAssets\(\)/,
  "BootScene must preload every ImageGen core and fracture sprite"
);

assert.ok(releaseFx.durationMs >= 5_000, "the collected core should rise slowly");
assert.ok(releaseFx.riseMinPx >= 300, "the collected core should travel a clearly readable distance");
assert.equal(releaseFx.echoCount, 3, "the authored ascent should use a restrained three-image echo");
assert.ok(
  releaseFx.sourceFractureAlpha <= 0.7,
  "the detailed fracture bloom should not overwhelm the mined tile"
);
assert.ok(
  releaseFx.sourcePulseAlpha <= 0.12,
  "the destruction pulse must remain quieter than the authored core"
);

console.log(
  "Star Block destruction quality contract passed: twelve ImageGen sprites, slow ascent, no procedural overlays"
);
