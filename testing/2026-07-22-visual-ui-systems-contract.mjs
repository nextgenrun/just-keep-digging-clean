import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.location = { search: "" };
globalThis.Phaser = {
  WEBGL: 2,
  Animations: { Events: { ANIMATION_UPDATE: "animationupdate" } },
  Scenes: { Events: { UPDATE: "update", POST_UPDATE: "postupdate" } },
  Input: { Keyboard: { JustDown: (key) => Boolean(key?.justDown) } },
  Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
};

const { ApprovedHudSkin, hasApprovedHudSkin } = await import("../systems/visual/ApprovedHudSkin.js");
const { CaveInteriorOcclusionSystem } = await import("../systems/visual/CaveInteriorOcclusionSystem.js");
const { CaveTemplateVisualSystem } = await import("../systems/visual/CaveTemplateVisualSystem.js");
const { ClimbTrailSystem } = await import("../systems/visual/ClimbTrailSystem.js");
const { DepthMilestoneCinematic } = await import("../systems/visual/DepthMilestoneCinematic.js");
const { HUDSystem } = await import("../systems/visual/HUDSystem.js");
const { LootPickupFxSystem } = await import("../systems/visual/LootPickupFxSystem.js");
const { MilestoneBoardSystem } = await import("../systems/visual/MilestoneBoardSystem.js");
const { PickaxeTrailSystem } = await import("../systems/visual/PickaxeTrailSystem.js");
const { PlayerBodyLanguageSystem } = await import("../systems/visual/PlayerBodyLanguageSystem.js");
const { PostFxSystem } = await import("../systems/visual/PostFxSystem.js");
const { ScreenFlashSystem } = await import("../systems/visual/ScreenFlashSystem.js");
const { StarPillarSystem } = await import("../systems/visual/StarPillarSystem.js");
const { UINotificationSystem } = await import("../ui/UINotificationSystem.js");
const { DEPTH_MILESTONES } = await import("../values/depthMilestones.js");
const { TILE_TYPES } = await import("../values/tileTypes.js");

class Actor {
  constructor(x = 0, y = 0, key = null, text = "") {
    this.x = x; this.y = y; this.key = key; this.text = text; this.active = true;
    this.visible = true; this.alpha = 1; this.width = Math.max(8, String(text).length * 8);
    this.height = 18; this.scaleX = 1; this.scaleY = 1; this.children = [];
  }
  setOrigin(...value) { this.origin = value; return this; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setFillStyle(color, alpha) { this.fill = { color, alpha }; return this; }
  setVisible(value) { this.visible = value; return this; }
  setText(value) { this.text = String(value); this.width = Math.max(8, this.text.length * 8); return this; }
  setColor(value) { this.color = value; return this; }
  setStyle(value) { this.style = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setAngle(value) { this.angle = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setTexture(value) { this.key = value; return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  setStrokeStyle() { return this; }
  setY(value) { this.y = value; return this; }
  setX(value) { this.x = value; return this; }
  add(value) { this.children.push(...(Array.isArray(value) ? value : [value])); return this; }
  clear() { this.cleared = true; return this; }
  fillStyle() { return this; }
  fillRect() { return this; }
  fillRoundedRect() { return this; }
  lineStyle() { return this; }
  strokeRoundedRect() { return this; }
  beginPath() { return this; }
  arc() { return this; }
  strokePath() { return this; }
  destroy() { this.active = false; this.destroyed = true; }
}

function makeScene(allTextures = false) {
  const actors = []; const tweenCalls = []; const timers = []; const listeners = new Map();
  const create = (x = 0, y = 0, key = null, text = "") => {
    const actor = new Actor(x, y, key, text); actors.push(actor); return actor;
  };
  const vignette = {}; const matrix = {
    resetCalls: 0, reset() { this.resetCalls += 1; }, saturate(value) { this.saturation = value; },
    brightness(value) { this.brightnessValue = value; },
  };
  const postFX = {
    removed: [], addVignette: () => vignette, addColorMatrix: () => matrix,
    remove(value) { this.removed.push(value); },
  };
  return {
    actors, tweenCalls, timers, listeners, scale: { width: 800, height: 600 },
    config: { tileSize: 10, topAirRows: 5 }, player: { y: 300 },
    game: { renderer: { type: Phaser.WEBGL }, loop: { actualFps: 60 } },
    cameras: { main: { x: 2, y: 3, scrollX: 10, scrollY: 20, zoom: 2, width: 800, height: 600, postFX } },
    events: {
      on(event, callback) { listeners.set(event, callback); },
      off(event, callback) { if (listeners.get(event) === callback) listeners.delete(event); },
    },
    add: {
      image: (x, y, key) => create(x, y, key), rectangle: (x, y) => create(x, y, "rect"),
      circle: (x, y) => create(x, y, "circle"), graphics: () => create(0, 0, "graphics"),
      text: (x, y, text) => create(x, y, "text", text), container: (x, y) => create(x, y, "container"),
    },
    tweens: {
      killed: [], add(config) { const tween = { ...config, stopped: false, stop() { this.stopped = true; } }; tweenCalls.push(tween); return tween; },
      killTweensOf(target) { this.killed.push(target); },
    },
    time: {
      now: 1000, delayedCall(delay, callback) { const timer = { delay, callback, removed: false, remove() { this.removed = true; } }; timers.push(timer); return timer; },
    },
    textures: { exists: () => allTextures, getTextureKeys: () => [], get: () => null },
  };
}

// Approved skin activation is all-or-nothing and owns its created frame lifecycle.
const plainScene = makeScene(false);
assert.equal(hasApprovedHudSkin(plainScene), false);
const skinScene = makeScene(true);
const hudActors = Object.fromEntries(["hudBg", "statusBg", "torchIcon", "buffTimerText", "clockPanel", "weatherPanel", "weatherSeasonText", "statsText", "comboText", "torchStatusText", "clockTimeText", "clockDayText", "weatherText", "weatherTempText"].map((key) => [key, new Actor()]));
hudActors.torchActive = true;
const skin = new ApprovedHudSkin(skinScene, hudActors);
assert.equal(skin.active, true);
skin.setBuffLines(["Haste", "Luck"]); skin.setComboVisible(true); skin.setTorchState(false);
assert.equal(skin.buffTexts[0].text, "Haste");
assert.equal(skin.comboFrame.visible, true);
assert.equal(hudActors.torchStatusText.text, "○");
skin.destroy();
assert.equal(skinScene.actors.filter((actor) => actor.destroyed).length > 0, true);

// Cave covers collect all zone types, reveal on entry, and detect opened wall rings.
const caveScene = makeScene();
const world = {
  caveZones: [{ cx: 4, cy: 4, rx: 2, ry: 2, wallThickness: 1 }],
  hiddenCaveZones: [{ cx: 10, cy: 5, rx: 2, ry: 1, hasTreasureRoom: true }],
  geodeZones: [{ cx: 15, cy: 6, rx: 2, ry: 2, wallThickness: 1 }], inBounds: () => true,
  getTileType: () => TILE_TYPES.DIRT,
};
const covers = new CaveInteriorOcclusionSystem(caveScene, { enabled: true, depth: 2, updateRangeTiles: 99, fillColor: 1, fillAlpha: 1, edgeColor: 2, edgeAlpha: 1, bandAlpha: 0.1 });
covers.create(world);
assert.equal(covers.zones.length, 4);
covers.update({ tx: 4, ty: 4 });
assert.equal(covers.revealed.has(covers.zones[0].id), true);
assert.equal(covers.isBreached(covers.zones.find((zone) => zone.type === "geode")), true);
covers.destroy();

// Authored templates choose by size deterministically and clamp object opacity.
const templateScene = makeScene(true);
const templates = new CaveTemplateVisualSystem(templateScene, { enabled: true, tilePx: 10 });
assert.deepEqual([templates.getZoneSizeBucket({ rx: 2, ry: 2 }), templates.getZoneSizeBucket({ rx: 5, ry: 4 }), templates.getZoneSizeBucket({ rx: 10, ry: 8 })], ["small", "medium", "large"]);
const candidates = [{ sizeBucket: "small", id: 1 }, { sizeBucket: "large", id: 2 }];
assert.equal(templates.pickTemplate(candidates, { cx: 1, cy: 1, rx: 2, ry: 2 }, 0).id, 1);
templates.placeTemplate({ widthTiles: 2, heightTiles: 2, objects: [{ textureKey: "cave", localX: 1, opacity: 4, w: 8, h: 9 }] }, { cx: 2, cy: 3, rx: 2, ry: 2 }, "normalCaves");
assert.equal(templates.placedObjects[0].alpha, 1);
templates.destroy();

// Trail systems spawn only while active and unsubscribe their player listeners.
class Player extends Actor {
  constructor() { super(10, 20, "player"); this.texture = { key: "player" }; this.frame = { name: 3, realWidth: 10, realHeight: 10 }; this.displayWidth = 20; this.displayHeight = 30; this.originX = 0.5; this.originY = 1; this._events = new Map(); }
  on(event, callback) { this._events.set(event, callback); }
  off(event, callback) { if (this._events.get(event) === callback) this._events.delete(event); }
  emit(event) { this._events.get(event)?.(); }
}
const trailScene = makeScene(); const trailPlayer = new Player();
const climbTrail = new ClimbTrailSystem(trailScene, trailPlayer, { spawnEveryFrames: 2, depth: 2, alpha: 0.4, tint: 1, fadeMs: 50 });
climbTrail.start(); trailPlayer.emit("animationupdate"); trailPlayer.emit("animationupdate");
assert.equal(trailScene.actors.length, 2);
climbTrail.stop(); trailPlayer.emit("animationupdate"); assert.equal(trailScene.actors.length, 2); climbTrail.destroy();
const pickaxeTrail = new PickaxeTrailSystem(trailScene, trailPlayer, { depth: 2, alpha: 0.4, tint: 1, fadeMs: 50 });
pickaxeTrail.start(); trailPlayer.emit("animationupdate"); pickaxeTrail.stop();
assert.equal(trailScene.actors.length, 4); pickaxeTrail.destroy();

// Re-entrant flashes stop the previous tween and teardown destroys the overlay.
const flashScene = makeScene();
const flash = new ScreenFlashSystem(flashScene, { critColor: 1, critAlpha: 0.2, critDuration: 20, luckyColor: 2, luckyAlpha: 0.4, luckyDuration: 30 });
flash.flashCrit(); const firstFlash = flash._activeTween; flash.flashLucky();
assert.equal(firstFlash.stopped, true); assert.equal(flash._rect.fill.color, 2); flash.destroy(); assert.equal(flash._rect.destroyed, true);

// Depth cinematics honor depth, cooldown, FPS, overlay, duplicate, and active guards.
const cinemaScene = makeScene();
const cinema = new DepthMilestoneCinematic(cinemaScene, { enabled: true, cinematicDepths: [100], cooldownMs: 100, minFps: 30, blockDuringOverlays: true });
cinema._beginCinematic = () => { cinema._active = true; };
assert.equal(cinema.trigger(99, {}), false);
assert.equal(cinema.trigger(100, { depth: 100 }), true);
assert.equal(cinema.trigger(100, { depth: 100 }), false);
assert.deepEqual(cinema.getTriggeredDepths(), [100]);

// PostFX grades by depth, resets the low-FPS counter, and fails safe after sustained low FPS.
const fxScene = makeScene();
const fxConfig = { enabled: true, updateIntervalMs: 1, disableBelowFps: 30, lowFpsChecksToDisable: 2, lerpFactor: 1, depth: { startMeters: 1, fullMeters: 10 }, vignette: { enabled: true, x: 0.5, y: 0.5, surfaceRadius: 1, deepRadius: 0.5, surfaceStrength: 0, deepStrength: 1 }, grading: { enabled: true, surfaceSaturation: 0, deepSaturation: -0.2, surfaceBrightness: 1, deepBrightness: 0.7 } };
const postFx = new PostFxSystem(fxScene, fxConfig); assert.equal(postFx.create(), true); postFx._tick(2);
assert.equal(postFx._depthBlend, 1); fxScene.game.loop.actualFps = 10; postFx._tick(4); postFx._tick(6);
assert.equal(postFx.available, false); assert.equal(fxScene.cameras.main.postFX.removed.length, 2);

// Body language reacts to dig/landing/fall state and detaches from scene lifecycle.
const bodyScene = makeScene(); const bodyPlayer = new Player();
bodyScene.playerController = { physicsBody: { vy: 20 }, isGrounded: () => false };
const body = new PlayerBodyLanguageSystem(bodyScene, bodyPlayer, { enabled: true, affectLivingDrill: true, digPopAmount: 0.1, digPopDestroyAmount: 0.2, digPopMs: 50, digPopEase: "Sine", landSquashMinVy: 5, landSquashMaxVy: 20, landSquashAmount: 0.1, landSquashMaxAmount: 0.3, landRecoverMs: 50, landRecoverEase: "Sine", fallStretchMinVy: 5, fallStretchMaxVy: 20, fallStretchAmount: 0.2, fallStretchLerp: 1 });
body.create(); body.onDigImpact(true); assert.equal(body._squash.x, 1.2); body._tick(); assert.ok(bodyPlayer.scaleY > bodyPlayer.scaleX); body.destroy(); assert.equal(body.enabled, false);

// Milestones persist once, compose bonuses, and never award the same depth twice.
const board = new MilestoneBoardSystem(makeScene(), { tileSize: 10, topAirRows: 5 }, {}, {}, 7);
board._updateBoardDisplay = () => {};
const firstDepth = DEPTH_MILESTONES[0].depth;
assert.equal(board.checkDepthMilestone(firstDepth)?.depth, firstDepth);
assert.equal(board.checkDepthMilestone(firstDepth), null);
assert.deepEqual(board.getReachedDepths(), [firstDepth]); assert.equal(typeof board.getBonuses(), "object");

// Pillar interaction is consumed only in range or while its modal view is open.
const pillar = new StarPillarSystem(makeScene(), { tileSize: 10, starPillarTileX: 4, starPillarTileY: 5, starPillarProximityTiles: 1 }, { getUnlockedConstellations: () => [], getStarRarityCounts: () => [0] }, {});
pillar.openConstellationView = () => { pillar._isViewOpen = true; }; pillar.closeConstellationView = () => { pillar._isViewOpen = false; };
pillar.update(100, 16, { tx: 4, ty: 6 }, {}); assert.equal(pillar.handleInteract(), true); assert.equal(pillar._isViewOpen, true);
assert.equal(pillar.handleInteract(), true); assert.equal(pillar._isViewOpen, false); pillar.update(200, 16, { tx: 20, ty: 20 }, {}); assert.equal(pillar.handleInteract(), false);

// HUD public state clamps invalid values and routes status through the notification owner.
const hud = Object.create(HUDSystem.prototype); const statusCalls = [];
Object.assign(hud, { scene: { scale: { width: 800, height: 600 }, uiNotifications: { destroyed: false, show: (...args) => statusCalls.push(args) }, tweens: { killTweensOf() {}, add() {} } }, depth: 0, xTile: 0, tilesBroken: 0, aim: "RIGHT", gemPowerPercent: 0, statsDirty: false, _destroyed: false, _startDepthCountUp() {} });
hud.setDepth(-2); hud.setXTile(-3); hud.setTilesBroken(-4); hud.setGemPower(150); hud.setAim("UP"); hud.flashStatus("Safe");
assert.deepEqual([hud.depth, hud.xTile, hud.tilesBroken, hud.gemPowerPercent, hud.aim], [0, 0, 0, 100, "UP"]);
assert.equal(statusCalls[0][1].key, "hud-status"); assert.deepEqual(hud.getLootPickupTarget(), { x: 758, y: 558 });

// Loot pickups cap sprite counts, map world coordinates, and release all live sprites.
const lootScene = makeScene(true); const loot = new LootPickupFxSystem(lootScene, { getLootPickupTarget: () => ({ x: 50, y: 60 }) });
loot.maxActiveSprites = 2; loot.showResourcePickup({ worldX: 20, worldY: 30, resourceType: "dirt", amount: 9 });
assert.equal(loot.activeSprites.length, 2); assert.deepEqual(loot._worldToScreen(20, 30), { x: 22, y: 23 }); loot.destroy(); assert.equal(loot.activeSprites.length, 0);

// Notifications replace keyed entries, dedupe repeats, enforce caps, and clear timers/actors.
const noticeScene = makeScene(false); const notices = new UINotificationSystem(noticeScene, { maxToasts: 2, dedupeWindowMs: 5000 });
const keyed = notices.show("one", { key: "status" });
assert.equal(notices.show("updated", { key: "status" }), keyed); assert.equal(keyed.text.text, "updated");
assert.ok(notices.info("repeat")); assert.equal(notices.info("repeat"), null); notices.warning("third", { noDedupe: true });
assert.equal(notices.entries.length, 2); notices.clear(); assert.equal(notices.entries.length, 0); notices.destroy(); assert.equal(notices.destroyed, true);

console.log("visual/UI systems contract: caves, trails, HUD, milestones, postFX, loot, and notifications passed");
