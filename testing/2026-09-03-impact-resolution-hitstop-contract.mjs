import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { particleHarness } from "./2026-09-03-particle-fx-harness.mjs";
import { CameraImpactOffset } from "../systems/visual/CameraImpactOffset.js";
import { CameraShakeSystem } from "../systems/visual/CameraShakeSystem.js";
import { MiningImpactFeedback } from "../systems/visual/MiningImpactFeedback.js";
import { DigImpactFxSystem } from "../systems/visual/DigImpactFxSystem.js";
import { materialParticleFrame } from "../systems/visual/materialParticleFrame.js";
import { resolveRenderDensityProfile } from "../systems/visual/RenderDensitySystem.js";
import { resolveMiningImpactPolish, MINING_IMPACT_POLISH_CONFIG as CONFIG } from "../values/miningImpactPolish.js";
import { COMPLEX_DIG_ANIMATIONS } from "../values/complexDigAnimations.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { MATERIAL_PARTICLE_BOUNDS } from "../values/materialParticlePolish.js";
import { setupGameplayMethods } from "../world/playScene/PlaySceneGameplay.js";
import { dispatchCaveMineFeedback } from "../world/playScene/caveMineFeedback.js";
import { installTileDestructionFxAtlasFrames } from "../systems/visual/tileDestructionFxAtlasFrames.js";
import { TILE_DESTRUCTION_FX_CONFIG } from "../values/tileDestructionFx.js";

let passed = 0;
const test = (name, run) => { run(); passed += 1; console.log(`PASS ${name}`); };
const cross = COMPLEX_DIG_ANIMATIONS.clips.cross;
const event = (actionId = 1, contactIndex = 0) => ({ actionId, contactIndex, contactCount: 1,
  animationKey: cross.animationKey, contactFrame: 10, contactSequenceIndex: 7, trigger: "animationupdate" });

function fixture(options = {}) {
  const h = particleHarness(options);
  h.body.vx = 0;
  h.scene.game = { loop: { actualFps: 60 }, __jkdRenderDensityProfile: { density: 1.5 } };
  h.scene.time.now = 1000;
  const camera = { scrollX: 200, scrollY: 500, zoom: 1,
    worldView: { x: 200, y: 500 }, midPoint: { x: 840, y: 860 },
    followOffset: { x: 0, y: 0 }, setFollowOffset(x, y) { this.followOffset = { x, y }; },
    // Deliberately fixed follow/deadzone: a follow offset cannot move this view.
    preRender() { this.scrollX = 200; this.scrollY = 500; },
    shakeEffect: { isRunning: false },
  };
  h.scene.cameras = { main: camera };
  h.scene.shakeSystem = new CameraShakeSystem(h.scene);
  h.player.texture.key = cross.sheetKey;
  h.player.frame.name = 10;
  h.player.anims = { currentAnim: { key: cross.animationKey, msPerFrame: 50,
    frames: cross.frames.map(textureFrame => ({ textureFrame })) },
    currentFrame: { textureFrame: 10 }, isPlaying: true, isPaused: false, timeScale: 1,
    pause() { this.isPlaying = false; this.isPaused = true; },
    resume() { this.isPlaying = true; this.isPaused = false; },
  };
  h.feedback = new MiningImpactFeedback(h.scene, h.player, h.controller, options);
  h.advance = milliseconds => { h.scene.time.now += milliseconds; h.events.emit("preupdate", h.scene.time.now); };
  h.dispose = () => { h.feedback.destroy(); h.scene.shakeSystem.destroy(); };
  return h;
}

test("1080p, 1440p and native 4K retain one logical viewport and explicit rollback", () => {
  for (const [preset, width, height] of [["high",1920,1080],["ultra",2560,1440],["uhd",3840,2160]]) {
    const p = resolveRenderDensityProfile(`?renderQuality=${preset}`);
    assert.deepEqual([p.backingWidth,p.backingHeight,p.logicalWidth,p.logicalHeight], [width,height,1280,720]);
  }
  assert.equal(resolveRenderDensityProfile("").density, 1.5);
  assert.equal(resolveRenderDensityProfile("?renderQuality=uhd&nativeDensity=0").density, 1);
  assert.deepEqual(resolveMiningImpactPolish("?impactPolish=0"), { enabled:false,shake:false,hitstop:false });
  assert.equal(resolveMiningImpactPolish("?impactHitstop=0").shake, true);
  assert.equal(resolveMiningImpactPolish("?impactShake=0").hitstop, true);
});

test("4K coarse chips select sufficient same-material pixels while fine grit keeps variation", () => {
  const h = fixture(); h.scene.game.__jkdRenderDensityProfile.density = 3;
  for (let sequence = 0; sequence < 12; sequence += 1) {
    const frame = materialParticleFrame(h.scene, "dirt", sequence, 12);
    const number = Number(frame.name.match(/-s(\d+)/)[1]);
    assert.ok([2,3].includes(number));
    const b = MATERIAL_PARTICLE_BOUNDS.dirt[number - 1];
    assert.ok(Math.max(b[2]-b[0], b[3]-b[1]) * CONFIG.texture.maximumUpscale >= 36);
  }
  const fine = new Set(Array.from({length:4},(_,i)=>materialParticleFrame(h.scene,"dirt",i,1).name));
  assert.equal(fine.size,4);
  globalThis.location.search = "?impactPolish=0";
  assert.match(materialParticleFrame(h.scene,"dirt",2,12).name, /s04-detail/);
  h.dispose();
});

test("render impulse bypasses deadzones without accumulating scroll or moving fixed HUD", () => {
  for (const zoom of [0.74,1,1.6]) {
    const h = fixture(), camera = h.scene.cameras.main;
    camera.zoom = zoom;
    const bridge = new CameraImpactOffset(h.scene), original = bridge.original;
    bridge.set(2,-1); camera.preRender();
    assert.ok(Math.abs((camera.scrollX-200)*zoom-2)<1e-9);
    assert.ok(Math.abs((camera.scrollY-500)*zoom+1)<1e-9);
    assert.equal((camera.scrollX-200)*0,0,"scrollFactor=0 HUD remains fixed");
    h.events.emit("render");
    assert.deepEqual([camera.scrollX,camera.scrollY,camera.worldView.x,camera.midPoint.x],[200,500,200,840]);
    camera.preRender(); camera.preRender(); h.events.emit("preupdate");
    assert.equal(camera.scrollX,200,"aborted/double renders cannot accumulate drift");
    bridge.destroy(); assert.equal(camera.preRender,original); h.dispose();
  }
});

test("approved atlases use linear sampling once without copying or repeatedly rebuilding frames", () => {
  const h=fixture(), filters=[];
  globalThis.Phaser.Textures={FilterMode:{LINEAR:0,NEAREST:1}};
  for(const texture of h.textures.values())texture.setFilter=value=>filters.push(value);
  installTileDestructionFxAtlasFrames(h.scene,TILE_DESTRUCTION_FX_CONFIG);
  installTileDestructionFxAtlasFrames(h.scene,TILE_DESTRUCTION_FX_CONFIG);
  assert.deepEqual(filters,[0,0]); assert.equal(h.textures.size,2); h.dispose();
});

test("camera kick starts on the contact frame, follows its normal, and restores exact registration", () => {
  const h = fixture(), shake = h.scene.shakeSystem, camera = h.scene.cameras.main;
  assert.equal(shake.shake("mining.medium",1,{renderImpulse:true,direction:{x:-1,y:0},applyImmediately:true}),true);
  camera.preRender(); assert.ok(camera.scrollX<200); assert.equal(camera.scrollY,500);
  h.events.emit("render"); assert.equal(camera.scrollX,200);
  shake.update(1100,16); camera.preRender(); assert.equal(camera.scrollX,200);
  assert.equal(shake.getStatus().active,false); h.dispose();
});

test("higher-priority shake, settings and low-FPS safety retain ownership", () => {
  const h = fixture(), shake = h.scene.shakeSystem;
  shake.shake("earthquake.major");
  assert.equal(h.feedback.present({normal:{x:0,y:1},strength:1},{tileType:TILE_TYPES.COPPER}).shake,false);
  shake.stop(); h.scene.game.loop.actualFps=30;
  assert.equal(h.feedback.prepare(event(),TILE_TYPES.COPPER,true),0);
  assert.equal(h.feedback.present({normal:{x:0,y:1},strength:1},{tileType:TILE_TYPES.COPPER}).shake,false);
  h.scene.game.loop.actualFps=60;
  shake._getDisplaySettings=()=>({cameraShakeEnabled:false});
  assert.equal(h.feedback.present({normal:{x:-1,y:0},strength:1},{tileType:TILE_TYPES.DIRT}).shake,false);
  h.dispose();
});

test("hitstop holds only the current authored pose and automatically releases without changing timeScale", () => {
  const h=fixture(), state=h.player.anims, before=JSON.stringify(h.body);
  const duration=h.feedback.prepare(event(),TILE_TYPES.DIRT,false);
  assert.equal(duration,18); assert.equal(state.isPaused,true); assert.equal(state.timeScale,1);
  h.advance(17); assert.equal(state.isPaused,true);
  h.advance(1); assert.equal(state.isPlaying,true); assert.equal(h.feedback.holding,false);
  assert.equal(JSON.stringify(h.body),before); assert.equal(state.currentFrame.textureFrame,10);
  h.dispose();
});

test("moving and speed-buffed holds stay brief and do not extend or stack", () => {
  const h=fixture(); h.body.vx=200; h.player.anims.timeScale=2.5;
  const duration=h.feedback.prepare(event(),TILE_TYPES.IRON,true);
  assert.ok(duration<=17 && duration>0);
  assert.equal(h.feedback.prepare(event(2),TILE_TYPES.IRON,true),0);
  h.advance(duration); assert.equal(h.player.anims.timeScale,2.5);
  assert.equal(h.feedback.prepare(event(3),TILE_TYPES.DIRT,false),0);
  h.dispose();
});

test("skipped frames, foreign pauses, reduced motion and cancellation never latch an animation", () => {
  for (const mode of ["skipped","paused","reduced","rollback","watchdog"]) {
    const h=fixture({reducedMotion:mode==="reduced",search:mode==="rollback"?"?impactPolish=0":""});
    if(mode==="skipped")h.player.anims.currentFrame.textureFrame=11;
    if(mode==="paused")h.player.anims.pause();
    const contact=event(); if(mode==="watchdog")contact.trigger="wall-clock-contact-watchdog";
    assert.equal(h.feedback.prepare(contact,TILE_TYPES.DIRT,false),0);
    h.dispose(); if(mode==="paused")assert.equal(h.player.anims.isPaused,true);
  }
  const h=fixture(); h.feedback.prepare(event(),TILE_TYPES.DIRT,false);
  h.events.emit("pause"); assert.equal(h.player.anims.isPlaying,true);
  h.advance(100); h.feedback.prepare(event(2),TILE_TYPES.DIRT,false);
  h.dispose(); assert.equal(h.player.anims.isPlaying,true);
  assert.equal(h.events.listenerCount("preupdate"),0);
});

test("real contact queue gives one hold and one shake, retains before-damage material and final position", () => {
  const h=fixture(); h.feedback.destroy();
  const system=new DigImpactFxSystem(h.scene,h.player,h.controller,h.profile,{random:()=>0.5});
  const payload={result:{success:true,destroyed:true,tileType:TILE_TYPES.AIR,typeBeforeDamage:TILE_TYPES.COPPER},
    targetTile:{tx:2,ty:1},contactEvent:event()};
  assert.equal(system.play(payload),true); assert.equal(h.player.anims.isPaused,true);
  assert.equal(system.play(payload),true); assert.equal(system.pending.length,1);
  h.player.x+=2; h.body.x+=2;
  h.events.emit("postupdate");
  assert.equal(system.sequence,1); assert.equal(system.lastImpact.feedback.family,"copper");
  assert.equal(system.lastImpact.feedback.shake,true); assert.ok(system.lastImpact.feedback.hitstopMs>0);
  assert.ok(h.images.every(image=>image.frame.startsWith("copper-")));
  system.destroy(); assert.equal(h.player.anims.isPaused,false); h.dispose();
});

test("failed hits never shake and main/cave feedback cannot dispatch a second mining impulse", () => {
  const prototype={}; setupGameplayMethods(prototype);
  let shakes=0;
  const scene={_gamefeelConfig:{shake:{minFps:40}},game:{loop:{actualFps:60}},
    shakeSystem:{shake:()=>{shakes+=1;}},digImpactFxSystem:{play:()=>true,feedback:{enabled:true}},
    _applyMineShake:prototype._applyMineShake};
  prototype._applyMineShake.call(scene,{success:false,reason:"cooldown"}); assert.equal(shakes,0);
  prototype.applyMineFeedback.call(scene,{success:true,tileType:TILE_TYPES.DIRT},{tx:1,ty:1},event());
  assert.equal(shakes,0);
  dispatchCaveMineFeedback(scene,null,{success:true,tileType:TILE_TYPES.AIR,typeBeforeDamage:TILE_TYPES.COPPER},{contactFeedback:true});
  assert.equal(shakes,0);
  const source=readFileSync(new URL("../world/playScene/CaveGameplayController.js",import.meta.url),"utf8");
  assert.match(source,/contactFeedback: queued && this\.scene\.digImpactFxSystem\?\.feedback\?\.enabled === true/);
});

console.log(`Impact resolution and hitstop: ${passed} contracts passed.`);
