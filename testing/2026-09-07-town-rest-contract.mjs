import assert from 'node:assert/strict';
import { TOWN_REST, getSleepDayFraction } from '../values/townRest.js';
import { TIME_CONFIG } from '../values/timeConfig.js';
import { WEATHER_CONFIG } from '../values/weatherConfig.js';
import { DayNightCycle } from '../systems/environment/DayNightCycle.js';
import { WeatherDirector } from '../systems/environment/WeatherDirector.js';
import { WeatherWorldState } from '../systems/environment/WeatherWorldState.js';
import { WeatherPrecipitationEnvelope } from '../systems/environment/WeatherPrecipitationEnvelope.js';
import { advanceSleepWeather, captureSleepWeather, restoreSleepWeather } from '../systems/environment/sleepWeatherSimulation.js';
import { GameSaveCoordinator } from '../systems/save-system/GameSaveCoordinator.js';
import { TownRestSystem } from '../systems/environment/TownRestSystem.js';
import { acquireUiInputPriority, hasUiInputPriority } from '../systems/UiInputPriorityRegistry.js';
import { CampfireSystem } from '../systems/environment/CampfireSystem.js';
import { sanitizeCampfireData } from '../values/campfireConfig.js';
import { DugTilesSaveStore } from '../world/model/DugTilesSaveStore.js';
import { sanitizeHardcoreModeData } from '../values/hardcoreMode.js';
import { persistHardcoreLiveCheckpoint } from '../world/playScene/HardcoreDeathBridge.js';
import { isInTownForRest, canPersistTownRest } from '../world/playScene/TownRestSavePolicy.js';

const clock = Object.create(DayNightCycle.prototype);
const days = [];
Object.assign(clock, { scene: { events: { emit: (_, event) => days.push(event) } },
  currentTime: 0.9, day: 6, dayDuration: TIME_CONFIG.dayDurationMs, timeConfig: TIME_CONFIG });
clock.advanceTime(clock.dayDuration * 2.25);
assert.equal(clock.day, 9);
assert.ok(Math.abs(clock.currentTime - 0.15) < 1e-10);
assert.equal(clock.getSeason(), 'summer');
assert.deepEqual(days.map(d => d.days), [3]);
for (const time of [0, 0.3, 0.4, 0.8, 0.999]) {
  const delta = getSleepDayFraction(time);
  assert.equal(delta, 8 / 24, 'every rest lasts eight game hours, independent of bedtime');
  clock.fromJSON({ day: 3, currentTime: time });
  clock.advanceTime(delta * clock.dayDuration);
  assert.equal(clock.day, 3 + Math.floor(time + 8 / 24));
  assert.ok(Math.abs(clock.currentTime - (time + 8 / 24) % 1) < 1e-10);
}
clock.fromJSON({ day: -99, currentTime: Infinity });
assert.equal(clock.day, 1);
assert.ok(Number.isFinite(clock.currentTime));

const config = { tileSize: 94, topAirRows: 65 };
const scene = { config, playerController: { physicsBody: { x: 1817, y: 6035, w: 31, h: 75 } },
  scene: { isActive: () => false }, dayNightCycle: clock };
assert.equal(isInTownForRest(scene), true);
assert.equal(canPersistTownRest(scene), false);
scene._townRestCommit = true;
assert.equal(canPersistTownRest(scene), true);
scene.playerController.physicsBody.y += 94;
assert.equal(canPersistTownRest(scene), false, 'underground cannot save even with a commit token');
scene.playerController.physicsBody.y -= 94;
scene.playerController.physicsBody.x = 99999;
assert.equal(canPersistTownRest(scene), false, 'surface outside town cannot save');
scene.playerController.physicsBody.x = 1817;
scene.scene.isActive = () => true;
assert.equal(canPersistTownRest(scene), false, 'a compact cave cannot inherit a town checkpoint');

const director = new WeatherDirector(scene, WEATHER_CONFIG);
const initial = director.start(0);
const weather = { weatherConfig: WEATHER_CONFIG, director, _simulationTime: 0,
  kind: initial.kind, intensity: 0, targetIntensity: initial.targetIntensity,
  wind: 0, targetWind: initial.targetWind, gust: 0, targetGust: 0,
  cloudFront: { seconds: 0, update(ms) { this.seconds += ms / 1000; } },
  _getDepthFactors: () => ({ surfaceAmount: 1, undergroundAmount: 0 }),
  occlusionSampler: { getSnapshot: () => ({ openSkyAmount: 1, samples: [], landingSamples: [] }) },
  worldState: new WeatherWorldState(scene, config, WEATHER_CONFIG),
  precipitationEnvelope: new WeatherPrecipitationEnvelope(WEATHER_CONFIG),
  _getLightingTarget: () => ({}),
  _applyDirectorPatch(patch) { this.kind = patch.kind;
    if (patch.targetIntensity !== null) this.targetIntensity = patch.targetIntensity;
    if (patch.targetWind !== null) this.targetWind = patch.targetWind; },
};
const duration = clock.dayDuration * 0.9;
advanceSleepWeather(weather, duration, clock);
assert.equal(weather._simulationTime, duration);
assert.ok(weather.sleepWeatherTransitions > 1);
assert.equal(weather.cloudFront.seconds, duration / 1000);
assert.ok(weather.surfaceWetness >= 0 && weather.surfaceWetness <= 1);
const savedWeather = captureSleepWeather(weather);
weather.kind = 'clear'; weather.director.forecastKind = 'clear';
assert.equal(restoreSleepWeather(weather, savedWeather), true);
assert.equal(weather.kind, savedWeather.kind);
assert.equal(weather.director.forecastKind, savedWeather.director.forecastKind);
assert.ok(Math.abs(weather.director._phaseEndsAt - weather._simulationTime - savedWeather.director.phaseRemaining) < 1e-8);
assert.equal(restoreSleepWeather(weather, { kind: 'invented' }), false);

let admitted = false, writes = [], mutated = 0;
const coordinator = new GameSaveCoordinator({ canPersist: () => admitted,
  capture: metadata => ({ revisionMetadata: metadata, value: mutated }),
  write: async snapshot => { writes.push(snapshot); return true; } }, undefined,
  { documentRef: null, windowRef: null });
coordinator.requestSnapshot('mining');
assert.equal(await coordinator.flush({ force: true, reason: 'page-hide' }), false);
const deferred = await coordinator.transaction({ id: 'loot', mutate: () => { mutated++; return true; } });
assert.equal(deferred.deferred, true);
assert.equal(mutated, 1);
assert.equal(writes.length, 0);
admitted = true;
assert.equal(await coordinator.flush({ force: true, reason: 'town-bed-rest' }), true);
assert.equal(writes.length, 1);
assert.equal(writes[0].value, 1);
admitted = false;
await coordinator.flush({ force: true, reason: 'shutdown' });
assert.equal(writes.length, 1);
coordinator.destroy();

const camp = new CampfireSystem({ celestialActionBarSystem: { sync() {} } }, config, {}, {});
camp._emberCharges = 0;
camp.restoreEmberCharges('town-bed-sleep', { silent: true });
assert.equal(camp.getEmberCharges(), 1);
camp._emberCharges = 7;
camp._emberRefillCapacity = 2;
camp.restoreEmberCharges('town-bed-sleep', { silent: true });
assert.equal(camp.getEmberCharges(), 7, 'rest preserves mined surplus');
let attempts = 0, releases = 0, fail = true;
const rest = Object.create(TownRestSystem.prototype);
Object.assign(rest, { phase: 'choosing', selected: 1, completed: 0,
  view: { hideMenu() {}, showCaption() {} },
  ports: { save: async () => { attempts++; await Promise.resolve(); return !fail; } },
  scene: { campfireSystem: camp, setShopOpen: () => releases++,
    celestialActionBarSystem: { sync() {} }, time: { delayedCall() {} },
    dayNightCycle: { day: 2 }, events: { emit() {} } } });
rest.releaseUiPriority = acquireUiInputPriority(rest.scene);
assert.equal(await rest.confirm(), false);
assert.equal(rest.phase, 'choosing');
assert.equal(hasUiInputPriority(rest.scene), true, 'failed saving retains the rest UI lock');
assert.equal(camp.getActiveBuff(), null);
assert.equal(camp.getEmberCharges(), 7);
fail = false;
const pending = rest.confirm();
assert.equal(await rest.confirm(), false, 'double click cannot grant twice');
assert.equal(await pending, true);
assert.equal(hasUiInputPriority(rest.scene), false, 'completed rest releases its UI lock');
assert.equal(attempts, 2);
assert.equal(releases, 1);
assert.equal(camp.getActiveBuff().type, 'inspiration');
assert.equal(camp.getEmberCharges(), 7, 'waking blessing costs no Ember');
const data = camp.getSaveData();
assert.equal(data.hasRested, true);
assert.equal(sanitizeCampfireData(data).activeBuff.type, 'inspiration');
const loaded = new CampfireSystem({ celestialActionBarSystem: { sync() {} } }, config, {}, {});
loaded._ensureCampfireTierTexture = () => Promise.resolve(true);
loaded.loadSaveData(data);
assert.equal(loaded.getActiveBuff().remainingMs, data.activeBuff.remainingMs);
assert.equal(loaded.getEmberCharges(), 7);
// Death remains durable before a first bed save, without a position checkpoint.
const memory = new Map();
const oldWindow = globalThis.window;
const oldLocalStorage = globalThis.localStorage;
globalThis.window = { localStorage: {
  getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key), key: index => [...memory.keys()][index],
  get length() { return memory.size; },
} };
globalThis.localStorage = globalThis.window.localStorage;
const store = new DugTilesSaveStore({ slotId: 3 });
const mode = sanitizeHardcoreModeData({ mode: 'hardcore', armed: true });
assert.equal(persistHardcoreLiveCheckpoint({ townRestSystem: {}, dugTileSaveStore: store,
  _hardcoreRuntime: { system: { state: mode, getSaveData: () => mode } } }), false);
assert.equal(memory.size, 0, 'Hardcore expeditions cannot write a resume checkpoint');
assert.equal(store.preparePermanentDeath(mode).success, true);
assert.equal(store.isDeathTombstoned(), true, 'death still prevents reloading a live run');
assert.equal(memory.size, 1, 'only the death marker persists');
globalThis.window = oldWindow;
globalThis.localStorage = oldLocalStorage;

// The outdoor time-lapse, not closed eyes, owns the eight-hour clock advance.
{
  let shot = false, waking = true, refills = 0, menuShown = false;
  const restClock = Object.create(DayNightCycle.prototype);
  Object.assign(restClock, { scene: { events: { emit() {} } }, day: 3, currentTime: 0.9,
    dayDuration: TIME_CONFIG.dayDurationMs, timeConfig: TIME_CONFIG,
    update(delta) { this.advanceTime(delta); } });
  const flow = Object.create(TownRestSystem.prototype);
  Object.assign(flow, { phase: 'idle', ready: true, elapsed: 0,
    isInRange: () => true, canInteract: () => true,
    view: { beginSleep() {}, beginTimelapse() { shot = true; }, updateCamera() {},
      prepareWake() { shot = false; }, wake() {}, restoreCamera() {}, showMenu() { menuShown = true; } },
    ports: { beginDozing: () => true, updateDozing() {}, beginTimelapse() {},
      awaken: () => true, isAwakening: () => waking },
    scene: { time: { now: 0 }, dayNightCycle: restClock, setShopOpen() {},
      playerController: { physicsBody: {}, getPlayerTile: () => ({ tx: 19, ty: 64 }) },
      campfireSystem: { restoreEmberCharges() { refills++; }, _selectedIndex: 0 },
      weatherSystem: { advanceForSleep(delta, target) { target.advanceTime(delta); }, update() {} } } });
  assert(flow.requestSleep());
  for (let i = 0; i < 16; i++) flow.update(i * 100, 100);
  assert.equal(flow.phase, 'sleeping'); assert(shot);
  assert.equal(restClock.currentTime, 0.9, 'dozing does not hide the time advance');
  for (let i = 0; i < 3; i++) flow.update(i * 100, 100);
  assert.equal(restClock.currentTime, 0.9, 'the outdoor fade-in finishes before time accelerates');
  flow.update(400, 100);
  assert(restClock.currentTime > 0.9);
  while (flow.phase === 'sleeping') flow.update(0, 100);
  assert.equal(restClock.day, 4);
  assert(Math.abs(restClock.currentTime - (0.9 + 8 / 24 - 1)) < 1e-10);
  assert.equal(refills, 1); assert.equal(shot, false);
  for (let i = 0; i < 10; i++) flow.update(0, 100);
  assert.equal(menuShown, false, 'awakening must finish before the blessing choice');
  waking = false; flow.update(0, 100);
  for (let i = 0; i < 7; i++) flow.update(0, 100);
  assert.equal(menuShown, true);
  flow.releaseUiPriority?.();
}

console.log('TOWN_REST_CONTRACT_OK: day/season, weather persistence, town boundaries, deferred rewards, save retry, duplicate input, refill, and blessing reload');
