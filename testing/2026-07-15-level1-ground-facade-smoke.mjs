import assert from "node:assert/strict";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { LEVEL_ONE_GROUND_FACADE } from "../values/levelOneGroundFacade.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { LevelOneGroundFacadeSystem } from "../world/rendering/LevelOneGroundFacadeSystem.js";

globalThis.location = { search: "" };

function fakeImage(x, y, textureKey, frameName) {
  return {
    x,
    y,
    textureKey,
    frameName,
    visible: true,
    setOrigin() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setVisible(value) { this.visible = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setTexture(key, frame) { this.textureKey = key; this.frameName = frame; return this; },
    destroy() { this.destroyed = true; },
  };
}

function fakeTexture(width, height) {
  const frames = new Set();
  return {
    has(name) { return frames.has(name); },
    add(name) { frames.add(name); },
    getSourceImage() { return { width, height }; },
  };
}

function createFakeLoader(textures, loadHistory, autoComplete = true) {
  const queued = [];
  const pending = [];
  const listeners = new Map();
  const addListener = (event, handler, once) => {
    const entries = listeners.get(event) || [];
    entries.push({ handler, once });
    listeners.set(event, entries);
  };
  const emit = (event, value) => {
    const entries = [...(listeners.get(event) || [])];
    listeners.set(event, entries.filter(entry => !entry.once));
    for (const entry of entries) entry.handler(value);
  };
  return {
    loading: false,
    isLoading() { return this.loading; },
    on(event, handler) { addListener(event, handler, false); return this; },
    once(event, handler) { addListener(event, handler, true); return this; },
    off(event, handler) {
      listeners.set(event, (listeners.get(event) || []).filter(entry => entry.handler !== handler));
      return this;
    },
    image(key, path) { queued.push({ key, path }); return this; },
    start() {
      this.loading = true;
      pending.push(...queued.splice(0));
      if (autoComplete) this.complete();
    },
    complete() {
      for (const request of pending.splice(0)) {
        const index = ASSET_KEYS.background.levelOneGroundFacade.chunks.indexOf(request.key);
        const chunk = LEVEL_ONE_GROUND_FACADE.chunks[index];
        textures.set(request.key, fakeTexture(chunk.columns * 94, 10 * 94));
        loadHistory.push(request);
      }
      this.loading = false;
      emit("complete");
    },
  };
}

const atlasKey = ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas;
const chunkKeys = ASSET_KEYS.background.levelOneGroundFacade.chunks;
const textures = new Map([
  [atlasKey, fakeTexture(8 * 94, 10 * 94)],
  [chunkKeys[0], fakeTexture(32 * 94, 10 * 94)],
]);
const removedTextureKeys = [];
const loadHistory = [];
const tileTypes = new Map([
  ["2,65", TILE_TYPES.FLOOR_TOWN_1],
  ["3,66", TILE_TYPES.COPPER],
  ["4,66", TILE_TYPES.CRIT_BLOCK],
  ["5,66", TILE_TYPES.AIR],
  ["7,66", TILE_TYPES.BEDROCK],
  ["8,66", TILE_TYPES.STONE],
  ["9,66", TILE_TYPES.GEODE_INTERIOR],
  ["10,66", TILE_TYPES.ANCIENT_RELIC_CACHE],
  ["11,66", TILE_TYPES.GLOW_CRYSTAL],
]);
const hitPoints = new Map([
  ["2,65", 0],
  ["6,66", 45],
]);
const images = [];
const cameraView = { x: 0, y: 60 * 94, width: 20 * 94, height: 12 * 94, centerX: 10 * 94 };
const scene = {
  add: {
    image(x, y, key, frame) {
      const image = fakeImage(x, y, key, frame);
      images.push(image);
      return image;
    },
  },
  cameras: { main: { worldView: cameraView } },
  config: { tileSize: 94, topAirRows: 65 },
  textures: {
    exists(key) { return textures.has(key) || ASSET_KEYS.tiles.dynamicSoil.cracks.includes(key); },
    get(key) { return textures.get(key); },
    remove(key) { removedTextureKeys.push(key); textures.delete(key); },
  },
};
scene.load = createFakeLoader(textures, loadHistory);
const worldModel = {
  getTileType(tx, ty) { return tileTypes.get(`${tx},${ty}`) ?? TILE_TYPES.DIRT; },
  getTileHp(tx, ty) { return hitPoints.get(`${tx},${ty}`) ?? 100; },
  getTileMaxHp() { return 100; },
};

assert.equal(chunkKeys.length, LEVEL_ONE_GROUND_FACADE.chunks.length);
assert.equal(LEVEL_ONE_GROUND_FACADE.chunks.reduce((sum, chunk) => sum + chunk.columns, 0), 280);
assert.equal(LEVEL_ONE_GROUND_FACADE.sourceCellPx, scene.config.tileSize);
assert.ok(LEVEL_ONE_GROUND_FACADE.damage.baseAlphaByStage.every(alpha => alpha === 1));

const system = new LevelOneGroundFacadeSystem(scene, worldModel);
assert.equal(system.create(), true);
assert.deepEqual([...system.activeChunks.keys()], [0], "create should use only the Boot-preloaded start chunk");
assert.equal(system.cells.length, 320, "one 32x10 chunk should create 320 cell views");
assert.equal(loadHistory.length, 0, "Boot-preloaded chunk zero should not be dynamically reloaded");

scene.player = { x: 10 * 94, y: 66 * 94 };
system.update();
assert.deepEqual([...system.activeChunks.keys()], [0, 1], "surface camera should keep current plus one margin chunk");
assert.equal(system.cells.length, 640);
assert.equal(loadHistory.at(-1).key, chunkKeys[1]);

const walkableFloor = system.cellByKey.get("2,65");
assert.equal(walkableFloor.base.alpha, 1);
assert.equal(walkableFloor.base.displayWidth, 94, "facade must end exactly at dug-cell boundaries");

const copper = system.cellByKey.get("3,66");
assert.match(copper.recognition.frameName, /level1-ground-recognition-[0-5]$/);
const crit = system.cellByKey.get("4,66");
assert.equal(crit.recognition.frameName, "level1-ground-recognition-69");
assert.notEqual(crit.recognition.textureKey, ASSET_KEYS.tiles.critBlock);
assert.equal(system.cellByKey.get("5,66").base.visible, false);

const damaged = system.cellByKey.get("6,66");
assert.equal(damaged.base.alpha, 1, "damage must never reveal the legacy square tile");
assert.equal(damaged.crack.textureKey, ASSET_KEYS.tiles.dynamicSoil.cracks[2]);
assert.equal(damaged.crack.displayWidth, 94, "cracks must not bleed into adjacent dug cells");
assert.equal(system.cellByKey.get("7,66").recognition, null);

const stone = system.cellByKey.get("8,66");
assert.match(stone.recognition.frameName, /level1-ground-recognition-5[4-9]$/);
const distinctFrames = ["9,66", "10,66", "11,66"].map(key => system.cellByKey.get(key).recognition.frameName);
assert.deepEqual(distinctFrames, [
  "level1-ground-recognition-73",
  "level1-ground-recognition-76",
  "level1-ground-recognition-77",
]);

tileTypes.set("3,66", TILE_TYPES.AIR);
system.invalidateCell(3, 66);
assert.equal(copper.base.visible, false, "authoritative digging must remove its exact streamed cell immediately");

cameraView.x = (4 * 32 + 6) * 94;
cameraView.centerX = cameraView.x + cameraView.width / 2;
scene.player.x = cameraView.centerX;
system.update();
assert.deepEqual([...system.activeChunks.keys()], [3, 4, 5]);
assert.equal(system.cells.length, 960, "streaming must cap permanent facade views at current plus two margins");
assert.ok(removedTextureKeys.includes(chunkKeys[0]) && removedTextureKeys.includes(chunkKeys[1]));

cameraView.x = 260 * 94;
cameraView.centerX = cameraView.x + cameraView.width / 2;
scene.player.x = cameraView.centerX;
system.update();
assert.deepEqual([...system.activeChunks.keys()], [7, 8]);
assert.equal(system.cells.length, 560);
assert.ok(system.cellByKey.has("279,74"), "rightmost Level 1 surface tile must stream in");

cameraView.y = 100 * 94;
scene.player.y = 100 * 94;
system.update();
assert.equal(system.cells.length, 0, "surface facade views must unload while the player is deep underground");
assert.equal(system.activeChunks.size, 0);
system.destroy();
assert.ok(images.every(image => image.destroyed));

cameraView.x = 0;
cameraView.y = 60 * 94;
cameraView.centerX = 10 * 94;
scene.player = { x: 10 * 94, y: 66 * 94 };
textures.set(chunkKeys[0], fakeTexture(32 * 94, 10 * 94));
scene.load = createFakeLoader(textures, loadHistory, false);
const delayed = new LevelOneGroundFacadeSystem(scene, worldModel);
assert.equal(delayed.create(), true);
assert.deepEqual([...delayed.activeChunks.keys()], [0]);
cameraView.x = (4 * 32 + 6) * 94;
cameraView.centerX = cameraView.x + cameraView.width / 2;
scene.player.x = cameraView.centerX;
delayed.update();
scene.load.complete();
assert.equal(textures.has(chunkKeys[1]), false, "a completed chunk that became undesired in flight must be removed");
scene.load.complete();
assert.deepEqual([...delayed.activeChunks.keys()], [3, 4, 5]);

cameraView.x = 260 * 94;
cameraView.centerX = cameraView.x + cameraView.width / 2;
scene.player.x = cameraView.centerX;
delayed.update();
delayed.destroy();
scene.load.complete();
assert.equal(textures.has(chunkKeys[7]), false, "destroy during loading must remove completed chunk seven");
assert.equal(textures.has(chunkKeys[8]), false, "destroy during loading must remove completed chunk eight");

const validAtlas = textures.get(atlasKey);
textures.set(atlasKey, fakeTexture(8 * 94, 5 * 94));
assert.throws(
  () => new LevelOneGroundFacadeSystem(scene, worldModel).create(),
  /Required marker 'obsidian'.*atlas only has 40 frames/,
  "an incomplete atlas must fail instead of selecting fallback art"
);
textures.set(atlasKey, validAtlas);

globalThis.location.search = "?level1Facade=0";
const rollback = new LevelOneGroundFacadeSystem(scene, worldModel);
assert.equal(rollback.create(), false);
assert.equal(rollback.cells.length, 0);

console.log("Level 1 facade smoke: streamed 280x10 coverage, opaque damage, exact holes, markers, and rollback passed");
