import { AmbientOpportunity } from "./ambient-opportunity.js";
/** Plays existing recordings through one protected review voice channel. */
export function createMixPreview(data, qa) {
  const $=id=>document.getElementById(id), config=data.policy.music, preview=data.preview;
  const clock=new AmbientOpportunity(data.policy.random,()=>0.5);
  let context, music, voice, duck, preference, voiceGain, owner=null, pendingNpc=null;
  let token=0, releaseTimer=null, handoffTimer=null, leadTimer=null, loadCancel=null, leadResolve=null;
  let musicEnabled=false, lastSpeechAt=-Infinity, lastPlayerAt=-Infinity;
  function log(message) {
    const li=document.createElement("li");li.textContent=message;$("mix-log").prepend(li);
    while($("mix-log").children.length>12)$("mix-log").lastChild.remove();
  }
  function status(message) { $("mix-status").textContent=message; }
  async function ensure() {
    if (!context) {
      context=new AudioContext();
      music=document.createElement("audio");music.loop=true;music.preload="none";music.src=preview.music;music.muted=qa;
      music.setAttribute("aria-label","Preview music");
      voice=document.createElement("audio");voice.preload="none";voice.muted=qa;voice.setAttribute("aria-label","Preview voice");
      $("audio-host").append(music,voice);
      duck=context.createGain();duck.gain.value=1;
      preference=context.createGain();preference.gain.value=Number($("music-level").value)/100;
      voiceGain=context.createGain();voiceGain.gain.value=preview.speechVolume;
      context.createMediaElementSource(music).connect(preference).connect(duck).connect(context.destination);
      context.createMediaElementSource(voice).connect(voiceGain).connect(context.destination);
      voice.addEventListener("ended",()=>finish("Finished"));
      voice.addEventListener("error",()=>{if(owner)finish("Voice could not load");});
    }
    if(context.state==="suspended")await context.resume();
  }
  function ease(target,constantMs) {
    if(!duck)return;
    const now=context.currentTime, current=duck.gain.value;
    duck.gain.cancelScheduledValues(now);duck.gain.setValueAtTime(current,now);
    duck.gain.setTargetAtTime(target,now,constantMs/1000);
  }
  function restoreMusic() {
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(()=>ease(1,config.releaseTimeConstantMs),config.holdMs);
  }
  function finish(message) {
    const previous=owner;if(!previous)return;
    owner=null;lastSpeechAt=performance.now();
    if(previous.kind!=="npc")lastPlayerAt=lastSpeechAt;
    status(message+" · "+previous.label);log(message+" · "+previous.label);
    if(pendingNpc && pendingNpc.expires>performance.now()){
      const next=pendingNpc;pendingNpc=null;
      handoffTimer=setTimeout(()=>{handoffTimer=null;request("npc",next.url,next.label,next.expires);},data.policy.speech.interlineMs);
    } else { pendingNpc=null;restoreMusic(); }
  }
  function ready(url,deadline) {
    return new Promise((resolve,reject)=>{
      let timer;
      const cleanup=()=>{clearTimeout(timer);voice.removeEventListener("canplay",ok);voice.removeEventListener("error",bad);loadCancel=null;};
      const ok=()=>{cleanup();resolve();};
      const bad=()=>{cleanup();reject(Error("audio unavailable"));};
      loadCancel=()=>{cleanup();reject(Error("cancelled"));};
      voice.addEventListener("canplay",ok,{once:true});voice.addEventListener("error",bad,{once:true});
      timer=setTimeout(bad,Math.min(preview.loadTimeoutMs,Math.max(0,deadline-performance.now())));
      voice.src=url;voice.load();
    });
  }
  async function request(kind,url,label,deadline=Infinity) {
    if(owner || handoffTimer){
      if(kind==="npc" && owner && owner.kind!=="npc" && !pendingNpc){
        pendingNpc={url,label,expires:performance.now()+preview.npcQueueTtlMs};
        log("NPC waits for the short active sentence.");return "queued";
      }
      log("Skipped "+label+" — another voice owns the channel.");return "busy";
    }
    if(kind!=="npc" && ($("demo-dialogue").checked || $("demo-danger").checked)){
      log("Skipped "+label+" — dialogue or danger blocks the player.");return "blocked";
    }
    const mine=++token;
    owner={kind,label,token:mine,phase:"loading"};
    clearTimeout(releaseTimer);status("Preparing · "+label);
    try {
      await ensure();
      if(token!==mine)return "cancelled";
      await ready(url,deadline);
      if(token!==mine)return "cancelled";
      if(performance.now()>deadline)throw Error("stale");
      owner.phase="lead-in";ease(config.floorGain,config.attackTimeConstantMs);
      await new Promise(resolve=>{leadResolve=resolve;leadTimer=setTimeout(()=>{leadResolve=null;resolve();},config.leadInMs);});
      leadTimer=null;
      if(token!==mine)return "cancelled";
      if(performance.now()>deadline || (kind!=="npc" && ($("demo-dialogue").checked || $("demo-danger").checked)))throw Error("context changed");
      await voice.play();
      if(token!==mine){voice.pause();return "cancelled";}
      owner.phase="playing";status("Speaking · "+label);log("Started "+kind+" · "+label);
      lastSpeechAt=performance.now();if(kind!=="npc")lastPlayerAt=lastSpeechAt;
      return "started";
    } catch(error) {
      if(token===mine){voice?.pause();finish("Dropped ("+error.message+")");}
      return "dropped";
    }
  }
  async function requestLine(url,label) { return request("event",url,label); }
  async function toggleMusic(){
    try{
      await ensure();musicEnabled=!musicEnabled;
      if(musicEnabled){await music.play();$("music-toggle").textContent="Pause music";status("Music playing. Choose a voice example.");}
      else {music.pause();$("music-toggle").textContent="Start music";}
    }catch{musicEnabled=false;status("Music could not start. Try again.");}
  }
  function stop(){
    token++;loadCancel?.();clearTimeout(leadTimer);leadResolve?.();leadResolve=null;clearTimeout(handoffTimer);clearTimeout(releaseTimer);
    leadTimer=null;handoffTimer=null;pendingNpc=null;owner=null;voice?.pause();music?.pause();musicEnabled=false;
    if(voice)voice.currentTime=0;
    ease(1,config.releaseTimeConstantMs);$("music-toggle").textContent="Start music";status("Preview stopped.");log("Stopped. Speech reservation released.");
  }
  async function tryThought(minutes){
    const paused=$("demo-paused").checked;
    const quietFromReal=performance.now()-lastSpeechAt,playerFromReal=performance.now()-lastPlayerAt;
    const added=paused?0:minutes*60000;
    const result=clock.advance(minutes*60000,{
      paused,gameplay:true,visible:!document.hidden,npcDialogue:$("demo-dialogue").checked,
      speechBusy:Boolean(owner||handoffTimer),danger:$("demo-danger").checked,pendingEvent:owner?.kind==="event",
      quietMs:quietFromReal+added,sincePlayerMs:playerFromReal+added
    });
    if(result==="eligible"){
      const outcome=await request("random",preview.randomReference,"Rare-thought delivery reference");
      if(outcome==="started")clock.markStarted();
    } else log("Rare thought: "+result.replaceAll("-"," ")+".");
    const snap=clock.snapshot();
    $("clock-status").textContent=(snap.activeMs/60000).toFixed(1)+" active minutes · "+snap.result.replaceAll("-"," ")+" · next opportunity in "+(snap.remainingMs/60000).toFixed(1)+" active minutes.";
  }
  $("music-toggle").addEventListener("click",toggleMusic);
  $("demo-leo").addEventListener("click",()=>request("event",preview.leo,"Quake survived: I've had gentler lovers.",performance.now()+preview.eventTtlMs));
  $("demo-npc").addEventListener("click",()=>request("npc",preview.npc,"NPC shopkeeper",performance.now()+preview.npcQueueTtlMs));
  $("demo-npc-event").addEventListener("click",async()=>{
    const started=await request("npc",preview.npc,"NPC shopkeeper",performance.now()+preview.npcQueueTtlMs);
    if(started==="started")await request("event",preview.leo,"New player event",performance.now()+preview.eventTtlMs);
  });
  $("demo-stop").addEventListener("click",stop);
  $("music-level").addEventListener("input",event=>{
    $("music-preference").value=event.target.value+"%";
    if(preference)preference.gain.setTargetAtTime(Number(event.target.value)/100,context.currentTime,config.attackTimeConstantMs/1000);
  });
  $("advance-clock").addEventListener("click",()=>tryThought(preview.clockStepMinutes));
  $("try-random").addEventListener("click",()=>tryThought(0));
  const meterTimer=setInterval(()=>{
    const value=duck?.gain.value??1;$("duck-meter").value=value;$("duck-value").value=Math.round(value*100)+"%";
  },preview.meterIntervalMs);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
  window.addEventListener("pagehide",()=>{stop();clearInterval(meterTimer);context?.close();},{once:true});
  return {requestLine};
}
