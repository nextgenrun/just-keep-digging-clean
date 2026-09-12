import assert from 'node:assert/strict';
import { WeatherOcclusionSampler } from '../systems/environment/WeatherOcclusionSampler.js';
import { WeatherImpactRainController } from '../systems/environment/WeatherImpactRainController.js';
import { WeatherLightningController } from '../systems/environment/WeatherLightningController.js';
import { WEATHER_CONFIG } from '../values/weatherConfig.js';

const config = { tileSize: 94, topAirRows: 65, spawnTileX: 28, worldDepthTiles: 5065 };
let solidQueries = 0;
const scene = {
  worldModel: { isSolid(x,y) { solidQueries++; return y >= 65 && (x + y) % 7 === 0; } },
  cameras: { main: { width: 1280, height: 720, worldView: { x: 2800, y: 5500, width: 1280, height: 720 } } },
};
const sampler = new WeatherOcclusionSampler(scene,config,WEATHER_CONFIG);
sampler.update(0,{depth:{deepFade:1}});
assert.ok(sampler.samples.length);
scene.cameras.main.worldView.y = (65+800)*94;
const originalPath = new WeatherOcclusionSampler(scene,config,WEATHER_CONFIG);
solidQueries = 0;
for(let i=0;i<1000;i++) originalPath.update(i*16);
const beforeQueries = solidQueries;
assert.ok(beforeQueries > 0);
solidQueries = 0;
for(let i=0;i<1000;i++) {
  const snapshot = sampler.update(i*16,{depth:{deepFade:0}});
  assert.equal(snapshot.samples.length,0);
  assert.equal(snapshot.openSkyAmount,0);
}
assert.equal(solidQueries,0,'deep weather must not query terrain');
sampler.resize();
sampler.update(16001,{depth:{deepFade:0}});
scene.cameras.main.worldView.y = 5500;
const restored = sampler.update(16002,{depth:{deepFade:1}});
assert.ok(restored.samples.length,'surface resamples immediately on return');
assert.ok(solidQueries > 0);
sampler.setDebugEnabled(true);
sampler._drawDebug = () => {};
sampler.update(17000,{depth:{deepFade:0}});
assert.ok(sampler.samples.length,'explicit debug retains geometry');

const rain = Object.create(WeatherImpactRainController.prototype);
rain.weatherConfig = WEATHER_CONFIG;
rain._dropSpritePool = [];
rain._impactEvents = [];
rain.drops = [{x:3000,y:5500,speedX:0,speedY:900,layer:'foreground',alpha:1}];
let casts = 0;
rain._updateDrops(1/60,{occlusion:{worldView:{x:2800,y:81310,width:1280,height:720},
  supportsWorldRaycast:true,raycastWorldSegment(){casts++; return null;}}});
assert.equal(casts,0,'offscreen rain should be culled before collision');
assert.equal(rain.drops.length,0);
const drop = x => ({x,y:100,speedX:0,speedY:100,layer:'foreground',alpha:1});
rain.drops = [drop(-5000),drop(10),drop(-5000),drop(20),drop(30)];
const originalArray = rain.drops;
rain._updateDrops(1/60,{occlusion:{worldView:{x:0,y:0,width:1280,height:720},
  supportsWorldRaycast:true,raycastWorldSegment(){return null;}}});
assert.equal(rain.drops,originalArray);
assert.deepEqual(rain.drops.map(item=>item.x),[10,20,30]);

const pending = [];
const overlay = {setScrollFactor(){return this;},setDepth(){return this;},setVisible(){return this;},setAlpha(){return this;}};
const lightning = new WeatherLightningController({
  cameras:scene.cameras,add:{rectangle:()=>overlay},
  time:{delayedCall(_delay,callback){ const timer={callback};pending.push(timer);return timer;}},
},WEATHER_CONFIG,{playThunder(){}});
for(let i=0;i<1000;i++) {
  lightning._nextLightningAt = 0;
  lightning.update(i*10000,16,{kind:'storm',intensity:1,depth:{surfaceAmount:1,undergroundAmount:0}});
  pending.shift().callback();
  assert.equal(lightning._timers.length,0,'completed thunder timers must not accumulate');
}
console.log(JSON.stringify({status:'WEATHER_PERFORMANCE_CONTRACT_OK',frames:1000,depth:800,beforeQueries,deepTerrainQueries:0,completedTimersRetained:0},null,2));
