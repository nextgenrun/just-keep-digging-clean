import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_VISUAL_LAYERED_SKY_REVIEW as C} from '../values/worldVisualLayeredSkyReview.js';
import {WEATHER_CONFIG} from '../values/weatherConfig.js';
import {resolveLayeredWeatherConfig} from '../systems/environment/LayeredWeatherAtlas.js';
import {WeatherParticleController} from '../systems/environment/WeatherParticleController.js';
import {sampleLayeredCloudShape} from '../world/rendering/scenic-world/layeredCloudShape.js';
import {landscapeJoinWeights} from '../world/rendering/scenic-world/WorldVisualLandscapeSections.js';

assert(C.cloudLayers.every(layer=>!layer.anchor),'No ground-anchored cloud layers');
assert(C.cloudLayers.every(layer=>layer.depth<Math.min(...C.landscapeLayers.map(l=>l.depth))),'All sky clouds behind terrain');
const banks=C.cloudLayers.filter(layer=>layer.atlas==='banks');
let minOverlap=Infinity,maxHeight=0;
for(const bank of banks){
 const scales=Array.from({length:1000},(_,seed)=>sampleLayeredCloudShape(bank,seed,17,0));
 const minWidth=Math.min(...scales.map(s=>1672*s.scaleX));
 const overlap=minWidth-bank.strideX-C.cloudJitter.x;
 assert(overlap>0,'Even smallest banks overlap at maximum opposing jitter');minOverlap=Math.min(minOverlap,overlap);
 for(let i=0;i<1000;i++)maxHeight=Math.max(maxHeight,516*sampleLayeredCloudShape(bank,i,17,1).scaleY);
}
assert(maxHeight<350,'Cloud banks remain vertically compact');
const layerSpread=Math.max(...C.cloudLayers.map(l=>l.bandBottomPx))-Math.min(...C.cloudLayers.map(l=>l.bandBottomPx))+C.cloudJitter.y;
assert(layerSpread<180,'Cloud planes form one compact ceiling');
assert(C.cloudLayers.every(l=>l.parallaxY===C.cloudLayers[0].parallaxY),'Ceiling remains compact at every altitude');

const stride=800,overlap=170,feather=C.landscapeJoin.coverageFeatherPx;
function alpha(x,from,to){const w=landscapeJoinWeights(x,stride,overlap,feather);return Math.max(from*w.outgoing,to*w.incoming);}
assert.equal(landscapeJoinWeights(200,stride,overlap,feather),null);
assert.equal(alpha(0,1,0),1);assert.equal(alpha(0,0,1),0);
assert.equal(alpha(overlap-1,0,1),1);
for(let x=feather;x<=overlap-feather;x++){
 assert.equal(alpha(x,1,0),1,'Opaque outgoing tree cannot turn into a ghost');
 assert.equal(alpha(x,0,1),1,'Opaque incoming ridge cannot be transparent');
 assert.equal(alpha(x,.6,.2),.6,'Source transparency retained without amplifying soft edges');
}
for(let x=0;x<feather;x++)assert(Math.abs(alpha(x,0,1)-alpha(x+.01,0,1))<.001);
for(let x=0;x<16;x++){
 const a=landscapeJoinWeights(x,stride,overlap,feather),b=landscapeJoinWeights(x+stride,stride,overlap,feather);
 assert.equal(a.t,b.t);assert.equal(a.outgoing,b.outgoing);assert.equal(a.incoming,b.incoming);
}

let mist,steam;const controller=Object.create(WeatherParticleController.prototype);
controller.visualAssets={};controller.impactController={update(){}};
for(const name of ['_emitDrips','_emitPreStormDust','_emitWetSurfaceRipples'])controller[name]=()=>{};
controller._emitMist=amount=>mist=amount;controller._emitPostRainSteam=delta=>steam=delta;
const state={kind:'storm',intensity:1,rainAmount:1,snowAmount:0,gust:30,depth:{surfaceAmount:1,undergroundSignal:0},occlusion:{openSkyAmount:1,coveredAmount:0,landingSamples:[]}};
globalThis.location={search:'?layeredSky=1'};controller.weatherConfig=resolveLayeredWeatherConfig(WEATHER_CONFIG);
controller.update(1000,16,state);assert.equal(mist,0);assert.equal(steam,0);
controller.update(1016,16,{...state,depth:{surfaceAmount:0,undergroundSignal:.65}});assert.equal(mist,.65);
globalThis.location.search='?layeredSky=0';controller.weatherConfig=resolveLayeredWeatherConfig(WEATHER_CONFIG);
controller.update(1032,16,state);assert(mist>0);assert(steam>0);
const result={passed:true,groundCloudsRemoved:true,outdoorMistAndSteamRemoved:true,undergroundWeatherPreserved:true,minimumBankOverlapPx:minOverlap,maxBankHeightPx:maxHeight,ceilingBandSpreadPx:layerSpread,silhouetteCoverage:true,softJoinBorders:true,paddedJoinContinuity:true};
fs.writeFileSync('testing/2026-09-06-level-one-live-v6/cloud-polish-contract.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
