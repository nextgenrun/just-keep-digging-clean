import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRuntime } from './audio-review-2026-09-03/runtime-fixture.mjs';
import { ASSET_KEYS } from '../values/assetKeys.js';
import { AUDIO_MASTERING } from '../values/audioMastering.js';
import { MUSIC_SOURCE_MIX } from '../values/musicSourceMix.generated.js';
import { VOICE_SOURCE_MIX } from '../values/voiceSourceMix.generated.js';
import { REVIEWED_AUDIO_ASSETS } from '../values/reviewedAudioAssets.js';
import { REVIEWED_AUDIO_MIX } from '../values/reviewedAudioMix.js';
import { AudioLayerBus } from '../sound/AudioLayerBus.js';
const root = new URL('../',import.meta.url);
const report = JSON.parse(readFileSync(new URL('audio-full-audit-2026-09-07/source-mix.json',import.meta.url),'utf8'));
const checks = [];
async function check(name,run) {try {await run(); checks.push({name,passed:true});} catch(e) {checks.push({name,passed:false,error:e.stack});}}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
await check('Every calibrated source still matches its measured full content hash',()=>{
  assert.equal(report.items.length,Object.keys(MUSIC_SOURCE_MIX).length+Object.keys(VOICE_SOURCE_MIX).length);
  for(const row of report.items) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(row.path,root))).digest('hex'),row.sourceSha256,row.path);
    const mix=row.kind==='music'?MUSIC_SOURCE_MIX[row.path.split('/').pop()]:VOICE_SOURCE_MIX[row.path];
    close(mix.gain,row.gain);
    assert.ok(row.afterTruePeakDbTP<=AUDIO_MASTERING.truePeakCeilingDb+0.001,row.path);
    assert.ok(mix.gain<=10**(AUDIO_MASTERING[row.kind+'MaxBoostDb']/20),row.path);
    if(mix.window) assert.ok(mix.window.duration>0 && mix.window.start>=0,row.path);
  }
});
for(const failure of ['false','throw']) await check('Layer playback '+failure+' destroys its instance and observes retry cooldown',()=>{
  const f=createRuntime(); const bus=new AudioLayerBus(f.system,REVIEWED_AUDIO_MIX.cave);
  let calls=0, created; const add=f.scene.sound.add;
  f.scene.sound.add=(...args)=>{calls++;created=add(...args);created.play=()=>{if(failure==='throw')throw Error('injected layer failure');return false;};return created;};
  const layer={asset:REVIEWED_AUDIO_ASSETS.libUiClick,gain:0.1};
  bus.update([layer]); assert.equal(bus.tracks.size,0); assert.equal(created.pendingDestroy,true);
  bus.update([layer]); assert.equal(calls,1);
  f.tick(REVIEWED_AUDIO_MIX.loadRetryMs+1);bus.update([layer]);assert.equal(calls,2);
  bus.destroy();f.system.destroy();
});
await check('An externally stopped layer releases its sound and can be requested again',async()=>{
  const f=createRuntime(), bus=new AudioLayerBus(f.system,REVIEWED_AUDIO_MIX.cave);
  const layer={asset:REVIEWED_AUDIO_ASSETS.libUiClick,gain:0.1};
  bus.update([layer]); const sound=[...bus.tracks.values()][0].sound;sound.stop();await Promise.resolve();
  assert.equal(sound.pendingDestroy,true);assert.equal(bus.tracks.size,0);
  bus.update([layer]);assert.equal(bus.tracks.size,1);bus.destroy();f.system.destroy();
});
function musicFixture(run) {
  const f=createRuntime(), music=ASSET_KEYS.audio.music, saved={files:music.files,playlist:music.playlist};
  const file=Object.keys(MUSIC_SOURCE_MIX)[0];
  music.files=[file];music.playlist=['audit-music'];f.keys.add('audit-music');
  f.system.musicEnabled=true;f.system.musicDirector.noteTrackStarted=()=>{};
  f.scene.tweens.add=cfg=>{cfg.targets.gain=cfg.gain;cfg.onUpdate?.();cfg.onComplete?.();};
  f.system.musicStreamController.assetManager={noteMusicUse(){},trimMusic(){}};
  try{run(f,MUSIC_SOURCE_MIX[file].gain);} finally {f.system.destroy();Object.assign(music,saved);}
}
await check('Music keeps source calibration through user volume and overlapping fades',()=>musicFixture((f,gain)=>{
  const stream=f.system.musicStreamController;stream._beginTrack(0,null);
  close(f.system.currentTrack.volume,f.system.musicVolume*gain);
  f.system.setMusicVolume(.8);close(f.system.currentTrack.volume,.8*gain);
  const old=f.scene.sound.add('audit-old',{volume:0});
  stream.fadingTracks.add(old);stream.trackGains.set(old,{gain:.8,sourceGain:.7});
  stream.trackGains.get(f.system.currentTrack).gain=.8;stream.refreshVolume();
  close(f.system.currentTrack.volume,.8*gain/2);close(old.volume,.8*.7/2);
}));
for(const failure of ['false','throw']) await check('Music playback '+failure+' does not leave an occupied transition',()=>musicFixture(f=>{
  let sound;const add=f.scene.sound.add;f.scene.sound.add=(...args)=>{sound=add(...args);sound.play=()=>{if(failure==='throw')throw Error('injected music failure');return false;};return sound;};
  f.system.isCrossfading=true;f.system.musicStreamController._beginTrack(0,null);
  assert.equal(f.system.isCrossfading,false);assert.equal(f.system.currentTrack,null);assert.equal(sound.pendingDestroy,true);
}));
assert.equal(checks.length,7,'Every check must complete before saving the report');
const result={passed:checks.every(c=>c.passed),checks};
writeFileSync(new URL('audio-full-audit-2026-09-07/mastering-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
