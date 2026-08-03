import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanChamberAssets,
  getTitanDiscoveryPreloadAssets,
  resolveTitanChamberAsset,
  resolveTitanChamberBlendEnabled,
  resolveTitanChambersEnabled,
} from "../values/titanDiscoveries.js";
import {
  mixWorldVisualTint,
  resolveWorldVisualDepthBackdropTint,
} from "../values/worldVisualDepthBackdrops.js";
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

function readExtendedWebp(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  assert.equal(buffer.toString("ascii", 12, 16), "VP8X");
  const readUInt24LE = offset => (
    buffer[offset]
    | (buffer[offset + 1] << 8)
    | (buffer[offset + 2] << 16)
  );
  const chunks = [];
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkName = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    chunks.push(chunkName);
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return {
    width: readUInt24LE(24) + 1,
    height: readUInt24LE(27) + 1,
    hasAlphaFlag: Boolean(buffer[20] & 0x10),
    hasAlphaChunk: chunks.includes("ALPH"),
  };
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
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
const rollbackChamberAssets = getTitanChamberAssets(
  undefined,
  "?titanChamberBlend=0",
);
const preloadAssets = getTitanDiscoveryPreloadAssets();
assert.equal(chamberAssets.length, 25);
assert.equal(rollbackChamberAssets.length, 25);
assert.equal(new Set(chamberAssets.map(asset => asset.key)).size, 25);
assert.ok(chamberAssets.every(asset => asset.key.endsWith("-v3")));
assert.ok(rollbackChamberAssets.every(asset => asset.key.endsWith("-v2")));
assert.equal(getTitanChamberAssets(undefined, "?titanChambers=0").length, 0);
assert.equal(resolveTitanChambersEnabled(undefined, "?titanChambers=0"), false);
assert.equal(resolveTitanChambersEnabled(undefined, "?titanChambers=1"), true);
assert.equal(resolveTitanChambersEnabled(undefined, "?titans=0"), false);
assert.equal(resolveTitanChamberBlendEnabled(undefined, ""), true);
assert.equal(resolveTitanChamberBlendEnabled(undefined, "?titanChamberBlend=0"), false);
assert.equal(preloadAssets.length, 56);
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
  const blendedFile = fs.readFileSync(
    path.join(ROOT, definition.chamberBlendAsset.path),
  );
  assert.deepEqual(
    readExtendedWebp(blendedFile),
    {
      width: TITAN_DISCOVERY_CONFIG.chambers.nativeWidthPx,
      height: TITAN_DISCOVERY_CONFIG.chambers.nativeHeightPx,
      hasAlphaFlag: true,
      hasAlphaChunk: true,
    },
    `${definition.id} blended chamber dimensions and alpha`,
  );
  assert.ok(
    blendedFile.length > 100_000,
    `${definition.id} blended chamber is suspiciously small`,
  );
  assert.equal(resolveTitanChamberAsset(definition), definition.chamberBlendAsset);
  assert.equal(
    resolveTitanChamberAsset(
      definition,
      TITAN_DISCOVERY_CONFIG,
      "?titanChamberBlend=0",
    ),
    definition.chamberAsset,
  );
}

const sourceManifest = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "sprites/backgrounds/titan-chambers-v2/2026-07-26-titan-chambers-production-manifest-v2.json",
  ),
  "utf8",
));
assert.equal(sourceManifest.complete, true);
assert.equal(sourceManifest.count, 25);
assert.deepEqual(sourceManifest.runtimeSize, [1536, 848]);
assert.equal(new Set(sourceManifest.cards.map(card => card.sha256)).size, 25);

const blendManifest = JSON.parse(fs.readFileSync(
  path.join(
    ROOT,
    "sprites/backgrounds/titan-chambers-v3/2026-07-28-titan-chambers-production-manifest-v3.json",
  ),
  "utf8",
));
assert.equal(blendManifest.complete, true);
assert.equal(blendManifest.count, 25);
assert.equal(blendManifest.sourceGenerationMode, "built-in ImageGen");
assert.deepEqual(blendManifest.runtimeSize, [1536, 848]);
assert.equal(new Set(blendManifest.cards.map(card => card.sha256)).size, 25);
for (const card of blendManifest.cards) {
  const runtime = fs.readFileSync(path.join(ROOT, card.runtime));
  assert.equal(runtime.length, card.bytes, `${card.id} manifest byte count`);
  assert.equal(sha256(runtime), card.sha256, `${card.id} manifest hash`);
  assert.equal(card.cornerAlphaMax, 0, `${card.id} transparent corners`);
  assert.ok(card.edgeMeanAlpha < 72, `${card.id} feathered edge`);
  assert.ok(card.centerMinAlpha >= 250, `${card.id} readable focal center`);
}

const loader = new FakeLoader();
const textureKeys = new Set();
const removedKeys = [];
const gameEvents = new EventEmitter();
const scene = {
  game: { events: gameEvents },
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
const compactSprite = new FakeImage(0, 0, definition.surfaceAsset.key, 768, 768);
const compactGlow = new FakeImage(0, 0, definition.surfaceAsset.key, 768, 768);
const view = {
  zone: {
    left: 20,
    top: 80,
    rightExclusive: 38,
    bottomExclusive: 90,
    centerYTile: 85,
  },
  definition,
  sprite: compactSprite,
  glowSprite: compactGlow,
  baseX: 29 * 94,
  baseY: 85 * 94,
  chamberCenterY: 85 * 94,
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
const lighting = { farTint: 0xb8d2da, lightning: 0 };
stream.sync({ tx: 29, ty: 85 }, lighting);
assert.equal(loader.queued.length, 1);
assert.equal(loader.queued[0].key, definition.chamberBlendAsset.key);
assert.equal(stream.getSnapshot().pending, 1);
textureKeys.add(definition.chamberBlendAsset.key);
loader.emit(`filecomplete-image-${definition.chamberBlendAsset.key}`);
assert.equal(view.visualMode, "chamber");
assert.equal(compactSprite.visible, true);
assert.equal(view.sprite, compactSprite);
assert.ok(view.chamberSprite);
assert.ok(
  view.chamberSprite.depth < TITAN_DISCOVERY_CONFIG.underground.spriteDepth,
  "the streamed chamber must remain behind the high-resolution stance",
);
assert.equal(stream.getSnapshot().resident, 1);
assert.equal(stream.getSnapshot().blendEnabled, true);
assert.equal(stream.getSnapshot().assetVersion, "titan-chambers-v3");
assert.equal(
  view.chamberSprite.tint,
  mixWorldVisualTint(
    0xffffff,
    resolveWorldVisualDepthBackdropTint(85, lighting),
    TITAN_DISCOVERY_CONFIG.underground.structureEnvironmentTintMix,
  ),
);
assert.notEqual(view.chamberSprite.tint, 0xffffff);

let archiveReady = 0;
const releaseArchive = stream.pinArchive(definition, {
  onReady: asset => {
    assert.equal(asset.key, definition.chamberBlendAsset.key);
    archiveReady += 1;
  },
});
assert.equal(archiveReady, 1);
assert.equal(stream.getSnapshot().pinned, 1);
releaseArchive();
stream.sync({ tx: 200, ty: 200 });
assert.equal(view.visualMode, "stance");
assert.equal(compactSprite.visible, true);
assert.equal(view.chamberSprite, null);
assert.equal(stream.getSnapshot().releasePending, 1);
assert.ok(
  textureKeys.has(definition.chamberBlendAsset.key),
  "a detached chamber texture must survive until the current render completes",
);
stream.sync({ tx: 29, ty: 85 }, lighting);
assert.ok(view.chamberSprite);
assert.equal(stream.getSnapshot().releasePending, 0);
gameEvents.emit("postrender");
assert.ok(
  textureKeys.has(definition.chamberBlendAsset.key),
  "returning to a chamber before post-render must cancel its texture eviction",
);
stream.sync({ tx: 200, ty: 200 });
assert.equal(stream.getSnapshot().releasePending, 1);
gameEvents.emit("postrender");
assert.ok(removedKeys.includes(definition.chamberBlendAsset.key));
assert.equal(stream.getSnapshot().releasePending, 0);
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
