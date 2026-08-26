import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SYSTEM_INTRODUCTION_CONFIG } from "../values/systemIntroduction.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";

const source = await readFile(
  new URL("../systems/visual/HudQuickControls.js", import.meta.url),
  "utf8",
);

assert.equal(
  (source.match(/scene\.add\.zone\(0, 0, 1, 1\)/g) || []).length,
  3,
  "each authored quick control must own a dedicated invisible input zone",
);
assert.doesNotMatch(
  source,
  /\.setVisible\(this\.visible\)\s*\.setInteractive/,
  "visual containers must not double as ambiguous input geometry",
);

for (const name of ["inventory", "pause", "map"]) {
  assert.match(
    source,
    new RegExp(`this\\.${name}Hit\\.input\\?\\.hitArea\\?\\.setTo\\?\\.\\(\\s*0,\\s*0,\\s*${name}HitWidth,\\s*${name}HitHeight`),
    `${name} hit area must use Phaser's local display-origin coordinates`,
  );
}
assert.match(source, /activate: this\.onMap/);
assert.match(source, /label\.replace\("\{key\}", USER_SETTINGS\.getKeyLabel\("map"\)\)/);
assert.equal(
  SYSTEM_INTRODUCTION_CONFIG.featureUnlocks.map,
  "always",
  "the visible world-map control must be usable on a fresh run",
);
assert.equal(
  RUNTIME_ASSET_LOADING.featureResidency.groups[
    RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap
  ].bypassPressureGate,
  true,
  "the Map must open immediately instead of appearing dead behind asset deferral",
);

console.log("HUD quick-control hit-area contract passed: Inventory, Menu, and Map use Phaser-local clickable bounds.");
