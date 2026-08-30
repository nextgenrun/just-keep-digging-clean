import assert from "node:assert/strict";

import { renderInventoryStarAtlas } from
  "../ui/overlays/UIInventoryStarAtlas.js";
import { installUiStarIdleMotionFrames } from
  "../ui/overlays/UIStarIdleMotion.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../values/starIdentityLibrary.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from
  "../values/worldVisualSemanticAssets.js";

globalThis.Phaser = { BlendModes: { ADD: 1, SCREEN: 7 } };

const objects = [];
const animations = new Map();
const textureFrames = new Map();
for (const atlas of [
  ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
  ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
  WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion.atlas,
]) {
  textureFrames.set(atlas.key, new Set());
}

function chainable(kind) {
  const object = {
    kind,
    active: true,
    scaleX: 1,
    scaleY: 1,
    on(event, callback) {
      this.handlers ||= {};
      this.handlers[event] = callback;
      return this;
    },
    setInteractive() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setOrigin() { return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    lineStyle() { return this; },
    strokeCircle() { return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      this.scaleX = width / 320;
      this.scaleY = height / 320;
      return this;
    },
    play(key) { this.animationKey = key; return this; },
  };
  object.anims = {
    setProgress(value) {
      object.animationProgress = value;
      return object;
    },
  };
  objects.push(object);
  return object;
}

const scene = {
  textures: {
    exists: key => (
      textureFrames.has(key)
      || key === STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation.key
    ),
    get: key => ({
      has: frame => textureFrames.get(key)?.has(frame) === true,
      add: frame => textureFrames.get(key)?.add(frame),
    }),
  },
  anims: {
    exists: key => animations.has(key),
    create: definition => {
      animations.set(definition.key, definition);
      return definition;
    },
  },
  add: {
    image: (x, y, key, frame) => {
      const object = chainable("image");
      Object.assign(object, { x, y, key, frame });
      return object;
    },
    sprite: (x, y, key, frame) => {
      const object = chainable("sprite");
      Object.assign(object, { x, y, key, frame });
      return object;
    },
    text: (x, y, value, style) => {
      const object = chainable("text");
      Object.assign(object, { x, y, value, style });
      return object;
    },
    zone: (x, y, width, height) => {
      const object = chainable("zone");
      Object.assign(object, { x, y, width, height });
      return object;
    },
    graphics: () => chainable("graphics"),
  },
};
const shell = {
  content: {
    children: [],
    parentContainer: { depth: 3221 },
    add(object) { this.children.push(object); },
  },
};
const identityCounts = new Array(
  STAR_IDENTITY_LIBRARY_CONFIG.identities.length,
).fill(0);
STAR_IDENTITY_LIBRARY_CONFIG.identities
  .filter(identity => identity.rarityIndex === 0)
  .slice(0, 12)
  .forEach(identity => { identityCounts[identity.index] = 1; });

const state = renderInventoryStarAtlas(
  scene,
  shell,
  { left: -450, top: -220, width: 900, height: 440 },
  0,
  0,
  identityCounts,
  () => {},
  () => {},
);
assert.equal(state.identityIndex, 0);

const motion = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion;
const sprites = objects.filter(object => object.kind === "sprite");
assert.equal(
  sprites.length,
  13,
  "all twelve visible selector Stars plus the dossier Star use authored motion",
);
assert.equal(animations.size, motion.atlas.variantCount);
for (const animation of animations.values()) {
  assert.equal(animation.frames.length, motion.atlas.framesPerVariant);
  assert.equal(animation.frameRate, 1000 / motion.framePeriodMs);
  assert.equal(animation.repeat, motion.ui.repeat);
}
assert.ok(sprites.every(sprite => sprite.key === motion.atlas.key));
assert.ok(sprites.every(sprite => sprite.blendMode === motion.blendMode));
assert.ok(sprites.every(sprite => sprite.animationKey?.startsWith(
  motion.ui.animationKeyPrefix,
)));
assert.ok(sprites.every(sprite => Number.isFinite(sprite.animationProgress)));
assert.ok(sprites.every(sprite => !Object.hasOwn(sprite, "tint")));
assert.equal(
  sprites.filter(sprite => sprite.alpha === motion.ui.selectorAlpha).length,
  11,
);
assert.equal(
  sprites.filter(sprite => sprite.alpha === motion.ui.selectedSelectorAlpha).length,
  1,
);
assert.equal(
  sprites.filter(sprite => sprite.alpha === motion.ui.previewAlpha).length,
  1,
);
assert.equal(
  textureFrames.get(motion.atlas.key).size,
  motion.atlas.frameCount,
);
assert.equal(
  installUiStarIdleMotionFrames(
    scene,
    WORLD_VISUAL_SEMANTIC_ASSETS,
    "?starIdle=0",
  ),
  null,
  "the shared rollback disables UI motion as well as world motion",
);

console.log(
  "Star Block idle UI contract passed: 12 selector loops, one dossier loop, "
  + "authored overlays, deterministic phase offsets, and shared rollback",
);
