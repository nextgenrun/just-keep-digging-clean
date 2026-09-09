import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { MerchantMotionPlayback } from '../systems/visual/MerchantMotionPlayback.js';
import { MerchantShopEntrance } from '../systems/visual/MerchantShopEntrance.js';
import { chooseMerchantActivity, sampleMerchantActivityBlend } from '../systems/visual/merchantActivityMotion.js';
import { MERCHANT_ACTIVITY_MOTION as A } from '../values/merchantActivityMotion.js';
import { MERCHANT_SHOP_AUDIO as AUDIO } from '../values/merchantShopAudio.js';
import { NPC_ACTIVITY_CONFIG as NPC } from '../values/npcActivityConfig.js';
import { SoundSystem } from '../sound/SoundSystem.js';
import { ShopOverlay } from '../ui/overlays/ShopOverlay.js';

const advance = (clock, ms) => { for (let left=ms; left>0; left-=10) clock.advance(Math.min(left,10)); };
for (const [id, config] of Object.entries(NPC.merchants)) {
  for (const activity of NPC.activityIds) {
    const clock=new MerchantMotionPlayback();
    const duration=config.durationsMs[activity];
    clock.startGesture(activity,duration);
    assert.equal(clock.activityBlend,0);
    advance(clock,A.fadeInDelayMs+A.fadeInMs);
    assert.equal(clock.activityBlend,1,id+' '+activity+' reaches the approved painting');
    advance(clock,duration-clock.actionElapsedMs-A.calmTailMs);
    assert.equal(clock.activityBlend,0,'Every painting reaches calm idle before the next activity');
    advance(clock,A.calmTailMs);
    assert.equal(clock.activity.id,null);
    assert.equal(sampleMerchantActivityBlend(-1,duration),0);
  }
  assert.ok(NPC.activityIds.includes(A.shopActivities[id]));
}
for (const elapsed of [0,260,330,600,4000]) {
  const clock=new MerchantMotionPlayback();clock.startGesture('work',6200);advance(clock,elapsed);
  const before=clock.activityBlend;clock.settle();
  assert.equal(clock.activityBlend,before,'Cancellation preserves the visible blend');
  advance(clock,10);assert.ok(clock.activityBlend<=before,'Cancellation cannot flash a new pose');
  advance(clock,A.settleMs);assert.equal(clock.activity.id,null);
}
const service=new MerchantMotionPlayback();service.startGesture('inspect',6000);advance(service,330);
const visible=service.activityBlend;
assert.equal(service.startShopIntro('showcase',6500),true);
assert.equal(service.activity.id,'inspect','An existing pose is retained through acknowledgement');
assert.equal(service.activityBlend,visible);
advance(service,250);assert.equal(service.activityBlend,1);
advance(service,500);assert.equal(service.activity.shopTime,A.shopIntroMs/1000);
const reduced=new MerchantMotionPlayback(true);assert.equal(reduced.startShopIntro('player',5600),false);
reduced.startGesture('work',6200);advance(reduced,1000);assert.equal(reduced.activity.id,null);
for (const last of NPC.ambientActivityIds) for (const random of [0,.3,.7,.999999]) {
  assert.notEqual(chooseMerchantActivity(NPC.ambientActivityIds,NPC.schedule.weights,last,()=>random),last);
}
assert.equal(chooseMerchantActivity(['only'],{only:1},'only',()=>.5),'only');

function fixture({animated=true,opens=true,sound=true}={}) {
  const calls=[];const cue={key:AUDIO.key};
  const npc={merchantId:'boboMerchant',tx:4,ty:2};
  const scene={gameState:'playing',events:new EventEmitter(),playerController:{state:{getPlayerTile:()=>({tx:4,ty:2})}},
    hasEscapeClosableUi:()=>false,
    shopOverlay:{isVisible:false,isOperational:()=>true,show:(id,options)=>{calls.push(['open',id,options]);scene.shopOverlay.isVisible=opens;return opens;}},
    soundSystem:{playMerchantWelcome:()=>{calls.push(['cue']);return sound?cue:null;},stopTrackedSfx:s=>calls.push(['stop',s]),playNPCVoiceLine:id=>calls.push(['voice',id])}};
  const manager={scene,activityTimeMs:0,_isMerchantAvailable:()=>true,activitySystem:{beginShopIntro:id=>{calls.push(['gesture',id]);return animated;},settleMerchant:id=>calls.push(['settle',id])}};
  const entrance=new MerchantShopEntrance(manager);
  return {scene,manager,npc,calls,entrance};
}
const tick=(entrance,ms)=>{for(let left=ms;left>0;left-=10)entrance.update(Math.min(10,left));};
const count=(f,type)=>f.calls.filter(c=>c[0]===type).length;
const f=fixture();assert.equal(f.entrance.request(f.npc),true);
for(let i=0;i<20;i++)assert.equal(f.entrance.request(f.npc),true);
assert.equal(count(f,'gesture'),1);tick(f.entrance,A.shopCueAtMs-10);assert.equal(count(f,'open'),0);assert.equal(count(f,'cue'),0);
tick(f.entrance,10);assert.equal(count(f,'cue'),1);assert.equal(count(f,'open'),0);
tick(f.entrance,A.shopIntroMs-A.shopCueAtMs);assert.equal(count(f,'open'),1);assert.equal(count(f,'voice'),1);
assert.equal(f.calls.find(c=>c[0]==='open')[2].playOpenSound,false);
tick(f.entrance,2000);assert.equal(count(f,'open'),1);assert.equal(count(f,'cue'),1);
assert.equal(f.entrance.lastOpening.elapsedMs,A.shopIntroMs);f.entrance.destroy();assert.equal(f.scene.events.listenerCount('preupdate'),0);
for(const cancel of [f=>f.scene.gameState='paused',f=>f.scene.hasEscapeClosableUi=()=>true,f=>f.scene.playerController.state.getPlayerTile=()=>({tx:40,ty:2}),f=>f.manager._isMerchantAvailable=()=>false]) {
  const f=fixture();f.entrance.request(f.npc);tick(f.entrance,A.shopCueAtMs);cancel(f);f.scene.events.emit('preupdate');
  assert.equal(f.entrance.pending,null);assert.equal(count(f,'stop'),1);tick(f.entrance,3000);assert.equal(count(f,'open'),0);f.entrance.destroy();
}
const destroyed=fixture();destroyed.entrance.request(destroyed.npc);destroyed.entrance.destroy();tick(destroyed.entrance,3000);assert.equal(count(destroyed,'open'),0);
const slow=fixture();slow.entrance.request(slow.npc);slow.entrance.update(5000);assert.equal(slow.entrance.pending.elapsedMs,NPC.performance.maxDeltaMs);assert.equal(count(slow,'open'),0);slow.entrance.destroy();
const fallback=fixture({animated:false});assert.equal(fallback.entrance.request(fallback.npc),true);assert.equal(count(fallback,'open'),1);assert.equal(count(fallback,'cue'),0);fallback.entrance.destroy();
const missing=fixture({sound:false});missing.entrance.request(missing.npc);tick(missing.entrance,A.shopIntroMs);assert.equal(missing.calls.find(c=>c[0]==='open')[2].playOpenSound,true);missing.entrance.destroy();
const failed=fixture({opens:false});failed.entrance.request(failed.npc);tick(failed.entrance,A.shopIntroMs);assert.equal(count(failed,'voice'),0);assert.equal(count(failed,'stop'),1);failed.entrance.destroy();

let audioNow=0;const audioCalls=[];
const audio=Object.create(SoundSystem.prototype);
Object.assign(audio,{lastMerchantWelcomeTime:-Infinity,sfxEnabled:true,audioInitialized:true,config:{uiVolume:.6},scene:{cache:{audio:{exists:()=>true}}},freesoundAudio:{now:()=>audioNow},playSfx:(...args)=>{audioCalls.push(args);return {key:args[0]};}});
assert.ok(audio.playMerchantWelcome());assert.equal(audioCalls[0][0],AUDIO.key);assert.equal(audioCalls[0][1],AUDIO.gain*.6);assert.equal(audio.playMerchantWelcome(),null);
audioNow=AUDIO.cooldownMs;audio.sfxEnabled=false;assert.equal(audio.playMerchantWelcome(),null);audio.sfxEnabled=true;audio.audioInitialized=false;assert.equal(audio.playMerchantWelcome(),null);audio.audioInitialized=true;
assert.ok(audio.playMerchantWelcome());audioNow+=AUDIO.cooldownMs;audio.scene.cache.audio.exists=()=>false;assert.equal(audio.playMerchantWelcome(),null);assert.equal(audioCalls.length,2);
const reveal=Object.create(ShopOverlay.prototype);let menus=0;
Object.assign(reveal,{isOperational:()=>true,scene:{setShopOpen:()=>{}},_syncMerchantChrome:()=>{},populateUpgrades:()=>{},shell:{show:()=>{}},_layoutChrome:()=>{},soundSystem:{playMenuOpen:()=>menus++}});
assert.equal(reveal.show('boboMerchant',{playOpenSound:false}),true);assert.equal(menus,0);
assert.equal(reveal.show('boboMerchant'),true);assert.equal(menus,1,'Other shop callers retain their existing sound');
console.log('MERCHANT_PERSONALITY_ENTRANCE_OK: 42 activities, smooth interruption, varied habits, 680 ms reveal, one 430 ms cue, cancellation, fallback, volume/mute, cleanup');
