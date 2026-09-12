// Read-only operation counts and synthetic CPU timings; no production changes.
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { CaveEntryController } from '../world/playScene/CaveEntryController.js';
import { AnimatedCacheVisualSystem } from '../systems/visual/AnimatedCacheVisualSystem.js';
import { WorldVisualMaterialField } from '../world/rendering/scenic-world/WorldVisualMaterialField.js';
import { SessionRecorder } from '../systems/telemetry/SessionRecorder.js';
import { PLAYER_SESSION_LOGGING } from '../values/playerSessionLogging.js';
import { formatCelestialMoney } from '../values/celestialCurrencyHud.js';
import { TILE_TYPES } from '../values/tileTypes.js';
import { GAME_CONFIG } from '../values/gameConfig.js';

const result = { cave: [], cache: [], materialMask: [], telemetry: [], currency: {} };
for (const count of [100, 1000, 5000]) {
  let solidQueries = 0;
  const cave = new CaveEntryController({ worldModel: {
    caveZones: Array.from({length: count}, (_, i) => ({entry:{tx:200,ty:100+i*2},standaloneScene:true})),
    isSolid: (x,y) => {solidQueries++; return y % 2 === 1;},
  }});
  cave._findNearestZone({tx:0,ty:0});
  result.cave.push({zones:count,solidQueriesPerStationaryFrame:solidQueries,nearbyZones:0});
}
for (const [width,height] of [[1280,720],[1920,1080]]) {
  let tileQueries = 0;
  const system = new AnimatedCacheVisualSystem({cameras:{main:{worldView:{x:3200,y:55000,width,height}}}},
    {tileSize:GAME_CONFIG.tileSize,widthTiles:280,depthTiles:5065,getTileType(){tileQueries++;return TILE_TYPES.AIR;}},{});
  for (let i=0;i<60;i++) system._collectNeeded(new Set(),{tx:60,ty:865});
  result.cache.push({worldViewWidth:width,worldViewHeight:height,frames:60,tileQueries});
}
const graphics = new Proxy({}, {get:()=>()=>graphics});
for (const mutations of [1,10,50]) {
  let tileQueries=0, redraws=0;
  const field=Object.create(WorldVisualMaterialField.prototype);
  Object.assign(field,{
    scene:{config:{tileSize:GAME_CONFIG.tileSize}}, worldModel:{getTileType(){tileQueries++;return TILE_TYPES.DIRT;}},
    activeBounds:{left:45,right:75,top:850,bottom:872},
    maskGraphics:graphics,edgeGraphics:graphics,authoredTopCapsEnabled:false,
    _drawBackdropMask(){},
    sync(bounds){redraws++;this._drawSolidMask(bounds);},
  });
  for(let i=0;i<mutations;i++) field.invalidateCell(60,865,{});
  result.materialMask.push({individualVisibleInvalidations:mutations,viewportCells:660,maskRedraws:redraws,tileQueries});
}
for(const count of [16,64,128]) {
  const times=[];let size=0;
  for(let repeat=0;repeat<25;repeat++) {
    const recorder=new SessionRecorder({sessionId:'audit',now:()=>1000});
    recorder.events=[];
    for(let i=0;i<count;i++) recorder.record('tile_damage',{tileX:60,tileY:865,tileType:'dirt',damage:4,destroyed:false});
    const start=performance.now();
    const batch=recorder.takeBatch('audit','local');
    times.push(performance.now()-start);size=batch.events.length;
  }
  times.sort((a,b)=>a-b);
  result.telemetry.push({queued:count,batchEvents:size,medianMs:times[12],p95Ms:times[23]});
}
result.telemetryPolicy={maxBatchEvents:PLAYER_SESSION_LOGGING.maxBatchEvents,flushIntervalMs:PLAYER_SESSION_LOGGING.flushIntervalMs};
const currencyTimes=[];
for(let run=0;run<10;run++) {
  const start=performance.now();
  for(let i=0;i<1000;i++) formatCelestialMoney(12345.67);
  currencyTimes.push((performance.now()-start)/1000);
}
currencyTimes.sort((a,b)=>a-b);
result.currency={unchangedValueCalls:1000,medianPerCallMs:currencyTimes[5]};
writeFileSync(new URL('./2026-09-12-audit-hotpaths.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
