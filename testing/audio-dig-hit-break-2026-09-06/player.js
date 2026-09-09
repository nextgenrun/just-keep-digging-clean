import { APPROVED_SFX_FAMILIES } from "../../values/audioConfig.js";
import { SoundSystem } from "../../sound/SoundSystem.js";
import { DIG_AUDIO_REVIEW as C } from "../../values/audioDigHitBreakReview.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
export async function createAuditPlayer(catalog, report) {
 const methods = {}; setupGameplayMethods(methods);
 let scene, system, events = [], generation = 0;
 const game = await new Promise(resolve => {
  const instance = new Phaser.Game({ type: Phaser.CANVAS, width: 1, height: 1, parent: "engine", banner: false,
   audio: { disableWebAudio: false }, scene: {
    preload() { for (const source of catalog.sources) this.load.audio(source.key, "/" + source.path); },
    create() {
     scene = this; system = new SoundSystem(scene); system.musicEnabled = false; system.audioInitialized = true;
     scene.soundSystem = system; scene.sound.volume = system.masterVolume;
     for (const [family, key] of [["starDig","dig-star-0"],["starDestruction","sfx-star-destruction-0"]]) {
      const source = catalog.sources.find(s => s.key === key);
      if (source) system.soundLibraryManager.libraries[family] = [{key, path:source.path, volumeMultiplier:1}];
     }
     system.soundLibraryManager.libraries.starDestruction = [...APPROVED_SFX_FAMILIES.starDestruction];
     resolve(instance);
    }
   } });
 });
 const originalPlay = system.playSfx.bind(system);
 system.playSfx = (key,gain,options) => {
  const sound = originalPlay(key,gain,options);
  if (sound) report({type:"sound",key,bufferMs:sound.audioBuffer.duration*1000,rate:sound.currentConfig.rate,gain:sound.currentConfig.volume*system.masterVolume});
  return sound;
 };
 function stop() { generation++; for (const event of events) event.remove(); events=[]; system._suspendAudio(); }
 async function ready() { await scene.sound.context.resume(); if (scene.sound.context.state !== "running") throw new Error("Audio is not running"); }
 function direct(source, event, original = false) {
  return system.playSfx(source.key,event.gain,{...event.options,window:original ? undefined : event.options.window});
 }
 const later = (delay, fn) => { events.push(scene.time.delayedCall(delay,fn)); };
 const api = {
  stop,
  async play(source,event,{original=false,repeat=false}={}) {
   stop(); await ready();
   if (!repeat) return direct(source,event,original);
   for (let n=0;n<C.repeatCount;n++) later(n*C.repeatGapMs,()=>direct(source,event,original));
   return null;
  },
  async sequence(tileName, fallback) {
   stop(); await ready(); system.freesoundAudio.enabled = !fallback;
   const token = generation;
   for(let n=0;n<C.repeatCount;n++) {
    later(n*C.repeatGapMs,()=>system.playDigSwing());
    later(n*C.repeatGapMs+C.contactDelayMs,()=> {
     if(token!==generation) return;
     methods.playMineFeedbackAudio.call({soundSystem:system},{success:true,destroyed:n===C.repeatCount-1},TILE_TYPES[tileName]);
    });
   }
  },
  async check() {
   stop(); await ready(); const token=generation, checks=[];
   for(const source of catalog.sources) {
    if(token!==generation) throw new Error("Check stopped");
    const route=catalog.routes.find(r=>r.events.some(e=>e.sourceId===source.id));
    const event=route.events.find(e=>e.sourceId===source.id);
    const cached=scene.cache.audio.get(source.key), start=performance.now();
    const sound=direct(source,event), buffer=sound?.source?.buffer, native=sound?.source, volume=sound?.volumeNode;
    if(!buffer) throw new Error("Native playback missing: "+source.assetId);
    const expected=(event.options.window?.duration || cached.duration)/event.rate;
    const completion=new Promise((resolve,reject)=>{
     const deadline=setTimeout(()=>reject(new Error("Completion missing: "+source.assetId)),expected*1000+2000);
     sound.once("complete",()=>{clearTimeout(deadline);resolve(performance.now()-start);});
    });
    const elapsed=await completion;
    if(Math.abs(native.playbackRate.value-event.rate)>0.001) throw new Error("Rate mismatch: "+source.assetId);
    if(Math.abs(volume.gain.value*system.masterVolume-event.outputGain)>0.001) throw new Error("Gain mismatch: "+source.assetId);
    if(Math.abs(buffer.duration/event.rate-expected)>0.001 || elapsed>expected*1000+250) throw new Error("Duration mismatch: "+source.assetId);
    if(scene.cache.audio.get(source.key)!==cached || system.activeSfxMixer.active.size) throw new Error("Source or voice leak");
    checks.push({id:source.assetId,rate:event.rate,gain:event.outputGain,bufferMs:buffer.duration*1000,completedMs:Math.round(elapsed),sourcePreserved:true});
    report({type:"check",done:checks.length,total:catalog.sources.length});
   }
   return {passed:true,backend:"Phaser WebAudio",checks,manualPlaythrough:false,listeningApproved:false};
  },
  destroy(){stop();system.destroy();game.destroy(true);}
 };
 document.addEventListener("visibilitychange",()=>{if(document.hidden) stop();});
 window.addEventListener("pagehide",()=>api.destroy());
 return api;
}
