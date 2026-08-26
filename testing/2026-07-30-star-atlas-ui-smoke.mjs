import assert from "node:assert/strict";

import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import {
  renderInventoryStarAtlas,
} from "../ui/overlays/UIInventoryStarAtlas.js";
import {
  UIInventoryStarAtlasKeyboard,
  resolveStarAtlasIdentityMove,
  resolveStarAtlasPageMove,
} from "../ui/overlays/UIInventoryStarAtlasKeyboard.js";
import {
  fitStarAtlasFoundation,
  starAtlasPoint,
  starAtlasSize,
} from "../ui/overlays/UIInventoryStarAtlasLayout.js";

globalThis.Phaser = { BlendModes: { ADD: 1, SCREEN: 7 } };

function chainable(kind, record) {
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
  };
  record.push(object);
  return object;
}

const objects = [];
const textureFrames = new Map();
for (const atlas of [
  ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
  ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
]) {
  textureFrames.set(atlas.key, new Set());
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
  add: {
    image: (x, y, key, frame) => {
      const image = chainable("image", objects);
      image.x = x;
      image.y = y;
      image.key = key;
      image.frame = frame;
      return image;
    },
    text: (x, y, value, style) => {
      const text = chainable("text", objects);
      text.x = x;
      text.y = y;
      text.value = value;
      text.style = style;
      return text;
    },
    zone: (x, y, width, height) => {
      const zone = chainable("zone", objects);
      zone.x = x;
      zone.y = y;
      zone.width = width;
      zone.height = height;
      return zone;
    },
    graphics: () => chainable("graphics", objects),
  },
};
const shell = {
  content: {
    children: [],
    parentContainer: { depth: 3221 },
    add(object) { this.children.push(object); },
  },
};
let selectedIdentityTarget = null;
const state = renderInventoryStarAtlas(
  scene,
  shell,
  { left: -450, top: -220, width: 900, height: 440 },
  0,
  0,
  () => {},
  identityIndex => { selectedIdentityTarget = identityIndex; },
);

assert.equal(state.rarityIndex, 0);
assert.equal(state.identityIndex, 0);
assert.ok(state.preview);
assert.equal(state.pageIndex, 0);
assert.equal(state.pageCount, 5);
assert.equal(
  objects.filter(object => object.kind === "image").length,
  27,
  "foundation + paired light/core selectors + paired dossier preview",
);
assert.equal(
  objects.filter(object => object.kind === "zone").length,
  20,
  "six rarity sockets + two page sockets + twelve identity sockets",
);
assert.ok(
  objects.some(object => object.kind === "text" && /SIGN XP/.test(object.value)),
);
assert.ok(
  objects.some(object => object.kind === "text" && /PGUP \/ PGDN PAGE/.test(object.value)),
  "the keyboard navigation legend is visible on the authored foundation",
);
const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
for (const testRect of [
  { left: -450, top: -220, width: 900, height: 440 },
  { left: -280, top: -135, width: 560, height: 270 },
]) {
  const compactBounds = fitStarAtlasFoundation(testRect, layout);
  assert(compactBounds.left >= testRect.left && compactBounds.top >= testRect.top);
  assert(compactBounds.left + compactBounds.width <= testRect.left + testRect.width + 1e-9);
  assert(compactBounds.top + compactBounds.height <= testRect.top + testRect.height + 1e-9);
  const hitSize = starAtlasSize(compactBounds, layout.selectorHitSizePx, layout);
  for (const xPx of layout.selectorCentersXPx) {
    for (const yPx of layout.selectorCentersYPx) {
      const center = starAtlasPoint(compactBounds, xPx, yPx, layout);
      assert(center.x - hitSize / 2 >= compactBounds.left);
      assert(center.x + hitSize / 2 <= compactBounds.left + compactBounds.width);
      assert(center.y - hitSize / 2 >= compactBounds.top);
      assert(center.y + hitSize / 2 <= compactBounds.top + compactBounds.height);
    }
  }
}
const foundation = objects.find(
  object => object.kind === "image"
    && object.key === STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation.key,
);
const commonLabel = objects.find(
  object => object.kind === "text" && object.value === "COMMON\n60 STARS",
);
assert.equal(
  commonLabel.x,
  foundation.x
    + foundation.displayWidth * (layout.rarityTabCentersXPx[0] / layout.sourceWidthPx),
);
assert.equal(
  commonLabel.y,
  foundation.y
    + foundation.displayHeight * (layout.rarityTabCenterYPx / layout.sourceHeightPx),
);
const firstIdentityZone = objects.find(
  object => object.kind === "zone"
    && object.x === foundation.x
      + foundation.displayWidth * (layout.selectorCentersXPx[0] / layout.sourceWidthPx)
    && object.y === foundation.y
      + foundation.displayHeight * (layout.selectorCentersYPx[0] / layout.sourceHeightPx),
);
assert.ok(firstIdentityZone, "the first selector hit zone matches its painted socket");
assert.equal(firstIdentityZone.depth, 3222);
assert.equal(firstIdentityZone.scrollFactor, 0);
assert.ok(
  textureFrames.get(configKey("common")).size === 60,
  "all Common atlas frames were installed",
);
assert.ok(
  textureFrames.get(lightConfigKey("common")).size === 60,
  "all Common dedicated light frames were installed",
);
const nextZone = objects.find(
  object => object.kind === "zone"
    && object.x === foundation.x
      + foundation.displayWidth * (layout.pageNextCenterXPx / layout.sourceWidthPx)
    && object.y === foundation.y
      + foundation.displayHeight * (layout.pageControlCenterYPx / layout.sourceHeightPx),
);
assert.ok(nextZone, "the painted next arrow and its hit zone share one measured anchor");
let stoppedPointerPhases = 0;
const stopEvent = { stopPropagation() { stoppedPointerPhases += 1; } };
nextZone.handlers.pointerdown(null, null, null, stopEvent);
nextZone.handlers.pointerup(null, null, null, stopEvent);
assert.equal(selectedIdentityTarget, 50, "page two begins at preserved global index 50");
assert.equal(stoppedPointerPhases, 2, "Star selectors cannot dismiss the modal backdrop");

assert.equal(resolveStarAtlasIdentityMove(0, 0, 1), 1);
assert.equal(resolveStarAtlasIdentityMove(0, 0, 4), 4);
assert.equal(resolveStarAtlasPageMove(0, 0, 1), 50);
assert.equal(resolveStarAtlasPageMove(0, 50, -1), 0);

let keydownHandler = null;
let keyboardDetached = false;
const keyboardScene = {
  input: {
    keyboard: {
      on: (event, handler) => {
        assert.equal(event, "keydown");
        keydownHandler = handler;
      },
      off: (event, handler) => {
        assert.equal(event, "keydown");
        assert.equal(handler, keydownHandler);
        keyboardDetached = true;
      },
    },
  },
};
const keyboardState = {
  isOpen: true,
  activeTab: STAR_IDENTITY_LIBRARY_CONFIG.inventory.navigation.starAtlasTabIndex,
  selectedStarRarity: 0,
  selectedStarIdentity: 0,
};
let cycledTabs = 0;
let selectedRarity = null;
const keyboard = new UIInventoryStarAtlasKeyboard(keyboardScene, {
  getState: () => ({ ...keyboardState }),
  onCycleTab: direction => { cycledTabs += direction; },
  onSelectRarity: rarityIndex => { selectedRarity = rarityIndex; },
  onSelectIdentity: identityIndex => {
    keyboardState.selectedStarIdentity = identityIndex;
  },
});
const keyboardEvent = code => ({
  code,
  preventDefault() { this.prevented = true; },
  stopPropagation() { this.stopped = true; },
});
keydownHandler(keyboardEvent("ArrowRight"));
assert.equal(keyboardState.selectedStarIdentity, 1);
keydownHandler(keyboardEvent("ArrowDown"));
assert.equal(keyboardState.selectedStarIdentity, 5);
keydownHandler(keyboardEvent("PageDown"));
assert.equal(keyboardState.selectedStarIdentity, 55);
keydownHandler(keyboardEvent("KeyE"));
assert.equal(selectedRarity, 1);
keydownHandler(keyboardEvent("Tab"));
assert.equal(cycledTabs, 1);
keyboard.destroy();
assert.equal(keyboardDetached, true);

function configKey(rarityId) {
  return STAR_IDENTITY_LIBRARY_CONFIG.atlases
    .find(atlas => atlas.id === rarityId).key;
}

function lightConfigKey(rarityId) {
  return STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases
    .find(atlas => atlas.id === rarityId).key;
}

console.log("star atlas UI smoke: PASS (aligned mouse + keyboard atlas navigation)");
