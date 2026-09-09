import { checkNativeQuality } from './native-quality.mjs';
import { REVIEWED_AUDIO_ASSETS } from '../../values/reviewedAudioAssets.js';
import { CinematicVideoPlayer } from '../../systems/visual/CinematicVideoPlayer.js';
import { USER_SETTINGS } from '../../systems/UserSettings.js';
const output = document.querySelector('#result');
import { SoundSystem } from '../../sound/SoundSystem.js';
let audioScene;
const nativeGame = new Phaser.Game({type:Phaser.HEADLESS,width:16,height:16,banner:false,parent:'engine',
  scene:{key:'AudioAudit',create(){this.soundSystem=new SoundSystem(this);this.soundSystem.musicEnabled=false;this.soundSystem.init();audioScene=this;document.querySelector('#result').textContent='Audio engine ready.';}}});
const assert = (value, message) => { if (!value) throw Error(message); };
const close = (a,b) => Math.abs(a-b) < 1e-6;
const settle = () => new Promise(resolve => setTimeout(resolve, 60));
function current() {
  const game = nativeGame;
  const scene = audioScene;
  assert(scene?.soundSystem, 'Wait for the audio engine to finish loading.');
  return { game, scene, system: scene.soundSystem };
}
function snapshot() {
  const {game,scene,system} = current();
  return { scenes: game.scene.getScenes(true).map(s => s.sys.settings.key),
    gameSaves: 'No world or save manager instantiated', context: scene.sound.context?.state,
    settings: {master:system.masterVolume,music:system.musicVolume,sfx:system.sfxVolume,voice:system.voiceVolume},
    music: system.getMusicSnapshot(), sfx: system.activeSfxMixer.snapshot(),
    layers: system.freesoundAudio.snapshot(), voice: system.getPlayerVoiceSnapshot() };
}
document.querySelector('#snapshot').onclick = () => { try { output.textContent=JSON.stringify(snapshot(),null,2); } catch(e){output.textContent=e.stack;} };
document.querySelector('#run').onclick = async () => {
  const checks = [];
  let system, saved;
  try {
    const runtime = current(); system=runtime.system;
    const {scene} = runtime;
    saved = Object.fromEntries(['masterVolume','musicVolume','sfxVolume','voiceVolume','sfxEnabled','musicEnabled'].map(k=>[k,system[k]]));
    system.toggleMusic(false); system.toggleSfx(true); system.audioInitialized=true;
    await scene.sound.context.resume();
    system._suspendAudio();
    system.setMasterVolume(.2); system.setMusicVolume(.4); system.setVoiceVolume(.8); system.setSfxVolume(.9);
    const check = (name, condition) => { assert(condition,name); checks.push({name,passed:true}); output.textContent=JSON.stringify(checks,null,2); };
    const asset=REVIEWED_AUDIO_ASSETS.libUiClick;
    if(!scene.cache.audio.exists(asset.key)) scene.cache.audio.add(asset.key,await scene.sound.context.decodeAudioData(await (await fetch('../../'+asset.path)).arrayBuffer()));
    const effect = system.reviewedSfx.play(asset.id);
    check('Native Phaser effect starts',Boolean(effect?.isPlaying));
    effect.stop();
    check('Native stop frees the active mixer slot',system.activeSfxMixer.active.size===0);
    const external=system.playSfx(asset.key,.1);
    external.destroy();
    check('External native effect destruction completes without recursive teardown',!external.manager && system.activeSfxMixer.active.size===0);
    const entry={key:'audio-audit-player-voice',path:'sound/voice-lines/player-character-leo-v1/audio/earthquake-warning-leo-v03.mp3'};
    scene.cache.audio.add(entry.key,await scene.sound.context.decodeAudioData(await (await fetch('../../'+entry.path)).arrayBuffer()));
    system.setVoiceVolume(0);
    const voice=system.voiceLineManager.playExactVoiceLine(entry);
    await settle();
    check('Silent native voice leaves music unducked',voice?.isPlaying && voice.volume===0 && close(system.getMusicMixVolume(),.4));
    system.setVoiceVolume(.5);
    await settle();
    check('Raising Voice during playback ducks music',voice.volume>0 && close(system.getMusicMixVolume(),.12));
    voice.pause(); system.voiceLineManager.stopCurrentVoiceLine();
    check('Paused native speech cleans up and restores the mix',!system.voiceLineManager.isBusy() && close(system.getMusicMixVolume(),.4));
    const externalVoice=system.voiceLineManager.playExactVoiceLine(entry);
    externalVoice.destroy();
    check('External native voice destruction completes and restores ducking',!externalVoice.manager && !system.voiceLineManager.isBusy() && !system.voiceDucked);
    scene.cache.audio.remove(entry.key);
    const video = document.createElement('video');
    const cinema = new CinematicVideoPlayer(scene);
    cinema.video = {setVolume(value){video.volume=value;}};
    const original=structuredClone(USER_SETTINGS.getAudio());
    try {
      USER_SETTINGS.updateAudio({masterVolume:0,voiceVolume:.8,sfxEnabled:true});
      cinema._applyAudioSettings(); check('Video audio follows Master zero',video.volume===0);
      USER_SETTINGS.updateAudio({masterVolume:.25,voiceVolume:.4});
      cinema._applyAudioSettings(); check('Video audio multiplies Master and Voice once',close(video.volume,.1));
      USER_SETTINGS.updateAudio({sfxEnabled:false});
      cinema._applyAudioSettings(); check('SFX toggle silences the cinematic mix',video.volume===0);
    } finally { USER_SETTINGS.updateAudio(original); }
    const measurements=await checkNativeQuality({scene,system,check,settle});
    output.textContent=JSON.stringify({passed:true,checks,measurements,engine:scene.sound.constructor.name,context:scene.sound.context.state},null,2);
  } catch(error) { output.textContent=JSON.stringify({passed:false,checks,error:error.stack},null,2); }
  finally {if(system&&saved){system._suspendAudio();system.applySettings(saved);}}
};
