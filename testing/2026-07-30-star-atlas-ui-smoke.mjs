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
    setOrigin() { return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
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
  },
};
const shell = {
  content: {
    children: [],
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
  29,
  "foundation + arrows + paired light/core selectors + paired dossier preview",
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
  objects.some(object => object.kind === "text" && /RARITY IS REWARD/.test(object.value)),
);
assert.ok(
  objects.some(object => object.kind === "text" && /PGUP \/ PGDN PAGE/.test(object.value)),
  "the keyboard navigation legend is visible on the authored foundation",
);
const layout = STAR_IDENTITY_LIBRARY_CONFIG.inventory.layout;
const foundation = objects.find(
  object => object.kind === "image"
    && object.key === STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation.key,
);
const commonLabel = objects.find(
  object => object.kind === "text" && object.value === "COMMON",
);
assert.equal(commonLabel.x, foundation.x + foundation.displayWidth * layout.rarityTabCentersX[0]);
assert.equal(commonLabel.y, foundation.y + foundation.displayHeight * layout.rarityTabCenterY);
const firstIdentityZone = objects.find(
  object => object.kind === "zone"
    && object.x === foundation.x + foundation.displayWidth * layout.selectorCentersX[0]
    && object.y === foundation.y + foundation.displayHeight * layout.selectorCentersY[0],
);
assert.ok(firstIdentityZone, "the first selector hit zone matches its painted socket");
assert.ok(
  textureFrames.get(configKey("common")).size === 60,
  "all Common atlas frames were installed",
);
assert.ok(
  textureFrames.get(lightConfigKey("common")).size === 60,
  "all Common dedicated light frames were installed",
);
const nextArrow = objects.find(
  object => object.kind === "image" && object.key === "ui-notification-next-v1",
);
assert.ok(nextArrow, "authored next-page arrow is visible");
const nextZone = objects.find(
  object => object.kind === "zone"
    && object.x === nextArrow.x
    && object.y === nextArrow.y,
);
nextZone.handlers.pointerdown();
assert.equal(selectedIdentityTarget, 50, "page two begins at preserved global index 50");

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
