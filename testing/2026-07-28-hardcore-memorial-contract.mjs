import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HardcoreMemorialStore } from "../systems/hardcore/HardcoreMemorialStore.js";
import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../systems/hardcore/hardcoreMemorialRecord.js";
import { HardcoreMemorialWorldSystem } from "../systems/visual/HardcoreMemorialWorldSystem.js";
import { HardcoreDeathRecapView } from "../ui/overlays/HardcoreDeathRecapView.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../values/hardcoreMemorials.js";

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
    setOrigin() { return this; },
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

function createVisualScene() {
  const images = [];
  const texts = [];
  const containers = [];
  const notices = [];
  return {
    images,
    texts,
    containers,
    notices,
    config: {
      tileSize: 94,
      worldWidthPx: 30000,
      worldDepthPx: 300000,
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
recapView.destroy();

const graveScene = createVisualScene();
const graveSystem = new HardcoreMemorialWorldSystem(graveScene, [record]);
assert.equal(graveSystem.entries.length, 1);
assert.equal(
  graveSystem.entries[0].root.depth,
  config.world.depth,
);
assert.equal(
  graveSystem.entries[0].image.displayHeight,
  config.world.heightTiles * graveScene.config.tileSize,
);
graveSystem.entries[0].image.emit("pointerdown");
assert.equal(graveScene.notices.length, 1);
assert.match(graveScene.notices[0].message, /777M/);
assert.match(graveScene.notices[0].message, /Graveborer Wurm/);
graveSystem.destroy();

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
  ["world/playScene/HardcoreDeathBridge.js", "isNewSave: true"],
  ["world/playScene/HardcoreDeathBridge.js", 'createHardcoreModeData("hardcore")'],
  ["ui/overlays/HardcoreModalOverlay.js", "new HardcoreDeathRecapView("],
  ["ui/overlays/HardcoreDeathRecapView.js", "deathActionButton"],
  ["systems/visual/HardcoreMemorialWorldSystem.js", "hardcoreMemorial"],
  ["world/model/DugTilesSaveStore.js", "_hasStoredArmedHardcoreRun"],
  ["world/model/DugTilesSaveStore.js", "PERMANENT_DEATH_TOMBSTONE_TOKEN"],
];
for (const [relativePath, expected] of sourceContracts) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.ok(source.includes(expected), `${relativePath} must contain ${expected}`);
}

for (const relativePath of [
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
