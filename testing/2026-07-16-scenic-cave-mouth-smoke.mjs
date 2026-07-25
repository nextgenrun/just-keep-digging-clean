import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CAVE_SCENE_CONFIG,
  resolveScenicCaveMouthsEnabled,
} from "../values/caveSceneConfig.js";

globalThis.Phaser = {
  Input: { Keyboard: { JustDown: () => true } },
};

const { CaveEntryController } = await import("../world/playScene/CaveEntryController.js");
const TILE_SIZE = 94;
const scenic = CAVE_SCENE_CONFIG.overworldEntrance.scenic;
const legacy = CAVE_SCENE_CONFIG.overworldEntrance.legacy;

function makeImage(x, y, textureKey) {
  return {
    x,
    y,
    textureKey,
    originX: null,
    originY: null,
    displayWidth: 0,
    displayHeight: 0,
    depth: null,
    alpha: null,
    tint: null,
    setOrigin(originX, originY) { this.originX = originX; this.originY = originY; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTint(tint) { this.tint = tint; return this; },
    destroy() { this.destroyed = true; },
  };
}

function makeScene(zones, textureExists = () => true) {
  const images = [];
  const tweens = [];
  const launches = [];
  const prompt = {
    setDepth() { return this; },
    setOrigin() { return this; },
    setVisible() { return this; },
    setPosition() { return this; },
    setText() { return this; },
    destroy() {},
  };
  const scene = {
    config: { tileSize: TILE_SIZE, topAirRows: 65 },
    worldVisualRuntimeMode: CAVE_SCENE_CONFIG.overworldEntrance.landmarkOwnership.scenicRuntimeMode,
    worldModel: {
      caveZones: zones,
      isSolid: (tx, ty) => zones.some(zone => zone.entry.tx === tx && zone.entry.ty + 1 === ty),
    },
    textures: { exists: textureExists },
    add: {
      text: () => prompt,
      image: (x, y, textureKey) => {
        const image = makeImage(x, y, textureKey);
        images.push(image);
        return image;
      },
    },
    tweens: {
      add: config => {
        const tween = { config, stopped: false, stop() { this.stopped = true; } };
        tweens.push(tween);
        return tween;
      },
    },
    playerController: { setControlsEnabled() {} },
    scene: {
      launch: (key, data) => launches.push({ key, data }),
      pause() {},
    },
  };
  return { scene, images, tweens, launches };
}

const shallow = {
  id: "cave-shallow",
  standaloneScene: true,
  entry: { tx: 7, ty: 40 },
  mouthAnchor: { tx: 6.5, ty: 40 },
  backgroundPresetKey: "caveAmber",
  cy: 40,
};
const deep = {
  id: "cave-deep",
  standaloneScene: true,
  entry: { tx: 13, ty: 70 },
  mouthAnchor: { tx: 12.5, ty: 70 },
  backgroundPresetKey: "caveViolet",
  cy: 70,
};

assert.equal(resolveScenicCaveMouthsEnabled(undefined, ""), true);
for (const value of CAVE_SCENE_CONFIG.overworldEntrance.scenicDisabledValues) {
  assert.equal(
    resolveScenicCaveMouthsEnabled(undefined, `?scenicCaveMouths=${value}`),
    false,
    value
  );
}
assert.ok(scenic.displayWidthTiles >= 2.5 && scenic.displayWidthTiles <= 3);
assert.equal(
  scenic.originY,
  scenic.alphaBounds.bottom / scenic.sourceSizePx,
  "measured visible alpha bottom, not transparent canvas padding, must own the floor baseline"
);
assert.equal(scenic.floorOffsetTiles, 0, "scenic cutout must meet the safe floor exactly");
assert.match(scenic.assetPath, /world-visual-v2\/landmarks\/underground-cave-mouth-v1\.png$/);
const scenicAsset = await readFile(new URL(`../${scenic.assetPath}`, import.meta.url));
assert.equal(scenicAsset.toString("ascii", 1, 4), "PNG", "scenic cave mouth must be a PNG cutout");
assert.equal(scenicAsset.readUInt32BE(16), scenic.sourceSizePx);
assert.equal(scenicAsset.readUInt32BE(20), scenic.sourceSizePx);
assert.equal(scenicAsset[25], 6, "scenic cave mouth PNG must retain RGBA color type");

globalThis.location = { search: "" };
const scenicHarness = makeScene([shallow, deep]);
const scenicController = new CaveEntryController(scenicHarness.scene);
scenicController.create();
assert.equal(scenicHarness.images.length, 1, "the landmark-owned shallowest cave must not be duplicated");
const [scenicImage] = scenicHarness.images;
assert.equal(scenicImage.textureKey, scenic.textureKey, "scenic default must never use legacy caveWall");
assert.equal(scenicImage.x, (deep.mouthAnchor.tx + 0.5) * TILE_SIZE, "mouth must remain world-anchored");
assert.equal(scenicImage.y, (deep.mouthAnchor.ty + 1) * TILE_SIZE, "mouth bottom must meet safe entry floor");
assert.equal(scenicImage.originX, scenic.originX);
assert.equal(scenicImage.originY, scenic.originY);
assert.equal(scenicImage.displayWidth, scenic.displayWidthTiles * TILE_SIZE);
assert.equal(scenicImage.displayHeight, scenic.displayHeightTiles * TILE_SIZE);
assert.equal(scenicImage.depth, scenic.depth);
assert.equal(scenicImage.tint, scenic.tint);
assert.equal(scenicHarness.tweens.length, 1, "scenic mouth must receive one restrained pulse tween");
assert.equal(scenicHarness.tweens[0].config.duration, scenic.pulse.durationMs);
assert.equal(scenicHarness.tweens[0].config.alpha, scenic.alpha - scenic.pulse.alphaDelta);
assert.equal(scenicController.update(deep.entry, { interact: {} }), true, "entry interaction must stay functional");
assert.equal(scenicHarness.launches[0]?.key, CAVE_SCENE_CONFIG.sceneKey);

globalThis.location.search = "?scenicCaveMouths=0";
const legacyHarness = makeScene([shallow, deep]);
const legacyController = new CaveEntryController(legacyHarness.scene);
legacyController.create();
assert.equal(legacyHarness.images.length, 2, "rollback must restore one legacy sprite per standalone cave");
assert.equal(legacyHarness.images[0].textureKey, legacy.textureKey);
assert.equal(legacyHarness.images[0].originY, legacy.originY);
assert.equal(
  legacyHarness.images[0].y,
  (shallow.mouthAnchor.ty + 1 + legacy.floorOffsetTiles) * TILE_SIZE,
  "rollback must preserve the old mouth-center anchor"
);
assert.equal(legacyHarness.tweens.length, 0, "legacy rollback must not inherit scenic pulse");

globalThis.location.search = "";
const missingHarness = makeScene([deep], key => key === legacy.textureKey);
new CaveEntryController(missingHarness.scene).create();
assert.equal(missingHarness.images.length, 0, "missing scenic art must not silently show the opaque legacy square");

const controllerSource = await readFile(
  new URL("../world/playScene/CaveEntryController.js", import.meta.url),
  "utf8"
);
const bootSource = await readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
assert.doesNotMatch(controllerSource, /ASSET_KEYS\.tiles\.caveWall/);
assert.match(controllerSource, /resolveScenicCaveMouthsEnabled/);
assert.match(controllerSource, /anchor\.ty \+ 1 \+ visual\.floorOffsetTiles/);
assert.match(bootSource, /caveEntrance\.scenic\.textureKey/);
assert.match(bootSource, /caveEntrance\.scenic\.assetPath/);

delete globalThis.location;
delete globalThis.Phaser;
console.log("Scenic recurring CaveScene mouth contract passed");
