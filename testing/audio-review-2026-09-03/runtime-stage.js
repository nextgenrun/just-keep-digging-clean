import { SoundSystem } from "../../sound/SoundSystem.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { REVIEWED_AUDIO_ASSETS as ASSETS } from "../../values/reviewedAudioAssets.js";
import { APPROVED_SFX_FAMILIES } from "../../values/audioConfig.js";
import { WEATHER_CONFIG } from "../../values/weatherConfig.js";
import { WeatherRecordedAmbienceController } from "../../systems/environment/WeatherRecordedAmbienceController.js";

const $ = id => document.getElementById(id);
const evidence = { loaded: 0, loadErrors: [], contacts: [], maxMeasuredPeak: 0, clippedFrames: 0 };
evidence.runtimeErrors = [];
window.addEventListener("error", event => evidence.runtimeErrors.push(String(event.message)));
window.addEventListener("unhandledrejection", event => evidence.runtimeErrors.push(String(event.reason)));
let stage;

class AudioRuntimeStage extends Phaser.Scene {
  constructor() { super("ApprovedAudioRuntimeStage"); this.mode = "quiet"; this.timers = []; }
  preload() {
    const assets = new Map(Object.values(ASSETS).map(asset => [asset.key, asset]));
    for (const asset of [...APPROVED_SFX_FAMILIES.starDestruction, ...APPROVED_SFX_FAMILIES.levelUpReward]) assets.set(asset.key, asset);
    for (const asset of assets.values()) this.load.audio(asset.key, asset.path);
    this.load.image("review-town", "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v1.webp");
    this.load.on("loaderror", file => evidence.loadErrors.push(file.key));
  }
  create() {
    stage = this;
    this.add.image(320, 160, "review-town").setDisplaySize(640, 320).setAlpha(.66);
    this.eventLabel = this.add.text(22, 20, "APPROVED AUDIO\nReady to test", { fontFamily: "Arial", fontSize: "24px", color: "#effaff", stroke: "#071b2c", strokeThickness: 5 });
    this.soundSystem = new SoundSystem(this);
    this.soundSystem.musicEnabled = false;
    this.soundSystem.init();
    // This page explicitly supplies simulated context; the production scene
    // observer is disconnected only in this save-free harness.
    this.events.off("postupdate", this.soundSystem._reviewedTick);
    this.soundSystem.setMasterVolume(.5);
    this.soundSystem.loadSoundLibraries();
    this.weather = new WeatherRecordedAmbienceController(this, WEATHER_CONFIG);
    this.weatherSystem = { audioController: { recordedAmbience: this.weather, stop: () => this.weather.stop() } };
    this.dayNightCycle = { getNightAmount: () => this.mode === "wind" ? 1 : 0 };
    evidence.loaded = Object.values(ASSETS).filter(asset => this.cache.audio.exists(asset.key)).length;
    $("loaded").textContent = String(evidence.loaded);
    $("start").disabled = false;
    $("start").textContent = "Enable audio";
    $("status").textContent = evidence.loadErrors.length ? "Load errors: " + evidence.loadErrors.join(", ") : "Ready. Enable audio first. D/S trigger contact-frame tests; 0 stops everything.";
    const context = this.sound.context;
    if (context && this.sound.masterVolumeNode) {
      this.meter = context.createAnalyser(); this.meter.fftSize = 2048;
      this.sound.masterVolumeNode.connect(this.meter);
      this.samples = new Float32Array(2048);
    }
    this.events.once("shutdown", () => {
      this.stopStage(); this.weather.destroy();
      if (this.meter) this.sound.masterVolumeNode.disconnect(this.meter);
      this.soundSystem.destroy();
    });
  }
  enable() {
    this.sound.context?.resume?.();
    if (!this.soundSystem.audioInitialized) this.soundSystem.startAudioAfterUserGesture({ voiceLines: false });
    $("start").textContent = "Audio enabled";
    $("status").textContent = "Audio enabled. Choose a cue or layer; 0 stops all queued and active sounds.";
  }
  cue(id) {
    this.enable();
    this.eventLabel.setText(id.toUpperCase());
    const s = this.soundSystem;
    if (id === "dirt" || id === "stone") {
      s.playDigSwing();
      const contactAt = this.time.now + 180;
      this.timers.push(this.time.delayedCall(180, () => {
        const started = this.time.now;
        this.playMineFeedbackAudio({ success: true, destroyed: id === "stone" }, id === "dirt" ? 1 : 2);
        const measurement = { material: id, scheduledAt: contactAt, dispatchedAt: started,
          frameErrorMs: Math.round((started - contactAt) * 100) / 100 };
        evidence.contacts.push(measurement);
        $("timing").textContent = `${id}: impact dispatched ${measurement.frameErrorMs} ms from scheduled contact (render-frame quantization).`;
      }));
      return;
    }
    if (id === "star") return this.playMineFeedbackAudio({ success: true, destroyed: true }, 16);
    const actions = { level: () => s.playLevelUpReward(), landing: () => s.reviewedSfx.play("libLandingDebris"),
      hover: () => s.playUiSelect(), click: () => s.playUiClick(), confirm: () => s.playUiConfirm(), menu: () => s.playMenuOpen(),
      purchase: () => s.playPurchase(), save: () => s.playManualSave(), resource: () => s.playResourcePickup(),
      coins: () => s.playCoinReward(), torch: () => s.playTorchExtinguish(),
      warning: () => s.playHardcoreStressWarning(false), critical: () => s.playHardcoreStressWarning(true),
      calm: () => s.stopSeismicWarning() };
    actions[id]?.();
  }
  bed(mode) {
    this.enable(); this.mode = mode;
    const cave = this.soundSystem.reviewedAmbience;
    cave.preset = mode === "composite" ? 3 : 0;
    if (mode === "composite") cave.compositeEntryPending = true;
    if (mode === "voice") {
      cave.entered = true; cave.nextDetailAt = Infinity; cave.nextBedAt = Infinity;
      const id = this.soundSystem.reviewedSfx.choose("stage-detail", ["libCreepySingerA", "libWhispersDeep", "libDeepVoicesA"]);
      cave.detail = { id, until: this.time.now + ASSETS[id].duration * 1000 - 1400 };
    }
    this.eventLabel.setText(mode.toUpperCase());
  }
  stopStage() {
    this.mode = "quiet";
    this.timers.forEach(timer => timer.remove(false)); this.timers = [];
    this.soundSystem._suspendAudio();
    this.soundSystem.stopStarDestruction(); this.soundSystem.stopLevelUpReward(); this.soundSystem.stopSeismicWarning();
    $("status").textContent = "Stopped. No queued contact or ambience remains.";
  }
  update(time, delta) {
    if (!this.soundSystem) return;
    const caveActive = ["cave", "composite", "voice"].includes(this.mode);
    // Test selections remain deterministic. Production alone owns the long
    // random bed/detail schedule; this page changes them only via its buttons.
    if (caveActive) {
      this.soundSystem.reviewedAmbience.nextBedAt = Infinity;
      this.soundSystem.reviewedAmbience.nextDetailAt = Infinity;
    }
    this.soundSystem.reviewedAmbience.update({ time, delta, active: caveActive, depth: 520, speaking: this.soundSystem.voiceDucked });
    const raining = ["rain", "shelter"].includes(this.mode);
    this.weather.update({ kind: "rain", rainAmount: raining ? .8 : 0, stormAmount: 0,
      wind: raining ? 80 : this.mode === "wind" ? 70 : 0, gust: 0,
      depth: { surfaceAmount: caveActive ? 0 : 1 }, occlusion: { coveredAmount: this.mode === "shelter" ? 1 : 0 }, delta });
    if (this.meter) {
      this.meter.getFloatTimeDomainData(this.samples);
      let peak = 0; for (const sample of this.samples) peak = Math.max(peak, Math.abs(sample));
      evidence.maxMeasuredPeak = Math.max(evidence.maxMeasuredPeak, peak);
      if (peak >= 1) evidence.clippedFrames++;
      $("meter").textContent = `Current peak ${peak.toFixed(4)} · session peak ${evidence.maxMeasuredPeak.toFixed(4)} · clipped frames ${evidence.clippedFrames}`;
    }
    if (time - (this.lastUiAt || 0) < 120) return;
    this.lastUiAt = time;
    evidence.sfx = this.soundSystem.activeSfxMixer.snapshot();
    evidence.mix = { master: this.sound.volume, sfx: this.soundSystem.getSfxMixVolume(),
      speechDucked: this.soundSystem.voiceDucked, context: this.mode,
      audioContextState: this.sound.context?.state || "unavailable" };
    evidence.cave = this.soundSystem.reviewedAmbience.snapshot();
    evidence.weather = this.weather.getSnapshot();
    $("playing").textContent = JSON.stringify({ mix: evidence.mix, sfx: evidence.sfx.sources, cave: evidence.cave.active, weather: evidence.weather.layers }, null, 2);
    $("events").textContent = JSON.stringify(this.soundSystem.reviewedSfx.history.slice(-10), null, 2);
    document.body.dataset.audioEvidence = JSON.stringify(evidence);
  }
}

setupGameplayMethods(AudioRuntimeStage.prototype);
new Phaser.Game({ type: Phaser.WEBGL, parent: "stage", width: 640, height: 320,
  backgroundColor: "#122434", audio: { disableWebAudio: false }, scene: [AudioRuntimeStage] });
$("start").onclick = () => stage?.enable();
window.addEventListener("pagehide", () => stage?.stopStage());
document.addEventListener("visibilitychange", () => { if (document.hidden) stage?.stopStage(); });
$("stop").onclick = () => stage?.stopStage();
$("mute").onclick = () => {
  if (!stage) return; const enabled = !stage.soundSystem.sfxEnabled;
  stage.soundSystem.toggleSfx(enabled); $("mute").textContent = enabled ? "Mute SFX" : "Unmute SFX";
};
$("master").oninput = event => { const value = Number(event.target.value); stage?.soundSystem.setMasterVolume(value); $("master-value").textContent = Math.round(value * 100) + "%"; };
document.querySelectorAll("[data-cue]").forEach(button => button.onclick = () => stage?.cue(button.dataset.cue));
document.querySelectorAll("[data-bed]").forEach(button => button.onclick = () => stage?.bed(button.dataset.bed));
$("speech").onclick = () => {
  if (!stage) return; stage.soundSystem.voiceDucked = !stage.soundSystem.voiceDucked;
  stage.soundSystem.refreshMixVolumes(); $("speech").textContent = stage.soundSystem.voiceDucked ? "Release speech duck" : "Simulate speech duck";
};
$("pressure").onclick = () => {
  stage?.enable(); for (const id of ["star", "level", "purchase", "resource", "landing", "critical", "torch"]) stage?.cue(id);
};
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = "understar-runtime-audio-audit.json"; link.click(); URL.revokeObjectURL(url);
};
document.addEventListener("keydown", event => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName) || event.repeat) return;
  if (event.key === "0" || event.key === "Escape") stage?.stopStage();
  if (event.key.toLowerCase() === "d") stage?.cue("dirt");
  if (event.key.toLowerCase() === "s") stage?.cue("stone");
});
