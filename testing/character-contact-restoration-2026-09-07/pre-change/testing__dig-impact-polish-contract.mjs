import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { DIG_IMPACT_CONTACTS } from "../values/digImpactContacts.generated.js";
import { DIG_IMPACT_FX_CONFIG as CONFIG, isDigImpactEnabled } from "../values/digImpactFx.js";
import { applyUnifiedDigContactPresentation } from "../values/digImpactPresentation.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as PROFILE } from "../values/survivalUalPlayerAssetProfile.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { resolveUalActionContact } from "../values/ualNativeActionTuning.js";
import { DigImpactFxSystem } from "../systems/visual/DigImpactFxSystem.js";
import { captureDigImpactPose, resolveDigImpactContact } from "../systems/visual/digImpactContact.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";

let passed = 0;
const test = (name, run) => { run(); passed += 1; console.log(`PASS ${name}`); };
const cross = COMPLEX_DIG_ANIMATIONS.clips.cross;
const event = (id = 1, index = 0) => ({
  actionId: id, animationKey: cross.animationKey, contactFrame: 10,
  contactSequenceIndex: 7, contactIndex: index, contactCount: 1,
});

function harness(options = {}) {
  const events = new EventEmitter();
  const images = [], tweens = [], sparks = [];
  const body = { x: 157, y: 113, w: 31, h: 75, vx: 0, vy: 0 };
  const player = {
    x: 172.5, y: 188, scaleX: 103 / 256, scaleY: 103 / 256,
    originX: 0.5, originY: 0.890625, rotation: 0, flipX: false, depth: 30,
    texture: { key: cross.sheetKey }, frame: { name: 10, realWidth: 256, realHeight: 256 },
    anims: { currentAnim: { key: cross.animationKey,
      frames: cross.frames.map(textureFrame => ({ textureFrame })) } },
  };
  const texture = { has: () => true, add() {} };
  const scene = {
    config: { tileSize: 94 }, events,
    textures: { exists: () => true, get: () => texture },
    speedBlockFxSystem: { onMineImpact: (tile, point) => sparks.push({ tile, point }) },
    add: { image(x, y, key, frame) {
      const size = key.includes("shards") ? 80 : 256;
      const image = {
        x, y, key, frame, active: true, scaleX: 1, scaleY: 1,
        setDisplaySize(w, h) { this.scaleX = w / size; this.scaleY = h / size; return this; },
        setTint(tint) { this.tint = tint; return this; },
        setDepth(depth) { this.depth = depth; return this; },
        setOrigin(x, y = x) { this.origin = [x, y]; return this; },
        setRotation(rotation) { this.rotation = rotation; return this; },
        setFlipX(value) { this.flipX = value; return this; },
        setAlpha(alpha) { this.alpha = alpha; return this; },
        setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
        setFrame(frame) { this.frame = frame; return this; },
        destroy() { this.active = false; },
      };
      images.push(image);
      return image;
    } },
    tweens: { add: config => { tweens.push(config); return config; }, killTweensOf() {} },
  };
  const controller = { physicsBody: body };
  const system = new DigImpactFxSystem(scene, player, controller, PROFILE, {
    search: "", random: () => 0.5, reducedMotion: false, ...options,
  });
  const hit = (contactEvent = event(), result = { success: true, tileType: 2 }) =>
    system.play({ result, targetTile: { tx: 2, ty: 1 }, contactEvent });
  return { scene, player, body, events, images, tweens, sparks, system, hit };
}

test("all contact coordinates are pinned to current approved runtime pixels", () => {
  for (const [sheet, data] of Object.entries(DIG_IMPACT_CONTACTS)) {
    const path = new URL(`../sprites/character/survival-character-unified-v1/runtime/2026-08-25-${sheet}.webp`, import.meta.url);
    assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), data.sha256, sheet);
    for (const row of Object.values(data.contacts)) {
      assert.ok(row.slice(1).every(Number.isFinite));
      assert.ok(row[1] >= 0 && row[1] < data.size && row[2] >= 0 && row[2] < data.size);
    }
  }
});

test("every standing combo and running phase has its own actual contact-frame record", () => {
  const keys = [...PROFILE.complexDigSideAnimationKeys, ...PROFILE.complexDigUpAnimationKeys,
    ...PROFILE.movingComplexDigAnimationKeys, ...PROFILE.movingDiagonalDigAnimationKeys];
  for (const key of keys) {
    const variant = PROFILE.digAnimationVariants.find(v => v.key === key);
    const spec = resolveUalActionContact(PROFILE, key);
    for (const contact of spec.contacts || [spec]) {
      const actualFrame = variant.frames[contact.sequenceIndex];
      assert.ok(Object.values(DIG_IMPACT_CONTACTS[variant.sheet].contacts)
        .some(row => row[0] === actualFrame), `${key} / ${actualFrame}`);
    }
  }
});

test("unified timing fixes retain each clip and both authored combo hits", () => {
  for (const [name, expected] of [["roundhouse", [9]], ["spinningBackKick", [12]],
    ["uppercut", [10]], ["elbowUppercut", [8, 16]], ["jabElbow", [9, 20]]]) {
    const clip = COMPLEX_DIG_ANIMATIONS.clips[name];
    const spec = resolveUalActionContact(PROFILE, clip.animationKey);
    assert.deepEqual(spec.contacts.map(c => c.textureFrame), expected);
    assert.equal(spec.contacts.length, clip.contact.contacts.length);
    for (const contact of spec.contacts) assert.equal(clip.frames[contact.sequenceIndex], contact.textureFrame);
  }
  const downPhases = PROFILE.movingDiagonalDigAnimationKeys.filter(key => key.includes("-down-"));
  assert.equal(downPhases.length, 4);
  for (const key of downPhases) assert.equal(resolveUalActionContact(PROFILE, key).sequenceIndex, 4);
});

test("rollback preserves original contact mappings and disables only the added presentation", () => {
  assert.equal(isDigImpactEnabled(""), true);
  for (const value of ["0", "off", "false", "legacy"]) assert.equal(isDigImpactEnabled(`?digImpact=${value}`), false);
  const original = { actionContactByAnimation: { test: cross.contact } };
  assert.equal(applyUnifiedDigContactPresentation(original, false), original.actionContactByAnimation);
  const h = harness({ search: "?digImpact=0" });
  h.hit(); h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.images.length, 0);
  assert.equal(h.sparks.length, 1);
  h.system.destroy();
});

test("fist stays inside the front plane instead of being snapped back to its tile edge", () => {
  const h = harness();
  const pose = captureDigImpactPose(h.player, event());
  const hit = resolveDigImpactContact({ pose, body: h.body, targetTile: { tx: 2, ty: 1 }, tileSize: 94 });
  assert.equal(hit.authored, true);
  assert.ok(hit.point.x > 188 + 15);
  assert.deepEqual(hit.point, hit.rawPoint);
  assert.equal(hit.normal.x, -1);
  const penetration = hit.point.x - 188;
  h.body.x = 94; h.player.x = 109.5; h.player.flipX = true;
  const mirrored = resolveDigImpactContact({ pose: captureDigImpactPose(h.player, event()),
    body: h.body, targetTile: { tx: 0, ty: 1 }, tileSize: 94 });
  assert.ok(Math.abs((94 - mirrored.point.x) - penetration) < 0.001);
  assert.equal(mirrored.normal.x, 1);
  h.system.destroy();
});

test("running composites project their real 192 px geometry at the existing 117 px size", () => {
  const h = harness();
  const key = PROFILE.movingComplexDigAnimationKeys[0];
  const variant = PROFILE.digAnimationVariants.find(v => v.key === key);
  const spec = resolveUalActionContact(PROFILE, key);
  h.player.texture.key = variant.sheet;
  h.player.frame = { name: spec.textureFrame, realWidth: 192, realHeight: 192 };
  h.player.scaleX = h.player.scaleY = 117 / 192;
  h.player.anims.currentAnim = { key, frames: variant.frames.map(textureFrame => ({ textureFrame })) };
  const e = { ...event(), animationKey: key, contactFrame: spec.textureFrame, contactSequenceIndex: spec.sequenceIndex };
  const hit = resolveDigImpactContact({ pose: captureDigImpactPose(h.player, e), body: h.body,
    targetTile: { tx: 2, ty: 1 }, tileSize: 94 });
  const row = Object.values(DIG_IMPACT_CONTACTS[variant.sheet].contacts).find(r => r[0] === spec.textureFrame);
  assert.equal(hit.authored, true);
  assert.ok(Math.abs(hit.rawPoint.x - (h.player.x + (row[1] - 96) * 117 / 192)) < 0.001);
  h.system.destroy();
});

test("effects wait for final same-frame movement and never change actor geometry", () => {
  const h = harness();
  h.hit();
  assert.equal(h.images.length, 0);
  h.player.x += 3;
  const before = JSON.stringify({ player: h.player, body: h.body });
  h.events.emit(CONFIG.postUpdateEvent);
  assert.ok(h.images.length > 1);
  assert.equal(JSON.stringify({ player: h.player, body: h.body }), before);
  assert.deepEqual(h.sparks[0].point, h.system.lastImpact.point);
  assert.ok(h.images.every(image => image.key.startsWith("tile-destruction-") && image.depth > h.player.depth));
  h.system.destroy();
});

test("duplicate callbacks and unsuccessful or absent contacts never emit extra bursts", () => {
  const h = harness();
  assert.equal(h.hit(event(), { success: false, reason: "cooldown" }), false);
  assert.equal(h.system.play(), false);
  h.hit(); h.hit(); h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.system.sequence, 1);
  h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.system.sequence, 1);
  assert.equal(h.sparks.length, 1);
  h.system.destroy();
});

test("two-hit combos keep distinct point samples and a single burst for each contact", () => {
  const h = harness();
  const clip = COMPLEX_DIG_ANIMATIONS.clips.jabElbow;
  h.player.texture.key = clip.sheetKey;
  h.player.anims.currentAnim = { key: clip.animationKey, frames: clip.frames.map(textureFrame => ({ textureFrame })) };
  for (const [index, contact] of clip.contact.contacts.entries()) {
    h.hit({ ...event(), animationKey: clip.animationKey, contactIndex: index, contactCount: 2,
      contactFrame: contact.textureFrame, contactSequenceIndex: contact.sequenceIndex });
  }
  h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.system.sequence, 2);
  assert.equal(h.sparks.length, 2);
  assert.notDeepEqual(h.sparks[0].point, h.sparks[1].point);
  h.system.destroy();
});

test("high-speed bursts are bounded, reduced motion is quieter, and teardown is complete", () => {
  const normal = harness();
  for (let id = 1; id <= 80; id += 1) { normal.hit(event(id)); normal.events.emit(CONFIG.postUpdateEvent); }
  assert.ok(normal.system.live.size <= CONFIG.maxLive);
  assert.ok(normal.system.seen.size <= CONFIG.rememberedContacts);
  const reduced = harness({ reducedMotion: true });
  reduced.hit(); reduced.events.emit(CONFIG.postUpdateEvent);
  assert.equal(reduced.images.length, 1 + CONFIG.chips.reducedCount);
  normal.system.destroy(); normal.system.destroy(); reduced.system.destroy();
  assert.equal(normal.system.live.size, 0);
  assert.equal(normal.events.listenerCount(CONFIG.postUpdateEvent), 0);
  assert.ok(normal.images.every(image => image.active === false));
});

test("flash phases and outward chips finish naturally without retaining sprites", () => {
  const h = harness();
  h.hit(); h.events.emit(CONFIG.postUpdateEvent);
  assert.match(h.images[0].frame, /-p01$/);
  for (const tween of h.tweens) tween.onComplete?.();
  assert.match(h.images[0].frame, /-p02$/);
  assert.equal(h.system.live.size, 0);
  assert.ok(h.images.every(image => image.active === false));
  h.system.destroy();
});

test("missing optional atlases and teardown before presentation cannot affect a hit", () => {
  const h = harness();
  h.scene.textures.exists = () => false;
  h.hit(); h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.images.length, 0);
  assert.equal(h.sparks.length, 1);
  h.hit(event(2)); h.system.destroy(); h.system.flush();
  assert.equal(h.system.pending.length, 0);
  assert.equal(h.sparks.length, 1);
});

test("main-world feedback preserves both contacts crossed by one skipped frame", () => {
  const h = harness();
  const prototype = {};
  setupGameplayMethods(prototype);
  Object.assign(h.scene, {
    digImpactFxSystem: h.system, applyMineFeedback: prototype.applyMineFeedback,
    playMineImpactFx() {}, playMineFeedbackAudio() {},
  });
  const clip = COMPLEX_DIG_ANIMATIONS.clips.jabElbow;
  h.player.texture.key = clip.sheetKey;
  h.player.anims.currentAnim = { key: clip.animationKey,
    frames: clip.frames.map(textureFrame => ({ textureFrame })) };
  for (const [index, contact] of clip.contact.contacts.entries()) {
    prototype.queueDigImpactFeedback.call(h.scene, {
      result: { success: true, tileType: 2 }, targetTile: { tx: 2, ty: 1 },
      contactEvent: { ...event(), animationKey: clip.animationKey,
        contactIndex: index, contactCount: 2, contactFrame: contact.textureFrame,
        contactSequenceIndex: contact.sequenceIndex },
    });
  }
  prototype.flushPendingDigImpactFeedback.call(h.scene);
  h.events.emit(CONFIG.postUpdateEvent);
  assert.equal(h.system.sequence, 2);
  assert.equal(h.sparks.length, 2);
  assert.notDeepEqual(h.sparks[0].point, h.sparks[1].point);
  assert.equal(h.scene._pendingDigImpactFeedback, null);
  h.system.destroy();
});

test("main and cave contact callbacks both feed the same scene-owned visual system", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(read("world/playScene/PlaySceneUpdate.js"), /handleNormalMineResult\(this, result, mineTargetTile, tileType, \{ contactEvent \}\)/);
  assert.match(read("world/playScene/PlaySceneGameplay.js"), /digImpactFxSystem\?\.play/);
  const cave = read("world/playScene/CaveGameplayController.js");
  assert.match(cave, /_applyMineResult\(result, targetTile, \{ contactEvent \}\)/);
  assert.match(cave, /digImpactFxSystem\?\.play/);
  assert.match(cave, /digImpactFxSystem\?\.destroy/);
  assert.match(read("world/playScene/PlaySceneLifecycle.js"), /"digImpactFxSystem"/);
});

console.log(`Dig impact polish: ${passed} contracts passed.`);
