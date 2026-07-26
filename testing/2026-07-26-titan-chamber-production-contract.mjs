import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanChamberAssets,
  getTitanDiscoveryPreloadAssets,
  resolveTitanChambersEnabled,
} from "../values/titanDiscoveries.js";
import { TitanChamberStream } from "../systems/visual/TitanChamberStream.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readLossyWebpSize(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  assert.equal(buffer.toString("ascii", 12, 16), "VP8 ");
  assert.deepEqual([...buffer.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff,
  };
}

class FakeImage {
  constructor(x, y, key, width = 1536, height = 848) {
    Object.assign(this, { x, y, key, width, height, visible: true });
  }
  setDepth(value) { this.depth = value; return this; }
  setScale(value) { this.scaleX = value; this.scaleY = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  destroy() { this.destroyed = true; }
}

class FakeLoader extends EventEmitter {
  constructor() {
    super();
    this.queued = [];
    this.loading = false;
  }
  image(key, assetPath) { this.queued.push({ key, path: assetPath }); }
  isLoading() { return this.loading; }
  start() { this.loading = true; }
}

const chamberAssets = getTitanChamberAssets();
const preloadAssets = getTitanDiscoveryPreloadAssets();
assert.equal(chamberAssets.length, 25);
assert.equal(new Set(chamberAssets.map(asset => asset.key)).size, 25);
assert.equal(getTitanChamberAssets(undefined, "?titanChambers=0").length, 0);
assert.equal(resolveTitanChambersEnabled(undefined, "?titanChambers=0"), false);
assert.equal(resolveTitanChambersEnabled(undefined, "?titanChambers=1"), true);
assert.equal(resolveTitanChambersEnabled(undefined, "?titans=0"), false);
assert.equal(preloadAssets.length, 26);
assert.ok(chamberAssets.every(asset => (
  !preloadAssets.some(preload => preload.key === asset.key)
)), "high-resolution cards must stream instead of entering Boot");

for (const definition of TITAN_DEFINITIONS) {
  assert.ok(definition.zoneWidthTiles >= 15 && definition.zoneWidthTiles <= 22);
  assert.ok(definition.zoneHeightTiles >= 8 && definition.zoneHeightTiles <= 13);
  const file = fs.readFileSync(path.join(ROOT, definition.chamberAsset.path));
  assert.deepEqual(
    readLossyWebpSize(file),
    {
      width: TITAN_DISCOVERY_CONFIG.chambers.nativeWidthPx,
      height: TITAN_DISCOVERY_CONFIG.chambers.nativeHeightPx,
    },
    `${definition.id} chamber dimensions`,
  );
  assert.ok(file.length > 100_000, `${definition.id} chamber is suspiciously small`);
}

const manifest = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "sprites/backgrounds/titan-chambers-v2/2026-07-26-titan-chambers-production-manifest-v2.json",
  ),
  "utf8",
));
assert.equal(manifest.complete, true);
assert.equal(manifest.count, 25);
assert.deepEqual(manifest.runtimeSize, [1536, 848]);
assert.equal(new Set(manifest.cards.map(card => card.sha256)).size, 25);

const loader = new FakeLoader();
const textureKeys = new Set();
const removedKeys = [];
const scene = {
  load: loader,
  textures: {
    exists: key => textureKeys.has(key),
    remove: key => {
      removedKeys.push(key);
      textureKeys.delete(key);
    },
  },
  add: { image: (x, y, key) => new FakeImage(x, y, key) },
  tweens: { killTweensOf() {} },
};
const definition = TITAN_DEFINITIONS[0];
const compactSprite = new FakeImage(0, 0, definition.asset.key, 256, 256);
const compactGlow = new FakeImage(0, 0, definition.asset.key, 256, 256);
const view = {
  zone: {
    left: 20,
    top: 80,
    rightExclusive: 38,
    bottomExclusive: 90,
  },
  definition,
  sprite: compactSprite,
  glowSprite: compactGlow,
  baseX: 29 * 94,
  baseY: 85 * 94,
  settledX: 29 * 94,
  baseScale: 1,
  widthPx: 18 * 94,
  heightPx: 10 * 94,
  animating: false,
};
let changeCount = 0;
const stream = new TitanChamberStream(
  scene,
  { tileSize: 94 },
  TITAN_DISCOVERY_CONFIG,
  () => changeCount += 1,
);
stream.create([view]);
stream.sync({ tx: 29, ty: 85 });
assert.equal(loader.queued.length, 1);
assert.equal(stream.getSnapshot().pending, 1);
textureKeys.add(definition.chamberAsset.key);
loader.emit(`filecomplete-image-${definition.chamberAsset.key}`);
assert.equal(view.visualMode, "chamber");
assert.equal(compactSprite.visible, false);
assert.equal(stream.getSnapshot().resident, 1);

let archiveReady = 0;
const releaseArchive = stream.pinArchive(definition, {
  onReady: asset => {
    assert.equal(asset.key, definition.chamberAsset.key);
    archiveReady += 1;
  },
});
assert.equal(archiveReady, 1);
assert.equal(stream.getSnapshot().pinned, 1);
releaseArchive();
stream.sync({ tx: 200, ty: 200 });
assert.equal(view.visualMode, "compact");
assert.equal(compactSprite.visible, true);
assert.ok(removedKeys.includes(definition.chamberAsset.key));
assert.ok(changeCount > 0);
stream.destroy();
assert.equal(loader.listenerCount("loaderror"), 0);

const systemSource = fs.readFileSync(
  path.join(ROOT, "systems/visual/TitanDiscoverySystem.js"),
  "utf8",
);
const archiveSource = fs.readFileSync(
  path.join(ROOT, "ui/overlays/TitanArchiveView.js"),
  "utf8",
);
const pauseSource = fs.readFileSync(
  path.join(ROOT, "world/playScene/PlaySceneUI.js"),
  "utf8",
);
for (const rendererPath of [
  "world/rendering/WorldRenderer.js",
  "world/rendering/scenic-world/WorldVisualRuntime.js",
]) {
  assert.match(
    fs.readFileSync(path.join(ROOT, rendererPath), "utf8"),
    /getTitanArchiveAssetProvider/,
  );
}
assert.match(systemSource, /chamberStream\.sync/);
assert.match(systemSource, /getArchiveAssetProvider/);
assert.match(archiveSource, /chamberProvider\.pinArchive/);
assert.match(pauseSource, /getTitanArchiveAssetProvider/);

console.log("titan chamber production contract: PASS");
