import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAYLIST_DIR = path.join(ROOT, "sound/playlists");
const playlist = JSON.parse(await readFile(
  path.join(PLAYLIST_DIR, "playlist.json"),
  "utf8",
));
const diskTracks = (await readdir(PLAYLIST_DIR))
  .filter(file => /\.(mp3|ogg|wav)$/i.test(file))
  .sort();

const { ASSET_KEYS } = await import("../values/assetKeys.js");
const {
  MUSIC_CONTEXT_IDS,
  MUSIC_CUE_IDS,
  MUSIC_DIRECTOR_CONFIG,
} = await import("../values/musicDirector.js");
const { PLAYER_VOICE_CONFIG } = await import(
  "../values/playerVoiceCharacterLeoV1.generated.js"
);
const {
  buildMusicTrackCatalog,
  getMusicIndexesForContext,
  getMusicIndexesForCue,
  selectMenuMusicSeedIndex,
} = await import("../sound/musicTrackCatalog.js");
const { MusicDirector, resolveMusicContext } = await import(
  "../sound/MusicDirector.js"
);
const { MusicStreamController } = await import(
  "../sound/MusicStreamController.js"
);

assert.equal(playlist.length, 143, "the authored catalog must retain all 143 accepted tracks");
assert.equal(new Set(playlist).size, playlist.length, "playlist entries must be unique");
assert.deepEqual(
  [...playlist].sort(),
  diskTracks,
  "playlist.json must address every on-disk music file exactly once",
);

const catalog = buildMusicTrackCatalog(playlist);
assert.equal(catalog.length, playlist.length);
assert.deepEqual(
  catalog.filter(track => !track.classified).map(track => track.file),
  [],
  "every track must have at least one contextual or cue route",
);

for (const contextId of Object.values(MUSIC_CONTEXT_IDS)) {
  assert.ok(
    getMusicIndexesForContext(catalog, contextId).length > 0,
    `music context ${contextId} must have at least one track`,
  );
}
for (const cueId of Object.values(MUSIC_CUE_IDS)) {
  assert.ok(
    getMusicIndexesForCue(catalog, cueId).length > 0,
    `music cue ${cueId} must have at least one track`,
  );
}

function trackContaining(fragment) {
  const track = catalog.find(entry => entry.normalizedFile.includes(fragment));
  assert.ok(track, `expected a catalog track containing ${fragment}`);
  return track;
}

function assertTrackContext(fragment, contextId) {
  assert.ok(
    trackContaining(fragment).contexts.includes(contextId),
    `${fragment} must route to ${contextId}`,
  );
}

function assertTrackCue(fragment, cueId) {
  assert.ok(
    trackContaining(fragment).cues.includes(cueId),
    `${fragment} must route to ${cueId}`,
  );
}

assertTrackContext("title-active-run", MUSIC_CONTEXT_IDS.menu);
assertTrackContext("practice-courtyard", MUSIC_CONTEXT_IDS.tutorial);
assertTrackContext("safe-dawn", MUSIC_CONTEXT_IDS.surfaceDawn);
assertTrackContext("world-greywood", MUSIC_CONTEXT_IDS.shallow);
assertTrackContext("world-frostlands", MUSIC_CONTEXT_IDS.blueCavern);
assertTrackContext("world-alchemy-marsh", MUSIC_CONTEXT_IDS.amberDepths);
assertTrackContext("world-memory", MUSIC_CONTEXT_IDS.crystalVoid);
assertTrackContext("world-ashen-quarry", MUSIC_CONTEXT_IDS.silverVein);
assertTrackContext("tower-black-tower", MUSIC_CONTEXT_IDS.theCore);
assertTrackContext("world-storm-coast", MUSIC_CONTEXT_IDS.storm);
assertTrackContext("boss-frost-warden", MUSIC_CONTEXT_IDS.graveborerWurm);
assertTrackContext("player-critical-health", MUSIC_CONTEXT_IDS.hardcoreCritical);
assertTrackCue("discovery-unique-material", MUSIC_CUE_IDS.discovery);
assertTrackCue("checkpoint-milestone", MUSIC_CUE_IDS.milestone);
assertTrackCue("wounded-return-recovery", MUSIC_CUE_IDS.recovery);
assertTrackCue("death-graveyard-respawn", MUSIC_CUE_IDS.deathRevive);
assertTrackCue("death-final-life", MUSIC_CUE_IDS.deathFinal);
assertTrackCue("victory-floor-one-hundred", MUSIC_CUE_IDS.finale);

const menuSeed = selectMenuMusicSeedIndex(playlist, () => 0);
assert.ok(menuSeed >= 0, "menu-first loading must select a music seed");
assert.equal(catalog[menuSeed].category, "title");
assert.ok(catalog[menuSeed].contexts.includes(MUSIC_CONTEXT_IDS.menu));

assert.equal(resolveMusicContext({ scene: "menu" }), MUSIC_CONTEXT_IDS.menu);
assert.equal(resolveMusicContext({
  scene: "play",
  wurmActive: true,
  wurmPhase: "warning",
  earthquakePlayerAware: true,
  earthquakeState: "earthquake",
}), MUSIC_CONTEXT_IDS.graveborerWurm, "the committed Wurm encounter has top danger priority");
assert.equal(resolveMusicContext({
  scene: "play",
  earthquakePlayerAware: true,
  earthquakeState: "aftermath",
}), MUSIC_CONTEXT_IDS.earthquake);
assert.equal(resolveMusicContext({
  scene: "play",
  hardcoreArmed: true,
  hardcoreStressBand: "critical",
}), MUSIC_CONTEXT_IDS.hardcoreCritical);
assert.equal(resolveMusicContext({
  scene: "play",
  tutorialActive: true,
}), MUSIC_CONTEXT_IDS.tutorial);
assert.equal(resolveMusicContext({
  scene: "play",
  biome: "surface",
  weather: "storm",
  dayPhase: "dawn",
}), MUSIC_CONTEXT_IDS.storm);
assert.equal(resolveMusicContext({
  scene: "play",
  biome: "surface",
  weather: "clear",
  dayPhase: "dawn",
}), MUSIC_CONTEXT_IDS.surfaceDawn);
assert.equal(resolveMusicContext({
  scene: "play",
  biome: "surface",
  depth: MUSIC_DIRECTOR_CONFIG.shallowDepthTiles,
  weather: "clear",
  dayPhase: "afternoon",
}), MUSIC_CONTEXT_IDS.shallow);
assert.equal(resolveMusicContext({
  scene: "play",
  biome: "amberDepths",
}), MUSIC_CONTEXT_IDS.amberDepths);
for (const [dayPhase, contextId] of Object.entries(
  MUSIC_DIRECTOR_CONFIG.surfacePhaseContexts,
)) {
  assert.equal(resolveMusicContext({
    scene: "play", biome: "surface", depth: 0, weather: "clear", dayPhase,
  }), contextId);
}
for (const [biome, contextId] of Object.entries(MUSIC_DIRECTOR_CONFIG.biomeContexts)) {
  if (biome === "surface") continue;
  assert.equal(resolveMusicContext({ scene: "play", biome }), contextId);
}
assert.equal(resolveMusicContext({
  scene: "play", hardcoreArmed: true, hardcoreStressBand: "warning",
}), MUSIC_CONTEXT_IDS.hardcoreWarning);

const previousFiles = ASSET_KEYS.audio.music.files;
const previousPlaylist = ASSET_KEYS.audio.music.playlist;
const previousRandom = Math.random;
try {
  ASSET_KEYS.audio.music.files = [...playlist];
  ASSET_KEYS.audio.music.playlist = playlist.map(
    (_file, index) => `music-track-${index + 1}`,
  );
  Math.random = () => 0;

  let crossfades = 0;
  const fakeSystem = {
    scene: { sys: { settings: { key: "PlayScene" } }, time: { now: 0 } },
    audioInitialized: true,
    currentTrack: {},
    currentTrackIndex: trackContaining("safe-day").index,
    musicStreamController: { crossfade: () => { crossfades += 1; } },
  };
  const director = new MusicDirector(fakeSystem, MUSIC_DIRECTOR_CONFIG);
  director.update({
    scene: "play",
    earthquakePlayerAware: true,
    earthquakeState: "warning",
  }, { now: 10 });
  assert.equal(director.getSnapshot().context, MUSIC_CONTEXT_IDS.earthquake);
  assert.equal(crossfades, 1, "urgent danger must request an immediate crossfade");
  assert.ok(director.isIndexEligible(director.selectNextIndex()));

  assert.equal(director.requestCue(MUSIC_CUE_IDS.discovery, {
    now: 20,
    dedupeKey: "ember-ore",
  }), true);
  const discoveryIndex = director.selectNextIndex();
  assert.ok(catalog[discoveryIndex].cues.includes(MUSIC_CUE_IDS.discovery));
  assert.equal(director.handleVoiceEvent(
    PLAYER_VOICE_CONFIG.eventIds.depthMilestone,
    { now: 30, dedupeKey: "depth-500" },
  ), true);
  assert.equal(director.getSnapshot().cue, MUSIC_CUE_IDS.milestone);
  const milestoneIndex = director.selectNextIndex();
  assert.ok(catalog[milestoneIndex].cues.includes(MUSIC_CUE_IDS.milestone));
  assert.equal(director.completeCue(milestoneIndex), true);
  assert.equal(director.getSnapshot().cue, null);

  fakeSystem.currentTrackIndex = trackContaining("boss-frost-warden").index;
  director.noteTrackStarted(fakeSystem.currentTrackIndex, 1000);
  const crossfadesBeforeCalm = crossfades;
  const calmSnapshot = {
    scene: "play",
    biome: "surface",
    weather: "clear",
    dayPhase: "afternoon",
  };
  director.update(calmSnapshot, { now: 2000 });
  director.update(calmSnapshot, { now: 3800 });
  assert.equal(director.getSnapshot().context, MUSIC_CONTEXT_IDS.surfaceDay);
  assert.equal(
    crossfades,
    crossfadesBeforeCalm,
    "a normal context change must respect the minimum transition interval",
  );
  director.update(calmSnapshot, { now: 9000 });
  assert.equal(
    crossfades,
    crossfadesBeforeCalm + 1,
    "a deferred context change must retry when the interval becomes available",
  );
  director.destroy();

  class FakeSound {
    constructor() { this.isPlaying = false; this.handlers = new Map(); }
    play() { this.isPlaying = true; }
    stop() { this.isPlaying = false; }
    destroy() { this.destroyed = true; }
    on(event, listener) { this.handlers.set(event, listener); }
  }
  const loadedKeys = new Set([ASSET_KEYS.audio.music.playlist[menuSeed]]);
  const loadRequests = [];
  const streamingSystem = {
    getMusicMixVolume() { return this.musicVolume; },
    _isUsableSound(sound) { return sound && !sound.destroyed; },
    _setSoundVolume(sound, volume) { sound.volume = volume; return true; },
    scene: {
      sys: { settings: { key: "PlayScene" } },
      cache: { audio: { exists: key => loadedKeys.has(key) } },
      sound: { add: () => new FakeSound() },
      tweens: { add: tween => { tween.targets.gain = tween.gain; tween.onUpdate?.(); tween.onComplete?.(); } },
      time: {
        now: 0,
        delayedCall: (delay, callback) => ({ delay, callback, remove() {} }),
      },
    },
    config: { musicTrackChangeInterval: 120000 },
    audioInitialized: true,
    musicEnabled: true,
    musicVolume: 1,
    masterVolume: 1,
    currentTrack: null,
    currentTrackIndex: -1,
    musicTrackTimer: null,
    isCrossfading: false,
  };
  const streamingAssets = {
    streamingEnabled: true,
    ensure(key, options) {
      loadRequests.push({ key, options });
      return { cancel() {} };
    },
    noteMusicUse() {},
    trimMusic() {},
  };
  streamingSystem.musicDirector = new MusicDirector(streamingSystem);
  const streamController = new MusicStreamController(streamingSystem, streamingAssets);
  streamingSystem.musicStreamController = streamController;
  streamController.start();
  assert.equal(loadRequests.length, 1, "Play must stream its relevant pool on demand");
  const requestedIndex = ASSET_KEYS.audio.music.playlist.indexOf(loadRequests[0].key);
  assert.ok(
    catalog[requestedIndex].contexts.includes(MUSIC_CONTEXT_IDS.surfaceDay),
    "a cached menu title must not override the initial Play context",
  );
  loadedKeys.add(loadRequests[0].key);
  loadRequests[0].options.onReady();
  assert.equal(streamingSystem.currentTrackIndex, requestedIndex);
  streamController.destroy();
  streamingSystem.musicDirector.destroy();
} finally {
  ASSET_KEYS.audio.music.files = previousFiles;
  ASSET_KEYS.audio.music.playlist = previousPlaylist;
  Math.random = previousRandom;
}

const sources = await Promise.all([
  readFile(path.join(ROOT, "ui/scenes/BootScene.js"), "utf8"),
  readFile(path.join(ROOT, "world/playScene/PlaySceneUpdate.js"), "utf8"),
  readFile(path.join(ROOT, "systems/demo/UnderstarEndingSystem.js"), "utf8"),
  readFile(path.join(ROOT, "world/playScene/HardcoreDeathBridge.js"), "utf8"),
]);
assert.match(sources[0], /selectMenuMusicSeedIndex/);
assert.match(sources[0], /ASSET_KEYS\.audio\.music\.files/);
assert.match(sources[1], /syncPlaySceneMusicContext\(this, time, depth\)/);
assert.match(sources[2], /MUSIC_CUE_IDS\.finale/);
assert.match(sources[3], /MUSIC_CUE_IDS\.deathRevive/);
assert.match(sources[3], /MUSIC_CUE_IDS\.deathFinal/);

console.log(
  `PASS: contextual music director covers ${catalog.length} tracks, `
  + `${Object.keys(MUSIC_CONTEXT_IDS).length} contexts and `
  + `${Object.keys(MUSIC_CUE_IDS).length} cues`,
);
