import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { SpecialBlockEffectsManager } from "../systems/mining/SpecialBlockEffectsManager.js";
import { SpeedBlockFxSystem } from "../systems/visual/SpeedBlockFxSystem.js";
import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { canStartUalMiningAction } from "../player/ualMiningActionCadence.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { SPECIAL_BLOCKS_CONFIG } from "../values/specialBlocks.js";
import { SPEED_BLOCK_FX_CONFIG } from "../values/speedBlockFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { resolveUalActionTimeScale } from "../values/ualNativeActionTuning.js";

let cases = 0;
function check(name, run) {
  try { run(); cases += 1; } catch (error) {
    throw new Error(`${name}: ${error.message}`, { cause: error });
  }
}
function rig(upgrades = null) {
  const scene = { time: { now: 0 }, config: { ...MINING_CONFIG, tileSize: 94 } };
  const effects = new SpecialBlockEffectsManager(scene);
  const dig = new DigSystem(null, { scene }, scene.config, upgrades, null, null, null, effects);
  return { scene, effects, dig };
}
function playRate(dig, clip, kind = "normal") {
  return resolveUalActionTimeScale({
    frameCount: clip.frames.length, frameRate: clip.frameRate,
    effectiveCooldownMs: dig.getEffectiveCooldownMs(),
    miningSpeedMultiplier: dig.getMiningSpeedBoostMultiplier(), kind,
  });
}

check("destroying the real speed-tile type grants exactly +50% attack rate", () => {
  const { dig, effects } = rig();
  const baseline = dig.getEffectiveCooldownMs();
  const result = dig.processDestroyedTile(4, 84, TILE_TYPES.SPEED_BLOCK, 0);
  assert.equal(result.specialBlockEffect, "speedBoost");
  assert.equal(effects.getMiningSpeedMultiplier(), 1.5);
  assert.equal(baseline, 1500);
  assert.equal(dig.getEffectiveCooldownMs(), 1000);
  assert.equal(baseline / dig.getEffectiveCooldownMs(), 1.5);
});

check("the real admission gate advances at the buffed cadence", () => {
  const { dig, effects } = rig();
  const starts = [];
  effects.applyEffect("speedBlock");
  for (let time = 0; time <= 3000; time += 250) {
    if (!canStartUalMiningAction({ digSystem: dig, nowMs: time })) continue;
    starts.push(time);
    dig.lastMineTime = time;
  }
  assert.deepEqual(starts, [0, 1000, 2000, 3000]);
});

check("every complex SIDE and UP clip visibly gains the same 50% speed", () => {
  for (const clip of Object.values(COMPLEX_DIG_ANIMATIONS.clips)) {
    const { dig, effects } = rig();
    const baseline = playRate(dig, clip);
    effects.applyEffect("speedBlock");
    assert.ok(Math.abs(playRate(dig, clip) / baseline - 1.5) < 1e-12, clip.id);
  }
});

check("the bonus composes with permanent mining upgrades", () => {
  const { dig, effects } = rig({ getEffectiveMineCooldown: base => base * 0.6 });
  const baseline = dig.getEffectiveCooldownMs();
  effects.applyEffect("speedBlock");
  assert.equal(baseline / dig.getEffectiveCooldownMs(), 1.5);
});

check("pickup refreshes the existing 20-second boost without multiplying it twice", () => {
  const { scene, effects } = rig();
  effects.applyEffect("speedBlock");
  scene.time.now = 19000;
  effects.applyEffect("speedBlock");
  assert.equal(effects.getMiningSpeedMultiplier(), 1.5);
  assert.equal(effects.getRemainingTime("miningSpeedBoost"), 20);
  scene.time.now = 39000;
  assert.equal(effects.getMiningSpeedMultiplier(), 1);
});

check("expiry removes gameplay and animation bonuses on the exact boundary", () => {
  const { scene, dig, effects } = rig();
  const clip = COMPLEX_DIG_ANIMATIONS.clips.cross;
  const baseline = playRate(dig, clip);
  effects.applyEffect("speedBlock");
  scene.time.now = SPECIAL_BLOCKS_CONFIG.effects.speedBlock.duration - 1;
  assert.equal(effects.getRemainingTime("miningSpeedBoost"), 1);
  assert.equal(dig.getEffectiveCooldownMs(), 1000);
  scene.time.now += 1;
  assert.equal(dig.getEffectiveCooldownMs(), 1500);
  assert.equal(playRate(dig, clip), baseline);
  effects.update();
  assert.equal(effects.effects.miningSpeedBoost.active, false);
});

check("saved remaining duration restores the same speed, not a fresh full timer", () => {
  const original = rig();
  original.effects.applyEffect("speedBlock");
  original.scene.time.now = 8000;
  const resumed = rig();
  resumed.scene.time.now = 500;
  resumed.effects.loadSaveData(original.effects.getSaveData());
  assert.equal(resumed.dig.getEffectiveCooldownMs(), 1000);
  assert.equal(resumed.effects.getRemainingTime("miningSpeedBoost"), 12);
  resumed.scene.time.now += 12000;
  assert.equal(resumed.dig.getEffectiveCooldownMs(), 1500);
});

check("God Mode retains its deliberate fixed benchmark and does not fake faster swings", () => {
  const { dig, effects } = rig({
    isGodModeActive: () => true, getEffectiveMineCooldown: base => base * 0.2,
  });
  const baseline = playRate(dig, COMPLEX_DIG_ANIMATIONS.clips.cross);
  effects.applyEffect("speedBlock");
  assert.equal(dig.getEffectiveCooldownMs(), 300);
  assert.equal(dig.getMiningSpeedBoostMultiplier(), 1);
  assert.equal(playRate(dig, COMPLEX_DIG_ANIMATIONS.clips.cross), baseline);
});

check("Quickslash keeps its existing playback limits and is not double-boosted", () => {
  const options = { frameCount: 16, frameRate: 30, effectiveCooldownMs: 150, kind: "quickslash" };
  assert.equal(resolveUalActionTimeScale({ ...options, miningSpeedMultiplier: 1.5 }),
    resolveUalActionTimeScale(options));
});

function fxRig(options = {}) {
  const base = rig();
  const sprites = [];
  const tweens = new Set();
  const texture = { has: () => true };
  base.scene.textures = { exists: () => !options.missingAtlas, get: () => texture };
  texture.add = () => {};
  base.scene.tweens = {
    add: tween => { tweens.add(tween); return tween; },
    killTweensOf: target => {
      for (const tween of tweens) if (tween.targets === target) tweens.delete(tween);
    },
  };
  base.scene.add = { image(x, y, key, frame) {
    const sprite = { x, y, key, frame, scaleX: 1, scaleY: 1,
      setOrigin() { return this; },
      setDisplaySize(w, h) { this.scaleX = w / 256; this.scaleY = h / 208; return this; },
      setDepth() { return this; }, setBlendMode() { return this; },
      setTint(tint) { this.tint = tint; return this; },
      setAlpha() { return this; }, setRotation() { return this; },
      destroy() { this.destroyed = true; },
    };
    sprites.push(sprite);
    return sprite;
  } };
  const player = { depth: 30, active: true, visible: true };
  const body = { x: 300, y: 700, w: 31, h: 64, vx: 0, vy: 0 };
  const fx = new SpeedBlockFxSystem(base.scene, player, { physicsBody: body }, base.effects,
    { search: "", random: () => 0.5, ...options });
  return { ...base, fx, sprites, tweens, body };
}

check("yellow bitmap sparks begin on pickup and pulse on real contact", () => {
  const { fx, effects, sprites, body } = fxRig();
  const untouched = { ...body };
  fx.update(16);
  assert.equal(sprites.length, 0);
  effects.applyEffect("speedBlock");
  fx.update(16);
  const activated = sprites.length;
  assert.equal(activated, SPEED_BLOCK_FX_CONFIG.activationCount);
  fx.onMineImpact({ tx: 4, ty: 7 });
  assert.equal(sprites.length, activated + SPEED_BLOCK_FX_CONFIG.impactCount);
  assert.ok(sprites.every(sprite => SPEED_BLOCK_FX_CONFIG.frames.some(frame => frame.name === sprite.frame)));
  assert.ok(sprites.every(sprite => SPEED_BLOCK_FX_CONFIG.colors.includes(sprite.tint)));
  assert.deepEqual(body, untouched, "the visual effect must not move or resize the player");
  fx.destroy();
});

check("continuous feedback is bounded and teardown removes every sprite and tween", () => {
  const { fx, effects, sprites, tweens } = fxRig();
  effects.applyEffect("speedBlock");
  for (let i = 0; i < 100; i += 1) fx.update(1000);
  assert.equal(fx.getSnapshot().liveParticles, SPEED_BLOCK_FX_CONFIG.maxParticles);
  fx.destroy();
  fx.destroy();
  assert.equal(fx.getSnapshot().liveParticles, 0);
  assert.equal(tweens.size, 0);
  assert.ok(sprites.every(sprite => sprite.destroyed));
});

check("expired buffs stop emitting even before the next manager update", () => {
  const { scene, fx, effects, sprites } = fxRig();
  effects.applyEffect("speedBlock");
  fx.update(16);
  const count = sprites.length;
  scene.time.now = 20000;
  fx.update(1000);
  fx.onMineImpact();
  assert.equal(sprites.length, count);
  assert.equal(fx.getSnapshot().active, false);
  fx.destroy();
});

check("reduced motion keeps the buff visible with a smaller spark budget", () => {
  const { fx, effects, sprites } = fxRig({ reducedMotion: true });
  effects.applyEffect("speedBlock");
  fx.update(16);
  assert.equal(sprites.length, SPEED_BLOCK_FX_CONFIG.reducedMotion.activationCount);
  fx.destroy();
});

check("visual rollback and unavailable artwork never disable the actual +50% bonus", () => {
  for (const options of [{ search: "?speedBlockFx=0" }, { missingAtlas: true }]) {
    const { fx, effects, dig, sprites } = fxRig(options);
    effects.applyEffect("speedBlock");
    fx.update(1000);
    assert.equal(sprites.length, 0);
    assert.equal(dig.getEffectiveCooldownMs(), 1000);
    fx.destroy();
  }
});

check("an active buff gets a yellow +50% timer even before the normal HUD unlock", () => {
  const { scene, effects } = rig();
  let entries = [];
  const hud = Object.assign(Object.create(HUDSystem.prototype), {
    scene, specialBlockEffectsManager: effects, _systemVisibility: { buff: false },
    buffTimerText: { setVisible() {} },
    approvedSkin: { active: true, setBuffEntries(value) { entries = value; } },
  });
  effects.applyEffect("speedBlock");
  hud.updateBuffTimers();
  assert.equal(entries[0].text, "ATK +50% 20s");
  assert.equal(entries[0].color, SPEED_BLOCK_FX_CONFIG.hud.color);
  scene.time.now = 20000;
  effects.update();
  hud.updateBuffTimers();
  assert.deepEqual(entries, []);
});

check("both gameplay worlds consume the same boost and own effect cleanup", () => {
  for (const file of ["PlaySceneGameplay.js", "CaveActionAnimationRuntime.js"]) {
    const source = readFileSync(new URL(`../world/playScene/${file}`, import.meta.url), "utf8");
    assert.match(source, /miningSpeedMultiplier:.*getMiningSpeedBoostMultiplier/);
  }
  for (const file of ["PlaySceneSetup.js", "CaveGameplayController.js"]) {
    const source = readFileSync(new URL(`../world/playScene/${file}`, import.meta.url), "utf8");
    assert.equal((source.match(/new SpeedBlockFxSystem\(/g) || []).length, 1);
  }
  const lifecycle = readFileSync(new URL("../world/playScene/PlaySceneLifecycle.js", import.meta.url), "utf8");
  assert.match(lifecycle, /"speedBlockFxSystem"/);
});

console.log("SPEED_BLOCK_REGRESSIONS_OK", { cases, boost: "50%", durationMs: 20000 });
