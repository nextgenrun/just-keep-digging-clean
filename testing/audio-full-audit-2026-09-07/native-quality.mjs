import { AUDIO_MASTERING } from '../../values/audioMastering.js';
import { AUDIO_CONFIG, APPROVED_SFX_FAMILIES } from '../../values/audioConfig.js';
import { ASSET_KEYS } from '../../values/assetKeys.js';
import { VOICE_SOURCE_MIX } from '../../values/voiceSourceMix.generated.js';
import { MUSIC_SOURCE_MIX } from '../../values/musicSourceMix.generated.js';
import { EarthquakeSystem } from '../../systems/environment/EarthquakeSystem.js';
import { WeatherAudioController } from '../../systems/environment/WeatherAudioController.js';
import { WEATHER_CONFIG } from '../../values/weatherConfig.js';

export async function checkNativeQuality({scene,system,check,settle}) {
  const ctx=scene.sound.context;
  const cache=async(key,path)=>{
    if(!scene.cache.audio.exists(key)) scene.cache.audio.add(key,await ctx.decodeAudioData(await(await fetch('../../'+path)).arrayBuffer()));
    return scene.cache.audio.get(key);
  };
  const trimmed={key:'audit-trimmed-npc',path:'sound/voice-lines/npc-voicelines/player-upgrade-npc-voicelines/update-2/Dwarf Uplifted.wav'};
  const original=await cache(trimmed.key,trimmed.path), mix=VOICE_SOURCE_MIX[trimmed.path];
  const speech=system.voiceLineManager._playSelectedVoiceLine('npc','playerUpgrades',trimmed,[trimmed]);
  await settle();
  check('Real NPC silence edit changes native duration and fades both edges',
    speech?.isPlaying && Math.abs(speech.duration-mix.window.duration)<.002
    && speech.audioBuffer.length<original.length
    && speech.audioBuffer.getChannelData(0)[0]===0
    && speech.audioBuffer.getChannelData(0).at(-1)===0);
  check('Native NPC volume includes calibration and NPC trim once',
    Math.abs(speech.volume-system.getVoiceMixVolume(true)*mix.gain)<1e-6);
  system.voiceLineManager.stopCurrentVoiceLine();scene.cache.audio.remove(trimmed.key);

  const asset=APPROVED_SFX_FAMILIES.starDestruction[0], starBuffer=await cache(asset.key,asset.path);
  const star=system.playSfx(asset.key,AUDIO_CONFIG.starDestructionVolume);
  check('Native Star sound inserts its owned 20 Hz high-pass',
    star?.isPlaying && star.dcFilter?.type==='highpass' && star.dcFilter.frequency.value===20);
  const offline=new OfflineAudioContext(starBuffer.numberOfChannels,starBuffer.length,starBuffer.sampleRate);
  const src=offline.createBufferSource(), filter=offline.createBiquadFilter();
  src.buffer=starBuffer;filter.type='highpass';filter.frequency.value=AUDIO_MASTERING.starDcHighpassHz;
  filter.Q.value=AUDIO_MASTERING.starDcFilterQ;src.connect(filter);filter.connect(offline.destination);src.start();
  const rendered=await offline.startRendering();
  let peak=0, dc=0;
  for(let ch=0;ch<rendered.numberOfChannels;ch++){
    const data=rendered.getChannelData(ch);let sum=0;
    for(const value of data){sum+=value;peak=Math.max(peak,Math.abs(value));}
    dc=Math.max(dc,Math.abs(sum/data.length));
  }
  check('Native rendered Star DC is removed and its measured peak fits the mixer metadata',
    dc<.001 && peak<=AUDIO_MASTERING.starFilteredPeak);
  star.stop();await settle();check('Stopping Star disposes its filtered sound',star.pendingRemove===true && !star.manager);
  const measurements={star:{rawFilteredPeak:peak,absoluteDcOffset:dc,sourcePeakAllowance:AUDIO_MASTERING.starFilteredPeak}};

  const weather=new WeatherAudioController(scene,WEATHER_CONFIG);
  scene.weatherSystem={audioController:weather};
  try {
    weather._ensureRainNoise();weather._setRainNoiseVolume(.08);
    weather._ensureWindNoise();weather._setWindNoiseVolume(.04);
    weather.playThunder({undergroundAmount:0},1);
    system.setSfxVolume(0);await settle();
    check('SFX zero immediately silences existing native rain, wind and thunder',
      weather._rainNoise.gain.gain.value===0 && weather._windNoise.gain.gain.value===0
      && [...weather._thunder.values()].every(t=>t.gain.gain.value===0));
    system.setSfxVolume(.9);await settle();
    check('Raising SFX restores existing weather at the new bus gain',
      Math.abs(weather._rainNoise.gain.gain.value-.08*.9)<1e-6
      && [...weather._thunder.values()].every(t=>Math.abs(t.gain.gain.value-t.level*.9)<1e-6));
  } finally {weather.destroy();delete scene.weatherSystem;}

  const quake=Object.create(EarthquakeSystem.prototype);
  quake.scene=scene;quake.config={playerFeedback:{}};quake._getPlayerProximity=()=>1;
  scene.earthquakeSystem=quake;
  try {
    quake._playTone('rumble');
    const tone=[...quake._audioTones][0];
    system.setSfxVolume(0);await settle();
    check('SFX zero silences an already running native earthquake tone',tone.mix.gain.value===0);
    system.setSfxVolume(.9);await settle();
    check('Earthquake tone follows a live SFX gain change',Math.abs(tone.mix.gain.value-.9)<1e-6);
    system._suspendAudio();
    check('Scene audio suspension releases all procedural earthquake nodes',quake._audioTones.size===0);
  } finally {quake.stopAudio();delete scene.earthquakeSystem;}

  const music=ASSET_KEYS.audio.music, saved={files:music.files,playlist:music.playlist};
  const stream=system.musicStreamController, oldConfig=stream.musicConfig;
  const files=Object.keys(MUSIC_SOURCE_MIX).slice(0,2);
  try {
    music.files=files;music.playlist=['audit-music-a','audit-music-b'];
    for(let i=0;i<2;i++) await cache(music.playlist[i],'sound/playlists/'+files[i]);
    stream.musicConfig={...oldConfig,crossfadeMs:80};system.musicEnabled=true;
    stream._beginTrack(0,null);
    await new Promise(resolve=>setTimeout(resolve,250));
    const first=system.currentTrack;
    check('Native music settles at its calibrated source gain',
      first?.isPlaying && Math.abs(first.volume-system.getMusicMixVolume()*MUSIC_SOURCE_MIX[files[0]].gain)<1e-6);
    stream._beginTrack(1,first);
    await new Promise(resolve=>setTimeout(resolve,250));
    check('Native music transition disposes the old track and preserves calibration',
      first.pendingRemove===true && !first.manager && stream.fadingTracks.size===0
      && Math.abs(system.currentTrack.volume-system.getMusicMixVolume()*MUSIC_SOURCE_MIX[files[1]].gain)<1e-6);
  } finally {
    system.toggleMusic(false);stream.musicConfig=oldConfig;
    for(const key of music.playlist) scene.cache.audio.remove(key);
    Object.assign(music,saved);
  }
  return measurements;
}
