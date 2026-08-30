import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

globalThis.Phaser = {
  Scene: class {},
  Math: { Between: minimum => minimum },
};
globalThis.location = { search: "" };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playlist = JSON.parse(await readFile(
  path.join(ROOT, "sound/playlists/playlist.json"),
  "utf8",
));
const bootSource = await readFile(
  path.join(ROOT, "ui/scenes/BootScene.js"),
  "utf8",
);
const menuAudioSource = await readFile(
  path.join(ROOT, "ui/scenes/MenuAudioScene.js"),
  "utf8",
);
const originalFetch = globalThis.fetch;
const originalRandom = Math.random;
globalThis.fetch = async url => ({
  json: async () => String(url).includes("playlist.json") ? playlist : [],
});
Math.random = () => 0;

const { ASSET_KEYS } = await import("../values/assetKeys.js");
const { BootScene } = await import("../ui/scenes/BootScene.js");

class FakeLoader {
  constructor(cache, events) {
    this.cache = cache;
    this.events = events;
    this.listeners = new Map();
    this.queued = [];
  }

  reset() {
    this.events.push("loader-reset");
    this.queued = [];
  }

  audio(key, assetPath) {
    this.queued.push({ key, path: assetPath });
  }

  on(event, listener) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  once(event, listener) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };
    this.on(event, wrapped);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event, ...args) {
    for (const listener of [...(this.listeners.get(event) || [])]) {
      listener(...args);
    }
  }

  start() {
    this.events.push("priority-loader-start");
    for (const asset of this.queued) this.cache.add(asset.key);
    this.emit("progress", 1);
    this.emit("complete");
  }
}

const createIndex = bootSource.indexOf("async create()");
const menuFirstIndex = bootSource.indexOf("await this.startMenuFirstPreload()", createIndex);
const fullPreloadIndex = bootSource.indexOf("await this.startFullPreload()", createIndex);
assert.ok(menuFirstIndex > createIndex, "Boot create must start its menu-first phase");
assert.ok(
  fullPreloadIndex > menuFirstIndex,
  "the full asset queue must start only after menu music is ready",
);
assert.match(
  bootSource,
  /finishBoot\(\)[\s\S]*hydrateMenuAudioLibraries\(\)[\s\S]*showBootSplash\(\)/,
  "the early menu sound system must be hydrated after the full audio load",
);
assert.match(
  menuAudioSource,
  /if \(!this\.soundSystem\) \{[\s\S]*this\._startRequested = true;[\s\S]*return;/,
  "an early music request must survive until MenuAudioScene has been created",
);

const events = [];
const cachedAudio = new Set();
const boot = new BootScene();
boot.cache = { audio: { exists: key => cachedAudio.has(key) } };
boot.load = new FakeLoader(cachedAudio, events);
boot.loadingUi = { setProgress: value => events.push(`progress-${value}`) };

const priorityReady = await boot.startMenuFirstPreload();
assert.equal(priorityReady, true);
assert.equal(boot.load.queued.length, 1, "the priority phase must queue one music track only");
assert.equal(boot.load.queued[0].key, ASSET_KEYS.audio.music.bootSeedKey);
assert.ok(cachedAudio.has(ASSET_KEYS.audio.music.bootSeedKey));
assert.deepEqual(events.slice(0, 2), ["loader-reset", "priority-loader-start"]);
assert.equal(ASSET_KEYS.audio.music.playlist.length, playlist.length);

boot._queuedAudioKeys.clear();
boot.load.queued = [];
await boot.preloadAudio();
assert.equal(
  boot.load.queued.some(asset => asset.key === ASSET_KEYS.audio.music.bootSeedKey),
  false,
  "the full phase must reuse, not download again, the priority music track",
);
assert.ok(
  boot.load.queued.some(asset => asset.key.startsWith("sfx-") || asset.key.startsWith("dig-")),
  "the full phase must still queue gameplay audio",
);

globalThis.fetch = originalFetch;
Math.random = originalRandom;

console.log("PASS: menu-first loading order contract");
