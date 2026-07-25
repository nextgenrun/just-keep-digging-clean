import assert from "node:assert/strict";

globalThis.Phaser = {
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  Loader: { Events: { COMPLETE: "complete" } },
};
globalThis.location = { search: "?worldFacade=1" };

const { ASSET_KEYS } = await import("../values/assetKeys.js");
const { LEVEL_ONE_GROUND_FACADE } = await import("../values/levelOneGroundFacade.js");
const { TILE_TYPES } = await import("../values/tileTypes.js");
const { WORLD_SCENIC_FACADE } = await import("../values/worldScenicFacade.js");
const { WorldScenicFacadeSystem } = await import("../world/rendering/WorldScenicFacadeSystem.js");

function displayObject(textureKey = null) {
  return {
    textureKey,
    visible: true,
    destroyed: false,
    tint: 0xffffff,
    setOrigin() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setMask(value) { this.mask = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setTexture(key, frame) { this.textureKey = key; this.frame = frame; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setScale(value) { this.scale = value; return this; },
    setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; },
    destroy() { this.destroyed = true; },
  };
}

function makeScene() {
  const materialKeys = Object.keys(WORLD_SCENIC_FACADE.materials)
    .map(material => `world-scenic-facade-${material}`);
  const atlasKey = ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas;
  const atlasFrames = new Set();
  const textureMap = new Map(materialKeys.map(key => [key, {
    has() { return true; },
    getSourceImage() { return { width: 2508, height: 2508 }; },
  }]));
  textureMap.set(atlasKey, {
    has(name) { return atlasFrames.has(name); },
    add(name) { atlasFrames.add(name); },
    getSourceImage() {
      const frameSize = LEVEL_ONE_GROUND_FACADE.recognitionAtlas.frameSizePx;
      return { width: 8 * frameSize, height: 6 * frameSize };
    },
  });
  const tileSprites = [];
  const images = [];
  const maskGraphics = {
    fills: [],
    destroyed: false,
    clear() { this.fills = []; return this; },
    fillStyle() { return this; },
    fillRect(x, y, width, height) { this.fills.push({ x, y, width, height }); return this; },
    createGeometryMask() { return { owner: this, destroyed: false, destroy() { this.destroyed = true; } }; },
    destroy() { this.destroyed = true; },
  };
  const scene = {
    config: { tileSize: 94 },
    time: { now: 0 },
    game: { loop: { actualFps: 60 } },
    worldBackgroundMasterSystem: { enabled: true, depthEnabled: true },
    weatherSystem: { kind: "rain", intensity: 0.7 },
    dayNightCycle: { getNightAmount: () => 0.8 },
    cameras: { main: { worldView: { x: 0, y: 75 * 94, width: 1280, height: 720 }, zoom: 1 } },
    textures: {
      exists(key) { return textureMap.has(key) || ASSET_KEYS.tiles.dynamicSoil.cracks.includes(key); },
      get(key) { return textureMap.get(key); },
      remove(key) { textureMap.delete(key); },
    },
    make: { graphics() { return maskGraphics; } },
    add: {
      tileSprite() {
        throw new Error("world facade must not allocate Phaser TileSprite canvases");
      },
      image(x, y, key, frame) {
        const image = Object.assign(displayObject(key), { x, y, frame });
        images.push(image);
        return image;
      },
    },
    load: {
      isLoading: () => false,
      on() {}, off() {}, once() {}, image() {}, start() {},
    },
    events: { once() {}, off() {} },
  };
  return { scene, tileSprites, images, maskGraphics };
}

const tileTypes = new Map([
  ["2,76", TILE_TYPES.AIR],
  ["3,76", TILE_TYPES.COPPER],
  ["4,76", TILE_TYPES.DIRT],
]);
const hitPoints = new Map([["4,76", 50]]);
const worldModel = {
  getTileType(tx, ty) { return tileTypes.get(`${tx},${ty}`) ?? TILE_TYPES.DIRT; },
  getTileHp(tx, ty) { return hitPoints.get(`${tx},${ty}`) ?? 100; },
  getTileMaxHp() { return 100; },
};

const { scene, tileSprites, images, maskGraphics } = makeScene();
const system = new WorldScenicFacadeSystem(scene, worldModel);
assert.equal(system.create(), true);
assert.equal(tileSprites.length, 0, "facade must never allocate a repeated canvas");
let materialImages = images.filter(image => image.name?.startsWith("world-scenic-facade-") && !image.destroyed);
assert.equal(materialImages.length, 1, "only the camera-intersecting material repeat should exist");
assert.equal(materialImages[0].x, 0, "material repeat must stay anchored to the world span");
assert.equal(materialImages[0].y, 75 * 94, "material repeat must stay anchored to its authored band");
assert.equal(materialImages[0].alpha, 1, "facade must stay opaque over functional square tiles");
assert.ok(materialImages[0].mask, "solid material must use the authoritative occupancy mask");
assert.deepEqual(materialImages[0].crop, { x: 0, y: 0, width: 2508, height: 2508 });
assert.ok(maskGraphics.fills.some(fill => fill.x === 3 * 94 && fill.y === 76 * 94));
assert.ok(!maskGraphics.fills.some(fill => fill.x === 2 * 94 && fill.y === 76 * 94), "air must remain a true visible hole");
assert.ok(system.markerPool.some(image => image.visible && image.frame?.startsWith("level1-ground-recognition-")));
assert.ok(system.crackPool.some(image => image.visible && image.textureKey === ASSET_KEYS.tiles.dynamicSoil.cracks[2]));

tileTypes.set("3,76", TILE_TYPES.AIR);
system.update(1000, 16, true);
assert.ok(!maskGraphics.fills.some(fill => fill.x === 3 * 94 && fill.y === 76 * 94), "digging must remove the exact solid mask cell");
assert.equal(materialImages[0].x, 0, "camera/mask updates must never move the material with the player");

scene.cameras.main.worldView = { x: 3000, y: 75 * 94 + 3000, width: 1280, height: 720 };
system.update(2000, 16, true);
materialImages = images.filter(image => image.name?.startsWith("world-scenic-facade-") && !image.destroyed);
assert.ok(materialImages.every(image => image.x % 2508 === 0), "horizontal repeats must stay on the world grid");
assert.ok(materialImages.every(image => (image.y - 75 * 94) % 2508 === 0), "vertical repeats must stay on the band grid");
assert.ok(materialImages.every(image => image.crop.width <= 2508 && image.crop.height <= 2508));

scene.cameras.main.worldView = { x: 0, y: 515 * 94, width: 1280, height: 720 };
system.update(3000, 16, true);
materialImages = images.filter(image => image.name?.startsWith("world-scenic-facade-") && !image.destroyed);
const shallowEdge = materialImages.find(image => image.name.startsWith("world-scenic-facade-level1-shallow-"));
const amberStart = materialImages.find(image => image.name.startsWith("world-scenic-facade-level1-amber-"));
assert.equal(shallowEdge.y, 75 * 94 + 16 * 2508);
assert.equal(shallowEdge.crop.height, 1702, "final shallow repeat must stop exactly at the band boundary");
assert.equal(amberStart.y, 520 * 94, "next material must begin exactly at the authored boundary");

assert.equal(WORLD_SCENIC_FACADE.span.rightTileExclusive, 280);
assert.equal(WORLD_SCENIC_FACADE.span.bottomTileExclusive, 5065);
assert.equal(WORLD_SCENIC_FACADE.bands.at(-1).bottomTileExclusive, 5065);
assert.equal(new Set(WORLD_SCENIC_FACADE.bands.map(band => band.material)).size, 8);

system.destroy();
assert.ok(images.filter(image => image.name?.startsWith("world-scenic-facade-")).every(image => image.destroyed));
assert.ok(maskGraphics.destroyed);

globalThis.location.search = "?worldFacade=0";
const rollback = new WorldScenicFacadeSystem(makeScene().scene, worldModel);
assert.equal(rollback.create(), false);

globalThis.location.search = "?worldFacade=1";
const noMasterScene = makeScene().scene;
noMasterScene.worldBackgroundMasterSystem.enabled = false;
const noMaster = new WorldScenicFacadeSystem(noMasterScene, worldModel, WORLD_SCENIC_FACADE, LEVEL_ONE_GROUND_FACADE);
assert.equal(noMaster.create(), false);

console.log("world scenic facade smoke: full depth, world anchoring, solid mask, digging, damage, recognition, and rollback passed");
