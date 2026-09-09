import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { particleHarness } from "./2026-09-03-particle-fx-harness.mjs";
import { MATERIAL_PARTICLE_POLISH as CONFIG, MATERIAL_PARTICLE_BOUNDS, isMaterialParticlePolishEnabled, materialParticleResponse } from "../values/materialParticlePolish.js";
import { PLAYER_FOOTSTEP_CONTACTS } from "../values/playerFootstepContacts.js";
import { TILE_DESTRUCTION_FX_CONFIG as ATLAS, resolveTileDestructionTint } from "../values/tileDestructionFx.js";
import { PLAYER_GROUND_FOOTSTEP_FX_CONFIG as FOOT } from "../values/playerGroundFootstepFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { materialParticleFrame, sizeMaterialParticle } from "../systems/visual/materialParticleFrame.js";
import { GroundFootstepFxSystem } from "../systems/visual/GroundFootstepFxSystem.js";
import { TileDestructionFxSystem } from "../systems/visual/TileDestructionFxSystem.js";
import { supportedFootstepSurface } from "../systems/visual/groundFootstepContact.js";
import { createCollisionE2EPreviewController } from "./JkdE2ECollisionPreview.js";
import { PLAYER_COLLISION_REVIEW_CONFIG } from "../values/playerCollisionReview.js";
import { KEYBIND_ACTIONS } from "../values/keybindActions.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const hash = data => createHash("sha256").update(data).digest("hex");
let passed = 0;
const test = (name, run) => { run(); console.log(`PASS ${name}`); passed += 1; };
function feet(options) {
  const h = particleHarness(options);
  h.sounds = [];
  h.system = new GroundFootstepFxSystem(h.scene, h.player, h.controller, h.world, h.profile,
    { onFootstep: value => h.sounds.push(value) });
  assert.equal(h.system.create(), true);
  h.flush = () => h.events.emit(CONFIG.foot.postUpdateEvent);
  return h;
}

test("all seventeen materials use unchanged approved pixels and valid isolated padded frames", () => {
  assert.equal(hash(read(ATLAS.assets.shards.path)), CONFIG.shardsSha256);
  const h = particleHarness();
  for (const family of Object.keys(ATLAS.families)) {
    assert.equal(MATERIAL_PARTICLE_BOUNDS[family].length, 5);
    for (const number of CONFIG.chipFrames[family]) {
      const index = CONFIG.chipFrames[family].indexOf(number);
      const frame = materialParticleFrame(h.scene, family, index);
      const stored = h.textures.get(ATLAS.assets.shards.key).frames.get(frame.name);
      assert.ok(stored.x >= (number - 1) * 80 && stored.x + stored.w <= number * 80);
      assert.ok(stored.y >= ATLAS.families[family] * 80 && stored.y + stored.h <= (ATLAS.families[family] + 1) * 80);
      const image = h.scene.add.image(0, 0, ATLAS.assets.shards.key, frame.name);
      sizeMaterialParticle(image, frame, 5);
      assert.ok(Math.abs(Math.max(image.displayWidth, image.displayHeight) - 5) < 1e-9);
      assert.ok(Math.abs(image.scaleX - image.scaleY) < 1e-9, "chip art must never stretch");
      materialParticleFrame(h.scene, family, index);
      assert.equal(h.textures.get(ATLAS.assets.shards.key).frames.get(frame.name), stored, "aliases install only once");
    }
  }
});

test("planted-foot coordinates are pinned to the four current sheets, not the legacy rig", () => {
  const manifest = JSON.parse(read("sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-unified-animation-runtime-v1-manifest.json"));
  for (const [key, data] of Object.entries(PLAYER_FOOTSTEP_CONTACTS.sheets)) {
    assert.equal(hash(read(`sprites/character/survival-character-unified-v1/runtime/${manifest.sheets[key].file}`)), data.sha256);
    for (const point of Object.values(data.contacts)) assert.ok(point.every(n => n >= 0 && n < data.size));
  }
});

test("both zero-based walk contacts fire once per cycle, including the first frame", () => {
  const h = feet();
  for (let frame = 0; frame < 24; frame += 1) {
    h.emitFoot(frame); h.emitFoot(frame); h.flush();
  }
  assert.equal(h.system.contactSequence, 2);
  assert.deepEqual(h.sounds.map(s => s.frame.textureFrame), [0, 12]);
  assert.equal(h.images.length, 6);
  assert.deepEqual(h.images.filter(i => i.key === ATLAS.assets.core.key).map(i => i.frame), ["dirt-p04", "dirt-p04"]);
  h.system.destroy();
});

test("torch walking and the current short-stride sheet follow their own visible foot poses", () => {
  for (const key of ["survival-held-torch-v1-walkLoop-sheet", "survival-blender-v2-walk-sheet"]) {
    const h = feet(); h.player.texture.key = key;
    for (let frame = 0; frame < 24; frame += 1) { h.emitFoot(frame); h.flush(); }
    assert.deepEqual(h.sounds.map(s => s.frame.textureFrame), Object.keys(PLAYER_FOOTSTEP_CONTACTS.sheets[key].contacts).map(Number));
    h.system.destroy();
  }
});

test("foot scuffs use final same-frame position and mirror without touching actor geometry", () => {
  for (const flipX of [false, true]) {
    const h = feet(); h.player.flipX = flipX; h.body.vx = flipX ? -200 : 200;
    h.emitFoot(0); assert.equal(h.images.length, 0);
    h.player.x += 4; h.body.x += 4;
    const before = JSON.stringify({ body: h.body, x: h.player.x, scale: h.player.scaleX, origin: h.player.originY });
    h.flush();
    const expectedX = h.player.x + (flipX ? -1 : 1) * (144.7 - 128) * h.player.scaleX;
    assert.ok(Math.abs(h.images[0].x - expectedX) < 1e-9);
    assert.equal(h.images[0].y, 188);
    assert.equal(before, JSON.stringify({ body: h.body, x: h.player.x, scale: h.player.scaleX, origin: h.player.originY }));
    assert.ok(h.images.every(i => i.depth >= CONFIG.foot.minimumDepth));
    h.system.destroy();
  }
});

test("idle, airborne, stale animation handoffs and empty supporting rows cannot emit dust", () => {
  for (const mode of ["idle", "air", "handoff", "no-floor"]) {
    const h = feet();
    if (mode === "idle") h.body.vx = 0;
    if (mode === "air") h.setGrounded(false);
    if (mode === "no-floor") h.world.isSolid = () => false;
    h.emitFoot(0);
    if (mode === "handoff") h.player.texture.key = "unrelated-idle-sheet";
    h.flush(); assert.equal(h.images.length, 0, mode); h.system.destroy();
  }
  const h = feet(); h.body.vx = 30; h.emitFoot(0); h.flush();
  assert.equal(h.sounds.length, 1, "quiet slow walking retains its sound");
  assert.equal(h.images.length, 0); h.system.destroy();
});

test("ledge scuffs stay on the support and never borrow dirt from deeper rows", () => {
  const queried = [];
  const world = { getTileType(tx, ty) { queried.push({ tx, ty }); return tx === 1 && ty === 2 ? TILE_TYPES.COPPER : TILE_TYPES.AIR; },
    isSolid: (tx, ty) => tx === 1 && ty === 2 };
  const surface = supportedFootstepSurface(world, { x: 190, y: 188 }, { x: 168, w: 18 }, 94, FOOT);
  assert.equal(surface.tileType, TILE_TYPES.COPPER);
  assert.ok(surface.anchor.x < 188 && surface.anchor.x > 187);
  assert.ok(queried.every(q => q.ty === 2));
  assert.equal(supportedFootstepSurface({ getTileType: () => TILE_TYPES.AIR }, { x: 190, y: 188 }, { x: 168, w: 18 }, 94, FOOT), null);
});

test("foot budgets, reduced motion, natural fades and teardown leave no retained effects", () => {
  const h = feet();
  for (let index = 0; index < 24; index += 1) { h.emitFoot(index % 2 ? 12 : 0); h.flush(); }
  assert.ok(h.system.activeObjects.size <= FOOT.particles.maxLive);
  assert.ok(h.system.activeTweens.size <= FOOT.particles.maxLive);
  for (let phase = 0; phase < 3; phase += 1) for (const tween of [...h.tweens]) h.finishTween(tween);
  assert.equal(h.system.activeObjects.size, 0);
  assert.equal(h.system.activeTweens.size, 0);
  h.emitFoot(1); h.emitFoot(0); h.system.destroy(); h.flush();
  assert.equal(h.events.listenerCount(CONFIG.foot.postUpdateEvent), 0);
  assert.equal(h.system.pendingFrames.length, 0);
  const quiet = feet({ reducedMotion: true }); quiet.emitFoot(0); quiet.flush();
  assert.equal(quiet.images.length, 1); quiet.system.destroy();
});

test("break fragments start promptly, have varied size and preserve each material tint", () => {
  for (const tileType of [TILE_TYPES.DIRT, TILE_TYPES.COPPER, TILE_TYPES.GLOW_CRYSTAL]) {
    const h = particleHarness(); const system = new TileDestructionFxSystem(h.scene);
    assert.equal(system.play({ worldX: 188, worldY: 141, tileType }), true);
    assert.equal(h.images.length, 1);
    h.fireTimers(CONFIG.destruction.shardDelayMs);
    assert.equal(h.images.length, 6);
    assert.ok(h.images.every(i => i.tint === resolveTileDestructionTint(tileType)));
    assert.ok(h.images.slice(1).every(i => i.frame.endsWith("-detail")));
    const sizes = h.images.slice(1).map(i => Math.max(i.displayWidth, i.displayHeight));
    assert.ok(Math.min(...sizes) < Math.max(...sizes) * 0.8);
    assert.equal(h.tweens[0].config.ease, "Cubic.Out", "stone must not wobble like rubber");
    h.fireTimers();
    for (let phase = 0; phase < 3; phase += 1) for (const tween of [...h.tweens]) h.finishTween(tween);
    assert.equal(system.activeObjects.size, 0); assert.equal(system.activeTweens.size, 0);
    system.destroy();
  }
  assert.ok(materialParticleResponse("dirt").travel < materialParticleResponse("copper").travel);
  assert.ok(materialParticleResponse("dirt").fade > materialParticleResponse("copper").fade);
});

test("mass destruction is capped, evicted tweens stop and all delayed work is disposed", () => {
  const h = particleHarness(); const system = new TileDestructionFxSystem(h.scene);
  for (let index = 0; index < 40; index += 1) {
    system.play({ worldX: 188, worldY: 141, tileType: TILE_TYPES.STONE });
    h.fireTimers(CONFIG.destruction.shardDelayMs);
  }
  assert.ok(system.activeObjects.size <= CONFIG.destruction.maxLive);
  assert.ok(system.activeTweens.size <= CONFIG.destruction.maxLive);
  assert.ok(h.tweens.filter(t => !t.config.targets.active).every(t => !t.active));
  system.destroy(); h.fireTimers();
  assert.ok(h.images.every(i => !i.active)); assert.ok(h.timers.every(t => !t.active));
  assert.equal(system.tweenTargets.size, 0);
});

test("rollback preserves the previous particle presentation and independent off switches", () => {
  for (const value of ["0", "off", "false", "legacy"]) assert.equal(isMaterialParticlePolishEnabled(`?particlePolish=${value}`), false);
  const h = particleHarness({ search: "?particlePolish=0" }); const system = new TileDestructionFxSystem(h.scene);
  system.play({ worldX: 188, worldY: 141, tileType: TILE_TYPES.COPPER });
  h.fireTimers(CONFIG.destruction.shardDelayMs); assert.equal(h.images.length, 1);
  h.fireTimers(ATLAS.core.phaseTimesMs[2]);
  assert.deepEqual(h.images.slice(1).map(i => i.frame), ["copper-s01", "copper-s02", "copper-s03", "copper-s04", "copper-s05"]);
  system.destroy();
  const off = feet({ search: "?groundFootFx=0" }); off.emitFoot(0); off.flush(); assert.equal(off.images.length, 0); off.system.destroy();
  const disabled = particleHarness({ search: "?authoredMineImpact=0" });
  const noBreak = new TileDestructionFxSystem(disabled.scene); assert.equal(noBreak.play({ worldX: 0, worldY: 0, tileType: TILE_TYPES.DIRT }), false); noBreak.destroy();
});

test("particle review cannot run in production, remote play or a save-writing session", () => {
  for (const [production, hostname, blocked] of [[true, "127.0.0.1", true], [false, "example.com", true], [false, "127.0.0.1", false]]) {
    assert.equal(createCollisionE2EPreviewController({ _saveWritesBlocked: blocked }, {
      production, location: { hostname, search: "?jkd_e2e=1&collisionReview=1&particleReview=1" },
    }), null);
  }
});

test("particle review shortcuts avoid all default gameplay, recording and fullscreen bindings", () => {
  const defaults = new Set(KEYBIND_ACTIONS.map(action => action.defaultKey));
  for (const code of [PLAYER_COLLISION_REVIEW_CONFIG.particle.catchCode, PLAYER_COLLISION_REVIEW_CONFIG.particle.walkCode]) {
    assert.equal(defaults.has(code), false, `review must not also trigger ${code}`);
  }
  const source = read("testing/JkdE2ECollisionPreview.js").toString();
  assert.match(source, /particleReview && caption && event\.ctrlKey/);
});

delete globalThis.location; delete globalThis.matchMedia; delete globalThis.Phaser;
console.log(`Material particle polish: ${passed} contracts passed.`);
