import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { INVENTORY_RESOURCE_GUIDE } from "../values/inventoryResourceGuide.js";
import { UI_RESOURCE_PRESENTATION } from "../values/uiIcons.js";
import { UI_MODAL_LAYOUT } from "../values/uiLayout.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
import { renderInventoryResourceGuide } from "../ui/overlays/UIInventoryResourceGuide.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const popupSource = fs.readFileSync(
  path.join(root, "ui/overlays/UIInventoryPopup.js"),
  "utf8"
);
const guideSource = fs.readFileSync(
  path.join(root, "ui/overlays/UIInventoryResourceGuide.js"),
  "utf8"
);
const tilePreviewSource = fs.readFileSync(
  path.join(root, "ui/overlays/UIInventoryWorldTilePreview.js"),
  "utf8"
);
const guide = INVENTORY_RESOURCE_GUIDE;
const semanticResources = WORLD_VISUAL_SEMANTIC_ASSETS.resources;
const catalogKeys = Object.keys(UI_RESOURCE_PRESENTATION);
assert.deepEqual(
  new Set(guide.resourceKeys),
  new Set(catalogKeys),
  "the clickable world guide must cover every collectible shown in inventory"
);
assert.equal(
  new Set(guide.resourceKeys).size,
  guide.resourceKeys.length,
  "the world guide cannot contain duplicate resource identities"
);
for (const key of guide.resourceKeys) {
  assert.match(guide.descriptions[key], /\S/, `${key} needs a visual identity description`);
}
assert.deepEqual(
  new Set(guide.formationKeys),
  new Set(Object.keys(semanticResources.frameStarts)),
  "every approved atlas resource, and only an approved atlas resource, must use an overlay"
);
assert.equal(
  semanticResources.atlas.frameCount,
  guide.formationKeys.length * semanticResources.atlas.variants,
  "the production atlas must contain six frames for every formation"
);
assert.equal(guide.grounds.length, semanticResources.atlas.variants);
for (const key of guide.formationKeys) {
  const start = semanticResources.frameStarts[key];
  assert(Number.isInteger(start), `${key} needs an integer atlas frame start`);
  assert(
    start >= 0 && start + semanticResources.atlas.variants <= semanticResources.atlas.frameCount,
    `${key} atlas frames must stay inside the production atlas`
  );
}
assert.deepEqual(
  guide.groundTypeIndices,
  { dirt: 0, darkDirtNormal: 1, darkDirtStrong: 2 },
  "ground-material previews must use the same soil type indices as WorldRenderer"
);
for (const [key, slots] of Object.entries(guide.groundMaterialSlots)) {
  assert.equal(slots.length, 6, `${key} needs six exact world-ground variants`);
  for (const slot of slots) {
    const textureKey = ASSET_KEYS.tiles.dynamicSoil[slot.group]?.[slot.band]?.[slot.variant];
    assert.match(textureKey || "", /\S/, `${key} references an invalid runtime ground slot`);
  }
}
assert.deepEqual(
  guide.lavaDirtStages.map(entry => entry.stage),
  [5, 4, 3, 2, 1],
  "Lava Dirt must be presented from intact through near-break"
);
const atlasPath = semanticResources.atlas.path.split("?")[0];
const atlasFile = path.join(root, atlasPath);
assert(fs.existsSync(atlasFile), "the approved semantic resource atlas must exist");
const atlasBytes = fs.readFileSync(atlasFile);
assert.equal(atlasBytes.toString("ascii", 1, 4), "PNG");
const atlasWidth = atlasBytes.readUInt32BE(16);
const atlasHeight = atlasBytes.readUInt32BE(20);
assert.equal(
  atlasWidth,
  semanticResources.atlas.columns * semanticResources.atlas.frameSizePx,
  "atlas width must match its declared frame grid"
);
assert.equal(
  atlasHeight,
  Math.ceil(semanticResources.atlas.frameCount / semanticResources.atlas.columns)
    * semanticResources.atlas.frameSizePx,
  "atlas height must match its declared frame grid"
);
const contentHeight = guide.layout.tabBodyGap
  ? (
    640
    - UI_MODAL_LAYOUT.headerHeight
    - 14
    - UI_MODAL_LAYOUT.footerHeight
    - guide.layout.tabBodyGap
  )
  : 0;
const selectorRows = Math.ceil(
  guide.resourceKeys.length / guide.layout.desktopSelectorColumns
);
const selectorItemHeight = (
  contentHeight
  - guide.layout.selectorHeaderHeight
  - guide.layout.panelPadding
  - guide.layout.selectorGap * (selectorRows - 1)
) / selectorRows;
assert(selectorItemHeight >= 44, "all 14 clickable desktop resource selectors must fit clearly");
assert.match(popupSource, /guide\.copy\.guideTab/);
assert.match(popupSource, /renderInventoryResourceGuide\(/);
assert.match(popupSource, /resourceKey\s*=>\s*\{/);
assert.match(guideSource, /guide\.resourceKeys\.map\(/);
assert.match(guideSource, /onClick:\s*\(\)\s*=>\s*onSelect\(resourceKey\)/);
assert.match(guideSource, /addInventoryWorldTile\(/);
assert.match(guideSource, /addInventoryLavaDirtTile\(/);
assert.match(tilePreviewSource, /ASSET_KEYS\.tiles\.dynamicSoil/);
assert.match(tilePreviewSource, /soil\.hardness\.compact/);
assert.match(tilePreviewSource, /soil\.hardness\.strong/);
assert.match(tilePreviewSource, /soil\.cracks\[4\]/);
assert.match(tilePreviewSource, /WORLD_VISUAL_SEMANTIC_ASSETS\.resources\.frameStarts/);
assert.match(tilePreviewSource, /lavaDirtHp\$\{stage\}/);
assert.doesNotMatch(
  guideSource + tilePreviewSource,
  /generateTexture|createCanvas|fillText|innerHTML|document\.createElement/,
  "the guide must use production images, not generated placeholder resource art"
);
assert.doesNotMatch(
  guideSource,
  /hasDiscoveredMaterial|NOT YET MINED|lockedAmount/,
  "world identities must remain visible before discovery"
);

class StubDisplay {
  constructor(kind = "display") {
    this.kind = kind;
    this.active = true;
    this.visible = true;
    this.events = new Map();
  }
  setOrigin() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setInteractive() { this.interactive = true; return this; }
  disableInteractive() { this.interactive = false; return this; }
  setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setScale(value) { this.scale = value; return this; }
  setColor(value) { this.color = value; return this; }
  setText(value) { this.value = value; return this; }
  setX(value) { this.x = value; return this; }
  on(event, callback) { this.events.set(event, callback); return this; }
  destroy() { this.active = false; return this; }
}

class StubGraphics extends StubDisplay {
  clear() { return this; }
  fillStyle() { return this; }
  fillRoundedRect() { return this; }
  lineStyle() { return this; }
  strokeRoundedRect() { return this; }
}

class StubContainer extends StubDisplay {
  constructor(x = 0, y = 0) {
    super("container");
    this.x = x;
    this.y = y;
    this.children = [];
  }
  add(children) {
    this.children.push(...(Array.isArray(children) ? children : [children]).filter(Boolean));
    return this;
  }
  iterate(callback) { this.children.forEach(callback); return this; }
}

class StubTexture {
  constructor(width, height) {
    this.frames = new Set();
    this.source = { width, height };
  }
  has(name) { return this.frames.has(name); }
  add(name) { this.frames.add(name); return this; }
  getSourceImage() { return this.source; }
}

function makeStubScene() {
  const soil = ASSET_KEYS.tiles.dynamicSoil;
  const soilTextureKeys = [
    ...soil.bases.flat(),
    ...soil.deepBases.flat(),
    ...soil.cracks,
    ...Object.values(soil.hardness),
  ];
  const textureMap = new Map([
    [semanticResources.atlas.key, new StubTexture(atlasWidth, atlasHeight)],
    ...soilTextureKeys.map(key => [key, new StubTexture(94, 94)]),
    ...[1, 2, 3, 4, 5].map(stage => [
      ASSET_KEYS.tiles[`lavaDirtHp${stage}`],
      new StubTexture(94, 94),
    ]),
  ]);
  const scene = {
    config: { tileSize: 94 },
    imageRecords: [],
    textRecords: [],
    textures: {
      exists: key => textureMap.has(key),
      get: key => textureMap.get(key),
    },
    add: {
      container: (x, y) => new StubContainer(x, y),
      graphics: () => new StubGraphics("graphics"),
      rectangle: () => new StubDisplay("rectangle"),
      text: (x, y, value) => {
        const text = new StubDisplay("text");
        Object.assign(text, { x, y, value });
        scene.textRecords.push(text);
        return text;
      },
      image: (x, y, key, frame = null) => {
        const image = new StubDisplay("image");
        Object.assign(image, { x, y, key, frame });
        scene.imageRecords.push(image);
        return image;
      },
    },
    tweens: {
      killTweensOf() {},
      add(config) { config.onComplete?.(); },
    },
    soundSystem: null,
  };
  return scene;
}

const smokeScene = makeStubScene();
const desktopRect = {
  left: -448,
  top: -182,
  right: 448,
  bottom: 266,
  width: 896,
  height: 448,
};
for (const resourceKey of guide.resourceKeys) {
  smokeScene.imageRecords.length = 0;
  smokeScene.textRecords.length = 0;
  const shell = { content: new StubContainer() };
  assert.equal(
    renderInventoryResourceGuide(smokeScene, shell, desktopRect, resourceKey, () => {}),
    resourceKey,
    `${resourceKey} must be selectable in the runtime-shaped guide`
  );
  assert(
    smokeScene.textRecords.some(text => text.value === UI_RESOURCE_PRESENTATION[resourceKey].name.toUpperCase()),
    `${resourceKey} must show its explicit name`
  );
  if (guide.formationKeys.includes(resourceKey)) {
    const start = semanticResources.frameStarts[resourceKey];
    for (let variant = 0; variant < semanticResources.atlas.variants; variant += 1) {
      assert(
        smokeScene.imageRecords.some(image =>
          image.frame === `${semanticResources.atlas.framePrefix}${start + variant}`
          && image.displayWidth >= 100
        ),
        `${resourceKey} must render production world variant ${variant + 1}`
      );
    }
  }
}

let clickedResource = null;
const clickShell = { content: new StubContainer() };
renderInventoryResourceGuide(
  smokeScene,
  clickShell,
  desktopRect,
  "stone",
  resourceKey => { clickedResource = resourceKey; }
);
const goldButton = clickShell.content.children.find(child =>
  child.kind === "container"
  && child.children?.some(item => item.kind === "text" && item.value === "GOLD")
);
assert(goldButton, "Gold needs a visible clickable selector");
const goldHit = goldButton.children.find(item => item.kind === "rectangle");
assert(goldHit?.events.get("pointerdown"), "Gold selector needs a pointer handler");
goldHit.events.get("pointerdown")();
assert.equal(clickedResource, "gold", "clicking Gold must select the Gold world preview");

console.log(
  `Inventory resource world guide contract passed (${guide.resourceKeys.length} clickable materials).`
);
