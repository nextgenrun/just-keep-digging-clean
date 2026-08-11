import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HardcoreMemorialStore } from "../systems/hardcore/HardcoreMemorialStore.js";
import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../systems/hardcore/hardcoreMemorialRecord.js";
import {
  HardcoreMemorialWorldSystem,
  resolveHardcoreMemorialGroundAnchor,
} from "../systems/visual/HardcoreMemorialWorldSystem.js";
import { HardcoreDeathRecapView } from "../ui/overlays/HardcoreDeathRecapView.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../values/hardcoreMemorials.js";
import {
  UAL_NATIVE_PLAYER_ASSET_PROFILE,
} from "../values/ualNativePlayerAssetProfile.js";
import {
  requestHardcoreMemorialInspection,
} from "../world/playScene/HardcoreModalStateBridge.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(String(key)) ? this.data.get(String(key)) : null;
  }
  setItem(key, value) {
    this.data.set(String(key), String(value));
  }
  removeItem(key) {
    this.data.delete(String(key));
  }
}

function createDisplayObject(x = 0, y = 0) {
  const events = new Map();
  return {
    x,
    y,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    children: [],
    setVisible(value) { this.visible = value; return this; },
    setOrigin(originX, originY = originX) {
      this.originX = originX;
      this.originY = originY;
      return this;
    },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setInteractive(options) { this.interactive = options || true; return this; },
    disableInteractive() { this.interactive = false; return this; },
    setText(value) { this.text = value; return this; },
    setColor(value) { this.color = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    setScale(xValue, yValue = xValue) {
      this.scaleX = xValue;
      this.scaleY = yValue;
      return this;
    },
    add(children) {
      this.children.push(...(Array.isArray(children) ? children : [children]));
      return this;
    },
    on(name, callback) { events.set(name, callback); return this; },
    emit(name) { events.get(name)?.(); return this; },
    removeAllListeners() { events.clear(); return this; },
    destroy() { this.destroyed = true; return this; },
  };
}

function createVisualScene({ solidTiles = [] } = {}) {
  const images = [];
  const texts = [];
  const containers = [];
  const notices = [];
  const inspections = [];
  const solids = new Set(solidTiles.map(([tileX, tileY]) => `${tileX},${tileY}`));
  const tileSize = 94;
  const worldWidthTiles = 320;
  const worldDepthTiles = 3200;
  return {
    images,
    texts,
    containers,
    notices,
    inspections,
    config: {
      tileSize,
      worldWidthPx: worldWidthTiles * tileSize,
      worldDepthPx: worldDepthTiles * tileSize,
    },
    worldModel: {
      widthTiles: worldWidthTiles,
      depthTiles: worldDepthTiles,
      widthPx: worldWidthTiles * tileSize,
      inBounds: (tileX, tileY) => (
        tileX >= 0
        && tileX < worldWidthTiles
        && tileY >= 0
        && tileY < worldDepthTiles
      ),
      isSolid: (tileX, tileY) => solids.has(`${tileX},${tileY}`),
      setSolid(tileX, tileY, solid) {
        const key = `${tileX},${tileY}`;
        if (solid) solids.add(key);
        else solids.delete(key);
      },
    },
    textures: { exists: () => true },
    add: {
      container: (x, y) => {
        const value = createDisplayObject(x, y);
        containers.push(value);
        return value;
      },
      image: (x, y) => {
        const value = createDisplayObject(x, y);
        images.push(value);
        return value;
      },
      text: (x, y) => {
        const value = createDisplayObject(x, y);
        texts.push(value);
        return value;
      },
    },
    tweens: {
      add: () => ({ stop() {} }),
    },
    soundSystem: {
      playUiSelect() {},
      playUiConfirm() {},
    },
    uiNotifications: {
      warning: (message, options) => notices.push({ message, options }),
    },
    inspectHardcoreMemorial: (value) => {
      inspections.push(value);
      return true;
    },
  };
}

const config = HARDCORE_MEMORIAL_CONFIG;
assert.equal(
  ASSET_KEYS.environment.hardcoreMemorial,
  config.assets.grave.key,
);
assert.equal(
  ASSET_KEYS.ui.hardcore.deathActionButton,
  config.assets.actionButton.key,
);
const storage = new MemoryStorage();
const stats = Object.fromEntries(
  config.statRows.map((row, index) => [row.key, index + 101]),
);
const achievements = Array.from({ length: 7 }, (_, index) => ({
  id: `achievement-${index + 1}`,
  sequence: index + 1,
  type: "milestone",
  title: `Achievement ${index + 1}`,
  detail: `Completed challenge ${index + 1}`,
  source: `contract-${index + 1}`,
}));
const rawRecord = {
  id: "hardcore-2-10000",
  slotId: 2,
  worldIdentity: "save-slot-2",
  diedAt: 10000,
  source: "graveborerWurm",
  reason: "The Graveborer Wurm shattered your final Gem Power",
  depth: 777,
  position: {
    worldX: 1200.5,
    worldY: 9400.25,
    tileX: 12,
    tileY: 94,
  },
  player: {
    characterId: "ual-native",
    level: 18,
    gemPowerMax: 721,
    wallet: 456789,
    carriedResourceUnits: 329,
  },
  hardcore: {
    activePlayMs: 7345000,
    peakStress: 96,
    unstuckUses: 2,
    paidTeleports: 9,
    teleportMoneySpent: 23000,
    wurmEncounters: 6,
  },
  stats,
  achievements,
};

const record = sanitizeHardcoreMemorialRecord(rawRecord);
assert.equal(record.depth, 777);
assert.equal(record.position.worldX, 1200.5);
assert.equal(record.achievements.length, achievements.length);
assert.deepEqual(Object.keys(record.stats), config.statRows.map(row => row.key));

const pages = buildHardcoreDeathRecapPages(record);
assert.equal(pages[0].title, config.copy.overviewTitle);
assert.match(pages[0].body, /ACTIVE HARDCORE TIME\s+02:02:25/);
assert.match(pages[0].body, /WURM HUNTS\s+6/);
assert.match(pages[0].body, /CARRIED UNITS LOST\s+329/);
const recapText = pages.map(page => `${page.title}\n${page.body}`).join("\n");
config.statRows.forEach((row, index) => {
  assert.ok(recapText.includes(row.label), `Missing stat label ${row.label}`);
  assert.ok(
    recapText.includes(String(index + 101)),
    `Missing stat value for ${row.key}`,
  );
});
achievements.forEach(event => {
  assert.ok(recapText.includes(event.title), `Missing ${event.title}`);
  assert.ok(recapText.includes(event.detail), `Missing ${event.detail}`);
});

const recapScene = createVisualScene();
const recapParent = createDisplayObject();
const recapView = new HardcoreDeathRecapView(recapScene, recapParent);
let retried = 0;
let returned = 0;
recapView.show({
  reason: record.reason,
  depth: record.depth,
  pages,
  onRetry: () => { retried += 1; },
  onReturn: () => { returned += 1; },
});
assert.equal(recapView.retryButton.visible, false);
assert.equal(recapView.pageTitle.text, pages[0].title);
recapView.handleKey({ key: "ArrowRight" });
assert.equal(recapView.pageTitle.text, pages[1].title);
recapView.setReady("SLOT 2");
assert.equal(recapView.retryButton.visible, true);
recapView.handleKey({ key: "Escape" });
assert.equal(returned, 1);
assert.equal(retried, 0);
recapView.show({
  reason: record.reason,
  depth: record.depth,
  pages,
  onRetry: () => { retried += 1; },
  onReturn: () => { returned += 1; },
});
recapView.setReady("SLOT 2");
recapView.handleKey({ key: "Enter" });
assert.equal(retried, 1);

let memorialClosed = 0;
recapView.showMemorial({
  reason: record.reason,
  depth: record.depth,
  slotId: record.slotId,
  pages,
  onClose: () => { memorialClosed += 1; },
});
assert.equal(recapView.mode, "memorial");
assert.equal(recapView.retryButton.visible, true);
assert.equal(recapView.menuButton.visible, false);
assert.equal(
  recapView.retryButton.actionLabel.text,
  config.copy.memorialCloseLabel,
);
assert.match(recapView.subtitle.text, /SLOT 2/);
assert.equal(recapView.pageTitle.text, pages[0].title);
recapView.handleKey({ key: "ArrowLeft" });
assert.equal(recapView.pageTitle.text, pages.at(-1).title);
recapView.handleKey({ key: "Escape" });
assert.equal(memorialClosed, 1);
recapView.destroy();

const deathTileX = Math.floor(rawRecord.position.worldX / 94);
const supportTileY = Math.floor(rawRecord.position.worldY / 94) + 4;
const graveScene = createVisualScene({
  solidTiles: [[deathTileX, supportTileY]],
});
const anchor = resolveHardcoreMemorialGroundAnchor(
  graveScene.worldModel,
  rawRecord.position.worldX,
  rawRecord.position.worldY,
  graveScene.config.tileSize,
);
assert.equal(anchor.tileX, deathTileX);
assert.equal(anchor.supportTileY, supportTileY);
assert.equal(anchor.worldY, supportTileY * graveScene.config.tileSize);
const graveSystem = new HardcoreMemorialWorldSystem(graveScene, [record]);
assert.equal(graveSystem.entries.length, 1);
assert.equal(
  config.world.heightTiles,
  UAL_NATIVE_PLAYER_ASSET_PROFILE.targetVisibleHeightTiles,
  "The death memorial must match the authored visible player height",
);
assert.equal(
  graveSystem.entries[0].root.depth,
  config.world.depth,
);
assert.equal(
  graveSystem.entries[0].root.y,
  supportTileY * graveScene.config.tileSize,
  "An airborne death memorial must sit on the first authoritative floor below it",
);
assert.notEqual(
  graveSystem.entries[0].root.y,
  record.position.worldY,
  "The grave must not reuse an airborne death coordinate as its ground",
);
assert.equal(
  graveSystem.entries[0].image.displayHeight,
  config.world.heightTiles * graveScene.config.tileSize,
);
assert.equal(
  graveSystem.entries[0].image.displayWidth,
  graveSystem.entries[0].image.displayHeight * config.world.widthToHeightRatio,
  "The player-scale memorial must retain its authored 512x768 aspect ratio",
);
assert.equal(
  graveSystem.entries[0].image.originY,
  config.world.visibleAlphaBottomRatio,
  "The measured visible stone base, not the transparent canvas edge, must touch ground",
);
graveSystem.entries[0].image.emit("pointerdown");
assert.equal(graveScene.notices.length, 0);
assert.equal(graveScene.inspections.length, 1);
assert.equal(graveScene.inspections[0].id, record.id);

graveScene.worldModel.setSolid(deathTileX, supportTileY, false);
graveScene.worldModel.setSolid(deathTileX, supportTileY + 3, true);
graveSystem.update();
assert.equal(
  graveSystem.entries[0].root.y,
  (supportTileY + 3) * graveScene.config.tileSize,
  "A memorial must settle onto the next floor if its support is mined",
);
graveSystem.destroy();

let modalOptions = null;
let controlsEnabled = true;
let aimVisible = true;
const modalScene = {
  gameState: "playing",
  _hardcoreDeathInProgress: false,
  _hardcoreRuntime: {
    modal: {
      isVisible: false,
      showMemorial: (options) => {
        modalOptions = options;
        return true;
      },
    },
  },
  hidePauseMenu() {},
  shopOverlay: { hide() {} },
  playerController: {
    setControlsEnabled: value => { controlsEnabled = value; },
  },
  aimBox: {
    setVisible: value => { aimVisible = value; },
  },
};
assert.equal(requestHardcoreMemorialInspection(modalScene, record), true);
assert.equal(modalScene.gameState, "hardcore-modal");
assert.equal(controlsEnabled, false);
assert.equal(aimVisible, false);
assert.equal(modalOptions.pages.length, pages.length);
assert.ok(modalOptions.pages.some(page => page.type === "stats"));
assert.ok(modalOptions.pages.some(page => page.type === "achievements"));
modalOptions.onClose();
assert.equal(modalScene.gameState, "playing");
assert.equal(controlsEnabled, true);
assert.equal(aimVisible, true);

const store = new HardcoreMemorialStore({ storage });
assert.equal(store.append(record).persisted, true);
assert.equal(store.getForSlot(2).length, 1);
assert.equal(store.getForSlot(1).length, 0);
const persistedBeforeRunErase = storage.getItem(config.persistence.storageKey);
storage.setItem("dig-game-save-slot-2", JSON.stringify({ hardcore: true }));
storage.removeItem("dig-game-save-slot-2");
assert.equal(
  storage.getItem(config.persistence.storageKey),
  persistedBeforeRunErase,
  "Memorial history must be independent from deletable save-slot data",
);

for (
  let index = 0;
  index < config.persistence.maximumRecordsPerSlot + 4;
  index += 1
) {
  store.append({
    ...rawRecord,
    id: `hardcore-2-${20000 + index}`,
    diedAt: 20000 + index,
  });
}
assert.equal(
  store.getForSlot(2).length,
  config.persistence.maximumRecordsPerSlot,
);
assert.ok(store.getAll().length <= config.persistence.maximumRecords);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const graveMetadata = readWebpMetadata(resolve(root, config.assets.grave.path));
assert.deepEqual(
  { width: graveMetadata.width, height: graveMetadata.height },
  { width: 512, height: 768 },
);
assert.equal(
  config.world.widthToHeightRatio,
  graveMetadata.width / graveMetadata.height,
);
for (const asset of Object.values(config.assets)) {
  const path = resolve(root, asset.path);
  assert.equal(existsSync(path), true, `Missing memorial asset ${asset.path}`);
  assert.ok(statSync(path).size > 20000, `Memorial asset is too small ${asset.path}`);
}

const sourceContracts = [
  ["ui/scenes/BootScene.js", "getHardcoreMemorialPreloadAssets"],
  ["world/playScene/PlaySceneSetup.js", "new HardcoreMemorialStore()"],
  ["world/playScene/PlaySceneSetup.js", "new HardcoreMemorialWorldSystem("],
  ["world/playScene/HardcoreDeathBridge.js", "captureHardcoreDeathRecord"],
  ["world/playScene/HardcoreDeathBridge.js", "store.append(record)"],
  ["world/playScene/HardcoreDeathBridge.js", "buildHardcoreDeathRecapPages"],
  ["world/playScene/HardcoreDeathBridge.js", 'result.outcome === "exhausted"'],
  ["world/playScene/HardcoreDeathBridge.js", "queueDugTilesSave"],
  ["ui/overlays/HardcoreModalOverlay.js", "new HardcoreDeathRecapView("],
  ["ui/overlays/HardcoreModalOverlay.js", "showMemorial("],
  ["ui/overlays/hardcoreRecapAction.js", "deathActionButton"],
  ["ui/overlays/HardcoreDeathRecapView.js", "showMemorial("],
  ["systems/visual/HardcoreMemorialWorldSystem.js", "hardcoreMemorial"],
  ["systems/visual/HardcoreMemorialWorldSystem.js", "inspectHardcoreMemorial"],
  ["world/playScene/HardcoreModalStateBridge.js", "buildHardcoreDeathRecapPages"],
  ["world/playScene/HardcoreModalStateBridge.js", "runtime.modal.showMemorial"],
  ["world/playScene/HardcoreModeBridge.js", "inspectHardcoreMemorial"],
  ["world/playScene/PlaySceneUpdate.js", "hardcoreMemorialSystem?.update?.()"],
  ["world/model/DugTilesSaveStore.js", "_hasStoredArmedHardcoreRun"],
  ["world/model/DugTilesSaveStore.js", "PERMANENT_DEATH_TOMBSTONE_TOKEN"],
];
for (const [relativePath, expected] of sourceContracts) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.ok(source.includes(expected), `${relativePath} must contain ${expected}`);
}

for (const relativePath of [
  "ui/overlays/hardcoreRecapAction.js",
  "ui/overlays/HardcoreDeathRecapView.js",
  "systems/visual/HardcoreMemorialWorldSystem.js",
]) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.doesNotMatch(source, /add\.(graphics|rectangle|circle)\(/i);
}
assert.doesNotMatch(
  readFileSync(
    resolve(root, "systems/hardcore/HardcoreMemorialStore.js"),
    "utf8",
  ),
  /\b(clear|remove|delete)(All|Record|Memorials)\s*\(/,
  "Permanent memorial storage must not expose a run-death deletion path",
);

console.log("Hardcore permanent memorial contract passed.");
