import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { PLAYER_RUNNING_CONFIG } from "../values/playerRunning.js";
import { PLAYER_SKELETAL_RUN, isSkeletalRunEnabled } from "../values/playerSkeletalRun.js";
import { PLAYER_RUN_DASH_FX as FX } from "../values/playerRunDashFx.js";
import { PlayerSkeletalRunPresentation } from "../player/PlayerSkeletalRunPresentation.js";
import { PlayerRunDashFxSystem } from "../systems/visual/PlayerRunDashFxSystem.js";
assert.ok(Math.abs(PLAYER_RUNNING_CONFIG.speedMultiplier / 1.5 - 1.4) < 1e-12);
assert.ok(isSkeletalRunEnabled({characterId:"survivalUal"},""));
assert.equal(isSkeletalRunEnabled({characterId:"robot"},""),false);
assert.equal(isSkeletalRunEnabled({characterId:"survivalUal"},"?skeletalRun=0"),false);
const glb=await readFile(new URL("../"+PLAYER_SKELETAL_RUN.assetPath,import.meta.url));
assert.equal(glb.readUInt32LE(0),0x46546c67);
assert.equal(glb.readUInt32LE(8),glb.length);
const model=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
assert.equal(model.animations.length,1);
assert.equal(model.animations[0].name,PLAYER_SKELETAL_RUN.clipName);
assert.ok(model.skins[0].joints.length>=100,"live character must retain the real skeleton");
assert.ok(model.animations[0].channels.filter(c=>c.target.path==="rotation").length>50,
  "jog must animate the skeleton, not just move an undeformed mesh");
assert.ok(model.meshes.every(m=>m.primitives.every(p=>p.attributes.JOINTS_0!=null && p.attributes.WEIGHTS_0!=null)));
assert.ok(glb.length<15_000_000,"runtime must use the compact mesh derivative");
const walkBytes=await readFile(new URL("../"+PLAYER_SKELETAL_RUN.walk.assetPath,import.meta.url));
const walkModel=JSON.parse(walkBytes.subarray(20,20+walkBytes.readUInt32LE(12)).toString());
assert.equal(walkModel.animations.length,1);
assert.equal(walkModel.animations[0].name,"Original_Run_Standard_Walk");
assert.notEqual(walkModel.animations[0].name,model.animations[0].name);
assert.equal(walkModel.meshes,undefined,"The walking clip must reuse the same public mesh");
assert.ok(walkBytes.length<250_000);
const jointNames=new Set(model.nodes.map(n=>n.name));
assert.ok(walkModel.animations[0].channels.every(c=>jointNames.has(walkModel.nodes[c.target.node].name)));
const walkManifest=JSON.parse(await readFile(new URL("../sprites/character/survival-skeletal-walk-v1/manifest.json",import.meta.url),"utf8"));
assert.match(walkManifest.source,/mixamo-standard-walk-123500901\.fbx$/);
assert.equal(walkManifest.sourcesUnchanged,true);
assert.equal(walkManifest.frames,24);
const walkDurations=walkModel.animations[0].samplers.map(s=>walkModel.accessors[s.input].max[0]);
assert.ok(walkDurations.every(duration=>Math.abs(duration-1)<1e-6),"Standard Walk must loop at one second without an extra leading hold");

const owner=Object.create(PlayerSkeletalRunPresentation.prototype);
Object.assign(owner,{
 ready:true,destroyed:false,scene:{gameState:"playing"},profile:{walkLoopAnim:"walk",walkRunAnim:"run",heldTorchAnimationByBaseAnimation:{walk:"torch-walk",run:"torch-run"}},
 player:{anims:{currentAnim:{key:"run"}},visible:true,active:true},
 controller:{physicsBody:{vx:336},isRunning:()=>true,isGrounded:()=>true},
});
assert.equal(owner.isAnimatingRun(),true);
owner.controller.isRunning=()=>false;owner.controller.physicsBody.vx=160;
for(const key of ["walk","torch-walk"]){
 owner.player.anims.currentAnim.key=key;
 assert.equal(owner.isAnimatingLocomotion(),true,"Walking must use the accepted live skeletal gait");
 assert.equal(owner.isAnimatingRun(),false,"Walking must stay distinct from Ctrl running");
}
for(const key of ["idle","mining","crouch","jump"]){
 owner.player.anims.currentAnim.key=key;assert.equal(owner.isAnimatingLocomotion(),false);
}
owner.controller.isRunning=()=>true;owner.controller.physicsBody.vx=336;
owner.player.anims.currentAnim.key="torch-run";assert.equal(owner.isAnimatingRun(),true);
owner.player.anims.currentAnim.key="mining";assert.equal(owner.isAnimatingRun(),false);
owner.player.anims.currentAnim.key="run";owner.controller.physicsBody.vx=0;assert.equal(owner.isAnimatingRun(),false);
owner.controller.physicsBody.vx=-336;assert.equal(owner.isAnimatingRun(),true);
owner.controller.isGrounded=()=>false;assert.equal(owner.isAnimatingRun(),false);
owner.controller.isGrounded=()=>true;owner.scene.gameState="paused";assert.equal(owner.isAnimatingRun(),false);
owner.scene.gameState="playing";owner.destroyed=true;assert.equal(owner.isAnimatingRun(),false);
const makeImage=()=>({
 active:true,x:0,alpha:0,
 setOrigin(x){this.originX=x;return this},setFlipX(x){this.flipX=x;return this},
 setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this},
 setBlendMode(){return this},setAlpha(a){this.alpha=a;return this},setDepth(){return this},
 destroy(){this.active=false},
});
const scene={events:new EventEmitter(),gameState:"playing",textures:{exists:()=>true},add:{image:(x,y)=>{
 const image=makeImage();image.x=x;image.y=y;return image;
}}};
const player={visible:true,active:true,depth:10};
const controller={config:{tileSize:94},physicsBody:{x:100,y:100,w:31,h:75,vx:336},isRunning:()=>true,isGrounded:()=>true};
const effect=new PlayerRunDashFxSystem(scene,player,controller);
await effect.readyPromise;
for(let i=0;i<300;i++){effect.update(16);assert.ok(effect.live.length<=FX.maxLive);}
assert.ok(effect.sequence>0);assert.ok(effect.live.every(d=>d.image.originX===1 && !d.image.flipX));
controller.physicsBody.vx=-336;
for(let i=0;i<30;i++)effect.update(16);
assert.ok(effect.live.every(d=>d.image.originX===0 && d.image.flipX));
effect.motionPreference={matches:true};const emitted=effect.sequence;
for(let i=0;i<30;i++)effect.update(16);
assert.equal(effect.sequence,emitted);assert.equal(effect.live.length,0);
effect.motionPreference.matches=false;controller.isGrounded=()=>false;
for(let i=0;i<30;i++)effect.update(16);
assert.equal(effect.sequence,emitted);
controller.isGrounded=()=>true;controller.isRunning=()=>false;
for(let i=0;i<30;i++)effect.update(16);
assert.equal(effect.sequence,emitted);
controller.isRunning=()=>true;
for(let i=0;i<30;i++)effect.update(16);
const images=effect.live.map(d=>d.image);
effect.destroy();assert.ok(images.every(i=>!i.active));assert.equal(scene.events.listenerCount(FX.postUpdateEvent),0);
effect.destroy();
console.log("SKELETAL_WALK_RUN_AND_DASH_CONTRACT_OK");
