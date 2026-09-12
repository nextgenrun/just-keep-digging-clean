import assert from 'node:assert/strict';
import { AnimatedCacheVisualSystem } from '../systems/visual/AnimatedCacheVisualSystem.js';
import { CelestialCurrencyHudSystem } from '../systems/visual/CelestialCurrencyHudSystem.js';
import { CaveEntryController } from '../world/playScene/CaveEntryController.js';
import { WorldModel } from '../world/model/WorldModel.js';
import { CelestialTalentProgressionSystem } from '../systems/progression/CelestialTalentProgressionSystem.js';
import { destroyScenicVideo } from '../world/rendering/scenic-world/destroyScenicVideo.js';
import { TILE_TYPES } from '../values/tileTypes.js';
import { INTERACTIVE_WORLD_STATES as C, getInteractiveWorldStateFrameName as frame } from '../values/interactiveWorldStates.js';

// A private video texture is reclaimed, but shared/renamed textures survive.
for (const shared of [false,true]) {
  const entries=new Map();const key='private-video';
  const manager={exists:k=>entries.has(k),get:k=>entries.get(k),remove:k=>entries.delete(k)};
  const texture={key,manager};entries.set(key,texture);
  const peer={children:{list:shared?[{active:true,texture}]:[]}};
  const scene={textures:manager,children:{list:[]},sys:{game:{scene:{scenes:[peer]}}}};
  const video={scene,_key:key,videoTexture:texture,stop(){},destroy(){this.scene=null;}};
  destroyScenicVideo(video);
  assert.equal(entries.has(key),shared);
}
{
  let removed=false;
  const texture={key:'shared-image',manager:{exists:()=>true,get:()=>texture,remove:()=>{removed=true;}}};
  destroyScenicVideo({_key:'private-video',videoTexture:texture,stop(){},destroy(){}});
  assert.equal(removed,false);
}

const visual=()=>({width:80,height:20,setText(t){this.text=t;return this;},setScale(){return this;},
  setOrigin(){return this;},setDepth(){return this;},setDisplaySize(){return this;},
  setFrame(f){this.frame=f;return this;},setAlpha(){return this;},destroy(){this.destroyed=true;}});
let queries=0,ready=false;
const opened=new Set();const tiles=new Map([['10,80',TILE_TYPES.CHEST]]);
const model={tileTypeRevision:0,tileSize:94,widthTiles:40,depthTiles:180,
  getTileType(x,y){queries++;return tiles.get(`${x},${y}`)??TILE_TYPES.AIR;}};
const scene={specialTileSystem:{openedChestKeys:opened},cameras:{main:{worldView:{x:600,y:6800,width:760,height:760}}},add:{image:visual}};
const cache=new AnimatedCacheVisualSystem(scene,model,{ensure:()=>ready,release(){}});
const player={tx:10,ty:79};cache.update(0,player);const initialQueries=queries;
for(let i=1;i<=60;i++)cache.update(i,player);
assert.equal(queries,initialQueries,'stationary frames must not rescan tiles');
ready=true;cache.update(61,player);
assert.ok(cache.records.get('10,80').image,'asset readiness still activates without a rescan');
opened.add('10,80');tiles.delete('10,80');model.tileTypeRevision++;
cache.update(62,player);
assert.equal(cache.records.get('10,80').image.frame,frame(C.states.activation[0].index));
const afterOpen=queries;cache.update(5000,player);
assert.equal(queries,afterOpen);
assert.equal(cache.records.get('10,80').image.frame,frame(C.states.resolved.index));
opened.delete('10,80');tiles.set('10,80',TILE_TYPES.CHEST);model.tileTypeRevision++;
cache.update(5001,player);
assert.equal(cache.records.get('10,80').image.frame,frame(C.states.proximityReady.index));
scene.cameras.main.worldView.x=1800;cache.update(5002,player);
assert.ok(queries>afterOpen,'camera changes must discover new tiles');
const afterMove=queries;scene.cameras.main.worldView.width=900;cache.update(5003,player);
assert.ok(queries>afterMove,'resize must refresh discovery');

// The model revision covers writes and destruction, but excludes HP-only changes.
const world=Object.create(WorldModel.prototype);
Object.assign(world,{widthTiles:2,depthTiles:2,_types:new Uint8Array(4),_hp:new Float32Array(4),
  tileTypeRevision:0,rubbleTiles:new Map(),dugTiles:new Map(),dugTileSource:new Map(),getTileMaxHp:()=>10});
world.setTile(0,0,TILE_TYPES.DIRT,10);assert.equal(world.tileTypeRevision,1);
world.setHp(0,0,9);world.setType(0,0,TILE_TYPES.DIRT);assert.equal(world.tileTypeRevision,1);
world.damageTile(0,0,1);assert.equal(world.tileTypeRevision,1);
world.damageTile(0,0,20);assert.equal(world.tileTypeRevision,2);
assert.equal(world.getTileType(0,0),TILE_TYPES.AIR);

let solidReads=0;
const near={entry:{tx:1,ty:0},standaloneScene:true};
const cave=new CaveEntryController({worldModel:{caveZones:[...Array.from({length:1000},(_,i)=>({entry:{tx:200,ty:i*2},standaloneScene:true})),near],
  isSolid(x,y){solidReads++;return y%2===1;}}});
assert.equal(cave._findNearestZone({tx:0,ty:0}),near);
assert.equal(solidReads,2,'only the nearby entrance needs solidity checks');

let money=12.5,stars=4;
const progression=new CelestialTalentProgressionSystem();
assert.equal(progression.getStars(),0);
progression.grantStars(12);
assert.equal(progression.getStars(),progression.getSnapshot().stars);
progression.getSnapshot=()=>{throw new Error('Balance reads must not build talent tree snapshots');};
assert.equal(progression.getStars(),12);
const hud=Object.create(CelestialCurrencyHudSystem.prototype);
Object.assign(hud,{getMoney:()=>money,getStars:()=>stars,moneyText:visual(),starsText:visual(),config:{layout:{valueWidthPx:80,valueHeightPx:20}}});
assert.equal(hud.update(true),true);assert.equal(hud.moneyText.text,'12.50');
let formats=0;const original=Number.prototype.toLocaleString;
try{Number.prototype.toLocaleString=function(...args){formats++;return original.apply(this,args);};
  for(let i=0;i<1000;i++)assert.equal(hud.update(),false);
  assert.equal(formats,0,'unchanged balances must skip locale formatting');
  money=13;assert.equal(hud.update(),true);assert.equal(hud.moneyText.text,'13');
  assert.equal(formats,1);stars=5;hud.update();assert.equal(hud.starsText.text,'5');
  hud.update(true);assert.equal(formats,4);
}finally{Number.prototype.toLocaleString=original;}
console.log(JSON.stringify({status:'SMOOTH_RUNTIME_CONTRACT_OK',stationaryFrames:60,initialTileQueries:initialQueries,additionalStationaryQueries:0,distantCaves:1000,nearbySolidQueries:solidReads,unchangedHudFrames:1000,unchangedHudFormats:0}));
