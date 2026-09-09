import { SIGNAL_DOG_CLIPS } from "../values/signalDogAudio.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { SignalVoicePlayer } from "../sound/SignalVoicePlayer.js";
import { VoiceLineManager } from "../sound/VoiceLineManager.js";
import { planSignalEvent } from "../world/playScene/SignalEventPlanner.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { RandomEventDirector } from "../systems/events/RandomEventDirector.js";
import { createSignalPayload, quoteSignalGift, selectSignalLine } from "../systems/events/signalEventRules.js";
import { SignalEventOutcome } from "../world/playScene/SignalEventOutcome.js";
import { getSignalCampCells, clearSignalMinicamp } from "../world/playScene/SignalMinicamp.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { SIGNAL_EVENT as cfg } from "../values/signalEvent.js";
import { SIGNAL_SURVIVORS } from "../values/signalSurvivors.js";
import { SIGNAL_VOICE_CLIPS } from "../values/signalVoiceManifest.generated.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const checks = [];
function check(name, fn) { fn(); checks.push(name); }
check("Most signals are empty; attack risk is 50 percent", () => {
  let real = 0, fatal = 0;
  for (let seed = 0; seed < 10000; seed++) {
    const s = createSignalPayload(seed, 1, {tx:10,ty:80}).signal;
    real += s.real; fatal += s.fatal;
  }
  assert.ok(real > 3300 && real < 3700); assert.ok(fatal > 4800 && fatal < 5200);
});
check("Reload preserves source, survivor, calls and committed attack fate", () => {
  const director = new RandomEventDirector(42, {master:true});
  const active = director.start("signal", createSignalPayload(42, 1, {tx:10,ty:80}, {kind:"survivor",outcome:"loss"}));
  active.signal.callInMs = 12345; active.signal.pendingDeath = true;
  const saved = JSON.parse(JSON.stringify(director.getSaveData()));
  const restored = new RandomEventDirector(42, {master:true}); restored.loadSaveData(saved);
  assert.deepEqual(restored.getSaveData(), saved);
  saved.active.signal = null; restored.loadSaveData(saved);
  assert.equal(restored.state.active, null);
});
check("Captions cover every authored line with real, measured audio", () => {
  assert.equal(Object.keys(SIGNAL_VOICE_CLIPS).length, 30);
  for (const s of SIGNAL_SURVIVORS.filter(s => s.kind !== "dog")) for (const [kind,text] of Object.entries(s.lines)) {
    const clip = SIGNAL_VOICE_CLIPS[s.id + "-" + kind];
    assert.equal(clip.text, text); assert.ok(clip.durationMs > 500 && clip.durationMs < 8000); assert.ok(clip.bytes > 1000);
  }
  assert.equal(selectSignalLine(20, 0), "farA");
  assert.equal(selectSignalLine(20, 1), "farB");
  assert.equal(selectSignalLine(7, 0), "middle");
  assert.equal(selectSignalLine(2, 0), "near");
});
for (const clip of Object.values(SIGNAL_VOICE_CLIPS)) assert.equal((await fs.stat(new URL("../" + clip.path, import.meta.url))).size, clip.bytes);
check("Exact donations reject invalid, empty and unaffordable input", () => {
  const owned = {dirt:100,stone:50,copper:10};
  const quote = quoteSignalGift(owned, {dirt:17,copper:3});
  assert.deepEqual(quote.resources, {dirt:83,stone:50,copper:7}); assert.equal(quote.count,20);
  assert.equal(owned.dirt,100);
  for (const invalid of [{}, {dirt:101}, {dirt:-1}, {dirt:1.5}, {dirt:NaN}, {dirt:"2"}, {unknown:1}]) {
    assert.throws(() => quoteSignalGift(owned, invalid));
  }
});
check("Minicamps have zero interior tiles and retain solid floors and special blocks", () => {
  const map = new Map(), key = (x,y) => x + "," + y;
  const world = { inBounds: (x,y) => x >= 0 && x < 40 && y >= 0 && y < 100,
    getType: (x,y) => map.get(key(x,y)) ?? TILE_TYPES.DIRT,
    isSolid(x,y) { return this.getType(x,y) !== TILE_TYPES.AIR; },
    applyDugTileKeys(keys) { return keys.map(k => {map.set(k,TILE_TYPES.AIR); const [tx,ty]=k.split(",").map(Number);return {tx,ty};}); } };
  const scene = {worldModel:world,worldRenderer:{applyTileUpdates:()=>{}},queueDugTilesSave:()=>{}};
  const a = {tx:20,ty:70};
  assert.equal(getSignalCampCells(scene,a).length,28);
  map.set(key(19,69),TILE_TYPES.ABILITY_BLOCK);
  assert.equal(clearSignalMinicamp(scene,a),false);
  assert.equal(world.getType(19,69),TILE_TYPES.ABILITY_BLOCK);
  map.delete(key(19,69));
  assert.equal(clearSignalMinicamp(scene,a),true);
  assert.equal(getSignalCampCells(scene,a).filter(p=>world.isSolid(p.tx,p.ty)).length,0);
  for(let x=17;x<=23;x++) assert.equal(world.isSolid(x,71),true);
});
function fixture(outcome = "win", mode = "casual") {
  const director = new RandomEventDirector(12,{master:true});
  const active = director.start("signal",createSignalPayload(12,1,{tx:10,ty:80},{kind:"survivor",outcome,survivorId:"ivo"}));
  active.signal.discovered = true;
  let resources={dirt:100,stone:50,copper:10}, stars=7, gp=80, position={bodyX:300,bodyY:600};
  const hardcore = new HardcoreModeSystem({mode,armed:false});
  const scene = {
    upgradeSystem: new UpgradeSystem(),
    config:{playerSpawnTileX:4,playerSpawnTileY:64},
    digSystem:{getResourceTotals:()=>({...resources}),setResourceTotals:v=>{resources={...v};}},
    celestialTalentProgressionSystem:{getSaveData:()=>({stars}),loadSaveData:v=>{stars=v.stars;},grantStars:v=>{stars+=v;return v;}},
    playerController:{getGemPowerExact:()=>gp,getGemPowerMax:()=>100,setGemPowerExact:v=>{gp=v;},
      getPersistenceData:()=>({...position,gemPower:gp}),restorePersistenceData:v=>{position={bodyX:v.bodyX,bodyY:v.bodyY};gp=v.gemPower;},
      teleportToTile:(tx,ty)=>{position={bodyX:tx,bodyY:ty};return true;}},
    _hardcoreRuntime:{system:hardcore},queueDugTilesSave:()=>{},
    gameSaveCoordinator:{transaction:async ({mutate})=>({success:true,value:await mutate()})},
  };
  return {scene,director,active,handler:new SignalEventOutcome(scene,director),snapshot:()=>({resources,stars,gp,position,hardcore:hardcore.getSaveData()})};
}
{
  const f=fixture(); await f.handler.choose(f.active.id,"give",{dirt:13,copper:3});
  assert.deepEqual(f.snapshot().resources,{dirt:87,stone:50,copper:7});
  assert.equal(f.director.state.signalHistory[0].count,16);
  await assert.rejects(f.handler.choose(f.active.id,"give",{dirt:13}));
  checks.push("Donation commits once and records exactly what was given");
}
{
  const f=fixture(); await f.handler.choose(f.active.id,"attack");
  assert.equal(f.snapshot().stars,7 + cfg.rewardStars); assert.equal(f.director.state.active,null);
  await assert.rejects(f.handler.choose(f.active.id,"attack"));
  checks.push("Attack win awards exactly the configured Starpower once");
}
{
  const f=fixture("loss"); const result=await f.handler.choose(f.active.id,"attack");
  assert.equal(result.fatal,true); assert.ok(Object.values(f.snapshot().resources).every(v=>v===0));
  assert.equal(f.snapshot().gp,0); assert.deepEqual(f.snapshot().position,{bodyX:4,bodyY:64});
  assert.equal(f.snapshot().stars,7);
  checks.push("Casual loss empties all cargo and GP and returns to surface");
}
{
  const f=fixture("loss","hardcore"); await f.handler.choose(f.active.id,"attack");
  assert.equal(f.director.state.active.signal.pendingDeath,true);
  assert.equal(f.snapshot().gp,0); assert.equal(f.snapshot().hardcore.armed,true);
  assert.equal(f.snapshot().hardcore.freeReviveAvailable,false);
  const restored=new RandomEventDirector(12,{master:true});restored.loadSaveData(f.director.getSaveData());
  assert.equal(restored.state.active.signal.pendingDeath,true);
  checks.push("Hardcore loss commits an armed pending death that survives reload");
}
for (const failure of ["false","throw"]) {
  const f=fixture("loss"), before=structuredClone(f.snapshot());
  f.scene.gameSaveCoordinator.transaction=async ({mutate})=>{ if(failure==="throw"){await mutate();throw new Error("disk");}return false; };
  await assert.rejects(f.handler.choose(f.active.id,"attack"));
  assert.deepEqual(f.snapshot(),before);assert.equal(f.director.state.active.id,f.active.id);
  checks.push("Save " + failure + " restores cargo, GP, position, currency and encounter");
}

check("Signal voice owns one shared channel and releases it when stopped", () => {
  const soundSystem = {sfxEnabled:false,refreshMixVolumes(){}};
  const scene = {soundSystem, sound:{}, cache:{audio:{exists:()=>false}}};
  const manager = new VoiceLineManager(scene,soundSystem); soundSystem.voiceLineManager=manager;
  const voice = new SignalVoicePlayer(scene);
  manager.pendingVoiceLineKey="native"; assert.equal(voice.canStart(),false);
  manager.pendingVoiceLineKey=null;
  const clip=voice.play(SIGNAL_SURVIVORS[0],"intro");
  assert.equal(clip.text,SIGNAL_SURVIVORS[0].lines.intro);
  assert.equal(manager.isBusy(),true);
  assert.equal(manager.playExactVoiceLine({key:"other",path:"other.mp3"}),null);
  voice.stop(); assert.equal(manager.isBusy(),false); assert.equal(soundSystem.voiceDucked,undefined);
  voice.destroy();
});
check("Surface dev spawns still require a fully underground camp", () => {
  const scene={config:{topAirRows:65},worldModel:{config:{seed:3},
    inBounds:(x,y)=>x>=0&&x<100&&y>=0&&y<200,
    getTileType:()=>TILE_TYPES.DIRT,isSolid:()=>true}};
  const plan=planSignalEvent(scene,{tx:10,ty:64},1,{kind:"survivor"});
  assert.ok(plan); assert.ok(plan.anchors[0].ty-cfg.camp.height+1>=65+cfg.minDepth);
  assert.equal(planSignalEvent(scene,{tx:10,ty:64},1),null);
});

check("Mia cannot be purchased; rescue ownership survives upgrade save restoration", () => {
  const upgrades = new UpgradeSystem(); upgrades.setMoney(50000000000000);
  assert.equal(upgrades.purchaseUpgrade("mia").reason,"requires_signal_rescue");
  assert.equal(upgrades.getUpgradeLevel("mia"),0);
  upgrades.grantUpgrade("mia");
  const restored = new UpgradeSystem(); restored.setUpgradeLevels(JSON.parse(JSON.stringify(upgrades.getUpgradeLevels())));
  assert.equal(restored.getUpgradeLevel("mia"),1);
  assert.equal(restored.purchaseUpgrade("mia").reason,"max_level");
});
check("Rescued Mia is excluded from future Signal camps", () => {
  for (let seed=0; seed<500; seed++) assert.notEqual(createSignalPayload(seed,1,{tx:10,ty:80},{miaRescued:true}).signal.survivorId,"mia");
});
for (const failed of [false,true]) {
  const f=fixture(); f.active.signal.survivorId="mia";
  if(failed) f.scene.gameSaveCoordinator.transaction=async({mutate})=>{await mutate();throw new Error("disk");};
  if(failed) await assert.rejects(f.handler.choose(f.active.id,"rescue"));
  else await f.handler.choose(f.active.id,"rescue");
  assert.equal(f.scene.upgradeSystem.getUpgradeLevel("mia"),failed?0:1);
  assert.equal(Boolean(f.director.state.active),failed);
  if(!failed) {
    const restored = new RandomEventDirector(12,{master:true}); restored.loadSaveData(f.director.getSaveData());
    assert.equal(restored.state.signalHistory.at(-1).choice,"rescue");
    await assert.rejects(f.handler.choose(f.active.id,"rescue"));
  }
  checks.push(failed?"Failed rescue rolls back Mia ownership":"Mia rescue grants existing upgrade once and records rescue");
}
const dog = SIGNAL_SURVIVORS.find(s=>s.id==="mia");
for (const [kind,text] of Object.entries(dog.lines)) {
  const clip = SIGNAL_DOG_CLIPS["mia-"+kind]; assert.equal(clip.text,text);
  assert.ok(clip.duration>0 && clip.duration<8); assert.ok(clip.offset>=0);
  assert.ok((await fs.stat(new URL("../"+clip.path,import.meta.url))).size>1000);
}
assert.equal(new Set(Object.values(SIGNAL_DOG_CLIPS).map(c=>c.path)).size,6);
assert.equal(new Set(Array.from({length:4},(_,i)=>selectSignalLine(20,i,dog))).size,4);
checks.push("Mia has 14 captioned segments from six recorded dog sounds");
check("Walking beyond hearing range silences a Signal", () => {
  const voice = new SignalVoicePlayer({soundSystem:{refreshMixVolumes(){}},sound:{}});
  voice.node = {gain:{gain:{value:1}},filter:{frequency:{value:0}},stereo:{pan:{value:0}},normalization:1};
  voice.position(cfg.hearingDistance+1,1); assert.equal(voice.node.gain.gain.value,0);
  voice.position(0,0); assert.ok(voice.node.gain.gain.value>0);
  voice.node=null; voice.destroy();
});
await fs.writeFile(new URL("./signal-event-sandbox/contracts.json",import.meta.url),JSON.stringify({passed:checks.length,checks},null,2)+"\n");
console.log("SIGNAL_CONTRACTS_PASS " + checks.length);

