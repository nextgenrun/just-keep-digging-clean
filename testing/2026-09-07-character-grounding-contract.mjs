import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { PLAYER_ASSET_PROFILES } from '../values/playerAssetProfiles.js';
import { getUniquePlayerSheetEntries } from '../player/PlayerAssetSheetCatalog.js';
import { createUalNativePlayerAnimations } from '../player/UalNativePlayerAnimations.js';
import { PlayerKinematicMotionSystem } from '../systems/visual/PlayerKinematicMotionSystem.js';
import { UalNativeLocomotionTransitionSelector } from '../systems/visual/UalNativeLocomotionTransitionSelector.js';
import { PlayerWorldAppearanceSystem } from '../systems/visual/PlayerWorldAppearanceSystem.js';
import { GroundedCharacterShadow } from '../systems/visual/GroundedCharacterShadow.js';
import { PLAYER_CONTACT_SHADOW_CONFIG } from '../values/playerContactShadow.js';
import { resolveRenderDensityProfile } from '../systems/visual/RenderDensitySystem.js';
const p=PLAYER_ASSET_PROFILES.survivalUal;
assert.equal(p.characterDefinitionRuntime.clothEnabled,false);
assert.equal(p.proceduralBodyLanguageScaleEnabled,false);
assert.equal(p.characterGroundingPolish.sourceSizePx,1024);
const entries=getUniquePlayerSheetEntries(p),atlases=new Map();
for(const e of entries){
 const data=JSON.parse(fs.readFileSync(e.path.split('?')[0],'utf8'));
 const frames=new Set();
 for(const page of data.textures){
  assert.ok(fs.existsSync(e.path.split('/').slice(0,-1).join('/')+'/'+page.image.split('?')[0]));
  for(const f of page.frames){assert.equal(f.sourceSize.w,512);assert.equal(f.sourceSize.h,512);frames.add(f.filename)}
  if(p.mipmappedCharacterSheets.includes(e.key)){
   assert.equal(page.size.w & (page.size.w-1),0);assert.equal(page.size.h & (page.size.h-1),0);
   assert.ok(page.frames.every(f=>f.frame.x>=8 && f.frame.y>=8));
  }
 }
 atlases.set(e.key,frames);
}
const animations=new Map();
createUalNativePlayerAnimations({textures:{exists:key=>atlases.has(key),get:()=>({setFilter(){}})},anims:{exists:key=>animations.has(key),create:a=>animations.set(a.key,a)}},p);
let refs=0;
for(const a of animations.values())for(const f of a.frames){assert.ok(atlases.get(f.key)?.has(String(f.frame)),a.key+':'+f.key+':'+f.frame);refs++}
const contacts=p.groundingContacts;
let groundedFrames=0;
for(const sheet of Object.values(contacts))for(const f of Object.values(sheet.feet)){
 assert.ok(Math.abs(Math.max(f.l.bottom,f.r.bottom)-454.5)<.01,'The actual supporting sole uses one native floor');groundedFrames++;
}
const motion=new PlayerKinematicMotionSystem({config:{tileSize:94}},null,{physicsBody:{x:0,y:0}},p);
const run=animations.get(p.walkRunAnim),walk=animations.get(p.walkLoopAnim);
const runScale=motion.resolveLocomotionTimeScale(p.walkRunAnim,run,336);
const walkScale=motion.resolveLocomotionTimeScale(p.walkLoopAnim,walk,160);
assert.equal(motion.resolveLocomotionTimeScale(p.walkRunAnim,run,0),0);
function slip(feet,scale,speed,a,b,side){
 const travel=speed*(b-a)/(24*scale);
 const foot=(feet[b%24][side].x-feet[a%24][side].x)*101/512;
 return {travel,foot,drift:travel+foot,ratio:Math.abs(travel+foot)/travel};
}
const runSlip=slip(contacts[p.walkRunSheet].feet,runScale,336,8,14,'l');
const walkSlip=slip(contacts[p.walkLoopSheet].feet,walkScale,160,8,17,'l');
const oldNative=JSON.parse(fs.readFileSync('testing/character-grounding-2026-09-07/native-feet.json','utf8'));
const beforeSlip=slip(oldNative.sheets['survival-mixamo-v1-walk-loop-sheet'],336/(1.55*94),336,8,14,'l');
assert.ok(runSlip.ratio<.1);assert.ok(walkSlip.ratio<.1);assert.ok(beforeSlip.ratio>.4);
const selector=new UalNativeLocomotionTransitionSelector(p);
selector.resolve({grounded:true,running:false,horizontalVelocity:160,facingFlipX:false,currentAnimationKey:p.walkLoopAnim,currentTextureFrame:9,isPlaying:true});
const switchRun=selector.resolve({grounded:true,running:true,horizontalVelocity:170,facingFlipX:false,currentAnimationKey:p.walkLoopAnim,currentTextureFrame:9,isPlaying:true});
assert.equal(switchRun.animationKey,p.walkRunAnim);
assert.equal(switchRun.startFrame,p.groundGaitFrameTransfers.walkToRun[9]);
const braking=selector.resolve({grounded:true,running:true,horizontalVelocity:80,facingFlipX:true,currentAnimationKey:p.walkRunAnim,currentTextureFrame:10,isPlaying:true});
assert.equal(braking.facingFlipX,false,'Brake in travel direction before turning');
const reversed=selector.resolve({grounded:true,running:true,horizontalVelocity:-30,facingFlipX:true,currentAnimationKey:p.walkRunAnim,currentTextureFrame:11,isPlaying:true});
assert.equal(reversed.facingFlipX,true);
function image(){return {alpha:0,visible:false,setDisplaySize(){return this},setDepth(){return this},setPosition(x,y){this.x=x;this.y=y;return this},setAlpha(v){this.alpha=v;return this},setVisible(v){this.visible=v;return this},destroy(){this.destroyed=true}}}
const events=new EventEmitter();let grounded=true,support=true;
const body={x:80,y:100,w:26,h:56,vx:0,vy:0};
const player={x:93,y:156,visible:true,alpha:1,scaleX:101/512,scaleY:101/512,originX:.5,originY:.890625,texture:{key:p.idleSheet},frame:{name:'0'}};
const scene={events,textures:{exists:()=>true},add:{image},worldModel:{isSolid:()=>support},config:{tileSize:94},playerAssetProfile:p};
const shadow=new GroundedCharacterShadow(scene,player,{physicsBody:body,isGrounded:()=>grounded},PLAYER_CONTACT_SHADOW_CONFIG);shadow.create();
shadow.update(80);assert.ok(shadow.outer.alpha>.2);const floorY=shadow.outer.y;
grounded=false;body.y-=70;player.y-=70;shadow.update(16);
assert.equal(shadow.outer.y,floorY,'Takeoff never pulls the shadow into the air');
assert.ok(shadow.feet.every(f=>f.alpha===0));shadow.update(80);shadow.update(80);assert.ok(shadow.outer.alpha<.003);
grounded=true;support=false;shadow.update(80);assert.ok(shadow.outer.alpha<.003,'A void cannot support a ground contact');
shadow.destroy();assert.equal(events.listenerCount('postupdate'),0);
motion.controller.physicsBody.x = 4;motion.samplePhysics(100);
assert.ok(Math.abs(motion.resolveLocomotionTimeScale(p.walkRunAnim,run,336)-40/p.stridePxByAnimation[p.walkRunAnim])<.001,'A slow frame advances cadence by travelled distance, not requested speed');
const tintPlayer={tintTopLeft:0xffffff,tintTopRight:0xffffff,tintBottomLeft:0xffffff,tintBottomRight:0xffffff,
  setTint(a,b,c,d){[this.tintTopLeft,this.tintTopRight,this.tintBottomLeft,this.tintBottomRight]=[a,b,c,d]},
  clearTint(){this.setTint(0xffffff,0xffffff,0xffffff,0xffffff)}};
const tintScene={events:new EventEmitter(),playerAssetProfile:p,dayNightCycle:{getNightAmount:()=>1}};
const appearance=new PlayerWorldAppearanceSystem(tintScene,tintPlayer);assert.equal(appearance.create(),true);
appearance.update(1000);assert.ok(tintPlayer.tintBottomLeft<tintPlayer.tintTopLeft);
tintPlayer.setTint(0xff0000,0xff0000,0xff0000,0xff0000);appearance.update(1000);assert.equal(tintPlayer.tintTopLeft,0xff0000,'Preserve combat tint ownership');
tintPlayer.clearTint();appearance.update(1000);assert.notEqual(tintPlayer.tintTopLeft,0xffffff);
appearance.destroy();assert.equal(tintPlayer.tintTopLeft,0xffffff);assert.equal(tintScene.events.listenerCount('postupdate'),0);
const savedWindow=globalThis.window;
globalThis.window={innerWidth:1280,innerHeight:720,devicePixelRatio:2};
assert.equal(resolveRenderDensityProfile('').density,2);assert.equal(resolveRenderDensityProfile('?renderQuality=high').density,1.5);
assert.equal(resolveRenderDensityProfile('?nativeDensity=0').density,1);globalThis.window=savedWindow;
const report={sheets:entries.length,animations:animations.size,frameReferences:refs,groundedFrames,runScale,walkScale,beforeRunSlip:beforeSlip,afterRunSlip:runSlip,afterWalkSlip:walkSlip};
fs.writeFileSync('testing/character-grounding-2026-09-07/contract-result.json',JSON.stringify(report,null,2));
console.log('CHARACTER_GROUNDING_CONTRACT_OK',JSON.stringify(report));
