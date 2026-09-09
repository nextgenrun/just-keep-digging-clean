import { SoundSystem } from "../../sound/SoundSystem.js";
import { AudioLayerBus } from "../../sound/AudioLayerBus.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { FREESOUND_AUDIO as CFG, FREESOUND_AUDIO_ASSETS as ASSETS } from "../../values/freesoundAudio.js";
import { FREESOUND_AUDIO_REVIEW as VIEW } from "../../values/freesoundAudioReview.js";
import { REVIEWED_AUDIO_ASSETS as LEGACY } from "../../values/reviewedAudioAssets.js";
import { APPROVED_SFX_FAMILIES } from "../../values/audioConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const $ = id => document.getElementById(id), held = new Set();
const assets = Object.values(ASSETS).sort((a, b) => `${a.role}:${a.title}`.localeCompare(`${b.role}:${b.title}`));
const assetByKey = new Map([...Object.values(LEGACY), ...assets].map(asset => [asset.key, asset]));
const evidence = { scope: "Save-free diagnostic map; real Phaser audio controllers, not gameplay physics", errors: [], maxPeak: 0, clippedFrames: 0 };
let stage;
window.addEventListener("error", event => evidence.errors.push(String(event.message)));
window.addEventListener("unhandledrejection", event => evidence.errors.push(String(event.reason)));
const tell = text => { $("status").textContent = text; };

class OrchestraStage extends Phaser.Scene {
  constructor() {
    super("FreesoundOrchestra");
    this.running = false; this.position = { ...VIEW.start }; this.wall = false; this.bed = true;
    this.threat = false; this.cells = new Map(); this.flightUntil = 0; this.previewAsset = null;
  }
  preload() {
    for (const id of ["digOne", "digTwo", "libDirtBreak", "libStoneBreak", "libToolContact", "libUiClick", "libRewardCoins", "libPurchaseCoin", "libDeepCaveBedA"]) {
      this.load.audio(LEGACY[id].key, LEGACY[id].path);
    }
    for (const asset of [...APPROVED_SFX_FAMILIES.starDestruction, ...APPROVED_SFX_FAMILIES.levelUpReward]) this.load.audio(asset.key, asset.path);
    this.load.on("loaderror", file => evidence.errors.push(`Load failed: ${file.key}`));
  }
  create() {
    stage = this; this.graphics = this.add.graphics();
    this.soundSystem = new SoundSystem(this); this.soundSystem.musicEnabled = false; this.soundSystem.init();
    this.events.off("postupdate", this.soundSystem._reviewedTick); // Only this review page supplies synthetic context.
    this.soundSystem.setMasterVolume(VIEW.master); this.soundSystem.loadSoundLibraries();
    this.previewBus = new AudioLayerBus(this.soundSystem, { ...CFG.stars, maxVoices: 1, fadeMs: VIEW.previewFadeMs });
    this.world = { tileSize: CFG.stars.fallbackTileSize,
      inBounds: (x, y) => x >= 0 && y >= 0 && x < VIEW.columns && y < VIEW.rows,
      getTileType: (x, y) => this.cells.get(`${x},${y}`)
        ?? (this.wall && x === VIEW.wall.x && y >= VIEW.wall.top && y <= VIEW.wall.bottom ? TILE_TYPES.STONE : TILE_TYPES.AIR),
      getSkyTileIdentity: (x, y) => x + y };
    this.resetStars();
    this.game.canvas.addEventListener("pointerdown", event => {
      const rect = this.game.canvas.getBoundingClientRect();
      this.place({ x: (event.clientX - rect.left) / rect.width * VIEW.columns,
        y: (event.clientY - rect.top) / rect.height * VIEW.rows });
    });
    if (this.sound.context && this.sound.masterVolumeNode) {
      this.meter = this.sound.context.createAnalyser(); this.meter.fftSize = 2048;
      this.samples = new Float32Array(this.meter.fftSize); this.sound.masterVolumeNode.connect(this.meter);
    }
    this.events.once("shutdown", () => {
      this.stopAll(); this.previewBus.destroy();
      if (this.meter) this.sound.masterVolumeNode.disconnect(this.meter);
      this.soundSystem.destroy();
    });
    $("start").disabled = false; $("start").textContent = "Start world mix";
    tell("Ready — nothing is playing. Start the world mix or solo one source.");
  }
  unlock() {
    this.sound.context?.resume?.();
    if (!this.soundSystem.audioInitialized) this.soundSystem.startAudioAfterUserGesture({ voiceLines: false });
  }
  startMix() {
    this.stopAll(); this.unlock(); this.running = true;
    tell("World mix running. Move toward a Star; F digs. 0 / Escape stops everything.");
  }
  stopAll() {
    this.running = false; this.previewAsset = null; this.previewStarted = false; this.flightUntil = 0;
    held.clear(); this.previewBus?.stop(); this.soundSystem?._suspendAudio();
    tell("Stopped — no active or queued sound. Start world mix to resume.");
  }
  place(position) {
    this.position = { x: Math.max(.5, Math.min(VIEW.columns - .5, position.x)),
      y: Math.max(.5, Math.min(VIEW.rows - .5, position.y)) };
  }
  resetStars() {
    this.cells.clear();
    for (const star of VIEW.stars) this.cells.set(`${star.tx},${star.ty}`, TILE_TYPES.SKY_TILE);
  }
  consume() {
    if (!this.running) this.startMix();
    const nearest = [...this.cells.keys()].map(key => ({ key, xy: key.split(",").map(Number) }))
      .sort((a, b) => Math.hypot(a.xy[0] + .5 - this.position.x, a.xy[1] + .5 - this.position.y)
        - Math.hypot(b.xy[0] + .5 - this.position.x, b.xy[1] + .5 - this.position.y))[0];
    if (!nearest) return tell("Both test Stars are consumed. Reset both Stars to hear them again.");
    this.cells.delete(nearest.key); this.soundSystem.playStarDestruction();
    tell(`Consumed test Star ${nearest.key}. Its emitter is gone; the approved destruction cue is unchanged.`);
  }
  cue(id) {
    if (!this.running) this.startMix();
    const s = this.soundSystem;
    if (id === "dig") return this.playMineFeedbackAudio({ success: true, destroyed: true }, VIEW.materialTypes[$("material").value]);
    if (id === "flight") { this.flightUntil = this.time.now + VIEW.flightMs; return; }
    if (id === "footstep") return s.playFootstep({ controller: { physicsBody: { x: 0, y: 0, width: 50, height: 94 } },
      worldModel: { tileSize: 94, getTileType: () => TILE_TYPES.DIRT } });
    const actions = { ui: () => s.playUiClick(), purchase: () => s.playPurchase(), coin: () => s.playCoinReward(), level: () => s.playLevelUpReward() };
    actions[id]?.();
  }
  solo() {
    const asset = ASSETS[$("sources").value]; if (!asset) return;
    this.stopAll(); this.unlock(); this.previewAsset = asset;
    tell(`Loading solo: ${asset.title} — world mix stopped.`);
  }
  update(time, delta) {
    if (!this.soundSystem) return;
    const director = this.soundSystem.freesoundAudio;
    if (this.running) {
      const horizontal = Number(held.has("d") || held.has("arrowright")) - Number(held.has("a") || held.has("arrowleft"));
      const vertical = Number(held.has("s") || held.has("arrowdown")) - Number(held.has("w") || held.has("arrowup"));
      const step = VIEW.movementTilesPerSecond * Math.min(delta, VIEW.maxDeltaMs) / 1000;
      this.place({ x: this.position.x + horizontal * step, y: this.position.y + vertical * step });
      const near = [...this.cells.keys()].some(key => {
        const [x, y] = key.split(",").map(Number); return Math.hypot(x + .5 - this.position.x, y + .5 - this.position.y) < VIEW.refugeTiles;
      });
      const flying = time < this.flightUntil;
      director.update({ time, delta, active: true, position: this.position, world: this.world,
        context: { scene: "play", biome: "amberDepths", depth: VIEW.depth, hardcoreArmed: true,
          hardcoreStressBand: $("panic").value, earthquakeState: this.threat ? "warning" : "idle",
          earthquakePlayerAware: this.threat, wurmActive: false },
        nearRefuge: near, speaking: this.soundSystem.voiceDucked, flying, vx: 0, vy: flying ? VIEW.flightVelocity : 0 });
      this.soundSystem.reviewedAmbience.update({ time, delta, depth: VIEW.depth, active: this.bed,
        speaking: this.soundSystem.voiceDucked, detailAllowed: director.allowDetail(), ambienceGain: director.decorativeGain() });
    }
    const asset = this.previewAsset;
    if (asset && this.soundSystem.sfxEnabled) {
      director.palette.warm(asset);
      if (director.palette.ready(asset)) {
        if (asset.loop) this.previewBus.update([{ asset, gain: asset.gain }], delta);
        else if (!this.previewStarted) this.soundSystem.reviewedSfx.play(asset.id);
        if (!this.previewStarted) tell(`Solo ${asset.loop ? "loop" : "one-shot"}: ${asset.title}. World mix is stopped. 0 stops solo.`);
        this.previewStarted = true;
      }
    }
    director.palette.trim([...this.previewBus.tracks.values()].map(track => track.asset.key));
    this.drawMap();
    if (time - (this.lastDiagnostics || 0) >= VIEW.diagnosticsMs) { this.lastDiagnostics = time; this.diagnostics(); }
  }
  drawMap() {
    const g = this.graphics, c = VIEW.cell; g.clear(); g.lineStyle(1, 0x263b4b, .7);
    for (let x = 0; x <= VIEW.columns; x++) g.lineBetween(x * c, 0, x * c, VIEW.rows * c);
    for (let y = 0; y <= VIEW.rows; y++) g.lineBetween(0, y * c, VIEW.columns * c, y * c);
    if (this.wall) { g.fillStyle(0x77838e, .9); g.fillRect(VIEW.wall.x * c, VIEW.wall.top * c, c, (VIEW.wall.bottom - VIEW.wall.top + 1) * c); }
    for (const key of this.cells.keys()) {
      const [x, y] = key.split(",").map(Number); g.lineStyle(1, 0x526449, .65);
      g.strokeCircle((x + .5) * c, (y + .5) * c, CFG.stars.enterRadius * c);
      g.fillStyle(0xffd978); g.fillCircle((x + .5) * c, (y + .5) * c, 7);
    }
    g.fillStyle(0x7dccff); g.fillCircle(this.position.x * c, this.position.y * c, 7);
  }
  diagnostics() {
    const s = this.soundSystem, snapshot = s.freesoundAudio.snapshot(), solo = this.previewBus.snapshot();
    const cave = s.reviewedAmbience.snapshot(), sfx = s.activeSfxMixer.snapshot();
    let peak = 0;
    if (this.meter) { this.meter.getFloatTimeDomainData(this.samples); for (const sample of this.samples) peak = Math.max(peak, Math.abs(sample)); }
    evidence.maxPeak = Math.max(evidence.maxPeak, peak); if (peak >= 1) evidence.clippedFrames++;
    const layers = [...snapshot.stars.active, ...snapshot.panic.active, ...cave.active, ...solo.active, ...sfx.sources];
    $("playing").textContent = layers.length ? layers.map(row => {
      const asset = ASSETS[row.id] || assetByKey.get(row.key);
      const title = asset?.title || (asset?.id || row.id || row.key).replace(/^lib/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
      return `${title} · gain ${(row.gain ?? row.baseGain ?? 0).toFixed(3)}${row.owner ? ` · Star ${row.owner}` : ""}`;
    }).join("\n") : "None — no active voices.";
    const star = snapshot.stars;
    $("position").textContent = `Listener ${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)} · ${star.source
      ? `Star ${star.source} · ${star.distance.toFixed(2)} tiles · pan ${star.pan.toFixed(2)} · ${star.occlusion > 0 ? "rock-muffled" : "open path"}` : "no audible Star"}`;
    $("meter").textContent = `Output peak ${peak.toFixed(4)} · session peak ${evidence.maxPeak.toFixed(4)} · clipped frames ${evidence.clippedFrames}`;
    evidence.current = { mode: this.running ? "world mix" : this.previewAsset ? "solo" : "stopped", position: this.position,
      contextState: this.sound.context?.state || "unavailable", sfxEnabled: s.sfxEnabled, master: this.sound.volume,
      sfxMix: s.getSfxMixVolume(), speechDucked: s.voiceDucked,
      stars: snapshot.stars, panic: snapshot.panic, memory: snapshot.memory, cave: cave.active, solo: solo.active, sfx };
    $("diagnostics").textContent = JSON.stringify({ ...evidence.current, lastInput: evidence.lastInput, errors: evidence.errors }, null, 2);
    evidence.events = snapshot.history.slice(-12); $("events").textContent = JSON.stringify(evidence.events, null, 2);
  }
}
setupGameplayMethods(OrchestraStage.prototype);
new Phaser.Game({ type: Phaser.CANVAS, parent: "stage", width: VIEW.columns * VIEW.cell, height: VIEW.rows * VIEW.cell,
  backgroundColor: "#101e2a", audio: { disableWebAudio: false }, scene: [OrchestraStage] });

function sourceInfo() {
  const asset = ASSETS[$("sources").value]; $("audition").disabled = !asset;
  $("source-info").textContent = asset ? `${asset.id} · ${asset.role} · ${asset.duration.toFixed(2)} s · ${asset.loop ? "loop" : "one-shot"} · ${asset.licenseDeclared}` : "No matching wired sources.";
  $("source-link").hidden = !asset; if (asset) $("source-link").href = asset.sourceUrl;
}
function filterSources() {
  if (stage?.previewAsset) stage.stopAll();
  const query = $("source-search").value.trim().toLowerCase();
  $("sources").replaceChildren(...assets.filter(a => `${a.id} ${a.role} ${a.title} ${a.creator}`.toLowerCase().includes(query))
    .map(a => new Option(`${a.role} · ${a.title} · ${a.id}`, a.id)));
  sourceInfo();
}
filterSources(); $("source-search").oninput = filterSources;
$("sources").onchange = () => { if (stage?.previewAsset) stage.stopAll(); sourceInfo(); };
$("start").onclick = () => stage?.startMix(); $("stop").onclick = () => stage?.stopAll();
$("consume").onclick = () => stage?.consume(); $("reset").onclick = () => stage?.resetStars();
$("audition").onclick = () => stage?.solo();
$("mute").onclick = () => {
  if (!stage) return; const enabled = !stage.soundSystem.sfxEnabled; stage.soundSystem.toggleSfx(enabled);
  if (!enabled) stage.previewBus.stop(); $("mute").textContent = enabled ? "Mute SFX" : "Unmute SFX";
  tell(enabled ? "SFX unmuted. Use Start world mix or Solo to choose playback." : "SFX muted — all sound effects are silent.");
};
$("master").oninput = event => { const value = Number(event.target.value); stage?.soundSystem.setMasterVolume(value); $("master-value").textContent = `${Math.round(value * 100)}%`; };
for (const [id, property, label] of [["wall", "wall", "Rock wall"], ["bed", "bed", "Cave bed"], ["threat", "threat", "Aware quake"]]) $(id).onclick = () => {
  if (!stage) return; stage[property] = !stage[property]; $(id).setAttribute("aria-pressed", String(stage[property])); $(id).textContent = `${label}: ${stage[property] ? "on" : "off"}`;
};
$("speech").onclick = () => {
  if (!stage) return; const s = stage.soundSystem; s.voiceDucked = !s.voiceDucked; s.refreshMixVolumes();
  $("speech").setAttribute("aria-pressed", String(s.voiceDucked)); $("speech").textContent = `Speech duck: ${s.voiceDucked ? "on" : "off"}`;
};
document.querySelectorAll("[data-cue]").forEach(button => button.onclick = () => stage?.cue(button.dataset.cue));
document.querySelectorAll("[data-location]").forEach(button => button.onclick = () => stage?.place(VIEW[button.dataset.location]));
document.querySelectorAll("[data-step]").forEach(button => button.onclick = () => {
  if (!stage) return; const dir = button.dataset.step;
  stage.place({ x: stage.position.x + (dir === "left" ? -1 : dir === "right" ? 1 : 0) * VIEW.stepTiles,
    y: stage.position.y + (dir === "up" ? -1 : dir === "down" ? 1 : 0) * VIEW.stepTiles });
});
$("export").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "understar-orchestra-runtime-evidence.json"; link.click(); URL.revokeObjectURL(url);
};
document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  evidence.lastInput = { key: event.key, code: event.code };
  if (key === "0" || key === "escape") { stage?.stopAll(); return; }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    if (stage && !event.repeat && !held.has(key)) stage.place({
      x: stage.position.x + (Number(["d", "arrowright"].includes(key)) - Number(["a", "arrowleft"].includes(key))) * VIEW.keyTapTiles,
      y: stage.position.y + (Number(["s", "arrowdown"].includes(key)) - Number(["w", "arrowup"].includes(key))) * VIEW.keyTapTiles,
    });
    held.add(key); event.preventDefault();
  }
  if (key === "f" && !event.repeat) stage?.cue("dig");
});
document.addEventListener("keyup", event => held.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => held.clear());
window.addEventListener("pagehide", () => stage?.stopAll());
document.addEventListener("visibilitychange", () => { if (document.hidden) stage?.stopAll(); });
