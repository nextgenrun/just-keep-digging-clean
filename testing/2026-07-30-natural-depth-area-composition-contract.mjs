import assert from "node:assert/strict";
import fs from "node:fs";

import {
  WORLD_VISUAL_AREA_COMPOSITION,
  resolveWorldVisualAreaCompositionEnabled,
} from "../values/worldVisualAreaComposition.js";
import { resolveWorldVisualSemanticSequenceIndex } from
  "../world/rendering/scenic-world/worldVisualSemanticSequence.js";

assert.equal(resolveWorldVisualAreaCompositionEnabled(
  WORLD_VISUAL_AREA_COMPOSITION,
  "",
), true);
assert.equal(resolveWorldVisualAreaCompositionEnabled(
  WORLD_VISUAL_AREA_COMPOSITION,
  "?naturalDepthAreas=0",
), false);

const assetCounts = Object.freeze([5, 9, 14, 15, 20]);
for (const [profileId, profile] of Object.entries(
  WORLD_VISUAL_AREA_COMPOSITION.profiles
)) {
  assert.ok(profile.areaWidthCards >= 4);
  assert.ok(profile.areaHeightCards >= 4);
  assert.ok(profile.motifSpan >= 2);

  for (const assetCount of assetCounts) {
    const firstArea = new Set();
    for (let row = 0; row < profile.areaHeightCards; row += 1) {
      for (let column = 0; column < profile.areaWidthCards; column += 1) {
        firstArea.add(resolveWorldVisualSemanticSequenceIndex(
          column,
          row,
          0,
          assetCount,
          { profileId },
        ));
      }
    }
    assert.equal(
      firstArea.size,
      Math.min(assetCount, profile.motifSpan),
      `${profileId} areas must use one bounded authored motif`,
    );

    const fullDescent = new Set();
    for (
      let row = 0;
      row < assetCount * profile.areaHeightCards;
      row += 1
    ) {
      for (let column = 0; column < profile.areaWidthCards; column += 1) {
        fullDescent.add(resolveWorldVisualSemanticSequenceIndex(
          column,
          row,
          0,
          assetCount,
          { profileId },
        ));
      }
    }
    assert.equal(
      fullDescent.size,
      assetCount,
      `${profileId} must use the complete library over a full descent`,
    );

    assert.equal(
      resolveWorldVisualSemanticSequenceIndex(
        0,
        profile.areaHeightCards,
        0,
        assetCount,
        { profileId },
      ),
      1 % assetCount,
      `${profileId} neighboring depth areas evolve by one authored entry`,
    );
  }
}

for (const { column, row, seed, count } of [
  { column: 0, row: 0, seed: 7, count: 9 },
  { column: 8, row: 4, seed: 11, count: 14 },
  { column: -3, row: 17, seed: -5, count: 20 },
]) {
  const legacy = resolveWorldVisualSemanticSequenceIndex(
    column,
    row,
    seed,
    count,
    { search: "?naturalDepthAreas=0" },
  );
  assert.equal(legacy, ((column + row + seed) % count + count) % count);
}

const profileSources = Object.freeze({
  backdrop: fs.readFileSync(new URL(
    "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js",
    import.meta.url,
  ), "utf8"),
  terrain: fs.readFileSync(new URL(
    "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js",
    import.meta.url,
  ), "utf8"),
  groundStructure: fs.readFileSync(new URL(
    "../world/rendering/scenic-world/WorldVisualGroundStructureRegionView.js",
    import.meta.url,
  ), "utf8"),
});
for (const [profileId, source] of Object.entries(profileSources)) {
  assert.match(source, new RegExp(`profileId: "${profileId}"`));
}

console.log("natural depth area composition contract: ok");
