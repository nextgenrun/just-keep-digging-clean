import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLD_VISUAL_BACKDROP_ENHANCERS,
  getWorldVisualBackdropEnhancerAssets,
  resolveWorldVisualBackdropEnhancerSelection,
  resolveWorldVisualBackdropEnhancersEnabled,
} from "../values/worldVisualBackdropEnhancers.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
} from "../values/worldVisualDepthBackdrops.js";
import {
  resolveWorldVisualBackdropCardPlacement,
  resolveWorldVisualBackdropCardRange,
} from "../world/rendering/scenic-world/worldVisualBackdropCardGrid.js";
import { readWebpMetadata, sha256 } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "underground-backdrop-enhancers-v7"
);
const manifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-07-29-backdrop-enhancers-v7.json"
), "utf8"));

assert.deepEqual(manifest.counts, {
  biomes: 10,
  assetsPerBiome: 10,
  totalAssets: 100,
});
assert.deepEqual(manifest.sourceSize, [1536, 1024]);
assert.equal(manifest.edgeFeatherPx, 192);
assert.equal(manifest.entries.length, 100);
assert.equal(new Set(manifest.entries.map(entry => entry.stem)).size, 100);
assert.equal(new Set(manifest.entries.map(entry => entry.runtimeSha256)).size, 100);

const assets = getWorldVisualBackdropEnhancerAssets();
assert.equal(assets.length, 100);
assert.equal(new Set(assets.map(asset => asset.key)).size, 100);
assert.equal(new Set(assets.map(asset => asset.path)).size, 100);
assert.equal(WORLD_VISUAL_BACKDROP_ENHANCERS.regions.length, 10);
assert.ok(WORLD_VISUAL_BACKDROP_ENHANCERS.regions.every(region => (
  region.assets.length === 10
)));
assert.deepEqual(WORLD_VISUAL_BACKDROP_ENHANCERS.source, {
  widthPx: 1536,
  heightPx: 1024,
  clearEdgePx: 72,
  alphaFeatherPx: 192,
});
assert.ok(assets.every(asset => (
  asset.path.includes("/biome-backdrop-enhancers-v7/")
  && asset.path.endsWith("-v7.webp")
  && ["NORMAL", "ADD"].includes(asset.blendMode)
)));
assert.equal(assets.filter(asset => asset.blendMode === "NORMAL").length, 60);
assert.equal(assets.filter(asset => asset.blendMode === "ADD").length, 40);

const manifestByRuntime = new Map(
  manifest.entries.map(entry => [entry.runtime, entry])
);
for (const asset of assets) {
  const entry = manifestByRuntime.get(asset.path);
  assert.ok(entry, asset.path);
  const runtimePath = path.join(ROOT, entry.runtime);
  assert.equal(fs.existsSync(runtimePath), true, entry.runtime);
  assert.equal(sha256(runtimePath), entry.runtimeSha256);
  assert.deepEqual(readWebpMetadata(runtimePath), {
    width: 1536,
    height: 1024,
    alphaFlag: true,
    hasAlpha: true,
  });
  assert.ok(
    entry.maximumOuter8Alpha <= 1,
    `${entry.stem} has an effectively clear outer edge after 8-bit feather rounding`
  );
  assert.ok(
    entry.occupiedFractionAlpha16 > 0.002
      && entry.occupiedFractionAlpha16 < 0.7,
    `${entry.stem} remains a sparse but nonempty enhancer`
  );
}
for (const contactSheet of manifest.contactSheets) {
  assert.equal(fs.existsSync(path.join(ROOT, contactSheet)), true, contactSheet);
}

assert.equal(resolveWorldVisualBackdropEnhancersEnabled(undefined, ""), true);
assert.equal(
  resolveWorldVisualBackdropEnhancersEnabled(
    undefined,
    "?undergroundBackdropEnhancers=0"
  ),
  false
);
assert.equal(
  resolveWorldVisualBackdropEnhancersEnabled(
    undefined,
    "?biomeBackdropEnhancers=legacy"
  ),
  false
);

function requestedBackdrop(region, assetsForRegion, column, row, rows) {
  const handoffs = assetsForRegion.filter(asset => asset.path.includes("-handoff-"));
  const body = assetsForRegion.filter(asset => !handoffs.includes(asset));
  if (handoffs.length > 0 && row === rows - 1) {
    return handoffs[column % handoffs.length];
  }
  const ordered = body.length > 0 ? body : handoffs;
  return ordered[(column + row * 3) % ordered.length];
}

for (let regionIndex = 0; regionIndex < 10; regionIndex += 1) {
  const enhancerRegion = WORLD_VISUAL_BACKDROP_ENHANCERS.regions[regionIndex];
  const backdropRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions[regionIndex];
  assert.equal(enhancerRegion.id, backdropRegion.id);
  const backdropAssets = resolveWorldVisualDepthBackdropRegionAssets(
    backdropRegion,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    ""
  );
  const seen = new Set();
  let blankCards = 0;
  let enhancedCards = 0;
  const columns = 31;
  const rows = 61;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const backdrop = requestedBackdrop(
        backdropRegion,
        backdropAssets,
        column,
        row,
        rows
      );
      const first = resolveWorldVisualBackdropEnhancerSelection(
        enhancerRegion.id,
        column,
        row,
        WORLD_VISUAL_BACKDROP_ENHANCERS,
        backdrop
      );
      const second = resolveWorldVisualBackdropEnhancerSelection(
        enhancerRegion.id,
        column,
        row,
        WORLD_VISUAL_BACKDROP_ENHANCERS,
        backdrop
      );
      assert.deepEqual(second, first, "selection stays stable on revisit");
      if (!first) {
        blankCards += 1;
        continue;
      }
      enhancedCards += 1;
      seen.add(first.asset.key);
      assert.equal(first.matchedBackdropPath, backdrop.path.toLowerCase());
      if (first.compatibilityFamilies) {
        assert.ok(first.compatibilityFamilies.includes(first.asset.family));
      }
      assert.ok(
        first.alpha >= WORLD_VISUAL_BACKDROP_ENHANCERS.render.minAlpha
        && first.alpha <= WORLD_VISUAL_BACKDROP_ENHANCERS.render.maxAlpha
      );
    }
  }
  const blankFraction = blankCards / (blankCards + enhancedCards);
  assert.ok(blankFraction > 0.25 && blankFraction < 0.6);
  assert.deepEqual(
    [...seen].sort(),
    enhancerRegion.assets.map(asset => asset.key).sort(),
    `${enhancerRegion.id} uses all ten high-resolution enhancer assets`
  );
}

const tileSize = 64;
const firstBackdropRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions[0];
const sampleBounds = { left: 0, right: 60, top: 65, bottom: 120 };
const sampleRange = resolveWorldVisualBackdropCardRange(
  sampleBounds,
  firstBackdropRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  tileSize,
  WORLD_VISUAL_BACKDROP_ENHANCERS.streaming.neighborSegments
);
assert.ok(sampleRange);
const firstPlacement = resolveWorldVisualBackdropCardPlacement(
  firstBackdropRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  tileSize,
  sampleRange.firstColumn,
  sampleRange.firstRow
);
const nextPlacement = resolveWorldVisualBackdropCardPlacement(
  firstBackdropRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  tileSize,
  sampleRange.firstColumn + 1,
  sampleRange.firstRow
);
assert.equal(
  nextPlacement.baseX - firstPlacement.baseX,
  WORLD_VISUAL_DEPTH_BACKDROPS.segment.strideXPx
);
assert.equal(firstPlacement.geometry.widthPx, 1152);
assert.equal(firstPlacement.geometry.heightPx, 768);
assert.ok(
  WORLD_VISUAL_BACKDROP_ENHANCERS.render.depthOffset
    > (sampleRange.columns + 1)
      * WORLD_VISUAL_DEPTH_BACKDROPS.render.segmentDepthStep,
  "enhancers sort above every backdrop card they can overlap"
);
assert.ok(
  WORLD_VISUAL_DEPTH_BACKDROPS.render.backwallDepth
    + (WORLD_VISUAL_DEPTH_BACKDROPS.regions.length - 1)
      * WORLD_VISUAL_DEPTH_BACKDROPS.render.regionDepthStride
    + WORLD_VISUAL_BACKDROP_ENHANCERS.render.depthOffset
    < 0,
  "enhancers remain below authoritative terrain"
);

const runtimeSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualRuntime.js"
), "utf8");
assert.match(runtimeSource, /WorldVisualBackdropEnhancerLayer/);
assert.match(runtimeSource, /backdropEnhancerLayer\?\.sync/);
assert.match(runtimeSource, /backdropEnhancerLayer\?\.update/);
assert.match(runtimeSource, /backdropEnhancerLayer\?\.destroy/);

const rendererSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualBackdropEnhancerLayer.js"
), "utf8");
assert.match(rendererSource, /_resolveBackdropAsset/);
assert.match(rendererSource, /resolveWorldVisualBackdropEnhancerSelection/);
assert.doesNotMatch(rendererSource, /Math\.random/);

for (const sourcePath of [
  "values/worldVisualBackdropEnhancers.js",
  "world/rendering/scenic-world/worldVisualBackdropCardGrid.js",
  "world/rendering/scenic-world/WorldVisualBackdropEnhancerLayer.js",
]) {
  const source = fs.readFileSync(path.join(ROOT, sourcePath), "utf8");
  assert.doesNotMatch(
    source,
    /setTile|damageTile|digTile|createTilemap|collision|localStorage|saveGame/
  );
}

console.log("Underground backdrop enhancer V7 contract passed");
