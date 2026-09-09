import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WEATHER_CONFIG as BASE } from '../values/weatherConfig.js';
import { LAYERED_WEATHER_VISUALS as C } from '../values/layeredWeatherVisuals.js';
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as SKY } from '../values/worldVisualLayeredSkyReview.js';
import { SKYLINE_WEATHER_VFX } from '../values/skylineWeatherVfx.js';
import { LayeredWeatherAtlas,resolveLayeredWeatherConfig } from '../systems/environment/LayeredWeatherAtlas.js';
import { WeatherDirector } from '../systems/environment/WeatherDirector.js';
import { WeatherCloudFront } from '../systems/environment/WeatherCloudFront.js';
import { rainTrailPose } from '../systems/environment/weatherRainTrail.js';
import { WeatherImpactRainController } from '../systems/environment/WeatherImpactRainController.js';
import { WeatherParticleController } from '../systems/environment/WeatherParticleController.js';
import { WeatherWorldCollision } from '../systems/environment/WeatherWorldCollision.js';
import { sampleLayeredCloudShape } from '../world/rendering/scenic-world/layeredCloudShape.js';

const before=JSON.stringify(BASE);globalThis.location={search:'?layeredSky=0'};
assert.equal(resolveLayeredWeatherConfig(BASE),BASE);
globalThis.location.search='?layeredSky=1';const config=resolveLayeredWeatherConfig(BASE);
assert.notEqual(config,BASE);assert.equal(JSON.stringify(BASE),before);
assert.equal(config.precipitationCollision,BASE.precipitationCollision);
assert.equal(config.surfaceLandingMask.enabled,false);
assert(config.rain.layers.foreground.ratePerSecond>BASE.rain.layers.foreground.ratePerSecond);

// The same physical drop has the same photographic trail at every refresh rate.
const style=config.rain.impact.visualStyles.foreground;
const baselinePose=rainTrailPose({x:300,y:500,previousY:480,speedX:200,speedY:1000,usesSweptCollision:true},style,config.rain.impact);
assert.equal(baselinePose.height,20);assert.equal(baselinePose.x1,296);assert.equal(baselinePose.y1,480);
const poseAt=fps=>rainTrailPose({x:300,y:500,previousX:300-150/fps,previousY:500-1300/fps,
 spawnY:0,speedX:150,speedY:1300,usesSweptCollision:true,widthScale:.9,lengthScale:1},style,config.rain.impact,config.rainMotion);
for(const fps of [30,60,144])assert.deepEqual(poseAt(fps),poseAt(60));
assert(poseAt(144).height>60);
const young=rainTrailPose({x:20,y:12,previousY:0,spawnY:0,speedX:0,speedY:1200,usesSweptCollision:true},style,config.rain.impact,config.rainMotion);
assert.equal(young.y1,0);assert.equal(young.height,12);

// Actual tile rays: open shafts remain open; the wider near-rain edges hit walls.
const ts=94,scene={worldModel:{isSolid:(x,y)=>y===7||(y===5&&x!==4)},add:{image(){return {setTexture(){return this;},setOrigin(){return this;},setScrollFactor(){return this;},setDepth(){return this;},setAlpha(){return this;},setVisible(){return this;},destroy(){}};}}};
const collision=new WeatherWorldCollision(scene,{tileSize:ts,topAirRows:5,worldDepthTiles:20,spawnTileX:4},config);
const occlusion={supportsWorldRaycast:true,raycastWorldSegment:collision.raycastSegment.bind(collision),worldView:{x:0,y:0,width:ts*10,height:ts*10}};
function falling(x,speedX=0){return {x,y:360,previousX:x,previousY:360,spawnY:0,speedX,speedY:5000,layer:'foreground',alpha:1,widthScale:1.16,lengthScale:1,impactWorldY:470};}
const rain=new WeatherImpactRainController(scene,{},config,{textureKey:C.atlas.key,frames:{rainStreaks:['r0','r1','r2','r3']}});
rain.drops=[falling(3.5*ts)];rain._updateDrops(.1,{occlusion});assert.equal(rain.drops.length,0);
let hits=rain.drainImpactEvents();assert.equal(hits.length,1);assert.equal(hits[0].worldY,470);
rain.drops=[falling(4.5*ts)];rain._updateDrops(.1,{occlusion});hits=rain.drainImpactEvents();assert.equal(hits[0].worldY,658);
rain.drops=[falling(5*ts-2)];rain._updateDrops(.1,{occlusion});hits=rain.drainImpactEvents();assert.equal(hits[0].worldY,470);
rain.destroy();

const bytes=fs.readFileSync('sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/weather-v4.png');
const bounds={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
const registered=new Map();const texture={has:n=>registered.has(n),add:(n,_source,x,y,w,h)=>{
 assert(x>=0&&y>=0&&x+w<=bounds.width&&y+h<=bounds.height);registered.set(n,[x,y,w,h]);},remove:n=>registered.delete(n)};
const atlasScene={textures:{exists:()=>true,get:()=>texture}};
const baseAssets={textureKey:'old-weather',frames:SKYLINE_WEATHER_VFX.particleFrames,presentation:SKYLINE_WEATHER_VFX.particlePresentation};
const atlas=new LayeredWeatherAtlas(atlasScene,baseAssets);
assert.equal(registered.size,8);assert.equal(atlas.visualAssets.frames.snowFlakes,baseAssets.frames.snowFlakes);
const emitter=Object.create(WeatherParticleController.prototype);emitter.visualAssets=atlas.visualAssets;
for(const group of ['rainSplashes','rainRipples']){
 const asset=emitter._imagegenAsset(group);assert.equal(asset.textureKey,C.atlas.key);assert(asset.frames.every(f=>registered.has(f)));
}
assert.equal(emitter._imagegenAsset('snowPowder').textureKey,'old-weather');
atlas.destroy();assert.equal(registered.size,0);
const absent=new LayeredWeatherAtlas({textures:{exists:()=>false}},baseAssets);assert.equal(absent.visualAssets,baseAssets);absent.destroy();

// Cloud cover is continuous and meaningfully changes while weather remains clear.
const front=new WeatherCloudFront(C.cloudFront),covers=[];
for(let i=0;i<840;i++){front.update(100);covers.push(front.sample('clear'));}
assert(Math.max(...covers)-Math.min(...covers)>.4);
assert(covers.slice(1).every((v,i)=>Math.abs(v-covers[i])<.005));
let referenceCover;
for(const fps of [30,60,144]){
 const instance=new WeatherCloudFront(C.cloudFront);for(let i=0;i<fps*20;i++)instance.update(1000/fps);
 assert(Math.abs(instance.snapshot().seconds-20)<1e-9);
 referenceCover??=instance.sample('rain');
 assert(Math.abs(instance.sample('rain')-referenceCover)<1e-10);
}
const director=new WeatherDirector({},config);director.force('storm',.9,120000,0);director.resume(1000);
assert.equal(director._overrideUntil,0);assert(director._phaseEndsAt<120000);
front.seconds=0;
const clear=front.apply({cloudCoverAmount:0,sunTransmittance:1,sunExposure:1},'clear');
const approaching=front.sample('clear',{forecastKind:'storm',forecastProgress:1});
assert(approaching>clear.cloudCoverAmount);assert(clear.sunTransmittance<1);
assert(front.sample('storm')>.8);

const widths=[],scales=[];
for(const layer of SKY.cloudLayers.filter(l=>!l.anchor))for(let seed=0;seed<120;seed++){
 const shape=sampleLayeredCloudShape(layer,seed,20,.8);
 assert(shape.scaleX<=1&&shape.scaleY<=1&&shape.scaleX>0);
 assert.deepEqual(shape,sampleLayeredCloudShape(layer,seed,20,.8));
 scales.push(shape.scaleX);widths.push(shape.scaleX*(layer.atlas==='banks'?1672:887));
}
assert(new Set(scales.map(s=>s.toFixed(3))).size>100);
assert(Math.max(...widths)/Math.min(...widths)>4);
const bank=SKY.cloudLayers[0];assert(sampleLayeredCloudShape(bank,733,20,.9).scaleX>sampleLayeredCloudShape(bank,733,20,.05).scaleX);
const result={passed:true,frameRates:[30,60,144],rainTrailPixels:poseAt(144).height,solidAndAirShaftCollision:true,atlasRouting:true,baselineConfigUnchanged:true,cloudCoverRange:[Math.min(...covers),Math.max(...covers)],cloudWidthRange:[Math.min(...widths),Math.max(...widths)],uniqueCloudScales:new Set(scales.map(s=>s.toFixed(3))).size};
fs.writeFileSync('testing/2026-09-06-level-one-live-v6/visual-contract.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
