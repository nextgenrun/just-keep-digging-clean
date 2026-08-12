import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};
globalThis.location = { search: "?skylineVfx=0&skyPropsV3=0" };
globalThis.Phaser = {
  BlendModes: { ADD: 1, SCREEN: 2 },
  Scenes: { Events: { UPDATE: "update" } },
  Input: { Keyboard: { KeyCodes: { ESC: 27, ENTER: 13 } } },
  Math: {
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    DegToRad: (degrees) => degrees * Math.PI / 180,
  },
};

const { AmbientParticleSystem } = await import("../systems/environment/AmbientParticleSystem.js");
const { AtmosphereSystem } = await import("../systems/environment/AtmosphereSystem.js");
const { default: BiomeSystem } = await import("../systems/environment/BiomeSystem.js");
const { CampfireSystem } = await import("../systems/environment/CampfireSystem.js");
const { GroundEffectsAtmosphere } = await import("../systems/environment/GroundEffectsAtmosphere.js");
const { LightRayAtmosphere } = await import("../systems/environment/LightRayAtmosphere.js");
const { V11SkyIslandVisualSystem } = await import("../systems/environment/V11SkyIslandVisualSystem.js");
const { StartZoneGroundFacadeSystem } = await import("../world/rendering/StartZoneGroundFacadeSystem.js");
const { StartZoneScenicBackgroundSystem } = await import("../world/rendering/StartZoneScenicBackgroundSystem.js");
const { TILE_TYPES } = await import("../values/tileTypes.js");

class Actor {
  constructor(x = 0, y = 0, key = null) {
    this.x = x; this.y = y; this.key = key; this.alpha = 1; this.visible = true;
    this.active = true; this.destroyed = false; this.children = []; this.texture = null;
  }
  setDepth(value) { this.depth = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setRotation(value) { this.rotation = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setOrigin(...value) { this.origin = value; return this; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  setTexture(key) { this.key = key; return this; }
  setFillStyle(color, alpha) { this.fill = { color, alpha }; return this; }
  fillStyle() { return this; }
  fillEllipse() { return this; }
  fillCircle() { return this; }
  clear() { this.cleared = true; return this; }
  add(value) { this.children.push(...(Array.isArray(value) ? value : [value])); return this; }
  destroy() { this.destroyed = true; this.active = false; }
}

function makeCanvasTexture() {
  const gradient = { addColorStop() {} };
  const context = {
    createLinearGradient: () => gradient, clearRect() {}, fillRect() {},
    fillStyle: null, globalCompositeOperation: "", globalAlpha: 1, filter: "",
  };
  return { getContext: () => context, refresh() {} };
}

function makeEnvironmentScene() {
  const actors = [];
  const tweens = [];
  const listeners = new Map();
  const frames = new Set();
  const groundTexture = {
    has: (name) => frames.has(name), add: (name) => frames.add(name),
    getSourceImage: () => ({ width: 400, height: 200 }),
  };
  const create = (x, y, key) => { const actor = new Actor(x, y, key); actors.push(actor); return actor; };
  return {
    actors, tweenCalls: tweens, frames,
    config: { tileSize: 10, topAirRows: 5, spawnTileX: 2, spawnTileY: 5, viewportWidth: 320, viewportHeight: 180 },
    player: { y: 100 },
    game: { loop: { actualFps: 60, delta: 16 } },
    cameras: { main: { width: 320, height: 180, scrollX: 0, scrollY: 0, worldView: { x: 0, y: 0, width: 320, height: 180 } } },
    events: {
      on(event, callback) { listeners.set(event, callback); },
      off(event, callback) { if (listeners.get(event) === callback) listeners.delete(event); },
    },
    add: {
      circle: create, rectangle: create, image: create,
      graphics: () => create(0, 0, "graphics"),
      container: () => create(0, 0, "container"),
    },
    tweens: { add(config) { tweens.push(config); return config; } },
    textures: {
      exists: () => true,
      createCanvas: () => makeCanvasTexture(),
      get: () => groundTexture,
    },
    time: { now: 1000 },
    dayNightCycle: {
      getCurrentPhaseName: () => "dawn", getNightAmount: () => 0.1,
      getSunState: () => ({ alpha: 0.8, screenPosition: { x: 100, y: 30 } }),
    },
    weatherSystem: {
      wind: 20,
      getSnapshot: () => ({ windGustAmount: 0.2 }),
      getLightingSnapshot: () => ({ cloudCoverAmount: 0.5, sunTransmittance: 0.8, sunExposure: 1, sunTint: 0xffffff }),
    },
    lightSystem: {
      getSunlightSnapshot: () => ({ strength: 0.8, tint: 0xffffff, screenPosition: { x: 100, y: 30 } }),
      getShaderSnapshot: () => ({ surfaceLightInfluence: 1 }),
    },
  };
}

// Underground particles obey depth/FPS gates, cap live actors, and unsubscribe on destroy.
const scene = makeEnvironmentScene();
const particles = new AmbientParticleSystem(scene, {
  enabled: true, minDepthMeters: 1, maxParticles: 1, spawnIntervalMs: 1, disableBelowFps: 20,
  mote: { sizeMin: 1, sizeMax: 1, alphaMin: 0.2, alphaMax: 0.2, color: 1, driftXMin: 0, driftXMax: 0, driftYMin: 0, driftYMax: 0, lifeMinMs: 100, lifeMaxMs: 100, depth: 3 },
  debris: { enabled: false },
});
particles.create();
particles._tick(2);
assert.equal(particles._live.size, 1);
particles._tick(4);
assert.equal(particles._live.size, 1);
scene.tweenCalls.at(-1).onComplete();
assert.equal(particles._live.size, 0);
particles.destroy();

// Biome transitions interpolate tint/alpha and destroy the screen overlay cleanly.
const biome = new BiomeSystem(scene, scene.config, {});
assert.equal(biome._lerpColor(0x000000, 0xffffff, 0.5), 0x808080);
biome.update(250);
assert.ok(biome._currentAlpha > 0);
assert.equal(biome._overlay.fill.color, biome._currentColor);
const biomeOverlay = biome._overlay;
biome.destroy();
assert.equal(biomeOverlay.destroyed, true);

// Ground atmosphere switches mist/fireflies by phase and emits/removes wind particles.
const ground = new GroundEffectsAtmosphere(scene, scene.config);
assert.equal(ground.mistParticles.length, 8);
assert.equal(ground.fireflies.length, 15);
ground.update(1000, "night", 1, 1);
assert.equal(ground.windParticles.length, 1);
ground.windParticles[0].sprite.alpha = 0;
ground.update(16, "morning", 0, 0);
assert.equal(ground.windParticles.length, 1, "calm fade retains particles until its next windy update");
ground.destroy();
assert.equal(ground.fireflies.length, 0);

// Light shafts combine weather tint, surface depth, phase presets, layout, and teardown.
const rays = new LightRayAtmosphere(scene, scene.config);
assert.equal(rays.lightRays.length, 4);
assert.equal(rays._multiplyTint(0x804020, 0x808080), 0x402010);
scene.cameras.main.worldView.y = -90;
assert.equal(rays._getSurfaceInfluence(), 1);
rays.update(1000, "dawn");
assert.ok(rays.lightRays.every((ray) => ray.sprite.alpha > 0));
scene.cameras.main.worldView.y = 100000;
assert.equal(rays._getSurfaceInfluence(), 0);
rays.destroy();
assert.equal(rays.lightRays.length, 0);

// Atmosphere orchestration advances procedural clouds/glow and delegates lifecycle cleanup.
scene.cameras.main.worldView.y = 0;
const atmosphere = new AtmosphereSystem(scene, scene.config);
assert.equal(atmosphere.clouds.length, 12);
const cloudX = atmosphere.clouds[0].sprite.x;
atmosphere.update(1200, 1000);
assert.notEqual(atmosphere.clouds[0].sprite.x, cloudX);
assert.ok(atmosphere.horizonGlow.alpha > 0);
atmosphere.resize();
atmosphere.destroy();
assert.equal(atmosphere.clouds.length, 0);

// Campfire tier state is slot-scoped; buffs expire and paid upgrades persist atomically.
let money = 9999;
const spent = [];
const campfireSaveRequests = [];
const campScene = {
  game: { loop: { delta: 16 } }, textures: { exists: () => true },
  upgradeSystem: { getMoney: () => money, spendMoney: (value) => { spent.push(value); money -= value; } },
  hudSystem: { flashStatus() {} }, queueDugTilesSave(reason) { campfireSaveRequests.push(reason); },
};
const campfire = new CampfireSystem(campScene, { tileSize: 94 }, {}, {}, 3);
campfire._applyBuff(campfire._buffs[0]);
assert.ok(campfire.getMiningSpeedBonus() > 0);
campfire._updateBuffTimer(campfire.getRemainingMs() + 1);
assert.equal(campfire.getActiveBuff(), null);
const upgrade = campfire.upgradeCampfire();
assert.equal(upgrade.success, true);
assert.equal(campfire.getCampfireLevel(), 2);
assert.equal(campfire.getSaveData().level, 2);
assert.equal(storage.has("jkd-campfire-level-slot-3"), false);
assert.equal(campfireSaveRequests.length, 1);
assert.equal(spent.length, 1);

// Sky-island visual unlocks are idempotent and remove only their owned portal sprite.
const islandLayout = {
  enabled: true, platformDepth: 1, portalDepth: 2,
  levels: [{ levelId: "one", platformKey: "platform", portalKey: "portal", leftTile: 1, bottomTile: 2, widthTiles: 3, heightTiles: 1,
    portalSlots: [{ leftTile: 2, bottomTile: 2, widthTiles: 1, heightTiles: 1 }],
    groundPortal: { id: "ground", leftTile: 4, bottomTile: 5, widthTiles: 1, heightTiles: 1 } }],
};
const islands = new V11SkyIslandVisualSystem(scene, islandLayout);
islands.create();
assert.ok(islands.sprites.length >= 2);
const portal = islands.setGroundPortalUnlocked("one", true);
assert.equal(islands.setGroundPortalUnlocked("one", true), portal);
islands.setGroundPortalUnlocked("one", false);
assert.equal(portal.destroyed, true);

// Start-zone scenic plate and tile facade stay world-anchored and mirror live WorldModel state.
const scenicConfig = {
  enabled: true, queryParam: "townScenic", queryEnableValues: ["1"], queryDisableValues: ["0"],
  cropFrameName: "crop", sourceGroundFraction: 0.5, surfaceMaxDepthTiles: 2, renderDepth: -1,
  worldAnchor: { leftTileX: 0, widthTiles: 2 },
  groundFacade: { enabled: true, depthTiles: 2, renderDepth: 1, recognitionDepth: 2, crackDepth: 3,
    resourceRecognitionScale: 0.5, specialRecognitionScale: 0.6, recognitionAlpha: 1, updateIntervalMs: 10, tileOverlapPx: 0 },
};
globalThis.location.search = "";
scene.player.y = 50;
const scenic = new StartZoneScenicBackgroundSystem(scene, scenicConfig);
assert.equal(scenic.create(), true);
scene.player.y = 1000;
scenic.update();
assert.equal(scenic.image.visible, false);
scenic.destroy();
let air = false;
const world = {
  getTileType: () => air ? TILE_TYPES.AIR : TILE_TYPES.DIRT,
  getTileHp: () => 50, getTileMaxHp: () => 100,
};
const facade = new StartZoneGroundFacadeSystem(scene, world, scenicConfig);
assert.equal(facade.create(), true);
assert.equal(facade.tiles.length, 4);
assert.equal(facade.tiles[0].base.visible, true);
assert.equal(facade.tiles[0].crack.visible, true);
air = true;
facade.update(20, true);
assert.equal(facade.tiles[0].base.visible, false);
facade.destroy();

console.log("environment systems contract: particles, atmosphere, campfire, islands, and start zone passed");
