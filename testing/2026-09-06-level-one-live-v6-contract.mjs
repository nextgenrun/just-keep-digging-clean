import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveLayeredSkyReviewEnabled as enabled,getLayeredSkyReviewAssets} from '../values/worldVisualLayeredSkyReview.js';
import {getWorldVisualPreloadAssets,WORLD_VISUAL_RUNTIME,resolveWorldVisualRuntimeMode} from '../values/worldVisualRuntime.js';
import {LEVEL_ONE_AMBIENT_EVENTS as C} from '../values/levelOneAmbientEvents.js';
import {WorldVisualLevelOneAmbientEvents} from '../world/rendering/scenic-world/WorldVisualLevelOneAmbientEvents.js';
import {WEATHER_CONFIG} from '../values/weatherConfig.js';
import {resolveLayeredWeatherConfig} from '../systems/environment/LayeredWeatherAtlas.js';

globalThis.location={search:'',hostname:'127.0.0.1'};
assert(enabled());assert.equal(getLayeredSkyReviewAssets().length,13);
assert(getWorldVisualPreloadAssets().some(a=>a.key===C.birdAsset.key));
assert(!getWorldVisualPreloadAssets().some(a=>a.key===WORLD_VISUAL_RUNTIME.assets.far.key));
assert.equal(resolveLayeredWeatherConfig(WEATHER_CONFIG).surfaceAtmosphere.mistScale,0);
for(const value of ['0','false','off'])assert.equal(enabled('?layeredSky='+value),false);
for(const value of WORLD_VISUAL_RUNTIME.legacyValues){
 assert.equal(enabled('?worldVisualRuntime='+value),false);
 assert.equal(enabled('?worldVisualRuntime='+value+'&layeredSky=1'),false);
 assert.equal(resolveWorldVisualRuntimeMode(undefined,'?worldVisualRuntime='+value),'legacy');
}
assert.equal(enabled('?gameplayProfile=full-review'),false);
assert(enabled('?gameplayProfile=full-review&layeredSky=1'));
assert(!getLayeredSkyReviewAssets('?gameplayProfile=full-review&layeredSky=1').some(a=>a.key===C.birdAsset.key));
globalThis.__DIG_GAME_PRODUCTION__=true;
assert(enabled('?gameplayProfile=full-review'));
assert.equal(getLayeredSkyReviewAssets('?gameplayProfile=full-review').length,13);
delete globalThis.__DIG_GAME_PRODUCTION__;

const frames=new Set(),images=[];
const texture={has:id=>frames.has(id),add:id=>frames.add(id),remove:id=>frames.delete(id),getSourceImage:()=>({width:1536,height:1024})};
const scene={gameplayCapabilities:{isLevelEnabled:l=>l!==2},config:{topAirRows:65,tileSize:94},
 cameras:{main:{scrollX:3000,scrollY:5400,worldView:{x:3000,y:5400,width:1280,height:720,bottom:6120}}},
 textures:{exists:()=>true,get:()=>texture},add:{image(x,y,key){
  const image={x,y,key,alpha:1,destroy(){this.destroyed=true;},setPosition(x,y){this.x=x;this.y=y;return this;},
   setAlpha(a){this.alpha=a;return this;},setFrame(f){this.frame=f;return this;},setDisplaySize(w,h){this.width=w;this.height=h;return this;}};
  for(const method of ['setScrollFactor','setDepth','setTint','setFlipX','setOrigin','setRotation'])image[method]=()=>image;
  images.push(image);return image;
 }}};
const environment={rain:0,storm:0,night:0,wind:20},motion={traveledSeconds:0};
const owner=new WorldVisualLevelOneAmbientEvents(scene);
assert.equal(frames.size,6);owner.update(motion,environment,true);assert.equal(owner.actors.length,0);
owner.nextAt=0;owner.update(motion,environment,true);
assert(owner.event);assert(owner.actors.length<=C.maxSprites);
const kind=owner.event.kind,first=owner.actors[0].image;
motion.traveledSeconds=2;owner.update(motion,environment,true);const pose={x:first.x,y:first.y,frame:first.frame};
owner.update(motion,environment,true);assert.deepEqual({x:first.x,y:first.y,frame:first.frame},pose,'Paused clock freezes movement');
motion.traveledSeconds=3;owner.update(motion,environment,true);assert.notEqual(first.x,pose.x);
owner.update(motion,{...environment,rain:1,storm:1},true);assert(owner.actors.every(a=>a.image.alpha===0));
motion.traveledSeconds=owner.event.duration+1;owner.update(motion,environment,true);
assert.equal(owner.actors.length,0);assert(owner.nextAt>=motion.traveledSeconds+C.quietSeconds[0]);
owner.nextAt=0;owner.update(motion,{...environment,rain:1,storm:1},true);assert.equal(owner.event,null);
owner.nextAt=0;owner.update(motion,{...environment,night:1},true);assert.equal(owner.event.kind,'glimmers');
owner.update(motion,environment,false);assert.equal(owner.actors.length,0);
owner.nextAt=0;owner.update(motion,environment,true);assert(owner.event);
scene.cameras.main.worldView.x+=4000;owner.update(motion,environment,true);assert.equal(owner.event,null);
owner.destroy();assert.equal(frames.size,0);assert(images.every(i=>i.destroyed));
globalThis.matchMedia=()=>({matches:true});const reduced=new WorldVisualLevelOneAmbientEvents(scene);assert.equal(reduced.enabled,false);reduced.destroy();delete globalThis.matchMedia;
globalThis.location.search='?surfaceEvents=0';const disabled=new WorldVisualLevelOneAmbientEvents(scene);assert.equal(disabled.enabled,false);disabled.destroy();
const result={passed:true,defaultWithoutFlag:true,rollback:true,productionDemoScope:true,fullReviewUnchanged:true,birdFrames:6,
 firstEvent:kind,weatherSuppression:true,quietGaps:true,pausedClock:true,undergroundCull:true,teleportCleanup:true,reducedMotion:true,teardown:true};
fs.writeFileSync('testing/2026-09-06-level-one-live-v6/contract.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
