import assert from "node:assert/strict";

const storage = new Map();
const localStorageStub = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.localStorage = localStorageStub;
globalThis.window = { localStorage: localStorageStub };
globalThis.Phaser = {
  BlendModes: { ADD: 1 },
  Input: { Keyboard: { KeyCodes: { SPACE: 32, ESC: 27 } } },
};

const { SkylineWeatherVfxAtlas } = await import("../systems/environment/SkylineWeatherVfxAtlas.js");
const { WeatherAudioController } = await import("../systems/environment/WeatherAudioController.js");
const { WeatherDirector } = await import("../systems/environment/WeatherDirector.js");
const { WeatherGameplayController } = await import("../systems/environment/WeatherGameplayController.js");
const { WeatherLightningController } = await import("../systems/environment/WeatherLightningController.js");
const { WeatherParticleController } = await import("../systems/environment/WeatherParticleController.js");
const { createWeatherParticleTextures } = await import("../systems/environment/WeatherParticleTextures.js");
const { WeatherWorldState } = await import("../systems/environment/WeatherWorldState.js");
const darkness = await import("../systems/lighting/darknessLightShader.js");
const lightning = await import("../systems/lighting/lightningFlashShader.js");
const shaderIndex = await import("../systems/lighting/shaderIndex.js");
const { createCommonShaderUniforms } = await import("../systems/lighting/shaderUniforms.js");
const weatherShader = await import("../systems/lighting/weatherAtmosphereShader.js");
const { SaveBackupManager } = await import("../systems/save-system/SaveBackupManager.js");
const { USER_SETTINGS, normalizeKey, normalizeKeyboardEvent, formatKey, keyToPhaserKey } = await import("../systems/UserSettings.js");

class Actor {
  constructor() { this.active = true; this.alpha = 0; this.visible = false; }
  setScrollFactor(value) { this.scrollFactor = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  destroy() { this.active = false; this.destroyed = true; }
}

// Atlas slicing is deterministic, handles uneven rows, and never duplicates frames.
const frames = new Map();
const atlasTexture = {
  getSourceImage: () => ({ width: 100, height: 60 }), has: (key) => frames.has(key),
  add: (key, source, x, y, width, height) => frames.set(key, { source, x, y, width, height }),
};
const atlas = new SkylineWeatherVfxAtlas({ textures: { get: () => atlasTexture } }, { rain: "rain-sheet" }, { sheets: { rain: { layoutRows: [2, 1] } } });
assert.equal(atlas.register(), true); assert.equal(frames.size, 3); assert.deepEqual(frames.get("rain-2"), { source: 0, x: 0, y: 30, width: 100, height: 30 });
assert.equal(atlas.register(), true); assert.equal(frames.size, 3); assert.equal(atlas.textureKey("rain"), "rain-sheet");

// Weather director forecasting, forced overrides, retargets, and storm distance remain bounded.
const directorConfig = {
  initialKind: "clear", intensityRetargetMs: [5, 5], forecast: { windowMs: 10 },
  gusts: { retargetMs: [5, 5] }, director: { recentHistorySize: 2, repeatPenalty: 0.2, seasonWeights: {} },
  phases: {
    clear: { durationMs: [10, 10], intensity: [0, 0], wind: [0, 0], next: { storm: 1 } },
    storm: { durationMs: [10, 10], intensity: [1, 1], wind: [100, 100], next: { clear: 1 } },
  },
};
const director = new WeatherDirector({ dayNightCycle: { getSeason: () => "summer" } }, directorConfig);
assert.deepEqual(director.start(0), { kind: "clear", targetIntensity: 0, targetWind: 0, retarget: true, gustRetarget: true, entered: true });
const entered = director.update(10); assert.equal(entered.entered, true); assert.equal(entered.kind, "storm"); assert.equal(director.stormDistance, 0);
assert.equal(director.force("missing", 1, 100, 20), null); assert.equal(director.force("storm", 5, 100, 20).targetIntensity, 1);

// Gameplay penalties apply only from wet exposed surfaces and surface storms.
const gameplay = new WeatherGameplayController({
  gameplay: { enabled: true, maxWetMovementPenalty: 0.5, stormMiningAmbienceBonus: 0.2, stormXpAmbienceBonus: 0.1 },
  visibility: { enabled: true, maxStormPenalty: 0.6 },
});
const gameplayState = gameplay.update({ kind: "storm", intensity: 1, depth: { surfaceAmount: 1 }, world: { playerWeatherState: { onWetSurface: true, wetness: 0.8 }, playerShelterAmount: 0.25 } });
assert.equal(gameplayState.movementWetnessPenalty, 0.4); assert.ok(Math.abs(gameplayState.visibilityPenalty - 0.45) < 1e-9); assert.deepEqual({ ...gameplayState, movementWetnessPenalty: 0, visibilityPenalty: 0 }, { movementWetnessPenalty: 0, visibilityPenalty: 0, campfireExposure: 0, miningAmbienceBonus: 0.2, xpAmbienceBonus: 0.1 });

// World wetness grows, tracks columns, resolves exposure, and reports underground points.
const worldScene = { player: { x: 20, y: 50 } };
const worldWeatherConfig = { depth: { undergroundFullTiles: 10 }, worldWetness: { fillRatePerSecond: 4, dryRatePerSecond: 0.2, columnFillPerSecond: 2, columnDryPerSecond: 0.1, exposedWetnessThreshold: 0.01 } };
const worldState = new WeatherWorldState(worldScene, { tileSize: 10, topAirRows: 5 }, worldWeatherConfig);
const worldSnapshot = worldState.update(100, { isRainKind: true, intensity: 1, depth: { surfaceAmount: 1, undergroundAmount: 0 }, occlusion: { openSkyAmount: 1, landingSamples: [{ worldX: 20 }], samples: [{ worldX: 20, covered: false }] } });
assert.ok(worldSnapshot.worldWetnessAmount > 0); assert.equal(worldSnapshot.playerExposure, "exposed"); assert.ok(worldState.getWeatherAtWorldPoint(20, 50).wetness > 0); assert.equal(worldState.getWeatherAtWorldPoint(20, 200).undergroundAmount, 1);

// Procedural audio creates both buses, clamps targets, plays thunder, and disconnects cleanly.
function audioParam(value = 0) { return { value, last: null, cancelScheduledValues() {}, setTargetAtTime(next) { this.value = next; this.last = next; } }; }
const sources = [];
const audioContext = {
  sampleRate: 10, currentTime: 0, destination: {},
  createBuffer: (_channels, length) => ({ getChannelData: () => new Float32Array(length) }),
  createBufferSource: () => { const node = { connect() {}, disconnect() { this.disconnected = true; }, start() { this.started = true; }, stop() { this.stopped = true; } }; sources.push(node); return node; },
  createBiquadFilter: () => ({ type: "", frequency: audioParam(), Q: audioParam(), connect() {}, disconnect() {} }),
  createGain: () => ({ gain: audioParam(), connect() {}, disconnect() {} }),
};
const audioConfig = { audio: { coverMuffle: 0.3, undergroundMuffle: 0.2, rainVolume: 0.7, roofRainVolume: 0.4, caveDripVolume: 0.2, windVolume: 0.5, coverLowpassHz: 500, openLowpassHz: 3000, thunderDurationMs: [100, 100], thunderOpenLowpassHz: 1800, thunderCaveLowpassHz: 500, thunderVolume: 0.8 } };
const audioScene = { soundSystem: { audioInitialized: true, sfxEnabled: true, sfxVolume: 0.5 }, sound: { context: audioContext, destination: audioContext.destination } };
const audio = new WeatherAudioController(audioScene, audioConfig);
audio.update({ intensity: 1, depth: { surfaceAmount: 1, undergroundSignal: 0, undergroundAmount: 0 }, occlusion: { openSkyAmount: 1, coveredAmount: 0 }, director: { stormDistance: 0 }, wind: 190 });
assert.ok(audio._rainNoise.gain.gain.last > 0); assert.ok(audio._windNoise.gain.gain.last > 0); audio.playThunder({ undergroundAmount: 0 }, 2); assert.equal(sources.at(-1).started, true); audio.destroy(); assert.equal(audio._rainNoise, null);

// Lightning schedules one thunder event, routes shake strength, exposes flash, and clears timers.
const lightningTimers = []; const shakeCalls = []; const thunderCalls = [];
const lightningScene = {
  cameras: { main: { width: 800, height: 600 } }, add: { rectangle: () => new Actor() },
  time: { delayedCall(delay, callback) { const timer = { delay, callback, removed: false, remove() { this.removed = true; } }; lightningTimers.push(timer); return timer; } },
  shakeSystem: { shake: (...args) => shakeCalls.push(args) },
};
const lightningConfig = { renderDepths: { tint: 2, lightning: 3 }, lightning: { flashAlpha: [0.5, 0.5], thunderDelayMs: [10, 10], intervalMs: [100, 100], clusterChance: 0, clusterGapMs: [5, 5] } };
const lightningController = new WeatherLightningController(lightningScene, lightningConfig, { playThunder: (...args) => thunderCalls.push(args) });
lightningController.update(0, 0, { kind: "storm", intensity: 1, depth: { surfaceAmount: 1, undergroundAmount: 0 }, destroyed: false });
assert.equal(lightningTimers.length, 1); assert.ok(lightningController.getLightningFlashAmount() > 0); lightningTimers[0].callback(); assert.equal(shakeCalls.length, 1); assert.equal(thunderCalls.length, 1); lightningController.destroy(); assert.equal(lightningTimers[0].removed, true);

// Texture generation is complete and idempotent for all particle texture roles.
const textureKeys = { rain: "r", rainSoft: "rs", sheet: "sh", drip: "d", splash: "s", mist: "m", dust: "du", ripple: "ri" };
const generated = new Set();
const gradient = { addColorStop() {} };
const textureScene = {
  textures: {
    exists: (key) => generated.has(key),
    createCanvas(key) { generated.add(key); return { getContext: () => ({ createRadialGradient: () => gradient, fillRect() {}, fillStyle: null }), refresh() {} }; },
  },
  make: { graphics: () => ({ lineStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {}, fillStyle() {}, fillCircle() {}, strokeEllipse() {}, generateTexture: (key) => generated.add(key), destroy() {} }) },
};
createWeatherParticleTextures(textureScene, textureKeys); createWeatherParticleTextures(textureScene, textureKeys); assert.equal(generated.size, 8);

// Particle routing emits bounded rain bursts and recognizes only precipitation kinds.
const particle = Object.create(WeatherParticleController.prototype);
particle.weatherConfig = { rain: { layers: { foreground: { ratePerSecond: 10, maxBurst: 3, minSpeedY: 100, maxSpeedY: 200, windScale: 1, windSpread: 2, alpha: 0.5, flashBoost: 1, spawnY: 0, minLifespanMs: 100, maxLifespanMs: 1000, xJitterPx: 0 } } } };
particle._accumulators = { foreground: 0 }; particle._randomRange = ([min]) => min; particle._pick = (items) => items[0];
const emitted = []; const operation = { onChange(value) { this.value = value; } };
const emitter = { ops: { speedX: operation, speedY: { ...operation }, rotate: { ...operation }, lifespan: { ...operation } }, setAlpha(value) { this.alpha = value; }, emitParticleAt: (...args) => emitted.push(args) };
particle._emitRainLayer("foreground", emitter, 1, 1, { wind: 5, gust: 2, lightningFlashAmount: 0.5 }, [{ screenX: 20, landingScreenY: 200 }]);
assert.equal(emitted.length, 3); assert.equal(particle._isRainKind("storm"), true); assert.equal(particle._isRainKind("clear"), false);

// Shader exports share stable keys, complete uniform shapes, and standalone GLSL programs.
const uniformsA = createCommonShaderUniforms(); const uniformsB = createCommonShaderUniforms();
assert.deepEqual(uniformsA.uResolution, { type: "2f", value: { x: 1280, y: 720 } }); assert.notEqual(uniformsA.uResolution, uniformsB.uResolution);
for (const module of [darkness, lightning, weatherShader]) assert.match(Object.values(module).find((value) => typeof value === "string" && value.includes("precision mediump")), /gl_FragColor/);
assert.equal(shaderIndex.DARKNESS_LIGHT_SHADER_KEY, darkness.DARKNESS_LIGHT_SHADER_KEY); assert.equal(shaderIndex.LIGHTNING_FLASH_SHADER_KEY, lightning.LIGHTNING_FLASH_SHADER_KEY); assert.equal(shaderIndex.WEATHER_ATMOSPHERE_SHADER_KEY, weatherShader.WEATHER_ATMOSPHERE_SHADER_KEY);

// Rotating backups restore without metadata and checksums detect mutation.
const RealDate = globalThis.Date; let backupClock = 0;
globalThis.Date = class extends RealDate { constructor(value) { super(value === undefined ? `2026-01-01T00:00:00.${String(backupClock++).padStart(3, "0")}Z` : value); } };
const backups = new SaveBackupManager({ maxBackups: 2, backupPrefix: "health-backup" });
const b0 = backups.createBackup(1, { value: 1, updatedAt: "2026-01-01", version: 2 }); const b1 = backups.createBackup(1, { value: 2, updatedAt: "2026-01-02" }); const b2 = backups.createBackup(1, { value: 3, updatedAt: "2026-01-03" });
const rotationIndices = [b0.backupIndex, b1.backupIndex, b2.backupIndex];
assert.equal(backups.getBackupStats(1).totalBackups, 2); assert.equal(backups.restoreBackup(1, b2.backupIndex).saveData.value, 3);
const checksum = backups.calculateChecksum({ value: 1 }); assert.equal(backups.verifyChecksum({ value: 1 }, checksum), true); assert.equal(backups.verifyChecksum({ value: 2 }, checksum), false);
const widerRing = new SaveBackupManager({ maxBackups: 3, backupPrefix: "health-backup-wide" });
const widerIndices = [1, 2, 3, 4, 5].map(value => widerRing.createBackup(1, { value }).backupIndex);
globalThis.Date = RealDate;

// User settings normalize browser keys, clamp persisted values, reject conflicts, and notify subscribers.
USER_SETTINGS.resetAll(); let notifications = 0; const unsubscribe = USER_SETTINGS.subscribe(() => { notifications += 1; });
USER_SETTINGS.updateAudio({ masterVolume: 4, musicVolume: -2 }); assert.deepEqual([USER_SETTINGS.getAudio().masterVolume, USER_SETTINGS.getAudio().musicVolume], [1, 0]); assert.equal(notifications, 1);
assert.equal(normalizeKey("Escape"), "ESC"); assert.equal(normalizeKeyboardEvent({ code: "Digit7" }), "SEVEN"); assert.equal(formatKey("SPACE"), "Space"); assert.equal(keyToPhaserKey("SPACE"), 32);
const keybinds = Object.entries(USER_SETTINGS.getKeybinds()); assert.equal(USER_SETTINGS.setKeybind(keybinds[0][0], keybinds[1][1]).ok, false); unsubscribe();

assert.deepEqual(rotationIndices, [0, 1, 0], "full backup ring must overwrite its oldest slot");
assert.deepEqual(widerIndices, [0, 1, 2, 0, 1], "backup ring must fill every slot before rotating oldest-first");

console.log("weather/settings/shader contract: controller state, particles, audio, saves, settings, and GLSL passed");
