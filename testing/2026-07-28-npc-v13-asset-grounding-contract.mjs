import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  getNpcActivityPreloadAssets,
  NPC_ACTIVITY_CONFIG,
  resolveNpcGroundContact,
} from "../values/npcActivityConfig.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const preloadAssets = getNpcActivityPreloadAssets(
  ASSET_KEYS.npcs.merchantActivities,
);
assert.equal(
  preloadAssets.length,
  42,
  "six merchants need seven accepted activity frames each",
);
assert.equal(
  new Set(preloadAssets.map(asset => asset.key)).size,
  preloadAssets.length,
  "every runtime activity key must be unique",
);
for (const asset of preloadAssets) {
  const relativePath = asset.path.split("?")[0];
  assert.ok(existsSync(`${root}${relativePath}`), `missing ${relativePath}`);
  assert.match(relativePath, /npc-v13-piskel-polished-activities/);
  assert.doesNotMatch(relativePath, /quiet|npc-v11/);
}

const manifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v13-piskel-polished-activities/manifest.json`,
  "utf8",
));
const baselineManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v13-polished-baselines/manifest.json`,
  "utf8",
));
const archivedManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v11-piskel-motion-idles/manifest.json`,
  "utf8",
));
const reviewManifest = JSON.parse(readFileSync(
  `${root}visual-approval-previews/npc-planted-idles-v5/manifest.json`,
  "utf8",
));
const cropSourceManifest = JSON.parse(readFileSync(
  `${root}sprites/npc/npc-v9-planted-idles/manifest.json`,
  "utf8",
));

assert.equal(manifest.runtimeApproved, true);
assert.equal(manifest.reviewOnly, false);
assert.equal(manifest.productionChanged, true);
assert.equal(manifest.walkingRemoved, true);
assert.equal(manifest.piskelRoundTripped, true);
assert.equal(manifest.silhouetteMatched, true);
assert.equal(manifest.chromaLeakRemoved, true);
assert.equal(manifest.rejectedQuietConceptsExcluded, true);
assert.equal(manifest.frameCount, 42);
assert.deepEqual(manifest.canvas, [512, 512]);
assert.deepEqual(manifest.activityOrder, NPC_ACTIVITY_CONFIG.activityIds);
assert.equal(archivedManifest.runtimeApproved, false);
assert.equal(archivedManifest.reviewOnly, true);
assert.equal(archivedManifest.activeProduction, false);
assert.equal(baselineManifest.runtimeApproved, true);
assert.equal(baselineManifest.sourceAssetsPreserved, true);
assert.equal(baselineManifest.chromaLeakRemoved, true);
assert.equal(Object.keys(baselineManifest.static).length, 6);
assert.equal(Object.keys(baselineManifest.video).length, 5);

for (const merchant of Object.values(NPC_ACTIVITY_CONFIG.merchants)) {
  const merchantRecord = manifest.merchants[merchant.assetSlug];
  const baselineRecord = baselineManifest.static[merchant.assetSlug];
  assert.ok(merchantRecord.uniformScale >= 0.85);
  assert.ok(merchantRecord.uniformScale <= 1.25);
  assert.ok(merchantRecord.silhouetteErrorPx <= 0.5);
  assert.ok(merchantRecord.maxBaselineRootErrorPx <= 1);
  assert.ok(merchantRecord.maxBaselineBottomErrorPx <= 0.5);
  assert.equal(merchantRecord.largeGreenLeakPixelsAfter, 0);
  assert.equal(baselineRecord.hiddenRgbPixels, 0);
  assert.equal(baselineRecord.cleanup.largeGreenLeakPixelsAfter, 0);
  assert.equal(
    merchantRecord.baselineSilhouetteHeightPx,
    baselineRecord.mainSilhouetteHeightAt512,
  );
  assert.equal(
    merchant.footBottomYAtReferencePx,
    baselineRecord.rootAnchorAt512[1],
  );
  assert.ok(merchantRecord.drift.maxRootAnchorDriftPx <= 1);
  assert.equal(merchantRecord.drift.maxBottomDriftPx, 0);
  assert.ok(existsSync(`${root}${merchantRecord.sourcePiskel}`));
  assert.ok(existsSync(`${root}${baselineRecord.path}`));
  assert.deepEqual(
    Object.keys(merchantRecord.assets),
    NPC_ACTIVITY_CONFIG.activityIds,
  );
  const piskel = JSON.parse(readFileSync(
    `${root}${merchantRecord.sourcePiskel}`,
    "utf8",
  )).piskel;
  assert.equal(JSON.parse(piskel.layers[0]).frameCount, 7);
  for (const record of Object.values(merchantRecord.assets)) {
    assert.deepEqual(record.dimensions, [512, 512]);
    assert.equal(record.edgeOpaquePixels, 0);
    assert.equal(record.hiddenRgbPixels, 0);
    assert.equal(record.largeGreenLeakPixels, 0);
    assert.ok(
      Math.abs(record.bottom - merchantRecord.targetAnchor[1]) <= 0.5,
    );
    assert.ok(record.alphaBounds[0] > 0 && record.alphaBounds[1] > 0);
    assert.ok(record.alphaBounds[2] < 512 && record.alphaBounds[3] < 512);
  }
}

for (const video of Object.values(baselineManifest.video)) {
  assert.equal(video.frames, 120);
  assert.equal(video.outputVerification.frames, 120);
  assert.equal(video.outputVerification.largeGreenLeakPixels, 0);
  assert.ok(existsSync(`${root}${video.path}`));
}

const supportedPlayerDisplaySizesPx = [89, 94, 109];
for (const [merchantId, merchant] of Object.entries(
  NPC_ACTIVITY_CONFIG.merchants,
)) {
  assert.equal(
    "groundOffsetPx" in merchant,
    false,
    `${merchantId} must not retain a display-size-dependent fixed offset`,
  );
  for (const playerDisplaySizePx of supportedPlayerDisplaySizesPx) {
    const displaySizePx = playerDisplaySizePx
      * NPC_ACTIVITY_CONFIG.render.displayScale;
    const contact = resolveNpcGroundContact(merchantId, displaySizePx);
    assert.equal(contact.calibrated, true);
    assert.ok(contact.bottomPaddingPx > 0);
    assert.ok(contact.anchorOffsetPx > contact.bottomPaddingPx);
    assert.ok(
      Math.abs(
        contact.anchorOffsetPx
          - contact.bottomPaddingPx
          - NPC_ACTIVITY_CONFIG.render.groundContactSinkPx
      ) <= NPC_ACTIVITY_CONFIG.health.groundContactTolerancePx,
      `${merchantId} must meet the platform at ${playerDisplaySizePx}px profile scale`,
    );
  }
}

const creatureRows = reviewManifest.boards["creature-base"].rows;
const gemQuiet = cropSourceManifest.assets["gem-power-merchant"].quiet;
assert.ok(
  creatureRows[2][0] - creatureRows[1][1] >= 6,
  "Gem and Magma source rows need a real empty gutter",
);
assert.equal(gemQuiet.sourcePanel[3], creatureRows[1][1]);
assert.ok(
  gemQuiet.sourcePanel[3] < creatureRows[2][0],
  "Gem crop must end before any Magma head pixel can enter",
);

console.log("NPC v13 asset and scale-aware grounding contract passed");
