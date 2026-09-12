import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { StellarLanceContactPresenter } from "../../world/playScene/StellarLanceContactPresenter.js";
import { resolveStellarLanceOrigin, resolveStellarLanceTravel, resolveStellarLanceHit } from "../../systems/celestial/stellarLanceTravel.js";
import { StellarRageEngine } from "../../systems/celestial/StellarRageEngine.js";
import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";
import { PLAYER_STATS_CONFIG } from "../../values/playerStats.js";
import { CELESTIAL_ENGINE_CONFIG, CELESTIAL_ENGINE_IDS } from "../../values/celestialEngines.js";
globalThis.Phaser={BlendModes:{ADD:"ADD"}};
const definitions=[
 {sheet:"survival-ual-player-v1-punch-jab-sheet",frame:7,tip:[207,88]},
 {sheet:"survival-mixamo-v3-complex-dig-roundhouse-sheet",frame:9,tip:[226,62]},
];
for(const {sheet,frame,tip} of definitions) for(const flipX of [false,true]){
 const player={texture:{key:sheet},frame:{name:frame,realWidth:256,realHeight:256},
  anims:{currentAnim:{key:sheet,frames:Array.from({length:32},(_,i)=>({textureFrame:i}))}},
  x:100,y:200,scaleX:.5,scaleY:.5,originX:.5,originY:.890625,flipX,rotation:0};
 const scene={player,events:new EventEmitter(),playerController:{physicsBody:{x:90,y:130,w:20,h:70}},config:{tileSize:94},time:{now:123},game:{loop:{frame:42}}};
 const presenter=new StellarLanceContactPresenter(scene), shots=[];
 const event={animationKey:sheet,contactFrame:frame,contactSequenceIndex:frame,contactIndex:0};
 const projectile={targetTile:{tx:2,ty:1},contactEvent:event};
 assert.equal(presenter.queue(projectile,p=>shots.push(p)),true);
 assert.equal(shots.length,0,"wait until final pose for this rendered frame");
 player.x+=9;
 scene.events.emit("postupdate");
 assert.equal(shots.length,1); const shot=shots[0];
 assert.equal(shot.originSource,"authored-hand-foot");
 assert.equal(shot.originWorld.x,109+((flipX?256-tip[0]:tip[0])-128)*.5);
 assert.equal(shot.originWorld.y,200+(tip[1]-228-8)*.5,
  "the emitter sits on the upper fist/foot surface, above the contact-tip centre");
 assert.equal(shot.releaseFrame,42); assert.equal(shot.contactPose.visibleFrame,frame);
 scene.events.emit("postupdate"); assert.equal(shots.length,1);
 for(let i=0;i<15;i++)presenter.queue(projectile,p=>shots.push(p));
 scene.events.emit("postupdate");assert.equal(shots.length,16,"all same-frame attack contacts are retained");
 presenter.queue(projectile,p=>shots.push(p)); presenter.destroy(); scene.events.emit("postupdate");
 assert.equal(shots.length,16,"no queued release after teardown");
}
const rotatedOrigin=resolveStellarLanceOrigin(
 {authored:true,rawPoint:{x:100,y:200}},{height:192,scaleY:.5,rotation:Math.PI/2});
assert.deepEqual(rotatedOrigin,{x:103,y:200},"the surface offset follows sprite rotation and scale");
assert.deepEqual(resolveStellarLanceOrigin({authored:false,point:{x:80,y:90}},{}),{x:80,y:90});
for(const dir of [{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1}]){
 const origin={x:470,y:470}, path={lane:0,endTile:{tx:5+dir.x*3,ty:5+dir.y*3}};
 const travel=resolveStellarLanceTravel(origin,path,dir,94);
 assert.ok(Math.abs(travel.distance/travel.durationMs*1000-C.speedPxPerSecond)<1e-9);
 assert.equal(dir.x?travel.end.y:travel.end.x,470);
 const first=resolveStellarLanceHit(travel,{tx:5,ty:5,distance:1},94);
 assert.equal(first.delayMs,0); assert.deepEqual(first.worldPoint,origin);
 const next=resolveStellarLanceHit(travel,{tx:5+dir.x*2,ty:5+dir.y*2,distance:3},94);
 const headAtImpact={x:origin.x+dir.x*(next.delayMs*C.speedPxPerSecond/1000+travel.noseOffset),
  y:origin.y+dir.y*(next.delayMs*C.speedPxPerSecond/1000+travel.noseOffset)};
 assert.ok(Math.hypot(headAtImpact.x-next.worldPoint.x,headAtImpact.y-next.worldPoint.y)<1e-8,
  "later impacts align with the flame's leading edge");
}
// A first tile that starts beyond the launch pose still waits for the flame's
// leading edge to reach the entered face instead of flashing on the fist.
{
 const origin={x:320,y:517},travel=resolveStellarLanceTravel(origin,{lane:0,endTile:{tx:8,ty:5}},{x:1,y:0},94);
 const first=resolveStellarLanceHit(travel,{tx:5,ty:5,distance:1},94);
 const headX=origin.x+first.delayMs*C.speedPxPerSecond/1000+travel.noseOffset;
 assert.ok(first.delayMs>0,"a distant first tile does not impact at the emitter");
 assert.ok(Math.abs(headX-first.worldPoint.x)<1e-8,"first impact aligns with the flame's leading edge");
}
// A slow renderer must not launch a watchdog contact from a future hand pose.
{
 const sheet="survival-ual-player-v1-punch-jab-sheet";
 const player={texture:{key:sheet},frame:{name:4,realWidth:256,realHeight:256},
  anims:{currentAnim:{key:sheet,frames:Array.from({length:32},(_,i)=>({textureFrame:i}))},
    currentFrame:{index:5},skipMissedFrames:true},x:100,y:200,scaleX:.5,scaleY:.5,originX:.5,originY:.890625,flipX:false};
 const scene={player,events:new EventEmitter(),playerController:{physicsBody:{x:90,y:130,w:20,h:70}},
  config:{tileSize:94},ualActionContactTimeline:{isActive:true}};
 const presenter=new StellarLanceContactPresenter(scene), shots=[];
 const shot={targetTile:{tx:2,ty:1},contactEvent:{animationKey:sheet,contactFrame:7,contactSequenceIndex:7,trigger:"wall-clock-contact-watchdog"}};
 presenter.queue(shot,p=>shots.push(p));scene.events.emit("postupdate");
 assert.equal(shots.length,0);assert.equal(presenter.hasPendingContact,true);
 assert.equal(player.anims.skipMissedFrames,false);
 player.frame.name=7;player.anims.currentFrame.index=8;scene.events.emit("postupdate");
 assert.equal(shots.length,1);assert.equal(shots[0].contactPose.visibleFrame,7);
 assert.equal(presenter.hasPendingContact,false);
 assert.equal(player.anims.skipMissedFrames,true);
 player.frame.name=4;player.anims.currentFrame.index=5;
 presenter.queue(shot,p=>shots.push(p));scene.events.emit("postupdate");
 scene.ualActionContactTimeline.isActive=false;scene.events.emit("postupdate");
 assert.equal(shots.length,1);assert.equal(presenter.hasPendingContact,false);
 presenter.destroy();
}
// A normal contact pauses only our frame catch-up, then immediately restores playback.
{
 const anim={key:"jab",frames:Array.from({length:32},(_,i)=>({textureFrame:i}))};
 const state={currentAnim:anim,currentFrame:{index:8},skipMissedFrames:true,isPlaying:true,isPaused:false,
  pause(){this.isPlaying=false;this.isPaused=true;},
  resume(){this.isPlaying=true;this.isPaused=false;}};
 const scene={player:{texture:{key:"survival-ual-player-v1-punch-jab-sheet"},
  frame:{name:7,realWidth:256,realHeight:256},anims:state,x:100,y:200,scaleX:.5,scaleY:.5,originX:.5,originY:.890625},
  events:new EventEmitter(),playerController:{physicsBody:{x:90,y:130,w:20,h:70}},config:{tileSize:94}};
 const p=new StellarLanceContactPresenter(scene),shot={targetTile:{tx:2,ty:1},
  contactEvent:{animationKey:"jab",contactFrame:7,contactSequenceIndex:7}};
 let count=0;p.queue(shot,()=>count++);
 assert.equal(state.isPaused,true);assert.equal(state.skipMissedFrames,false);
 scene.events.emit("postupdate");
 assert.equal(count,1);assert.equal(state.isPlaying,true);assert.equal(state.skipMissedFrames,true);
 state.pause();p.queue(shot,()=>count++);scene.events.emit("postupdate");
 assert.equal(state.isPaused,true,"do not release a pause owned by another system");
 p.destroy();
}
const stopped=resolveStellarLanceTravel({x:350,y:130},{lane:0,endTile:{tx:3,ty:1}},{x:1,y:0},94);
assert.equal(stopped.distance,0,"an extended kick never sends the projectile backwards");
const displays=[],tweens=[];
const scene={add:{image(x,y,key){const sprite={x,y,key,angle:0,
 setOrigin(x,y){this.originX=x;this.originY=y;return this;},setDisplaySize(w,h){this.w=w;this.h=h;return this;},
 setAlpha(a){this.alpha=a;return this;},setBlendMode(){return this;},setDepth(){return this;},
 destroy(){this.destroyed=true;}};displays.push(sprite);return sprite;}},
 tweens:{add(t){tweens.push(t);},killTweensOf(){}}};
const def=CELESTIAL_ENGINE_CONFIG.engines[CELESTIAL_ENGINE_IDS.STELLAR_RAGE];
let random=.039;
const engine=new StellarRageEngine({scene,budget:{engineId:CELESTIAL_ENGINE_IDS.STELLAR_RAGE,startedAtMs:0},
 definitionOverride:def,projectileAssetKeys:["blue","purple","red","prismatic"],tileSize:94,
 getAnchor:()=>({x:0,y:0}),random:()=>random});
const shot={originWorld:{x:225,y:130},direction:{x:1,y:0},targetTile:{tx:3,ty:1},
 visualPaths:[{lane:0,endTile:{tx:8,ty:1,distance:5}}],hits:[]};
engine.launchProjectile(shot);assert.equal(engine.lastProjectilePalette,"prismatic");
random=.04;engine.launchProjectile(shot);assert.equal(engine.lastProjectilePalette,"purple");
random=.9;engine.launchProjectile(shot);assert.equal(engine.lastProjectilePalette,"red");
for(const p of engine.projectiles){
 assert.equal(p.x,225);assert.equal(p.y,130);assert.equal(p.w,64);assert.equal(p.h,28);assert.equal(p.alpha,1);
 assert.equal(p.originX,.02,"the flame extends out from the fist instead of back over the torso");
 const tween=tweens.find(t=>t.targets===p);assert.equal(tween.ease,"Linear"); assert.equal("alpha" in tween,false);
 for(const prop of ["scaleX","scaleY","angle"])assert.equal(prop in tween,false);
}
assert.equal(engine.getSnapshot(1).wakeCount,0);
engine.destroy();assert.ok(displays.every(p=>p.destroyed));assert.equal(engine.projectiles.size,0);
assert.equal(C.speedPxPerSecond, PLAYER_STATS_CONFIG.walkSpeedPxPerSec*C.minimumWalkSpeedRatio,
 "Cinder must remain visibly faster than ordinary walking");
console.log("CINDER_CONTACT_CONTRACT_PASS: mirrored punches/kicks, leading-edge contact, teardown, walk-outpacing Cinder speed, 4% rare boundary, stable silhouette");
