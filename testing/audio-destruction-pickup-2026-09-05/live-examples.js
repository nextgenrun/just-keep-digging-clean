import { REVIEWED_AUDIO_MIX } from "../../values/reviewedAudioMix.js";
import { getPlayerAssetProfile, resolvePlayerVisualOrigin } from "../../values/playerAssetProfiles.js";
import { PLAYER_GROUND_FOOTSTEP_FX_CONFIG } from "../../values/playerGroundFootstepFx.js";
import { GroundFootstepFxSystem } from "../../systems/visual/GroundFootstepFxSystem.js";
import { PLAYER_FOOTSTEP_CONTACTS } from "../../values/playerFootstepContacts.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
const profile = getPlayerAssetProfile();
export function preloadLiveExamples(scene) {
 const sheet = profile.sheetFiles.find(entry => entry[0] === "walkRunSheet");
 scene.load.spritesheet(profile.walkRunSheet, "/" + (sheet[3] || profile.basePath) + "/" + sheet[1],
  { frameWidth: profile.frameSizePxBySheet?.[profile.walkRunSheet] || profile.frameWidth, frameHeight: profile.frameHeight });
 scene.load.audio(REVIEWED_AUDIO_ASSETS.libDirtSwingA.key, "/" + REVIEWED_AUDIO_ASSETS.libDirtSwingA.path);
}
export function installLiveExamples(scene, system) {
 const $ = id => document.getElementById(id), methods = {}; setupGameplayMethods(methods);
 const player = scene.add.sprite(320, 170, profile.walkRunSheet, 0);
 const origin = resolvePlayerVisualOrigin(profile, profile.walkRunAnim, profile.walkRunSheet);
 player.setOrigin(origin.x, origin.y).setDisplaySize(profile.displaySizePxByAnimation[profile.walkRunAnim], profile.displaySizePxByAnimation[profile.walkRunAnim]);
 scene.add.graphics().lineStyle(1, 0x91d7ce, 0.35).lineBetween(120, 170, 520, 170);
 scene.anims.create({ key: profile.walkRunAnim, frames: profile.walkRunFrames.map(frame => ({ key: profile.walkRunSheet, frame })), frameRate: profile.walkRunAnimationFps, repeat: -1 });
 const controller = { physicsBody: { x: 0, y: 14, w: 40, h: 80, vx: 0 }, isGrounded: () => true,
  getMotionState: () => controller.physicsBody.vx ? "walk-right" : "idle", getEffectiveWalkSpeed: () => 130 };
 let ground = TILE_TYPES.STONE, started = 0, active = false, contacts = [], scheduled = [];
 const world = { tileSize: 94, getTileType: (x, y) => y === 1 ? ground : TILE_TYPES.AIR };
 scene.config = { tileSize: 94 }; scene.playerController = controller; scene.worldModel = world;
 const write = () => { $("live-evidence").textContent = JSON.stringify({ frameRate: profile.walkRunAnimationFps, contactFrames: Object.keys(PLAYER_FOOTSTEP_CONTACTS.sheets[profile.walkRunSheet].contacts).map(Number), contacts }, null, 2); };
 const fx = new GroundFootstepFxSystem(scene, player, controller, world, profile, {
  config: { ...PLAYER_GROUND_FOOTSTEP_FX_CONFIG, enabled: false },
  onFootstep: ({ frame }) => {
   if (!active) return;
   const sound = system.playFootstep({ controller, worldModel: world });
   if (!sound) return;
   const row = { atMs: Math.round(performance.now() - started), frame: frame.textureFrame, key: sound.key,
    audibleBufferMs: Math.round(sound.audioBuffer.duration * 1000), native: Boolean(sound.source?.buffer) };
   sound.once("complete", () => { row.completedAtMs = Math.round(performance.now() - started); write(); });
   contacts.push(row); $("live-state").textContent = `Contact ${contacts.length}: frame ${row.frame}, ${row.audibleBufferMs} ms sound`; write();
  }
 });
 fx.create();
 function stop() {
  active = false; controller.physicsBody.vx = 0; player.anims.stop();
  for (const event of scheduled) event.remove(); scheduled = []; system._suspendAudio();
  document.querySelectorAll("audio").forEach(audio => audio.pause());
 }
 const later = (ms, callback) => { scheduled.push(scene.time.delayedCall(ms, callback)); };
 async function walk(type) {
  stop(); await scene.sound.context.resume(); ground = type; contacts = []; started = performance.now(); active = true; controller.physicsBody.vx = 130;
  fx.lastContactToken = null; player.play(profile.walkRunAnim); fx._handleAnimationUpdate(player.anims.currentAnim, player.anims.currentFrame);
  later(4000, () => {
   active = false; controller.physicsBody.vx = 0; player.anims.stop();
   later(150, () => { stop(); $("live-state").textContent = `${contacts.length} animation contacts played; ${contacts.filter(row => row.completedAtMs).length} sounds completed.`; write(); });
  });
 }
 async function land(type) {
  stop(); await scene.sound.context.resume(); ground = type;
  const sound = system.playLanding(controller, REVIEWED_AUDIO_MIX.landing.fullSpeed, world);
  if (!sound) { $("landing-state").textContent = "Recent contact or unavailable sound — replay after a short pause."; return; }
  const evidence = { key: sound.key, bufferMs: Math.round(sound.audioBuffer.duration * 1000),
   outputGain: sound.currentConfig.volume * system.masterVolume, native: Boolean(sound.source?.buffer), completed: false };
  $("landing-state").textContent = `Maximum landing strength: one ${evidence.bufferMs} ms ground contact`;
  $("landing-evidence").textContent = JSON.stringify(evidence, null, 2);
  sound.once("complete", () => { evidence.completed = true; $("landing-evidence").textContent = JSON.stringify(evidence, null, 2); });
 }
 $("land-hard").onclick = () => land(TILE_TYPES.STONE); $("land-dirt").onclick = () => land(TILE_TYPES.DIRT);
 const play = {
  swing: () => system.playDigSwing(),
  break: () => methods.playMineFeedbackAudio.call({ soundSystem: system }, { success: true, destroyed: true }, TILE_TYPES.DIRT),
  pickup: () => system.playResourcePickup(),
 };
 for (const name of ["swing", "break", "pickup"]) $("solo-" + name).onclick = async () => {
  stop(); await scene.sound.context.resume(); play[name](); $("mining-state").textContent = `Only ${name}: ${name === "swing" ? "libDirtSwingA" : name === "break" ? "libDirtBreak" : "libResourcePop"}`;
 };
 $("mine-live").onclick = async () => {
  stop(); await scene.sound.context.resume(); const selected = Object.keys(play).filter(name => $("layer-" + name).checked);
  $("mining-state").textContent = `Playing current ${selected.join(" + ") || "silent"} layers. XP remains silent.`;
  for (let n = 0; n < 8; n++) {
   const at = n * 720;
   if (selected.includes("swing")) later(at, play.swing);
   if (selected.includes("break")) later(at + 90, play.break);
   if (selected.includes("pickup")) later(at + 560, play.pickup);
   later(at + 1150, () => system.playXpGather({ special: true }));
  }
  later(6400, () => { stop(); $("mining-state").textContent = "Sequence finished. The XP animation added no second pickup."; });
 };
 $("walk-hard").onclick = () => walk(TILE_TYPES.STONE); $("walk-dirt").onclick = () => walk(TILE_TYPES.DIRT);
 $("stop-live").onclick = () => { stop(); $("live-state").textContent = "Stopped"; $("mining-state").textContent = "Stopped"; };
 for (const id of ["walk-hard", "walk-dirt", "land-hard", "land-dirt", "mine-live", "solo-swing", "solo-break", "solo-pickup"]) $(id).disabled = false;
 $("live-state").textContent = "Ready — actual walk animation and current game audio";
 $("check").addEventListener("click", stop);
 document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
 scene.events.once("shutdown", () => { stop(); fx.destroy(); });
}
