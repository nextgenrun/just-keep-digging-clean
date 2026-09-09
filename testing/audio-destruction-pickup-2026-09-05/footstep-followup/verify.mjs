import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync, writeFileSync } from "node:fs";
import { createFreesoundFixture } from "../../audio-review-2026-09-03/freesound-fixture.mjs";
import { GroundFootstepFxSystem } from "../../../systems/visual/GroundFootstepFxSystem.js";
import { getPlayerAssetProfile } from "../../../values/playerAssetProfiles.js";
import { PLAYER_GROUND_FOOTSTEP_FX_CONFIG } from "../../../values/playerGroundFootstepFx.js";
import { PLAYER_FOOTSTEP_CONTACTS } from "../../../values/playerFootstepContacts.js";
import { CORE_ACTION_AUDIO as C } from "../../../values/coreActionAudio.js";
import { CORE_SFX_WINDOWS } from "../../../values/coreSfxWindows.js";
import { FREESOUND_RUNTIME_ASSETS as A } from "../../../values/freesoundAudio.js";
import { TILE_TYPES } from "../../../values/tileTypes.js";
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const checks = [], check = (name, fn) => { fn(); checks.push(name); };
globalThis.Phaser = { Animations: { Events: { ANIMATION_UPDATE: "animationupdate" } } };
check("Actual animation contact system routes one short step per sole plant on hard ground and dirt", () => {
 for (const material of [TILE_TYPES.STONE, TILE_TYPES.DIRT]) {
  const f = createFreesoundFixture(), profile = getPlayerAssetProfile();
  for (const a of C.hardFootsteps) f.keys.add(a.key);
  let grounded = true, moving = true; const calls = [];
  const controller = { physicsBody: { x: 0, y: 14, w: 40, h: 80, vx: 130 },
   isGrounded: () => grounded, getMotionState: () => moving ? "walk-right" : "idle" };
  const world = { tileSize: 94, getTileType: (x, y) => y === 1 ? material : TILE_TYPES.AIR };
  const player = new EventEmitter(); player.texture = { key: profile.walkRunSheet };
  const play = f.system.playSfx.bind(f.system);
  f.system.playSfx = (key, gain, options) => { calls.push({ key, window: options.window, at: f.scene.time.now }); return play(key, gain, options); };
  const fx = new GroundFootstepFxSystem(f.scene, player, controller, world, profile, {
   config: { ...PLAYER_GROUND_FOOTSTEP_FX_CONFIG, enabled: false },
   onFootstep: () => f.system.playFootstep({ controller, worldModel: world }) });
  assert.equal(fx.create(), true);
  const contactFrames = Object.keys(PLAYER_FOOTSTEP_CONTACTS.sheets[profile.walkRunSheet].contacts).map(Number);
  const cycle = () => { for (const textureFrame of profile.walkRunFrames) {
   f.tick(1000 / profile.walkRunAnimationFps);
   const frame = { index: textureFrame + 1, textureFrame, textureKey: profile.walkRunSheet };
   player.emit("animationupdate", { key: profile.walkRunAnim }, frame);
   player.emit("animationupdate", { key: profile.walkRunAnim }, frame);
  } };
  for (let n = 0; n < 4; n++) cycle();
  assert.equal(calls.length, contactFrames.length * 4);
  const allowed = material === TILE_TYPES.STONE ? C.hardFootsteps.map(a => a.key) : C.banks.footstepDirt.map(id => A[id].key);
  assert.ok(calls.every(c => allowed.includes(c.key) && c.window.duration <= 0.12));
  for (let n = 1; n < calls.length; n++) assert.ok(calls[n].at - calls[n - 1].at > calls[n - 1].window.duration * 1000);
  grounded = false; cycle(); grounded = true; moving = false; cycle();
  assert.equal(calls.length, contactFrames.length * 4, "Airborne and idle contact frames stay silent");
  fx.destroy(); f.system.destroy();
 }
});
check("Hard-ground variants have comparable trimmed output peaks and all six footstep attacks are prompt", () => {
 const measurements = json("../window-measurements.json");
 const peaks = C.hardFootsteps.map(a => measurements.find(m => m.id === a.key).peak * a.gain);
 assert.ok(Math.max(...peaks) / Math.min(...peaks) < 1.1);
 for (const id of [...C.hardFootsteps.map(a => a.key), ...C.banks.footstepDirt]) {
  const m = measurements.find(row => row.id === id);
  assert.ok(m.dominantAttackMs <= 8 && m.editedSeconds <= 0.12);
  assert.deepEqual(m.window, CORE_SFX_WINDOWS[id]);
 }
});
check("All supplied rejects stay excluded and current review identities remain stable", () => {
 const original = json("../../audio-design-cleanup-2026-09-05/review-export-original.json");
 const current = json("../../audio-runtime-reaudit-2026-09-04/catalog.json");
 const before = json("testing__audio-runtime-reaudit-2026-09-04__catalog.json");
 const rejected = Object.entries(original.decisions).filter(([, decision]) => decision === "reject").map(([id]) => id);
 assert.equal(rejected.length, 9);
 assert.ok(rejected.every(id => !current.items.some(row => row.id === id)));
 assert.deepEqual(current.items.map(row => [row.id, row.path]), before.items.map(row => [row.id, row.path]));
 assert.equal(current.items.filter(row => row.metadata.playbackWindow).length, 11);
});
check("Old hard-walk and mining composites cannot be mistaken for the current playback", () => {
 const old = readFileSync(new URL("../../audio-pickup-footstep-2026-09-05/index.html", import.meta.url), "utf8");
 for (const name of ["before-hard-walk.wav", "after-hard-walk.wav", "before-mine-loot.wav", "after-mine-loot.wav"]) assert.ok(!old.includes(name));
 assert.ok(old.includes("audio-destruction-pickup-2026-09-05/#contacts"));
 assert.ok(old.includes("audio-destruction-pickup-2026-09-05/#mining-live"));
});
writeFileSync(new URL("verification.json", import.meta.url), JSON.stringify({ passed: true, checks, manualPlaythrough: false, listeningApproved: false }, null, 2));
console.log(JSON.stringify({ passed: true, checks }));
