import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createSignalPayload, sanitizeSignal } from "../systems/events/signalEventRules.js";
import { signalBlastHits, signalHasCover, signalGiftReward, signalGiftRequirement } from "../systems/events/signalRiskRules.js";
import { RandomEventDirector } from "../systems/events/RandomEventDirector.js";
import { SignalEventOutcome } from "../world/playScene/SignalEventOutcome.js";
import { SignalTrapRuntime } from "../world/playScene/SignalTrapRuntime.js";
import { SignalEventBridge } from "../world/playScene/SignalEventBridge.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { CelestialTalentProgressionSystem } from "../systems/progression/CelestialTalentProgressionSystem.js";
import { SIGNAL_TRAP as cfg, SIGNAL_REWARDS } from "../values/signalRisk.js";

const checks = [];
const test = async (name, fn) => { await fn(); checks.push(name); };
await test("100,000 worlds: fixed 10% trap / 35% occupied / 65% empty, invariant across depth", () => {
  let traps = 0, occupied = 0;
  for (let seed = 0; seed < 100000; seed++) {
    const s = createSignalPayload(seed, 1, {tx:20,ty:90}).signal;
    traps += s.explosive; occupied += s.real;
    for (const depth of [1000,1500,6000]) assert.equal(
      createSignalPayload(seed,1,{tx:50,ty:depth+70}).signal.explosive,s.explosive);
    if (s.explosive) { assert.equal(s.survivorId,"bram"); assert.equal(s.real,true); }
  }
  assert.ok(traps > 9700 && traps < 10300);
  assert.ok(occupied > 34200 && occupied < 35800);
});
await test("Cumulative odds reflect encounter count, with no depth pity or reroll", () => {
  let ten = 0, twenty = 0, thirty = 0;
  for (let seed = 0; seed < 10000; seed++) {
    let first = Infinity;
    for (let serial = 1; serial <= 30; serial++) {
      if (createSignalPayload(seed,serial,{tx:20,ty:90}).signal.explosive) { first=serial; break; }
    }
    ten += first <= 10; twenty += first <= 20; thirty += first <= 30;
  }
  for (const [count, found] of [[10,ten],[20,twenty],[30,thirty]])
    assert.ok(Math.abs(found/10000-(1-(1-cfg.chance)**count)) < 0.02);
});
await test("Saved armed fuse and sampled fatal result survive restore; legacy and Mia stay safe", () => {
  const s=createSignalPayload(12,1,{tx:10,ty:80},{kind:"explosive"}).signal;
  s.blastPhase="fuse"; s.fuseRemainingMs=417; s.discovered=true;
  assert.equal(sanitizeSignal(s).fuseRemainingMs,417);
  s.blastPhase="spent"; s.blastFatal=true; s.pendingDeath=true; s.deathSource=cfg.deathSource;
  const restored=sanitizeSignal(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.blastFatal,true); assert.equal(restored.deathSource,cfg.deathSource);
  const legacy=sanitizeSignal({real:true,fatal:false,survivorId:"bram"});
  assert.equal(legacy.explosive,false);
  assert.equal(sanitizeSignal({...s,survivorId:"mia"}).explosive,false);
  assert.equal(createSignalPayload(1,1,{tx:10,ty:80},{kind:"survivor",survivorId:"mia"}).signal.explosive,false);
});
const source={tx:10,ty:80}, open={isSolid:()=>false};
await test("Blast is lethal close; walking to the room edge or solid cover stops it", () => {
  assert.equal(signalBlastHits(open,source,source),true);
  assert.equal(signalBlastHits(open,source,{tx:12,ty:80}),true);
  assert.equal(signalBlastHits(open,source,{tx:13,ty:80}),false);
  const wall={isSolid:(x,y)=>x===11&&y===80};
  assert.equal(signalHasCover(wall,source,{tx:12,ty:80}),true);
  assert.equal(signalBlastHits(wall,source,{tx:12,ty:80}),false);
  assert.equal(signalHasCover(wall,source,{tx:11,ty:81}),true);
  assert.equal(signalHasCover(open,source,source),false);
});
function fixture({fatal=true,mode="casual",trap=true}={}) {
  const director=new RandomEventDirector(52,{master:true});
  const active=director.start("signal",{...createSignalPayload(52,1,source,{kind:trap?"explosive":"survivor",survivorId:"ivo",outcome:"win"}),startedDepth:1000});
  active.signal.discovered=true;
  if(trap){active.signal.blastPhase="spent";active.signal.blastFatal=fatal;active.signal.fuseRemainingMs=0;}
  let resources={dirt:100,stone:50,copper:200},gp=40,pos={tx:10,ty:80},notifications=[];
  const talents=new CelestialTalentProgressionSystem();talents.grantStars(7);
  const scene={config:{playerSpawnTileX:4,playerSpawnTileY:64},worldModel:open,
    _hardcoreRuntime:{system:new HardcoreModeSystem({mode,armed:false})},
    digSystem:{getResourceTotals:()=>({...resources}),setResourceTotals:r=>{resources={...r};}},
    playerController:{getGemPowerExact:()=>gp,getGemPowerMax:()=>100,setGemPowerExact:g=>{gp=g;},
      teleportToTile:(tx,ty)=>{pos={tx,ty};},getPersistenceData:()=>({...pos,gp}),
      restorePersistenceData:p=>{pos={tx:p.tx,ty:p.ty};gp=p.gp;}},
    celestialTalentProgressionSystem:talents,queueDugTilesSave(){},
    uiNotifications:{success:msg=>notifications.push(msg),warning:msg=>notifications.push(msg)},
    gameSaveCoordinator:{transaction:async({mutate})=>({success:true,value:await mutate()})}};
  const outcome=new SignalEventOutcome(scene,director);
  return {scene,director,active,outcome,read:()=>({resources,gp,pos,stars:talents.getSaveData().stars,notifications})};
}
await test("Casual explosion instantly clears every resource and GP, teleports, grants no Stars, commits once", async()=>{
  const f=fixture(); const result=await f.outcome.choose(f.active.id,"blast");
  assert.equal(result.fatal,true); assert.equal(f.read().gp,0);assert.equal(f.read().stars,7);
  assert.ok(Object.values(f.read().resources).every(n=>n===0));assert.deepEqual(f.read().pos,{tx:4,ty:64});
  assert.equal(f.director.state.signalHistory[0].choice,"blast");
  await assert.rejects(f.outcome.choose(f.active.id,"blast"));
});
await test("Hardcore explosion arms permanent death and restores its distinct cause", async()=>{
  const f=fixture({mode:"hardcore"});const result=await f.outcome.choose(f.active.id,"blast");
  assert.equal(result.fatal,true);assert.equal(typeof result.afterClose,"function");
  assert.equal(f.active.signal.pendingDeath,true);assert.equal(f.read().gp,0);
  assert.equal(f.scene._hardcoreRuntime.system.state.armed,true);
  const restored=new RandomEventDirector();restored.loadSaveData(f.director.getSaveData());
  assert.equal(restored.state.active.signal.deathSource,cfg.deathSource);
  assert.equal(restored.state.active.signal.blastPhase,"spent");
});
await test("Escaped trap rewards 750 once without changing cargo, position or GP",async()=>{
  const f=fixture({fatal:false}),before=structuredClone(f.read());
  const result=await f.outcome.choose(f.active.id,"blast");
  assert.equal(result.stars,cfg.rewardStars);assert.equal(result.fatal,false);
  assert.equal(f.read().stars,before.stars+750);
  assert.deepEqual(f.read().resources,before.resources);assert.equal(f.read().gp,before.gp);
  await assert.rejects(f.outcome.choose(f.active.id,"blast"));
});
await test("An armed or sleeping trap cannot enter choices or collect a free reward",async()=>{
  const f=fixture();
  await assert.rejects(f.outcome.choose(f.active.id,"give",{dirt:1}));
  await assert.rejects(f.outcome.choose(f.active.id,"attack"));
  f.active.signal.blastPhase="fuse";await assert.rejects(f.outcome.choose(f.active.id,"blast"));
});
await test("Blast save failure rolls back damage and reward but retains the sampled lethal fate",async()=>{
  for(const fatal of [true,false]) {
    const f=fixture({fatal}),before=structuredClone(f.read());
    f.scene.gameSaveCoordinator.transaction=async({mutate})=>{await mutate();throw Error("disk");};
    await assert.rejects(f.outcome.choose(f.active.id,"blast"));
    assert.deepEqual(f.read(),before);
    assert.equal(f.director.state.active.signal.blastFatal,fatal);
    assert.equal(f.director.state.active.signal.blastPhase,"spent");
  }
});
await test("Substantial gift respects depth/value/share; small gifts stay free-form",async()=>{
  const f=fixture({trap:false});
  assert.equal(signalGiftRequirement(f.read().resources,1000),2000);
  assert.equal(signalGiftReward(f.read().resources,{dirt:1},1000).generous,false);
  const result=await f.outcome.choose(f.active.id,"give",{copper:134});
  assert.equal(result.generous,true);assert.equal(result.stars,2000);
  assert.equal(f.read().stars,2007);assert.equal(f.read().gp,100);assert.equal(f.read().resources.copper,66);
  await assert.rejects(f.outcome.choose(f.active.id,"give",{copper:1}));
  assert.equal(signalGiftRequirement({gold:1000},18),125000);
});
await test("Small gift grants 250; failed generous gift restores resources, Stars and GP",async()=>{
  const small=fixture({trap:false});const reward=await small.outcome.choose(small.active.id,"give",{dirt:1});
  assert.equal(reward.stars,SIGNAL_REWARDS.giftStars);assert.equal(small.read().gp,40);
  const f=fixture({trap:false}),before=structuredClone(f.read());
  f.scene.gameSaveCoordinator.transaction=async({mutate})=>{await mutate();throw Error("disk");};
  await assert.rejects(f.outcome.choose(f.active.id,"give",{copper:134}));assert.deepEqual(f.read(),before);
});
await test("Trap counts visible fuse time, supports retreat, and samples only once",async()=>{
  const f=fixture();f.active.signal.blastPhase="dormant";f.active.signal.fuseRemainingMs=cfg.fuseMs;
  let bursts=0,clears=0;
  const sprite={setTint(){}},view={sprite,setPose(){},cue(){},update(){},prompt:{setVisible(){}},
    clearSurvivor(){this.sprite=null;},clear(){clears++;}};
  const bridge={scene:f.scene,outcome:f.outcome,view,voice:{stop(){}},cueRemaining:0};
  const runtime=new SignalTrapRuntime(bridge);runtime.id=f.active.id;
  runtime.view={ready:true,fuse(){},detonate(){bursts++;}};
  runtime.update(f.active,{tx:9,ty:80},1,500,0);
  assert.equal(f.active.signal.blastPhase,"fuse");assert.equal(f.active.signal.fuseRemainingMs,cfg.fuseMs);
  runtime.update(f.active,{tx:7,ty:80},3,cfg.fuseMs,2000);
  runtime.update(f.active,{tx:10,ty:80},0,20,2020);
  await new Promise(r=>setImmediate(r));
  assert.equal(bursts,1);assert.equal(f.read().stars,757);assert.equal(clears,1);
  assert.equal(f.director.state.active,null);
});
await test("Pause suspends the fuse; ordinary event expiry cannot erase an armed trap",()=>{
  const f=fixture();f.active.signal.blastPhase="fuse";f.active.signal.fuseRemainingMs=700;
  const bridge=Object.create(SignalEventBridge.prototype);
  Object.assign(bridge,{scene:f.scene,director:f.director,cinema:{isVisible:false},
    start(){},suspend(){},trap:{reset(){throw Error("must not expire");}}});
  bridge.update(1000,500,source,true);
  assert.equal(f.active.signal.fuseRemainingMs,700);
  assert.equal(bridge.finish(),false);assert.equal(f.director.state.active.id,f.active.id);
});
await test("Currency-cap feedback reports only the actual Stars granted",async()=>{
  const f=fixture({fatal:false});
  f.scene.celestialTalentProgressionSystem.grantStars(9999990);
  const result=await f.outcome.choose(f.active.id,"blast");
  assert.equal(result.stars,2);
  assert.equal(f.read().stars,9999999);
  assert.match(result.message,/\+2 STARPOWER/);
});
const report={passed:checks.length,checks,probability:{perSignal:cfg.chance,
  ten:1-(1-cfg.chance)**10,twenty:1-(1-cfg.chance)**20,thirty:1-(1-cfg.chance)**30}};
await fs.writeFile(new URL("./signal-event-sandbox/risk-contracts.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log("SIGNAL_RISK_CONTRACTS_PASS",checks.length);
