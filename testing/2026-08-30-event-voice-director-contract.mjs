import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PLAYER_VOICE_CONFIG,
  PLAYER_VOICE_LIBRARY,
} from "../values/playerVoiceCharacterLeoV1.generated.js";
import { EventVoiceLineDirector } from "../sound/EventVoiceLineDirector.js";
import {
  resolvePlayerVoiceFamily,
  resolvePlayerVoiceRuntime,
  scalePlayerVoicePolicy,
} from "../sound/PlayerVoiceRuntimeMode.js";
import { VoiceLineManager } from "../sound/VoiceLineManager.js";
import { VoiceLineRequestQueue } from "../sound/VoiceLineRequestQueue.js";

assert.equal(PLAYER_VOICE_CONFIG.legacyPlayerRandomEnabled, false);
assert.equal(PLAYER_VOICE_CONFIG.merchantOpenChance, 0.35);
assert.equal(PLAYER_VOICE_CONFIG.maxQueuedLines, 2);
assert.equal(resolvePlayerVoiceRuntime(PLAYER_VOICE_CONFIG, "").enabled, true);
assert.equal(resolvePlayerVoiceRuntime(PLAYER_VOICE_CONFIG, "?playerVoices=0").enabled, false);
assert.equal(
  resolvePlayerVoiceRuntime(PLAYER_VOICE_CONFIG, "?playerVoiceMode=stress10x").stressMode,
  true,
);
assert.equal(resolvePlayerVoiceFamily(PLAYER_VOICE_CONFIG, ""), "titanDiscovery");
assert.equal(
  resolvePlayerVoiceFamily(PLAYER_VOICE_CONFIG, "?playerVoiceFamily=campfireRest"),
  "campfireRest",
);
const stressPolicy = scalePlayerVoicePolicy(
  PLAYER_VOICE_CONFIG.events.digMomentum,
  resolvePlayerVoiceRuntime(PLAYER_VOICE_CONFIG, "?playerVoiceMode=stress10x"),
);
assert.equal(stressPolicy.chance, 1);
assert.equal(stressPolicy.cooldownMs, 9000);
assert.equal(stressPolicy.quietTailMs, 600);
assert.equal(stressPolicy.globalCooldownDivisor, 10);

function makeScene() {
  const delayed = [];
  return {
    delayed,
    time: {
      now: 0,
      delayedCall(delay, callback) {
        const timer = { delay, callback, remove() { this.removed = true; } };
        delayed.push(timer);
        return timer;
      },
    },
  };
}

function makeManager() {
  return {
    busy: false,
    calls: [],
    isBusy() { return this.busy; },
    start(kind, detail, callbacks = {}) {
      this.busy = true;
      this.calls.push({ kind, detail });
      callbacks.onStarted?.();
      return { kind, detail };
    },
    playRandomPlayerVoiceLine() { return this.start("ambient", "player"); },
    playNPCVoiceLine(npcName) { return this.start("merchant", npcName); },
    playExactVoiceLine(entry, callbacks = {}) {
      return this.start("exact", entry.key, callbacks);
    },
  };
}

const scene = makeScene();
const manager = makeManager();
const randomRolls = [0.9, 0.1, 0];
const director = new EventVoiceLineDirector(
  scene,
  { voiceLineManager: manager },
  PLAYER_VOICE_CONFIG,
  { random: () => randomRolls.shift() ?? 0, search: "" },
);

assert.equal(director.requestAmbient(), null);
assert.equal(manager.calls.length, 0, "legacy random player speech must never start");
assert.equal(director.getSnapshot().lastDecision.reason, "legacy-player-random-disabled");
assert.equal(director.getAmbientRetryDelayMs(), null, "disabled ambient must not reschedule");
assert.equal(director.requestMerchantOpen("boboMerchant"), null);
assert.equal(manager.calls.length, 0, "65% of merchant-open rolls must remain silent");
assert.ok(director.requestMerchantOpen("boboMerchant"));
assert.deepEqual(manager.calls, [{ kind: "merchant", detail: "boboMerchant" }]);

assert.equal(
  director.requestEvent("earthquakeWarning", { tags: ["danger"] }),
  null,
  "event speech must queue rather than interrupt merchant speech",
);
assert.deepEqual(director.getSnapshot().queuedIds, ["event:earthquakeWarning"]);
assert.equal(director.requestEvent("earthquakeWarning"), null);
assert.equal(director.getSnapshot().lastDecision.reason, "event-cooldown");

scene.time.now = 1000;
manager.busy = false;
director.onChannelIdle({ played: true });
assert.equal(manager.calls.length, 1, "queue drain must preserve the authored gap");
assert.equal(scene.delayed.length, 1);
assert.equal(scene.delayed[0].delay, PLAYER_VOICE_CONFIG.queueInterlineDelayMs);
scene.delayed.shift().callback();
assert.equal(manager.calls.at(-1).kind, "exact");
assert.ok(
  PLAYER_VOICE_LIBRARY.earthquakeWarning.some(
    entry => entry.key === manager.calls.at(-1).detail,
  ),
);
assert.equal(director.getSnapshot().session.eventCursors.earthquakeWarning, 1);
assert.equal(director.requestAmbient(), null);
assert.equal(director.getSnapshot().lastDecision.reason, "legacy-player-random-disabled");

scene.time.now = 2000;
manager.busy = false;
director.onChannelIdle({ played: true });
assert.ok(director.getSnapshot().ambientQuietRemainingMs > 0);
assert.equal(director.requestMerchantOpen("boboMerchant"), null);
assert.equal(director.getSnapshot().lastDecision.reason, "merchant-cooldown");
director.destroy();

const dedupeScene = makeScene();
const dedupeManager = makeManager();
const dedupeDirector = new EventVoiceLineDirector(
  dedupeScene,
  { voiceLineManager: dedupeManager },
  PLAYER_VOICE_CONFIG,
  { random: () => 0, search: "" },
);
assert.ok(dedupeDirector.requestEvent("titanDiscovery", { dedupeKey: "titan:1" }));
dedupeManager.busy = false;
dedupeDirector.onChannelIdle({ played: true });
assert.equal(dedupeDirector.requestEvent("titanDiscovery", { dedupeKey: "titan:1" }), null);
assert.equal(dedupeDirector.getSnapshot().lastDecision.reason, "event-duplicate");
assert.ok(dedupeDirector.requestEvent("titanDiscovery", { dedupeKey: "titan:2" }));
dedupeDirector.destroy();

const unavailableScene = makeScene();
const unavailableManager = {
  isBusy: () => false,
  playExactVoiceLine: () => null,
};
const unavailableDirector = new EventVoiceLineDirector(
  unavailableScene,
  { voiceLineManager: unavailableManager },
  PLAYER_VOICE_CONFIG,
  { random: () => 0, search: "" },
);
assert.equal(unavailableDirector.requestEvent("titanDiscovery", { dedupeKey: "missing" }), null);
assert.equal(unavailableDirector.getSnapshot().lastDecision.reason, "playback-unavailable");
assert.deepEqual(unavailableDirector.getSnapshot().session.eventCursors, {});
assert.deepEqual(unavailableDirector.getSnapshot().session.seenAdmissionKeys, []);
unavailableDirector.destroy();

const dropped = [];
const queue = new VoiceLineRequestQueue(2, request => dropped.push(request.id));
assert.equal(queue.enqueue({ id: "low", priority: 1, createdAtMs: 0, expiresAtMs: 50 }, 0).accepted, true);
assert.equal(queue.enqueue({ id: "mid", priority: 2, createdAtMs: 1, expiresAtMs: 50 }, 0).accepted, true);
assert.equal(queue.enqueue({ id: "high", priority: 3, createdAtMs: 2, expiresAtMs: 50 }, 0).accepted, true);
assert.deepEqual(queue.ids(), ["high", "mid"]);
assert.deepEqual(dropped, ["low"]);
assert.equal(queue.dropExpired(50), 2);

class FakeSound {
  constructor(key) { this.key = key; this.isPlaying = false; this.stopCalls = 0; this.handlers = new Map(); }
  play() { this.isPlaying = true; }
  stop() { this.stopCalls += 1; this.isPlaying = false; }
  destroy() { this.destroyed = true; }
  once(event, callback) { this.handlers.set(event, callback); }
  complete() { this.isPlaying = false; this.handlers.get("complete")?.(); }
}

const cache = new Set(["player-random-0", "event-test"]);
const lowLevelSystem = {
  getVoiceMixVolume() { return this.voiceVolume; },
  refreshMixVolumes() {},
  voiceVolume: 1, masterVolume: 1, musicVolume: 1, sfxVolume: 1,
  setMusicVolume(value) { this.musicVolume = value; },
  setSfxVolume(value) { this.sfxVolume = value; },
  noteVoiceLineUse() {}, prefetchVoiceLine() {},
};
const lowLevelManager = new VoiceLineManager({
  cache: { audio: { exists: key => cache.has(key) } },
  sound: { add: key => new FakeSound(key) },
}, lowLevelSystem);
lowLevelManager.loadLibrary("player", "random", "voice/", ["ambient.ogg"]);
const ambient = lowLevelManager.playRandomPlayerVoiceLine();
assert.ok(ambient?.isPlaying);
assert.equal(lowLevelManager.playExactVoiceLine({ key: "event-test", path: "event.mp3" }), null);
assert.equal(ambient.stopCalls, 0, "even a bypassed caller cannot interrupt active speech");
ambient.complete();
lowLevelManager.destroy();

const soundSource = await readFile(new URL("../sound/SoundSystem.js", import.meta.url), "utf8");
assert.match(soundSource, /shouldScheduleLegacyAmbient/);
assert.match(soundSource, /Legacy random player voice lines are disabled/);

console.log("EVENT_VOICE_DIRECTOR_CONTRACT_OK");
