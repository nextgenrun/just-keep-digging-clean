import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FREESOUND_AUDIO as CFG, FREESOUND_AUDIO_ASSETS as ASSETS } from "../values/freesoundAudio.js";
import { FREESOUND_APPROVAL_HASH } from "../values/generated/approved-freesound/index.js";
import { FreesoundPaletteBank } from "../sound/FreesoundPaletteBank.js";
import { starPocketSpatial } from "../sound/starSoundPocketMath.js";
import { createFreesoundFixture } from "./audio-review-2026-09-03/freesound-fixture.mjs";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";

const root = new URL("../", import.meta.url), checks = [];
const read = path => readFileSync(new URL(path, root));
const decisionsBytes = read("testing/audio-review-2026-09-03/freesound-approved-decisions.json");
const decisions = JSON.parse(decisionsBytes).decisions;
const manifest = JSON.parse(read("sound/soundEffects/approved-freesound-2026-09-03/manifest.json"));
function check(name, callback) { callback(); checks.push(name); }
const consumers = {
  mineEarth: "SoundSystem.playDig", mineStone: "SoundSystem.playDig", mineMetal: "SoundSystem.playDig",
  crystalBreak: "SoundSystem.playTileBreak", footstepDirt: "SoundSystem.playFootstep",
  flightWhoosh: "FreesoundAudioDirector.observeFlight", coinPickup: "SoundSystem.playCoinReward",
  coinReward: "SoundSystem.playPurchase", uiClick: "SoundSystem.playUiClick", uiMechanical: "SoundSystem.playMenuOpen/playUiConfirm/playManualSave",
  starHum: "StarSoundPocketController.update", starGrain: "StarSoundPocketController.update",
  starAccent: "StarSoundPocketController.update", panicSlow: "PanicSoundscapeController.update",
  panicPulse: "PanicSoundscapeController.update", panicFast: "PanicSoundscapeController.update",
  structuralCreak: "FreesoundAudioDirector.update (structural context)", quakeRumble: "FreesoundAudioDirector.update (aware threat)",
};

check("Exact export: all 562 approvals, zero rejected/open entries, verified local derivatives", () => {
  assert.equal(createHash("sha256").update(decisionsBytes).digest("hex"), FREESOUND_APPROVAL_HASH);
  assert.equal(Object.keys(ASSETS).length, 562);
  const approved = Object.entries(decisions).filter(([, value]) => value === "approved").map(([id]) => id).sort();
  assert.deepEqual(Object.keys(ASSETS).sort(), approved);
  for (const asset of Object.values(ASSETS)) {
    assert.ok(consumers[asset.role], asset.id);
    assert.equal(createHash("sha256").update(read(asset.path)).digest("hex"), manifest.assets.find(row => row.id === asset.id).sha256);
  }
});
check("All approved variants are reachable through bounded banks or stable site/episode selection", () => {
  const f = createFreesoundFixture();
  const bank = new FreesoundPaletteBank(f.system, { ...CFG, bankHoldMs: 0, bankUsesBeforeRotation: CFG.maxBankSize });
  for (const [role, assets] of bank.roles) {
    const reached = new Set();
    if (assets[0].loop) {
      for (let seed = 0; seed < 30000 && reached.size < assets.length; seed++) reached.add(bank.stable(role, seed).id);
    } else {
      for (let n = 0; n < bank.banks.get(role).length * CFG.maxBankSize + CFG.maxBankSize; n++) {
        const previous = bank.states.get(role)?.last;
        const asset = bank.pick(role, "coverage");
        assert.ok(asset, role); assert.notEqual(asset.id, previous, role);
        reached.add(asset.id); f.tick(100000);
      }
    }
    assert.equal(reached.size, assets.length, role);
    assert.ok(bank.banks.get(role).every(group => group.length <= CFG.maxBankSize));
  }
  bank.destroy(); f.system.destroy();
});
check("Actual mining dispatcher routes dirt, metal and crystal; Star destruction remains single", () => {
  const f = createFreesoundFixture(), methods = {};
  setupGameplayMethods(methods);
  for (const [type, role] of [[1, "mineEarth"], [3, "mineMetal"], [34, "crystalBreak"]]) {
    f.tick(10000); methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed: true }, type);
    assert.ok(f.system.freesoundAudio.history.some(row => row.role === role), role);
  }
  f.tick(10000); const before = f.played.length;
  methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed: true }, 16);
  assert.equal(f.played.length - before, 1);
  f.system.destroy();
});
check("An unloaded contact warms future use and never replays from a loading callback", () => {
  const f = createFreesoundFixture({ loaded: false });
  assert.equal(f.system.freesoundAudio.play("mineEarth"), null);
  f.tick(2000); f.finishLoads(); assert.equal(f.played.length, 0);
  assert.ok(f.system.freesoundAudio.play("mineEarth"));
  const count = f.played.length;
  for (let i = 0; i < 100; i++) f.system.freesoundAudio.play("mineEarth");
  assert.equal(f.played.length, count); f.system.destroy();
});
check("Distance and rock attenuation are monotonic; direction changes left/right and above/below", () => {
  const f = createFreesoundFixture(), star = { tx: 8, ty: 8 };
  const near = starPocketSpatial({ x: 7, y: 8.5 }, star, f.world);
  const far = starPocketSpatial({ x: 0, y: 8.5 }, star, f.world);
  assert.ok(near.gain > far.gain && far.pan > 0);
  assert.ok(starPocketSpatial({ x: 10, y: 8.5 }, star, f.world).pan < 0);
  assert.equal(starPocketSpatial({ x: 8.5, y: 10 }, star, f.world).vertical, "above");
  f.cells.set("7,8", 2);
  const blocked = starPocketSpatial({ x: 6.5, y: 8.5 }, star, f.world);
  f.cells.delete("7,8"); const clear = starPocketSpatial({ x: 6.5, y: 8.5 }, star, f.world);
  assert.ok(blocked.gain > 0 && blocked.gain < clear.gain && blocked.cutoff < clear.cutoff);
  assert.equal(starPocketSpatial({ x: 30, y: 8.5 }, star, f.world).gain, 0); f.system.destroy();
});
check("Star identity is stable; two-site handover is bounded; consumed Stars become silent", () => {
  const f = createFreesoundFixture();
  for (let i = 0; i < 15; i++) f.update();
  const first = f.system.freesoundAudio.stars.snapshot();
  assert.equal(first.source, "8,8"); assert.ok(first.active.length);
  f.update({ position: { x: 13.9, y: 8.5 } });
  assert.equal(f.system.freesoundAudio.stars.current.key, "14,8");
  assert.ok(new Set(f.system.freesoundAudio.stars.bus.snapshot().active.map(row => row.owner)).size <= 2);
  f.cells.delete("14,8"); f.update();
  assert.equal(f.system.freesoundAudio.stars.bus.tracks.size, 0);
  assert.equal(f.system.freesoundAudio.stars.current, null); f.system.destroy();
});
check("Panic follows actual bands, preserves voice across pause, and has a bounded recovery", () => {
  const f = createFreesoundFixture();
  f.update({ context: { ...f.context, hardcoreStressBand: "warning" } });
  assert.equal(f.system.freesoundAudio.panic.role, "panicPulse");
  f.update({ context: { ...f.context, hardcoreStressBand: "critical" } });
  const id = f.system.freesoundAudio.panic.asset.id;
  f.update({ active: false }); f.update({ active: true });
  assert.equal(f.system.freesoundAudio.panic.asset.id, id);
  f.update({ context: f.context }); assert.equal(f.system.freesoundAudio.panic.role, "panicSlow");
  f.update({}, CFG.panic.recoveryMs + 1); assert.equal(f.system.freesoundAudio.panic.role, null);
  f.system.destroy();
});
check("Flight acceleration crosses one onset threshold, not one sound each frame", () => {
  const f = createFreesoundFixture(); f.update();
  f.update({ flying: true, vy: -20 });
  f.update({ flying: true, vy: -120 });
  for (let i = 0; i < 20; i++) f.update({ flying: true, vy: -120 });
  assert.equal(f.system.freesoundAudio.history.filter(row => row.role === "flightWhoosh").length, 1);
  f.system.destroy();
});
check("Loading, decoded residency, mute, teardown and priority admission are bounded", () => {
  const f = createFreesoundFixture({ loaded: false }), director = f.system.freesoundAudio;
  for (const asset of Object.values(ASSETS)) director.palette.warm(asset);
  assert.ok(director.palette.pending.size <= CFG.maxPending);
  f.finishLoads();
  for (const asset of Object.values(ASSETS)) { f.keys.add(asset.key); director.palette.touch(asset); }
  director.palette.trim();
  assert.ok(director.palette.resident.size <= CFG.maxResident);
  assert.ok(director.palette.decodedBytes() <= CFG.maxDecodedBytes);
  const key = Object.values(ASSETS)[0].key; f.keys.add(key);
  for (let i = 0; i < 10; i++) f.system.playSfx(key, 0.1, { priority: 100 });
  assert.equal(f.system.playSfx(key, 0.1, { priority: 10 }), null);
  f.system.toggleSfx(false); assert.equal(f.system.activeSfxMixer.active.size, 0);
  assert.equal(director.palette.pending.size, 0); f.system.destroy();
});

check("Menu UI warming survives inactive world ticks but never replays the past click", () => {
  const f = createFreesoundFixture({ loaded: false }), d = f.system.freesoundAudio;
  d.play("uiClick", { context: "interface" });
  assert.ok(d.palette.pending.size > 0);
  f.update({ active: false, context: { scene: "menu" } });
  assert.ok(d.palette.pending.size > 0);
  f.finishLoads(); assert.equal(f.played.length, 0);
  assert.ok(d.play("uiClick", { context: "interface" }));
  d.play("mineEarth"); f.system._suspendAudio();
  assert.equal(d.palette.pending.size, 0); f.system.destroy();
});
check("Structural detail and rumble follow context, silence and actual threat awareness", () => {
  const f = createFreesoundFixture(), d = f.system.freesoundAudio;
  f.update({ position: { x: 40, y: 40 }, context: { ...f.context, biome: "stone" } });
  f.update({}, CFG.structuralFirstDelayMs + 1);
  assert.equal(d.history.filter(row => row.role === "structuralCreak").length, 0);
  f.update({ context: f.context, speaking: true });
  assert.equal(d.history.filter(row => row.role === "structuralCreak").length, 0);
  f.update({ speaking: false });
  assert.equal(d.history.filter(row => row.role === "structuralCreak").length, 1);
  for (let i = 0; i < 20; i++) f.update();
  assert.equal(d.history.filter(row => row.role === "structuralCreak").length, 1);
  f.update({ context: { ...f.context, earthquakeState: "warning", earthquakePlayerAware: false } });
  assert.equal(d.history.filter(row => row.role === "quakeRumble").length, 0);
  f.update({ context: { ...f.context, earthquakeState: "warning", earthquakePlayerAware: true } });
  assert.equal(d.history.filter(row => row.role === "quakeRumble").length, 1);
  f.update({ context: f.context });
  assert.equal(f.system.reviewedSfx.groups.has("dangerDetail"), false); f.system.destroy();
});
check("Dirt footsteps use the contacted floor; cave context cannot reuse overworld Stars or threats", () => {
  const f = createFreesoundFixture(), d = f.system.freesoundAudio;
  const body = { x: 94, y: 94, width: 47, height: 94, vx: 0, vy: 0 };
  const controller = { physicsBody: body, abilities: { isFlying: () => false } };
  f.system.playFootstep({ controller, worldModel: { tileSize: 94, getTileType: () => 1 } });
  assert.equal(d.history.at(-1).role, "footstepDirt");
  const count = d.history.length;
  f.tick(1000); f.system.playFootstep({ controller, worldModel: { tileSize: 94, getTileType: () => 2 } });
  assert.equal(d.history.length, count);
  f.update({ context: { ...f.context, hardcoreStressBand: "critical" } });
  d.stop(); d.panic.stop(true);
  const cave = { gameplay: { playerController: controller }, worldModel: { tileSize: 94, getTileType: () => 0 },
    archetype: { id: "echo-gallery" }, entryData: { depthTiles: 420 } };
  d.updateFromCaveScene(cave, f.scene.time.now, 100);
  assert.equal(d.context.scene, "cave"); assert.equal(d.context.depth, 420);
  assert.equal(d.context.hardcoreArmed, false); assert.equal(d.stars.current, null);
  assert.equal(d.panic.role, null); assert.equal(d.frame.position.x, 1.25);
  cave.isLeaving = true; d.updateFromCaveScene(cave, f.scene.time.now, 100);
  assert.equal(d.stars.bus.tracks.size, 0); assert.equal(d.palette.pending.size, 0); f.system.destroy();
});

const report = { passed: true, checks, approved: Object.keys(ASSETS).length, exportHash: FREESOUND_APPROVAL_HASH };
writeFileSync(new URL("testing/audio-review-2026-09-03/freesound-timing-audit.json", root), JSON.stringify(report, null, 2) + "\n");
writeFileSync(new URL("testing/audio-review-2026-09-03/freesound-wiring-coverage.json", root), JSON.stringify({ ...report,
  assets: Object.values(ASSETS).map(asset => ({ id: asset.id, role: asset.role, consumer: consumers[asset.role], path: asset.path, runtimeWired: true })) }, null, 2) + "\n");
console.log("FREESOUND_TIMING_OK", JSON.stringify({ checks: checks.length, approved: 562 }));
