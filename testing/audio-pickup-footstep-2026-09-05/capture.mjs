import { readFileSync, writeFileSync } from "node:fs";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { dispatchCaveMineFeedback } from "../../world/playScene/caveMineFeedback.js";
import { FREESOUND_AUDIO_ASSETS } from "../../values/freesoundAudio.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { TILE_TYPES as T } from "../../values/tileTypes.js";
const mode = process.argv[2] || "after";
const methods = {}; setupGameplayMethods(methods);
const catalog = Object.fromEntries([...Object.values(FREESOUND_AUDIO_ASSETS),
 ...Object.values(REVIEWED_AUDIO_ASSETS)].map(asset => [asset.key, asset]));
const metrics = JSON.parse(readFileSync(new URL("source-metrics.json", import.meta.url)));
const oldCatalog = JSON.parse(readFileSync(new URL("../audio-design-cleanup-2026-09-05/before/testing__audio-runtime-reaudit-2026-09-04__catalog.json", import.meta.url)));
const hardSteps = oldCatalog.items.filter(item => item.routes.some(route => route.source === "legacy-runtime" && ["footsteps", "interface"].includes(route.role)))
 .map(item => ({ key: item.routes[0].key, path: item.path, duration: metrics[item.path]?.duration || 1 }));
for (const asset of hardSteps) catalog[asset.key] = asset;
let seed = 501;
Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
const scenarios = [];
function capture(id, title, run) {
 const f = createFreesoundFixture(), events = [], active = new Map();
 for (const asset of hardSteps) f.keys.add(asset.key);
 f.system.soundLibraryManager.libraries.footsteps = hardSteps;
 const tick = f.tick;
 f.tick = milliseconds => {
  const until = f.scene.time.now + milliseconds;
  while (true) {
   const due = [...active].filter(([, event]) => event.naturalEnd <= until)
    .sort((a, b) => a[1].naturalEnd - b[1].naturalEnd)[0];
   if (!due) break;
   tick(Math.max(0, due[1].naturalEnd - f.scene.time.now));
   active.delete(due[0]); due[0].emit("complete");
  }
  tick(Math.max(0, until - f.scene.time.now));
 };
 const add = f.scene.sound.add;
 f.scene.sound.add = (key, options) => {
  const sound = add(key, options), asset = catalog[key], play = sound.play;
  let currentEvent;
  Object.defineProperty(sound, "volume", { get: () => sound.config.volume, set: value => {
   sound.config.volume = value;
   if (currentEvent && currentEvent.end === null) currentEvent.gains.push({ at: f.scene.time.now, gain: value * f.scene.sound.volume });
  } });
  sound.play = (...args) => {
   const ok = play.apply(sound, args);
   const event = { key, path: asset?.path, title: asset?.title || asset?.id || key,
    at: f.scene.time.now, end: null, gain: sound.volume * f.scene.sound.volume,
    rate: options.rate || 1, duration: metrics[asset.path]?.duration || asset.duration, gains: [] };
   event.naturalEnd = event.at + event.duration * 1000 / event.rate;
   currentEvent = event; active.set(sound, event);
   events.push(event);
   const stop = () => { event.end ??= f.scene.time.now; active.delete(sound); };
   sound.once("stop", stop); sound.once("destroy", stop);
   return ok;
  }; return sound;
 };
 f.scene.config = { tileSize: 94 };
 f.scene.worldModel = { tileSize: 94, getTileType: (x, y) => y === 1 ? T.DIRT : T.AIR };
 f.scene.playerController = { physicsBody: { x: 0, y: 14, w: 40, h: 80, vx: 130, vy: 0 },
  isGrounded: () => true, getEffectiveWalkSpeed: () => 130 };
 f.system.freesoundAudio.setContext({ biome: "default" });
 run(f);
 f.tick(Math.max(0, 8000 - f.scene.time.now));
 scenarios.push({ id, title, seconds: 8, events });
 f.system.destroy();
}
capture("pickup", "Routine resource and XP arrivals", f => {
 for (let n = 0; n < 15; n++) {
  f.tick(400); f.system.playResourcePickup();
  f.tick(40); f.system.playXpGather({ segmentIndex: n % 10 });
  f.tick(40); f.system.playXpGather({ segmentIndex: (n + 1) % 10 });
 }
});
capture("special-pickup", "Special resource and XP arriving together", f => {
 for (let n = 0; n < 15; n++) {
  f.tick(400); f.system.playResourcePickup();
  f.tick(40); f.system.playXpGather({ special: true, segmentIndex: n % 10 });
  f.tick(40); f.system.playXpGather({ levelUp: true });
 }
});
capture("shop", "Rapid shop purchases and sell rewards", f => {
 for (let batch = 0; batch < 3; batch++) {
  f.tick(1200);
  for (let n = 0; n < 4; n++) { f.tick(160); n % 2 ? f.system.playCoinReward() : f.system.playPurchase(); }
 }
});
capture("mine-loot", "Mining with resource and XP arrivals", f => {
 for (let n = 0; n < 10; n++) {
  f.tick(380); f.system.playDigSwing(); f.tick(90);
  methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed: true }, T.DIRT);
  f.tick(140); f.system.playResourcePickup(); f.tick(40); f.system.playXpGather();
 }
});
capture("walk", "Walking on dirt", f => {
 for (let n = 0; n < 16; n++) { f.tick(340); f.system.playFootstep(); }
});
capture("hard-walk", "Walking on hard ground", f => {
 f.scene.worldModel.getTileType = (x, y) => y === 1 ? T.STONE : T.AIR;
 for (let n = 0; n < 16; n++) { f.tick(340); f.system.playFootstep(); }
});
for (const [id, title, type] of [["earth", "Digging and breaking earth", T.DIRT],
 ["stone", "Digging and breaking stone", T.STONE], ["metal", "Digging and breaking copper", T.COPPER],
 ["crystal", "Breaking crystal", T.GEODE_INTERIOR]]) {
 capture(id, title, f => {
  for (let n = 0; n < 12; n++) {
   f.tick(420); f.system.playDigSwing(); f.tick(90);
   methods.playMineFeedbackAudio.call({ soundSystem: f.system },
    { success: true, destroyed: id === "crystal" || n % 3 === 2 }, type);
  }
 });
}
capture("cave", "The same stone contacts in a cave", f => {
 for (let n = 0; n < 12; n++) {
  f.tick(510);
  dispatchCaveMineFeedback({ game: { loop: { actualFps: 60 } } }, { soundSystem: f.system },
   { success: true, destroyed: n % 3 === 2, typeBeforeDamage: T.STONE }, { contactFeedback: true });
 }
});
capture("landing", "Braked descent, normal landing, hard landing", f => {
 let grounded = true;
 const controller = f.scene.playerController;
 controller.isGrounded = () => grounded;
 const observe = (speed, onGround) => {
  grounded = onGround; controller.physicsBody.vy = speed;
  f.tick(80); f.system.reviewedAmbience.observeMotion(controller, 80, f.scene.worldModel);
 };
 observe(0, true);
 for (const lastSpeed of [80, 400, 700]) {
  f.tick(1000);
  observe(700, false); observe(lastSpeed, false); observe(lastSpeed, false); observe(0, true);
 }
});
writeFileSync(new URL(`${mode}-traces.json`, import.meta.url), JSON.stringify({ mode, scenarios }, null, 2));
console.log(JSON.stringify({ mode, scenarios: scenarios.map(s => ({ id: s.id, voices: s.events.length })) }));

writeFileSync(new URL("source-catalog.json", import.meta.url), JSON.stringify(catalog, null, 2));
