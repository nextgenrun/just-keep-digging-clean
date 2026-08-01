import assert from "node:assert/strict";

import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
} from "../values/worldVisualDepthBackdrops.js";
import { WorldVisualBackdropEnhancerLayer } from
  "../world/rendering/scenic-world/WorldVisualBackdropEnhancerLayer.js";
import { resolveWorldVisualBackdropCardPlacement } from
  "../world/rendering/scenic-world/worldVisualBackdropCardGrid.js";
import { WorldVisualDepthBackdropRegionView } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js";

const tileSize = 94;
const scene = { config: { tileSize } };
const enhancerLayer = new WorldVisualBackdropEnhancerLayer(
  scene,
  undefined,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  ""
);

let comparisons = 0;
for (const region of WORLD_VISUAL_DEPTH_BACKDROPS.regions) {
  const backwalls = resolveWorldVisualDepthBackdropRegionAssets(
    region,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    ""
  );
  const retainedView = new WorldVisualDepthBackdropRegionView(
    scene,
    region,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    backwalls
  );
  const placement = resolveWorldVisualBackdropCardPlacement(
    region,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    tileSize,
    0,
    0
  );
  for (let row = 0; row < placement.rows; row += 1) {
    for (let column = 0; column < placement.columns; column += 1) {
      const retainedAsset = retainedView._resolveSegmentAsset(column, row);
      const enhancerBackdrop = enhancerLayer._resolveBackdropAsset(
        region,
        column,
        row,
        placement.rows
      );
      assert.equal(
        enhancerBackdrop?.key,
        retainedAsset?.key,
        `${region.id}:${column}:${row} must pair against the rendered backdrop`
      );
      comparisons += 1;
    }
  }
}

assert.ok(comparisons > 100, "selection parity covers the complete backdrop grid");
console.log(`Backdrop enhancer selector parity passed (${comparisons} cards)`);
