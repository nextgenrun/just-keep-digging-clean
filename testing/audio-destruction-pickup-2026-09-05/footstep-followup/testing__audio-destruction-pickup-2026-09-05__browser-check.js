import { SoundSystem } from "../../sound/SoundSystem.js";
import { CORE_SFX_WINDOWS } from "../../values/coreSfxWindows.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { FREESOUND_RUNTIME_ASSETS } from "../../values/freesoundAudio.js";
const assets = { ...REVIEWED_AUDIO_ASSETS, ...FREESOUND_RUNTIME_ASSETS };
const windows = Object.entries(CORE_SFX_WINDOWS);
const measurements = await (await fetch("window-measurements.json", { cache: "no-store" })).json();
const catalog = await (await fetch("../audio-runtime-reaudit-2026-09-04/catalog.json", { cache: "no-store" })).json();
const labels = { libDirtBreak: "Earth destruction", libStoneBreak: "Stone / metal destruction", libResourcePop: "Resource pickup", "freesound-536921": "Crystal break A", "freesound-703115": "Crystal break B" };
for (const row of measurements) {
 const asset = assets[row.id], gain = catalog.items.find(item => item.path === asset.path).runtimeGain;
 const tr = document.createElement("tr"), title = document.createElement("td");
 title.textContent = labels[row.id];
 const note = document.createElement("small"); note.textContent = `${Math.round(row.originalSeconds * 1000)} → ${Math.round(row.editedSeconds * 1000)} ms`;
 title.append(note); tr.append(title);
 for (const [mode, path] of [["Before", row.source], ["Current", row.previewPath]]) {
  const td = document.createElement("td"), audio = document.createElement("audio");
  audio.controls = true; audio.preload = "metadata"; audio.src = "/" + path; audio.volume = gain;
  audio.setAttribute("aria-label", `${mode}: ${labels[row.id]}`);
  audio.onplay = () => document.querySelectorAll("audio").forEach(other => { if (other !== audio) other.pause(); });
  td.append(audio); tr.append(td);
 }
 document.getElementById("comparisons").append(tr);
}
let scene, system;
const game = new Phaser.Game({ type: Phaser.CANVAS, width: 1, height: 1, parent: "engine", banner: false,
 audio: { disableWebAudio: false }, scene: {
 preload() { for (const [id] of windows) this.load.audio(assets[id].key, "/" + assets[id].path); },
 create() {
  scene = this; system = new SoundSystem(scene); system.musicEnabled = false;
  system.audioInitialized = true; scene.soundSystem = system; scene.sound.volume = system.masterVolume;
  document.getElementById("state").textContent = "Ready"; document.getElementById("check").disabled = false;
 }
} });
const assert = (value, message) => { if (!value) throw new Error(message); };
document.getElementById("check").onclick = async () => {
 const button = document.getElementById("check"), state = document.getElementById("state"), output = document.getElementById("results");
 button.disabled = true; state.textContent = "Checking…";
 const report = { passed: false, backend: "Phaser WebAudio", checks: [], manualPlaythrough: false, listeningApproved: false };
 try {
  await scene.sound.context.resume();
  assert(scene.sound.context.state === "running", "Audio context must be running");
  for (const [id, window] of windows) {
   const original = scene.cache.audio.get(assets[id].key), originalDuration = original.duration;
   const rate = id === "libStoneBreak" ? 0.9 : 1;
   const start = performance.now(), sound = system.reviewedSfx.play(id, { rate });
   assert(sound?.source?.buffer, "Native WebAudio source missing: " + id);
   assert(sound.source.buffer !== original, "Source must stay unmodified");
   assert(Math.abs(sound.source.buffer.duration - window.duration) < 0.001, "Native duration mismatch");
   const edited = sound.audioBuffer;
   assert(edited.getChannelData(0)[0] === 0 && edited.getChannelData(0).at(-1) === 0, "Fade edges must be zero");
   // AudioParam.value reflects the render thread after a quantum, not synchronously.
   const completed = new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("Missing native completion: " + id)), 2000);
    sound.once("complete", () => { clearTimeout(deadline); resolve(); });
   });
   await new Promise(requestAnimationFrame);
   assert(Math.abs(sound.source.playbackRate.value - rate) < 0.001, "Material rate was lost");
   const initialVolume = sound.volume; system.setSfxVolume(system.sfxVolume / 2);
   await new Promise(requestAnimationFrame);
   assert(Math.abs(sound.volume - initialVolume / 2) < 0.0001, `Mixer must retain gain control: initial=${initialVolume}, changed=${sound.volume}`);
   system.setSfxVolume(system.sfxVolume * 2);
   await completed;
   const elapsedMs = performance.now() - start;
   assert(elapsedMs < window.duration / rate * 1000 + 150, "Old long tail survived: " + id);
   assert(scene.cache.audio.get(assets[id].key) === original && original.duration === originalDuration, "Approved cache changed");
   assert(!system.activeSfxMixer.active.size, "Completed voice remained in mixer");
   const preview = await scene.sound.context.decodeAudioData(await (await fetch("renders/" + id + ".wav")).arrayBuffer());
   assert(Math.abs(preview.duration - edited.duration) < 0.001, "Review preview duration mismatch");
   report.checks.push({ id, originalMs: originalDuration * 1000, bufferMs: edited.duration * 1000,
    rate, observedCompletionMs: Math.round(elapsedMs), sourcePreserved: true, gainControl: true, previewDecoded: true });
   output.textContent = JSON.stringify(report, null, 2);
  }
  const pickup = system.playResourcePickup({ special: true });
  assert(pickup, "Resource arrival must have its cue");
  await new Promise(resolve => scene.time.delayedCall(1100, resolve));
  assert(system.playXpGather({ special: true }) === null, "Late XP replayed a pickup");
  report.delayedXpSilent = true; report.passed = true; state.textContent = "PASS — five native playback edits and delayed XP checked";
 } catch (error) { report.error = error.message; state.textContent = "FAIL — " + error.message; }
 output.textContent = JSON.stringify(report, null, 2); button.disabled = false;
};
window.addEventListener("pagehide", () => { system?.destroy(); game.destroy(true); });
