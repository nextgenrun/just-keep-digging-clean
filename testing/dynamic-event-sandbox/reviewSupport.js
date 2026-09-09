import { DYNAMIC_EVENT_REVIEW as cfg } from "../../values/dynamicEventReview.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { resolveGraveborerWurmActivation } from "../../world/playScene/GraveborerWurmBridge.js";
import { GRAVEBORER_WURM_CONFIG } from "../../values/graveborerWurm.js";
import { SHADOW_MINER_CONFIG } from "../../values/shadowMiner.js";
import { RANDOM_EVENT_TYPES, resolveRandomEventFlags } from "../../values/randomWorldEvents.js";
import { RandomEventDirector } from "../../systems/events/RandomEventDirector.js";

export const cueAssets = ["libFarCollapse", "libSupportCreak", "libPressureRumble"]
  .map(id => REVIEWED_AUDIO_ASSETS[id]);

export function createReviewSound(scene) {
  const active = new Set();
  let last = -Infinity;
  const play = (asset, gain = 1, rate = 1) => {
    if (!scene.controls.audio || scene.paused || scene.clockMs - last < cfg.audio.minimumGapMs) return null;
    if (!scene.cache.audio.exists(asset.key)) return null;
    last = scene.clockMs;
    const sound = scene.sound.add(asset.key, { volume: Math.min(asset.gain, cfg.audio.volume) * gain, rate });
    active.add(sound);
    sound.once("complete", () => { active.delete(sound); sound.destroy(); });
    sound.play();
    scene.metrics.audioCues++;
    return sound;
  };
  const stop = () => { for (const sound of active) { sound.stop(); sound.destroy(); } active.clear(); };
  return {
    get sfxEnabled() { return scene.controls.audio; },
    playSeismicWarning: gain => play(cueAssets[0], gain),
    stopSeismicWarning: stop,
    playTileHit: () => play(cueAssets[1]),
    playTileBreak: options => play(cueAssets[0], options?.volume ?? 1, options?.rate ?? 1),
    playApprovedSfxFamily: (_family, gain, options) => play(cueAssets[1], gain, options?.rate ?? 1),
    destroy: stop, stop,
  };
}

export function createReviewRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Earthquake's existing random helpers run synchronously. Restore before yielding.
export function withReviewRandom(random, action) {
  const previous = Math.random;
  Math.random = random;
  try { return action(); } finally { Math.random = previous; }
}

export function readReviewGates(scene) {
  const gate = resolveGraveborerWurmActivation(scene,
    scene.playerController.getPlayerTile(), scene.wurm, false);
  const wurm = [];
  if (!gate.hardcoreArmed) wurm.push("Hardcore is not armed");
  if (!gate.flightUnlocked) wurm.push("Flight is locked");
  if (!gate.depthEligible) wurm.push(`Depth below ${GRAVEBORER_WURM_CONFIG.activation.minDepthTiles}m`);
  if (scene.wurm.cooldownMs > 0) wurm.push(`Cooldown ${(scene.wurm.cooldownMs / 1000).toFixed(1)}s`);
  if (scene.wurm.noise < GRAVEBORER_WURM_CONFIG.noise.threshold) {
    wurm.push(`Noise ${scene.wurm.noise.toFixed(1)} / ${GRAVEBORER_WURM_CONFIG.noise.threshold}`);
  }
  const quake = [];
  if (!scene.controls.hazards) quake.push("Hazard introduction is locked");
  if (scene.controls.suppressed) quake.push("Seismic Suppression owned");
  const quakeStatus = scene.quake.getStatus();
  if (scene.quake.state === "idle") quake.push(`Next check ${Math.max(0, quakeStatus.nextEventMs / 1000).toFixed(1)}s`);
  const shadow = [];
  if (scene.controls.depth < SHADOW_MINER_CONFIG.production.minimumDepthTiles) shadow.push("Below 50m");
  shadow.push(`Next check ${Math.max(0, (scene.shadow.nextCheckAtMs - scene.clockMs) / 1000).toFixed(1)}s`);
  if (scene.controls.torch) shadow.push("Torch will repel");
  const attempt = scene.shadow.getHealthSnapshot().lastSpawnAttempt;
  if (attempt?.reason) shadow.push(cfg.blockers[attempt.reason] || attempt.reason);
  return { wurm, quake, shadow, activation: gate };
}

export function checkRetiredAdmission() {
  const retired = [RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH, RANDOM_EVENT_TYPES.BLACKOUT_BLOOM, "lumenBloom"];
  return retired.map(type => {
    const flags = resolveRandomEventFlags(`?${type}=1&randomEventDebug=1&randomEvent=${type}`);
    const director = new RandomEventDirector(cfg.seed, flags);
    const started = director.start(type, { targetResource: "gold" });
    director.loadSaveData({ version: 2, active: { type, targetResource: "gold", remainingMs: 10000 } });
    return { type, blocked: !started && !director.state.active && flags.forcedType !== type };
  });
}
