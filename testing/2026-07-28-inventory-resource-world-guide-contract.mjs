import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { INVENTORY_CODEX_CONFIG } from "../values/inventoryCodex.js";
import { INVENTORY_RESOURCE_GUIDE } from
  "../values/inventoryResourceGuide.js";
import { UI_RESOURCE_PRESENTATION } from "../values/uiIcons.js";
import {
  fitInventoryCodexFoundation,
  inventoryCodexPoint,
  inventoryCodexSize,
} from "../ui/overlays/UIInventoryCodexArt.js";
import { renderInventoryResourceGuide } from
  "../ui/overlays/UIInventoryResourceGuide.js";
import {
  resolveResourceCodexMove,
  UIInventoryResourceKeyboard,
} from "../ui/overlays/UIInventoryResourceKeyboard.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const pngSize = relativePath => {
  const bytes = fs.readFileSync(path.join(root, relativePath.split("?")[0]));
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

const guide = INVENTORY_RESOURCE_GUIDE;
const config = INVENTORY_CODEX_CONFIG;
assert.deepEqual(
  new Set(guide.resourceKeys),
  new Set(Object.keys(UI_RESOURCE_PRESENTATION)),
  "the Resource Codex must cover every collectible shown in Holdings",
);
assert.equal(new Set(guide.resourceKeys).size, 14);
for (const [index, key] of guide.resourceKeys.entries()) {
  assert.match(guide.descriptions[key], /\S/, `${key} needs a dossier description`);
  assert.equal(
    config.assets.portraits.frameIndices[key],
    index,
    `${key} must keep the authored atlas row-major order`,
  );
}

const foundationSize = pngSize(config.assets.foundation.path);
assert.deepEqual(foundationSize, {
  width: config.layout.sourceWidthPx,
  height: config.layout.sourceHeightPx,
});
assert(
  Math.abs(
    foundationSize.width / foundationSize.height - config.layout.aspectRatio,
  ) < 1e-9,
  "the display aspect must come from the authored foundation dimensions",
);
assert.deepEqual(pngSize(config.assets.portraits.path), {
  width: config.assets.portraits.widthPx,
  height: config.assets.portraits.heightPx,
});
assert.equal(config.layout.selectorColumnCentersXPx.length, 2);
assert.equal(config.layout.selectorRowCentersYPx.length, 7);
for (const x of [
  ...config.layout.selectorColumnCentersXPx,
  ...config.layout.selectorPortraitCentersXPx,
  ...config.layout.statCentersXPx,
]) {
  assert(x > 0 && x < config.layout.sourceWidthPx, `source x ${x} stays on art`);
}
for (const y of [
  ...config.layout.selectorRowCentersYPx,
  config.layout.previewCenterYPx,
  config.layout.statCenterYPx,
]) {
  assert(y > 0 && y < config.layout.sourceHeightPx, `source y ${y} stays on art`);
}

for (const testRect of [
  { left: -448, top: -182, width: 896, height: 448 },
  { left: -300, top: -135, width: 600, height: 270 },
]) {
  const bounds = fitInventoryCodexFoundation(testRect, config.layout);
  assert(bounds.left >= testRect.left && bounds.top >= testRect.top);
  assert(bounds.left + bounds.width <= testRect.left + testRect.width + 1e-9);
  assert(bounds.top + bounds.height <= testRect.top + testRect.height + 1e-9);
  const hit = inventoryCodexSize(
    bounds,
    config.layout.selectorHitWidthPx,
    config.layout.selectorHitHeightPx,
    config.layout,
  );
  for (const xPx of config.layout.selectorColumnCentersXPx) {
    for (const yPx of config.layout.selectorRowCentersYPx) {
      const center = inventoryCodexPoint(bounds, xPx, yPx, config.layout);
      assert(center.x - hit.width / 2 >= bounds.left);
      assert(center.x + hit.width / 2 <= bounds.left + bounds.width);
      assert(center.y - hit.height / 2 >= bounds.top);
      assert(center.y + hit.height / 2 <= bounds.top + bounds.height);
    }
  }
}

const holdingsSource = read("ui/overlays/UIInventoryHoldingsView.js");
const guideSource = [
  read("ui/overlays/UIInventoryResourceGuide.js"),
  read("ui/overlays/UIInventoryResourceCollection.js"),
  read("ui/overlays/UIInventoryResourceDossier.js"),
].join("\n");
assert.match(holdingsSource + guideSource, /addResourceCodexPortrait/);
assert.match(guideSource, /fitInventoryCodexFoundation/);
assert.match(guideSource, /selectorColumnCentersXPx/);
assert.match(guideSource, /selectorPortraitCentersXPx/);
assert.doesNotMatch(
  holdingsSource + guideSource,
  /UIInventoryWorldTilePreview|addInventoryWorldTile|addInventoryLavaDirtTile/,
  "I-key resource surfaces must not reuse gameplay-ground tile composition",
);
assert.doesNotMatch(
  guideSource,
  /generateTexture|createCanvas|fillText|innerHTML|document\.createElement/,
  "Codex material backgrounds must remain authored bitmap assets",
);

class StubDisplay {
  constructor(kind) {
    this.kind = kind;
    this.handlers = {};
  }
  setOrigin(x = 0.5, y = x) { this.originX = x; this.originY = y; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setInteractive() { this.interactive = true; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  on(event, callback) { this.handlers[event] = callback; return this; }
}

class StubGraphics extends StubDisplay {
  constructor() { super("graphics"); }
  lineStyle() { return this; }
  strokeRoundedRect() { return this; }
}

class StubContainer {
  constructor() {
    this.children = [];
    this.parentContainer = { depth: 3221 };
  }
  add(value) {
    this.children.push(...(Array.isArray(value) ? value : [value]).filter(Boolean));
    return this;
  }
}

class StubTexture {
  constructor() { this.frames = new Set(); }
  has(name) { return this.frames.has(name); }
  add(name) { this.frames.add(name); return this; }
}

function makeScene() {
  const textures = new Map([
    [config.assets.foundation.key, new StubTexture()],
    [config.assets.portraits.key, new StubTexture()],
  ]);
  const scene = {
    images: [],
    texts: [],
    zones: [],
    textures: {
      exists: key => textures.has(key),
      get: key => textures.get(key),
    },
    add: {
      graphics: () => new StubGraphics(),
      image: (x, y, key, frame = null) => {
        const image = Object.assign(new StubDisplay("image"), { x, y, key, frame });
        scene.images.push(image);
        return image;
      },
      text: (x, y, value, style) => {
        const text = Object.assign(new StubDisplay("text"), { x, y, value, style });
        scene.texts.push(text);
        return text;
      },
      zone: (x, y, width, height) => {
        const zone = Object.assign(
          new StubDisplay("zone"),
          { x, y, width, height },
        );
        scene.zones.push(zone);
        return zone;
      },
    },
  };
  return scene;
}

const rect = {
  left: -448,
  top: -182,
  right: 448,
  bottom: 266,
  width: 896,
  height: 448,
};
const scene = makeScene();
const shell = { content: new StubContainer() };
let clickedResource = null;
const items = Object.fromEntries(guide.resourceKeys.map((key, index) => [key, index]));
assert.equal(
  renderInventoryResourceGuide(
    scene,
    shell,
    rect,
    "gold",
    items,
    resourceKey => { clickedResource = resourceKey; },
  ),
  "gold",
);
assert.equal(scene.zones.length, 14, "all collection sockets are clickable");
assert(scene.zones.every(zone => zone.depth === 3222 && zone.scrollFactor === 0));
assert(scene.texts.some(text => text.value === "GOLD"));
const foundation = scene.images.find(image => image.key === config.assets.foundation.key);
const scale = foundation.displayWidth / config.layout.sourceWidthPx;
const expectedPreviewX = foundation.x + config.layout.previewCenterXPx * scale;
const expectedPreviewY = foundation.y
  + foundation.displayHeight * (config.layout.previewCenterYPx / config.layout.sourceHeightPx);
const goldFrames = scene.images.filter(image => (
  image.frame === `${config.assets.portraits.framePrefix}gold`
));
const goldDossier = goldFrames.sort((a, b) => b.displayWidth - a.displayWidth)[0];
assert.equal(goldDossier.x, expectedPreviewX);
assert.equal(goldDossier.y, expectedPreviewY);
assert.equal(
  goldDossier.displayWidth,
  foundation.displayWidth * (config.layout.previewSizePx / config.layout.sourceWidthPx),
  "the dossier portrait uses the same source-space transform as its socket",
);
const goldIndex = guide.resourceKeys.indexOf("gold");
let stoppedPointerPhases = 0;
const stopEvent = { stopPropagation() { stoppedPointerPhases += 1; } };
scene.zones[goldIndex].handlers.pointerdown(null, null, null, stopEvent);
scene.zones[goldIndex].handlers.pointerup(null, null, null, stopEvent);
assert.equal(clickedResource, "gold");
assert.equal(stoppedPointerPhases, 2, "selector input cannot fall through to backdrop");

assert.equal(resolveResourceCodexMove("dirt", 1), "stone");
assert.equal(resolveResourceCodexMove("dirt", 2), "copper");
assert.equal(resolveResourceCodexMove("magmaCrystal", 2), "magmaCrystal");
let keydown = null;
let selected = "dirt";
const keyboard = new UIInventoryResourceKeyboard({
  input: { keyboard: {
    on: (event, handler) => { assert.equal(event, "keydown"); keydown = handler; },
    off: () => {},
  } },
}, {
  getState: () => ({ isOpen: true, activeTab: 1, selectedGuideResource: selected }),
  onSelect: value => { selected = value; },
});
keydown({ code: "ArrowDown", preventDefault() {}, stopPropagation() {} });
assert.equal(selected, "copper");
keydown({ code: "ArrowRight", preventDefault() {}, stopPropagation() {} });
assert.equal(selected, "darkDirtNormal");
keyboard.destroy();

console.log("Inventory Resource Codex contract passed (authored art + aligned input)");
