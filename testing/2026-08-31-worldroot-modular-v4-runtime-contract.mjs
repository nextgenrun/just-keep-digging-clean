import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  WORLDROOT_MODULAR_V4_CONFIG,
  getWorldrootModularV4PreloadAssets,
  isWorldrootModularV4Enabled,
} from "../values/worldrootModularV4.js";
import { WorldrootModularV4View } from "../systems/visual/WorldrootModularV4View.js";

const assetRoot = new URL("../sprites/environment/worldroot-modular-v4/", import.meta.url);
const manifest = JSON.parse(await readFile(
  new URL("worldroot-modular-v4.manifest.json", assetRoot),
  "utf8",
));

assert.equal(WORLDROOT_MODULAR_V4_CONFIG.enabledByDefault, false);
assert.equal(isWorldrootModularV4Enabled(""), false, "ordinary play now uses the ground sanctuary");
assert.equal(isWorldrootModularV4Enabled("?worldrootArt=v4"), true, "V4 remains an explicit rollback");
assert.equal(isWorldrootModularV4Enabled("?worldrootArt=v3"), false, "V3 must remain a rollback");
assert.equal(
  isWorldrootModularV4Enabled("?worldrootWhitebox=1"),
  false,
  "the isolated whitebox review must retain precedence",
);

assert.equal(manifest.version, 4);
assert.equal(manifest.contract, "native-pixel-modules-no-runtime-stretch");
assert.equal(manifest.modules.length, 6);
assert.deepEqual(
  manifest.modules.map(module => module.id),
  WORLDROOT_MODULAR_V4_CONFIG.modules.map(module => module.id),
);

const preloadAssets = getWorldrootModularV4PreloadAssets("?worldrootArt=v4");
assert.equal(preloadAssets.length, 12, "six modules require living and consumed textures");
assert.equal(new Set(preloadAssets.map(asset => asset.key)).size, 12);
assert.equal(getWorldrootModularV4PreloadAssets("?worldrootArt=v3").length, 0);

for (const [index, module] of manifest.modules.entries()) {
  const config = WORLDROOT_MODULAR_V4_CONFIG.modules[index];
  assert.ok(module.width <= config.maxWidthPx);
  assert.equal(module.runtimeScale, 1);
  assert.notEqual(module.hashes.living, module.hashes.consumed);
  for (const state of ["living", "consumed"]) {
    const bytes = await readFile(new URL(module[state], assetRoot));
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash, module.hashes[state], `${module.id} ${state} hash drifted`);
  }
}

const dimensions = new Map(manifest.modules.map(module => [module.id, module]));
const makeImage = key => {
  const module = WORLDROOT_MODULAR_V4_CONFIG.modules.find(candidate => (
    candidate.living.key === key || candidate.consumed.key === key
  ));
  const size = dimensions.get(module.id);
  return {
    key,
    width: size.width,
    height: size.height,
    displayWidth: size.width,
    displayHeight: size.height,
    alpha: 1,
    destroyed: false,
    setOrigin() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(scale) {
      this.scale = scale;
      this.displayWidth = this.width * scale;
      this.displayHeight = this.height * scale;
      return this;
    },
    setDepth(depth) { this.depth = depth; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    destroy() { this.destroyed = true; },
  };
};
const scene = {
  config: { tileSize: 94 },
  textures: { exists: key => preloadAssets.some(asset => asset.key === key) },
  add: { image: (_x, _y, key) => makeImage(key) },
};
const snapshot = {
  signature: "runtime-pair-test",
  growthStage: 6,
  knownStarCount: 10,
  consumedStarCount: 5,
  regionMemories: [
    { id: "surface-entry", consumedRatio: 0 },
    { id: "level1-blue", consumedRatio: 0.25 },
    { id: "level1-amber", consumedRatio: 1 },
  ],
};
const previousLocation = globalThis.location;
globalThis.location = { search: "?worldrootArt=v4" };
const view = new WorldrootModularV4View(scene).create(snapshot);
globalThis.location = previousLocation;
assert.equal(view.enabled, true);
assert.equal(view.entries.length, 6);
const expectedPlatformCount = WORLDROOT_MODULAR_V4_CONFIG.modules.reduce(
  (count, module) => count + module.platforms.length,
  0,
);
const spritePlatforms = view.getOneWayPlatforms();
assert.equal(spritePlatforms.length, expectedPlatformCount);
assert.ok(spritePlatforms.every(platform => platform.source === "worldroot-modular-v4-sprite-alpha"));
for (const entry of view.entries) {
  for (const platform of entry.module.platforms) {
    const runtime = spritePlatforms.find(candidate => candidate.id === `worldroot-${platform.id}`);
    assert.ok(runtime, `${platform.id} is absent from runtime collision`);
    assert.equal(runtime.leftX, entry.living.x + platform.leftPx);
    assert.equal(runtime.rightX, entry.living.x + platform.rightPx);
    assert.equal(runtime.y, entry.living.y + platform.yPx);
  }
}
assert.equal(view.entries[0].living.alpha, 1, "left-in-world Stars keep living art visible");
assert.equal(view.entries[0].consumed.alpha, 0);
assert.equal(view.entries[1].living.alpha, 0.5);
assert.equal(view.entries[1].consumed.alpha, 0.5, "partial consumption must visibly crossfade");
assert.equal(view.entries[2].living.alpha, 0);
assert.equal(view.entries[2].consumed.alpha, 1, "consumed territory must use consumed art");
assert.ok(view.entries.at(-1).consumed.alpha > 0, "the Crown must reflect aggregate consumption");

const [bootSource, visualSource] = await Promise.all([
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/WorldrootWorldVisual.js", import.meta.url), "utf8"),
]);
assert.match(bootSource, /getWorldrootModularV4PreloadAssets\(\)/);
assert.match(visualSource, /new WorldrootModularV4View\(this\.scene\)\.create\(snapshot\)/);
assert.ok(
  visualSource.indexOf("new WorldrootWhiteboxView")
    < visualSource.indexOf("new WorldrootModularV4View"),
  "the explicit review route must remain ahead of production V4",
);
assert.match(visualSource, /this\.livingBody = this\._createImage/, "V3 fallback must remain available");

view.destroy();
assert.equal(view.entries.length, 0);

console.log("WORLDROOT_MODULAR_V4_RUNTIME_CONTRACT_OK");
