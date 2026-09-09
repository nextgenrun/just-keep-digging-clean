import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
class FakeEmitter {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback, context) {
    const entries = this.listeners.get(event) || [];
    entries.push({ callback, context });
    this.listeners.set(event, entries);
    return this;
  }
  once(event, callback, context) {
    return this.on(event, callback, context);
  }
  off(event, callback, context) {
    const entries = this.listeners.get(event) || [];
    this.listeners.set(event, entries.filter(entry => (
      entry.callback !== callback || entry.context !== context
    )));
    return this;
  }
  emit(event, ...args) {
    for (const { callback, context } of [...(this.listeners.get(event) || [])]) {
      callback.apply(context, args);
    }
  }
  removeAllListeners() {
    this.listeners.clear();
  }
}
class FakeKey extends FakeEmitter {
  constructor() {
    super();
    this.justDown = false;
  }
  press() {
    this.justDown = true;
    this.emit("down");
  }
}

globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        if (!key?.justDown) return false;
        key.justDown = false;
        return true;
      },
    },
  },
  Math: {
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  },
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
};
const { WORLD_MAP_CONFIG } = await import("../values/worldMapConfig.js");
const { resolveWorldMapPlayerTile } = await import("../systems/map/resolveWorldMapPlayerTile.js");
const { WorldMapDiscoverySystem } = await import("../systems/map/WorldMapDiscoverySystem.js");
const { WorldMapInputController } = await import("../ui/overlays/world-map/WorldMapInputController.js");
const { WorldMapRenderer } = await import("../ui/overlays/world-map/WorldMapRenderer.js");
const { WorldMapTextButton } = await import("../ui/overlays/world-map/WorldMapTextButton.js");
const { GameInputHandler } = await import("../world/playScene/GameInputHandler.js");

const worldModel = {
  widthTiles: 280,
  depthTiles: 5065,
  topAirRows: 65,
  tileSize: 10,
  dugTiles: new Map(),
  worldToTile: (x, y) => ({ tx: Math.floor(x / 10), ty: Math.floor(y / 10) }),
};
const authoritativeScene = {
  worldModel,
  player: { x: 2200, y: 33000 },
  playerController: {
    getPlayerTile: () => ({ tx: 28, ty: 66 }),
    physicsBody: { getCenter: () => ({ x: 285, y: 665 }) },
    sprite: { x: 9000, y: 9000 },
  },
};
assert.deepEqual(
  resolveWorldMapPlayerTile(authoritativeScene),
  { tx: 28, ty: 66 },
  "the collision-controller tile must beat the sprite visual anchor",
);
assert.deepEqual(
  resolveWorldMapPlayerTile({
    worldModel,
    playerController: {
      getPlayerTile: () => ({ tx: Number.NaN, ty: 1 }),
      physicsBody: { getCenter: () => ({ x: 315, y: 705 }) },
    },
  }),
  { tx: 31, ty: 70 },
  "a finite collision-body center must be the first fallback",
);
const storage = {
  readJson: () => null,
  writeJson: () => true,
};
const discovery = new WorldMapDiscoverySystem(authoritativeScene, 1, storage);
discovery.updatePlayerDiscovery(true);
assert.equal(discovery.lastPlayerCellKey, "7,16", "fog discovery must use the same player tile");

const renderer = new WorldMapRenderer(
  authoritativeScene,
  {
    getDiscoveredCells: () => [],
    isTileDiscovered: () => false,
    isWorldPositionDiscovered: () => false,
    getDiscoveryRatio: () => 0.25,
  },
  { getMarkers: () => [] },
);
const layout = { x: 150, y: 59, width: 823, height: 599 };
const centeredView = { zoom: WORLD_MAP_CONFIG.view.defaultZoom, centerTileX: 28, centerTileY: 66 };
renderer.clampView(layout, centeredView);
assert.deepEqual(
  { x: centeredView.centerTileX, y: centeredView.centerTileY },
  { x: 28, y: 66 },
  "surface players must not be pushed away from center by whole-world edge clamping",
);
const centeredMarker = renderer.worldToScreen(28, 66, layout, centeredView);
assert.equal(centeredMarker.x, layout.x + layout.width / 2);
assert.equal(centeredMarker.y, layout.y + layout.height / 2);
const closeZoomMetrics = renderer.getMetrics(layout, {
  ...centeredView,
  zoom: WORLD_MAP_CONFIG.view.maxZoom,
});
assert.ok(
  closeZoomMetrics.pixelsPerTile >= 30,
  "maximum zoom must provide close, near-native world-tile inspection",
);

const zoomView = { zoom: 8, centerTileX: 140, centerTileY: 2000 };
const wheelAnchor = { x: 710, y: 240 };
const tileBeforeZoom = renderer.screenToWorld(wheelAnchor.x, wheelAnchor.y, layout, zoomView);
renderer.zoomAtScreenPoint(layout, zoomView, 12, wheelAnchor.x, wheelAnchor.y);
const tileAfterZoom = renderer.screenToWorld(wheelAnchor.x, wheelAnchor.y, layout, zoomView);
assert.ok(Math.abs(tileBeforeZoom.tileX - tileAfterZoom.tileX) < 1e-9);
assert.ok(Math.abs(tileBeforeZoom.tileY - tileAfterZoom.tileY) < 1e-9);
const graphics = {
  clear() {}, fillStyle() {}, fillRect() {}, lineStyle() {}, lineBetween() {},
  strokeRect() {}, fillCircle() {}, strokeCircle() {},
};
const stats = renderer.render(graphics, layout, centeredView);
assert.equal(stats.playerAnnotation.x, layout.x + layout.width / 2);
assert.equal(stats.playerAnnotation.y, layout.y + layout.height / 2);
assert.equal(stats.playerAnnotation.iconFrame, WORLD_MAP_CONFIG.symbolAtlas.frames.player);
assert.equal(stats.currentDepth, 1);
const input = new FakeEmitter();
input.keyboard = new FakeEmitter();
const inputScene = { input };
const calls = { pans: [], zooms: [], centers: 0 };
const inputController = new WorldMapInputController(inputScene, {
  isOpen: () => true,
  getViewport: () => layout,
  panByPixels: (x, y) => calls.pans.push([x, y]),
  changeZoom: (delta, anchor) => calls.zooms.push([delta, anchor]),
  centerOnPlayer: () => { calls.centers += 1; },
});
const dragZone = new FakeEmitter();
dragZone.input = { cursor: "", hitArea: { setTo() {} } };
inputController.bindViewport(dragZone);
let stopped = 0;
dragZone.emit("pointerdown", { id: 3, x: 500, y: 300 }, 0, 0, {
  stopPropagation: () => { stopped += 1; },
});
assert.equal(dragZone.input.cursor, WORLD_MAP_CONFIG.input.activeCursor);
input.emit("pointermove", { id: 9, x: 900, y: 900 });
assert.equal(calls.pans.length, 0, "a second pointer must not hijack map dragging");
input.emit("pointermove", { id: 3, x: 525, y: 288 });
assert.deepEqual(calls.pans[0], [25, -12]);
input.emit("pointerup", { id: 3 });
assert.equal(dragZone.input.cursor, WORLD_MAP_CONFIG.input.idleCursor);
assert.equal(inputController.lastPointer, null, "pointer release must end dragging globally");

input.emit("wheel", { x: 20, y: 20 }, [], 0, -1);
assert.equal(calls.zooms.length, 0, "wheel input outside the map must pass through");
let wheelPrevented = 0;
input.emit("wheel", {
  x: 700, y: 300,
  event: { preventDefault: () => { wheelPrevented += 1; } },
}, [], 0, -1);
assert.deepEqual(calls.zooms[0], [WORLD_MAP_CONFIG.view.zoomStep, { x: 700, y: 300 }]);
assert.equal(wheelPrevented, 1);
let keyPrevented = 0;
input.keyboard.emit("keydown", { code: "KeyF", preventDefault: () => { keyPrevented += 1; } });
input.keyboard.emit("keydown", { code: "ArrowRight", preventDefault: () => { keyPrevented += 1; } });
assert.equal(calls.centers, 1);
assert.deepEqual(calls.pans.at(-1), [-WORLD_MAP_CONFIG.view.keyboardPanScreenPx, 0]);
assert.equal(keyPrevented, 2);
assert.equal(stopped, 1);
inputController.destroy();

const mapKey = new FakeKey();
const hardEscape = new FakeKey();
const gameplayKeyboard = new FakeEmitter();
const globalKeys = {
  map: mapKey,
  hardEscape,
  escape: hardEscape,
  shift: { isDown: false },
  restart: null,
  fullscreen: null,
  screenRecord: null,
  muteMusic: null,
  muteSfx: null,
};
const mapToggleScene = {
  events: new FakeEmitter(),
  input: { keyboard: gameplayKeyboard },
  _settingsKeyCaptureActive: false,
  _worldMapFeatureLoading: false,
  worldMapOverlay: null,
  toggleCalls: 0,
  toggleWorldMap() {
    this.toggleCalls += 1;
    this.worldMapOverlay = this.worldMapOverlay?.isOpen ? null : { isOpen: true };
    return true;
  },
};
const gameInput = new GameInputHandler(
  mapToggleScene,
  { getKeys: () => globalKeys },
  {},
);
mapKey.justDown = true;
gameplayKeyboard.emit("keydown", { code: "KeyM", key: "m", repeat: false });
assert.equal(mapToggleScene.worldMapOverlay.isOpen, true, "M down must open the map immediately");
assert.equal(gameInput.handleGlobalInput(), true);
assert.equal(mapToggleScene.toggleCalls, 1, "the frame poll must not double-toggle the open press");
mapKey.justDown = true;
gameplayKeyboard.emit("keydown", { code: "KeyM", key: "m", repeat: false });
assert.equal(mapToggleScene.worldMapOverlay, null, "M down must close an already-open map immediately");
assert.equal(gameInput.handleGlobalInput(), true, "the spent close press must be consumed");
assert.equal(mapToggleScene.toggleCalls, 2, "the close press must not reopen the map in the frame loop");
gameInput.destroy();

const root = { children: [], add(object) { this.children.push(object); } };
const buttonScene = {
  add: {
    zone(x, y, width, height) {
      const zone = new FakeEmitter();
      Object.assign(zone, { x, y, width, height, input: { hitArea: { setTo: (...args) => { zone.hitRect = args; } } } });
      zone.setOrigin = zone.setScrollFactor = zone.setInteractive = function(options) {
        if (options) this.input.cursor = options.cursor;
        return this;
      };
      zone.destroy = () => { zone.destroyed = true; };
      return zone;
    },
  },
  soundSystem: { playUiSelect: () => { buttonScene.soundCalls += 1; } },
  soundCalls: 0,
  tweens: { killTweensOf() {}, add: options => { buttonScene.lastTween = options; } },
};
const label = {
  color: "", alpha: 1, scale: 1,
  setColor(value) { this.color = value; return this; },
  setAlpha(value) { this.alpha = value; return this; },
  setScale(value) { this.scale = value; return this; },
  destroy() { this.destroyed = true; },
};
let buttonCalls = 0;
const button = new WorldMapTextButton(buttonScene, root, label, {
  x: 90, y: 40, width: 80, height: 48,
  activate: () => { buttonCalls += 1; return true; },
});
assert.deepEqual(button.zone.hitRect, [0, 0, 80, 48], "hit geometry must stay in Phaser-local coordinates");
button.zone.emit("pointerover");
assert.equal(label.color, WORLD_MAP_CONFIG.colors.active);
assert.equal(label.scale, WORLD_MAP_CONFIG.input.hoverScale);
button.zone.emit("pointerdown", null, 0, 0, { stopPropagation: () => { stopped += 1; } });
assert.equal(buttonCalls, 1);
assert.equal(buttonScene.soundCalls, 1);
assert.equal(buttonScene.lastTween.duration, WORLD_MAP_CONFIG.input.pressDurationMs);
button.setEnabled(false);
button.zone.emit("pointerdown", null, 0, 0, { stopPropagation: () => { stopped += 1; } });
assert.equal(buttonCalls, 1, "disabled zoom-limit controls must ignore clicks");
assert.equal(button.zone.input.cursor, WORLD_MAP_CONFIG.input.disabledCursor);
button.destroy();

assert.ok(WORLD_MAP_CONFIG.input.closeHitSizePx >= 44);
assert.ok(WORLD_MAP_CONFIG.input.zoomHitSizePx >= 44);
assert.ok(WORLD_MAP_CONFIG.input.activityHitHeightPx >= 38);
assert.ok(WORLD_MAP_CONFIG.view.defaultZoom > WORLD_MAP_CONFIG.view.minZoom);
assert.ok(
  WORLD_MAP_CONFIG.view.maxZoom / WORLD_MAP_CONFIG.view.defaultZoom >= 16,
  "the deep world needs a substantially closer zoom range than its opening view",
);
assert.ok(
  WORLD_MAP_CONFIG.view.zoomStep >= 4,
  "the extended zoom range must remain practical to reach with wheel and button input",
);

const viewSource = await readFile(new URL("../ui/overlays/world-map/WorldMapOverlayView.js", import.meta.url), "utf8");
const inputSource = await readFile(new URL("../world/playScene/GameInputHandler.js", import.meta.url), "utf8");
const escapeSource = await readFile(new URL("../world/playScene/hasEscapeClosableUi.js", import.meta.url), "utf8");
assert.ok(
  viewSource.indexOf("this._buildViewportInput();") < viewSource.indexOf("const closeText"),
  "the drag surface must be below later-created mouse controls",
);
assert.match(viewSource, /x: closeText\.x, y: closeText\.y/);
assert.match(viewSource, /x: centerText\.x, y: centerText\.y/);
assert.match(inputSource, /justDown\(keys\.map\)[\s\S]*?toggleWorldMap/);
assert.match(escapeSource, /worldMapOverlay\?\.isOpen/);

discovery.destroy();
console.log("World map mouse-polish contract passed: body-centered marker, anchored zoom, global drag release, aligned controls, M and Escape routing.");
