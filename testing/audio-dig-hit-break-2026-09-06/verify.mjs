import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CORE_ACTION_AUDIO as C } from "../../values/coreActionAudio.js";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { TILE_TYPES } from "../../values/tileTypes.js";
const catalog=JSON.parse(readFileSync(new URL("catalog.json",import.meta.url)));
const current=JSON.parse(readFileSync(new URL("../audio-runtime-reaudit-2026-09-04/catalog.json",import.meta.url)));
const original=JSON.parse(readFileSync(new URL("../audio-design-cleanup-2026-09-05/review-export-original.json",import.meta.url)));
const checks=[],check=(label,fn)=>{fn();checks.push(label);};
check("Every current core hit/break source and fallback is present exactly once",()=>{
 const expected=[...C.banks.mineEarth,...C.banks.mineStone,...C.banks.mineMetal,...C.banks.crystalBreak,
 "digOne","digTwo","libDirtSwingA","libDirtBreak","libStoneBreak","libToolContact","starDestruction","dig-star-0"];
 assert.deepEqual(catalog.sources.map(s=>s.assetId).sort(),expected.sort());
 assert.equal(new Set(catalog.sources.map(s=>s.path)).size,expected.length);
});
check("All recorded routing cases resolve; cooldown and no-target input stay silent",()=>{
 for(const route of catalog.routes){
  if(["cooldown","no-target"].includes(route.stage))assert.equal(route.events.length,0);
  else assert.ok(route.events.length>0,route.id);
 }
 const blocked=catalog.routes.find(r=>r.id==="blocked");assert.equal(blocked.events.length,1);assert.equal(blocked.events[0].key,"approved-review-libToolContact");
});
check("Cave material audio matches corresponding main-world gain, rate and source choices",()=>{
 for(const cave of catalog.routes.filter(r=>r.mode==="cave")){
  const main=catalog.routes.find(r=>r.id===`${cave.tileName}-${cave.stage}-primary`);
  const comparable=rows=>rows.map(e=>[e.key,e.gain,e.rate]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.deepEqual(comparable(cave.events),comparable(main.events));
 }
});
check("All review IDs, original audio hashes and supplied rejected-source exclusions are preserved",()=>{
 for(const source of catalog.sources){
  assert.ok(current.items.some(item=>item.id===source.id&&item.path===source.path));
  assert.equal(original.decisions[source.id]==="reject",false);
  assert.equal(createHash("sha256").update(readFileSync(source.path)).digest("hex"),source.sha256);
  assert.ok(Number.isFinite(source.measurement.attackMs));
  assert.ok(source.measurement.routes.every(r=>r.rate>0&&Number.isFinite(r.estimatedPeakDb)));
 }
});
const cold=[];
for(const [name,type] of [["DIRT",TILE_TYPES.DIRT],["STONE",TILE_TYPES.STONE],["COPPER",TILE_TYPES.COPPER]]){
 const f=createFreesoundFixture({loaded:false});f.system.playDig({tileType:type});
 const immediate=f.played.map(e=>e.key);f.finishLoads();const afterLoad=f.played.length;f.tick(2000);f.system.playDig({tileType:type});
 cold.push({tile:name,immediate,afterLoad,nextContact:f.played.slice(afterLoad).map(e=>e.key)});f.system.destroy();
}
check("Loading missing material audio never causes a late queued hit",()=>{for(const row of cold){assert.equal(row.afterLoad,row.immediate.length);assert.equal(row.nextContact.length,1);}});
const report={passed:true,sourceCount:catalog.sourceCount,routeCount:catalog.routeCount,checks,cold,manualPlaythrough:false,browserPlaybackVerified:false,listeningApproved:false};
writeFileSync(new URL("verification.json",import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
