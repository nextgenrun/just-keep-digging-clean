import assert from "node:assert/strict";
import { WORLD_BACKGROUND_MASTER_TEST } from "../values/worldBackgroundMasterTest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../values/v11DepthBackgroundRuntimeManifest.js";
import { WORLD_SCENIC_FACADE } from "../values/worldScenicFacade.js";
import { buildWorldDepthContinuationEntries } from "../world/rendering/WorldDepthContinuationBuilder.js";

const manifest = V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST;
const config = WORLD_BACKGROUND_MASTER_TEST.depthContinuation;
const entries = buildWorldDepthContinuationEntries(manifest, config, WORLD_SCENIC_FACADE);
const tileSize = manifest.tileSize;
const offsetX = manifest.xOffsetPx ?? manifest.xOffsetTiles * tileSize;
const offsetY = manifest.yOffsetPx ?? manifest.yOffsetTiles * tileSize;
const rectOf = entry => ({
  left: entry.xPx + offsetX,
  right: entry.xPx + offsetX + entry.widthPx,
  top: entry.yPx + offsetY,
  bottom: entry.yPx + offsetY + entry.heightPx,
});

assert.ok(entries.length > 0, "deep continuation should create streamed plate entries");
assert.ok(entries.every(entry => entry.deepContinuation && entry.sourceCrop));
assert.ok(entries.every(entry => manifest.objects.some(source => source.textureKey === entry.textureKey)));

for (const entry of entries) {
  const rect = rectOf(entry);
  assert.ok(rect.left >= config.targetLeftTile * tileSize);
  assert.ok(rect.right <= config.targetRightTileExclusive * tileSize);
  assert.ok(rect.top >= config.targetTopTile * tileSize);
  assert.ok(rect.bottom <= config.targetBottomTileExclusive * tileSize);
  const source = manifest.objects.find(candidate => candidate.textureKey === entry.textureKey);
  assert.ok(entry.sourceCrop.x >= 0 && entry.sourceCrop.y >= 0);
  assert.ok(entry.sourceCrop.x + entry.sourceCrop.width <= source.sourceWidthPx + 0.001);
  assert.ok(entry.sourceCrop.y + entry.sourceCrop.height <= source.sourceHeightPx + 0.001);
}

for (const xTile of [132, 160, 220, 279]) {
  const x = (xTile + 0.5) * tileSize;
  const intervals = entries.map(rectOf)
    .filter(rect => x >= rect.left && x < rect.right)
    .sort((a, b) => a.top - b.top);
  let coveredBottom = config.targetTopTile * tileSize;
  for (const interval of intervals) {
    assert.ok(interval.top <= coveredBottom, `no vertical gap is allowed at x${xTile}`);
    coveredBottom = Math.max(coveredBottom, interval.bottom);
  }
  assert.equal(coveredBottom, config.targetBottomTileExclusive * tileSize);
}

for (const band of WORLD_SCENIC_FACADE.bands.filter(band => band.topTile >= config.targetTopTile)) {
  const entry = entries.find(candidate => {
    const rect = rectOf(candidate);
    return rect.top / tileSize >= band.topTile && rect.top / tileSize < band.bottomTileExclusive;
  });
  assert.ok(entry, `${band.id} needs continued backdrop art`);
  assert.equal(entry.tint, config.tintByFacadeBand[band.id]);
}

assert.deepEqual(buildWorldDepthContinuationEntries(manifest, { ...config, enabled: false }, WORLD_SCENIC_FACADE), []);
console.log("World depth continuation smoke: detailed plates cover x132..279 / y2065..5064 with crops, grading, and rollback");
