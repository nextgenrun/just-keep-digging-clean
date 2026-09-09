import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GroundFootstepFxSystem } from "../systems/visual/GroundFootstepFxSystem.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionTint,
} from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  PLAYER_GROUND_FOOTSTEP_FX_CONFIG,
  resolvePlayerGroundFootstepFxEnabled,
} from "../values/playerGroundFootstepFx.js";

globalThis.Phaser = {
  Animations: { Events: { ANIMATION_UPDATE: "animationupdate" } },
};
globalThis.matchMedia = () => ({ matches: false });

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const listeners = new Map();
const images = [];
const tweens = [];
const tileQueries = [];
const makeTexture = () => {
  const frames = new Set();
  return {
    frames,
    add(name) { frames.add(name); },
    has(name) { return frames.has(name); },
  };
};
const coreTexture = makeTexture();
const shardTexture = makeTexture();
const player = {
  x: 100,
  y: 188,
  scaleX: 123 / 256,
  scaleY: 123 / 256,
  originX: 0.5,
  originY: 1,
  flipX: false,
  depth: 20,
  on(event, listener) { listeners.set(event, listener); },
  off(event, listener) {
    if (listeners.get(event) === listener) listeners.delete(event);
  },
};
const body = { x: 84.5, y: 113, w: 31, h: 75, vx: 200 };
let motionState = "walk-right";
const controller = {
  physicsBody: body,
  isGrounded: () => true,
  getMotionState: () => motionState,
  getEffectiveWalkSpeed: () => 200,
};
const manifest = {
  actions: {
    run: {
      rig_markers: {
        frames: {
          13: { foot_l: [51.7881, 218.9038], foot_r: [189.7395, 233.4623] },
          27: { foot_l: [189.9769, 233.7673], foot_r: [51.7882, 218.9038] },
        },
      },
    },
  },
};
const profile = {
  rigManifestKey: "rig-manifest",
  frameWidth: 256,
  frameHeight: 256,
  displaySizePx: 123,
  visualOriginX: 0.5,
  visualOriginY: 1,
  walkMovingAnims: ["run-anim"],
  footstepFrameIndices: {
    "run-anim": [13, 27],
  },
};
const scene = {
  config: { tileSize: 94 },
  cache: { json: { get: () => manifest } },
  textures: {
    exists: () => true,
    get: (key) => key.includes("core") ? coreTexture : shardTexture,
  },
  add: {
    image(x, y, key, frame) {
      const image = {
        x,
        y,
        key,
        frame,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        destroyed: false,
        setOrigin() { return this; },
        setDepth() { return this; },
        setDisplaySize() { return this; },
        setTint() { return this; },
        setAlpha() { return this; },
        setRotation(value) { this.rotation = value; return this; },
        setScale(xScale, yScale) { this.scaleX = xScale; this.scaleY = yScale; return this; },
        destroy() { this.destroyed = true; },
      };
      images.push(image);
      return image;
    },
  },
  tweens: {
    add(config) {
      tweens.push(config);
      return { stop() {}, remove() {} };
    },
  },
};
const worldModel = {
  getTileType(tx, ty) {
    tileQueries.push({ tx, ty });
    return TILE_TYPES.DIRT;
  },
};
let footstepSounds = 0;
const system = new GroundFootstepFxSystem(
  scene,
  player,
  controller,
  worldModel,
  profile,
  { onFootstep: () => { footstepSounds += 1; } },
);

assert.equal(system.create(), true);
assert.ok(coreTexture.has("dirt-p01"));
assert.ok(shardTexture.has("dirt-s01"));
const emit = listeners.get("animationupdate");
assert.equal(typeof emit, "function");

emit({ key: "run-anim" }, { index: 13, textureFrame: 13 });
assert.equal(footstepSounds, 1);
assert.equal(images.length, 3);
assert.ok(images.every((image) => image.x > 110), "right-facing burst missed the planted foot");
assert.ok(images.every((image) => Math.abs(image.y - 188) < 2));
assert.deepEqual(tileQueries[0], { tx: 1, ty: 2 });
assert.equal(images[0].frame, "dirt-p04", "one low authored scuff replaces an airborne fragment");
assert.ok(images.slice(1).every((image) => image.frame.startsWith("dirt-s") && image.frame.endsWith("-detail")));
assert.equal(tweens.length, 3);

emit({ key: "run-anim" }, { index: 13, textureFrame: 13 });
assert.equal(footstepSounds, 1, "duplicate animation update emitted a second contact");
assert.equal(images.length, 3);

emit({ key: "run-anim" }, { index: 14, textureFrame: 14 });
player.flipX = true;
body.vx = -200;
motionState = "walk-left";
emit({ key: "run-anim" }, { index: 27, textureFrame: 27 });
assert.equal(footstepSounds, 2);
assert.equal(images.length, 6);
assert.ok(images.slice(3).every((image) => image.x < 90), "mirrored burst missed the planted foot");

emit({ key: "run-anim" }, { index: 14, textureFrame: 14 });
body.vx = -30;
emit({ key: "run-anim" }, { index: 13, textureFrame: 13 });
assert.equal(footstepSounds, 3, "low-speed contact lost its existing footstep sound");
assert.equal(images.length, 6, "low-speed contact emitted visual noise below the FX threshold");

emit({ key: "run-anim" }, { index: 14, textureFrame: 14 });
delete profile.footstepFrameIndices;
player.flipX = false;
body.vx = 200;
motionState = "walk-right";
emit({ key: "run-anim" }, { index: 1, textureFrame: 1 });
assert.equal(footstepSounds, 4, "legacy profile fallback lost its existing cadence");
assert.equal(images.length, 9);
assert.ok(
  images.slice(6).every((image) => image.x > 95 && image.x < 105),
  "legacy fallback did not use the authoritative w/h body center",
);

assert.equal(resolvePlayerGroundFootstepFxEnabled("?groundFootFx=0"), false);
assert.equal(resolvePlayerGroundFootstepFxEnabled("?groundFootFx=1"), true);

const materialTiles = Object.entries(TILE_TYPES)
  .filter(([name]) => name !== "AIR" && !name.startsWith("RETIRED_"));
const materialIdentities = materialTiles.map(([name, tileType]) => {
  assert.equal(
    Object.prototype.hasOwnProperty.call(TILE_DESTRUCTION_FX_CONFIG.familyByTile, tileType),
    true,
    `${name} is missing an explicit current-library shard family`,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(TILE_DESTRUCTION_FX_CONFIG.tintByTile, tileType),
    true,
    `${name} is missing an explicit footstep palette identity`,
  );
  const family = resolveTileDestructionFamily(tileType);
  assert.equal(Number.isInteger(TILE_DESTRUCTION_FX_CONFIG.families[family]), true);
  return `${family}:${resolveTileDestructionTint(tileType).toString(16)}`;
});
assert.equal(materialTiles.length, 32, "only active tile types have particle palette routes");
assert.equal(
  new Set(materialIdentities).size,
  materialIdentities.length,
  "two unique tile materials resolve to the same family/tint footstep identity",
);

const subtleParticles = PLAYER_GROUND_FOOTSTEP_FX_CONFIG.particles;
assert.equal(subtleParticles.count, 3);
assert.ok(subtleParticles.displayMaxTiles <= 0.09);
assert.ok(subtleParticles.maxLive <= 12);
assert.ok(subtleParticles.startAlpha <= 0.78);

const systemSource = readFileSync(resolve(root, "systems/visual/GroundFootstepFxSystem.js"), "utf8");
const setupSource = readFileSync(resolve(root, "world/playScene/PlaySceneSetup.js"), "utf8");
const caveSource = readFileSync(resolve(root, "world/playScene/CaveGameplayController.js"), "utf8");
assert.doesNotMatch(systemSource, /add\.circle|add\.graphics/);
assert.doesNotMatch(systemSource, /visual-approval-previews/);
assert.match(setupSource, /new GroundFootstepFxSystem/);
assert.match(caveSource, /new GroundFootstepFxSystem/);
assert.doesNotMatch(setupSource, /this\._onAnimUpdate\s*=/);

system.destroy();
assert.equal(listeners.has("animationupdate"), false);
assert.ok(images.every((image) => image.destroyed));

console.log("GROUND_FOOTSTEP_FX_CONTRACT_OK", {
  contacts: footstepSounds,
  bitmapParticles: images.length,
  mirroredContact: true,
  materialFamily: "dirt",
  materialRoutes: materialTiles.length,
  maximumLiveParticles: subtleParticles.maxLive,
  mainWorld: true,
  compactCaves: true,
});
