import { DynamicEventRuntime } from "../../world/playScene/DynamicEventRuntime.js";
import { EarthquakeFeedbackUI } from "../../systems/visual/EarthquakeFeedbackUI.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as minerProfile } from "../../values/playerAssetProfiles.js";
import { DYNAMIC_EVENT_REVIEW as cfg } from "../../values/dynamicEventReview.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { GRAVEBORER_WURM_CONFIG as wurmCfg } from "../../values/graveborerWurm.js";
import { EARTHQUAKE_CONFIG } from "../../values/earthquakes.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { ShadowMinerRuntime } from "../../world/playScene/ShadowMinerRuntime.js";
import { GraveborerWurmSystem } from "../../systems/environment/GraveborerWurmSystem.js";
import { GraveborerWurmVisualSystem } from "../../systems/visual/GraveborerWurmVisualSystem.js";
import { EarthquakeSystem } from "../../systems/environment/EarthquakeSystem.js";
import { EarthquakeHazardOverlay } from "../../systems/visual/EarthquakeHazardOverlay.js";
import { handleGraveborerWurmEvents } from "../../world/playScene/GraveborerWurmEventBridge.js";
import { recordGraveborerWurmMiningNoise } from "../../world/playScene/GraveborerWurmBridge.js";
import { installReviewWorld, paintReviewTerrain, moveReviewBody, seedReviewTrail } from "./reviewWorld.js";
import { cueAssets, createReviewSound, createReviewRandom, withReviewRandom,
  readReviewGates, checkRetiredAdmission } from "./reviewSupport.js";

export class EncounterScene extends Phaser.Scene {
  constructor(controls, publish) {
    super(cfg.sceneKey);
    this.controls = controls;
    this.publish = publish;
    this.ready = false;
    this.loadErrors = [];
  }

  preload() {
    this.load.on("loaderror", file => this.loadErrors.push(file.src));
    for (const asset of Object.values(cfg.assets)) {
      if (asset.frameWidth) this.load.spritesheet(asset.key, "../../" + asset.path, asset);
      else this.load.image(asset.key, "../../" + asset.path);
    }
    for (const [part, key] of Object.entries(ASSET_KEYS.environment.graveborerWurm)) {
      this.load.image(key, "../../" + wurmCfg.assets.basePath + "/" + wurmCfg.assets[part + "File"]);
    }
    for (const asset of Object.values(EARTHQUAKE_FEEDBACK_CONFIG.assets)) {
      this.load.image(asset.key, "../../" + asset.path);
    }
    for (const property of ["punchJabSheet", "groundStrikeSheet"]) {
      const [key, file, , base] = minerProfile.sheetFiles.find(entry => entry[0] === property);
      this.load.spritesheet(minerProfile[key], "../../" + base + "/" + file,
        { frameWidth: minerProfile.frameWidth, frameHeight: minerProfile.frameHeight });
    }
    for (const asset of cueAssets) this.load.audio(asset.key, "../../" + asset.path);
  }

  create() {
    for (const name of ["idle", "walk"]) {
      const asset = cfg.assets[name];
      this.anims.create({ key: "event-lab-" + name,
        frames: this.anims.generateFrameNumbers(asset.key, { start: 0, end: asset.frames - 1 }),
        frameRate: asset.fps, repeat: -1 });
    }
    for (const [key, texture, frames] of [
      [minerProfile.idleAnim, cfg.assets.idle.key, minerProfile.idleFrames],
      [minerProfile.digSidewaysAnim, minerProfile.digSidewaysSheet, minerProfile.digSidewaysFrames],
      [minerProfile.digDownAnim, minerProfile.digDownSheet, minerProfile.digDownFrames],
    ]) this.anims.create({ key, frames: frames.map(frame => ({ key: texture, frame })), frameRate: cfg.assets.idle.fps, repeat: -1 });
    this.keys = this.input.keyboard.addKeys("A,D");
    this.resetChamber();
    this.ready = true;
    this.publish(this.snapshot());
    this.events.once("shutdown", () => this.dispose());
  }

  log(message) {
    this.trace.push({ timeMs: this.elapsedMs, message });
    this.trace = this.trace.slice(-cfg.logLimit);
  }

  resetChamber() {
    this.dispose();
    this.children.removeAll(true);
    this.tweens.killAll();
    this.tweens.timeScale = this.controls.speed;
    this.clockMs = cfg.trail.durationMs * 2;
    this.elapsedMs = 0;
    this.accumulator = 0;
    this.nextNoiseMs = 0;
    this.nextPublishMs = 0;
    this.patrolDirection = 1;
    this.paused = false;
    this.lastCompletionCount = 0;
    this.sequence = null;
    this.trace = [];
    this.lastStates = {};
    this.runtimeError = null;
    this.reviewWurm = false;
    this.metrics = { hits: 0, destroyed: 0, quakesCompleted: 0,
      saveRequestsIntercepted: 0, audioCues: 0 };
    this.random = createReviewRandom(cfg.seed);
    this.time.now = this.clockMs;
    installReviewWorld(this, this.controls.depth);
    this.soundSystem = createReviewSound(this);
    this.wurm = new GraveborerWurmSystem();
    this.graveborerWurmSystem = this.wurm;
    this.graveborerWurmRuntime = { system: this.wurm, lastGate: null,
      encountersCompleted: 0, tilesCarved: 0, carveEventCount: 0, lastHit: null };
    this.wurmView = new GraveborerWurmVisualSystem(this);
    this.quake = withReviewRandom(this.random,
      () => new EarthquakeSystem(this, EARTHQUAKE_CONFIG, () => this.clockMs));
    this.earthquakeSystem = this.quake;
    this.earthquakeHazardOverlay = new EarthquakeHazardOverlay(this, this.quake);
    this.shadow = new ShadowMinerRuntime(this, {
      mode: { enabled: true, review: false, dev10x: false }, random: this.random,
    });
    this.shadowMinerSystem = this.shadow;
    this.gameState = "playing";
    this.earthquakeFeedbackUI = new EarthquakeFeedbackUI(this, this.quake);
    this.dynamicEventRuntime = new DynamicEventRuntime(this, { review: true });
    this.retired = checkRetiredAdmission();
    this.log("Fresh chamber · production encounter timing · no save storage");
    this.syncConditions();
    paintReviewTerrain(this);
  }

  syncConditions() {
    this.hardcoreModeData = { mode: this.controls.hardcore ? "hardcore" : "casual",
      armed: this.controls.hardcore, livesRemaining: 3 };
    withReviewRandom(this.random, () => {
      this.quake.setPaused(!this.controls.hazards);
      this.quake.syncSuppression();
    });
    this.graveborerWurmRuntime.lastGate = readReviewGates(this).activation;
  }

  context() {
    return { torchActive: this.controls.torch, torchIntensity: this.controls.torch ? 1 : 0,
      stressSnapshot: { armed: this.controls.hardcore, stressBand: "calm", stressRatio: 0 },
      nearIntactStarLight: false };
  }

  noise() {
    const before = this.wurm.noise;
    recordGraveborerWurmMiningNoise(this, "normal", this.playerController.getPlayerTile());
    this.log(`Mining noise ${before.toFixed(1)} → ${this.wurm.noise.toFixed(1)}`);
  }

  trigger(type, sequenced = false) {
    if (!this.ready || this.paused) return false;
    if (this.busy()) { this.log("Trigger blocked: an encounter is still active or rubble is settling"); return false; }
    if (!sequenced) this.sequence = null;
    const tile = this.playerController.getPlayerTile();
    let started = false;
    if (type === "shadow") {
      seedReviewTrail(this);
      started = this.shadow.forceSpawn(tile, this.clockMs, this.context());
    } else if (type === "wurm") {
      this.reviewWurm = true;
      this.wurm.forceEncounter(tile, { size: this.controls.wurmSize, difficulty: this.controls.wurmDifficulty });
      this.updateWurm(cfg.stepMs);
      started = this.wurm.phase === "warning";
    } else if (type === "earthquake") {
      if (!this.controls.hazards || this.controls.suppressed) {
        this.log("Earthquake blocked: hazard introduction locked or Seismic Suppression owned");
        return false;
      }
      started = withReviewRandom(this.random, () => this.quake.start(this.controls.intensity));
    }
    this.log(`${type} review trigger: ${started ? "STARTED" : "BLOCKED"}`);
    return started;
  }

  busy() {
    return this.shadow.state !== "dormant" || ["warning", "burrowing"].includes(this.wurm.phase)
      || this.quake.state !== "idle" || this.quake.caveIns.length > 0
      || this.quake.fallingRocks.length > 0 || this.quake.chainPending
      || this.quake._restoreQueue.length > 0;
  }

  runSequence() {
    if (this.busy() || this.paused) { this.log("Sequence blocked: finish or reset the current encounter"); return; }
    this.sequence = { index: 0, waiting: false, nextAt: this.clockMs,
      deadline: this.clockMs + cfg.sequenceTimeoutMs, completed: false, failed: false };
    this.log("Six-encounter sequence requested");
  }

  updateSequence() {
    const run = this.sequence;
    if (!run || run.completed || run.failed) return;
    if (this.clockMs > run.deadline) {
      run.failed = true;
      this.log("SEQUENCE FAILED: encounter did not settle before the timeout");
      return;
    }
    if (run.waiting && !this.busy()) {
      run.waiting = false;
      run.index++;
      run.nextAt = this.clockMs + cfg.sequenceGapMs;
      run.deadline = run.nextAt + cfg.sequenceTimeoutMs;
      if (run.index === cfg.sequence.length) {
        run.completed = true;
        this.log("SEQUENCE COMPLETE: all six encounters finished");
      }
    } else if (!run.waiting && !run.completed && this.clockMs >= run.nextAt) {
      run.waiting = this.trigger(cfg.sequence[run.index], true);
      if (!run.waiting) { run.failed = true; this.log("SEQUENCE FAILED: requested encounter was blocked"); }
    }
  }

  updateWurm(delta) {
    const gates = readReviewGates(this);
    const tile = this.playerController.getPlayerTile();
    const body = this.playerController.physicsBody, ts = this.config.tileSize;
    this.graveborerWurmRuntime.lastGate = gates.activation;
    this.wurm.update(delta, { active: this.reviewWurm || gates.activation.active,
      playerTile: tile, depth: gates.activation.depth, worldWidthTiles: this.config.worldWidthTiles,
      playerBounds: { left: body.x / ts, right: (body.x + body.w) / ts,
        top: body.y / ts, bottom: (body.y + body.h) / ts } });
    handleGraveborerWurmEvents(this, this.graveborerWurmRuntime);
    if (!["dormant", "warning", "burrowing"].includes(this.wurm.phase)) this.reviewWurm = false;
    this.wurmView.update(this.wurm.getRenderState(this.clockMs), this.clockMs);
  }

  step(delta) {
    this.clockMs += delta;
    this.elapsedMs += delta;
    this.time.now = this.clockMs;
    this.syncConditions();
    moveReviewBody(this, delta);
    const tile = this.playerController.getPlayerTile();
    if (this.controls.mining && this.clockMs >= this.nextNoiseMs) {
      recordGraveborerWurmMiningNoise(this, "normal", tile);
      this.nextNoiseMs = this.clockMs + 1000;
    }
    const normal = this.controls.natural && (!this.sequence || this.sequence.completed || this.sequence.failed);
    if (normal || this.quake.state !== "idle" || this.quake._restoreQueue.length) {
      withReviewRandom(this.random, () => this.quake.update(delta));
    }
    if (normal || this.reviewWurm || ["warning", "burrowing"].includes(this.wurm.phase)) this.updateWurm(delta);
    if (!normal && this.shadow.state === "dormant") this.shadow.nextCheckAtMs = this.clockMs + this.shadow.profile.checkIntervalMs;
    this.shadow.update(this.clockMs, delta, tile, this.context());
    this.earthquakeHazardOverlay.update();
    this.earthquakeFeedbackUI.update();
    this.dynamicEventRuntime.update(this.clockMs);
    const completed = Object.values(this.dynamicEventRuntime.getHealthSnapshot().events).reduce((sum, row) => sum + row.completions, 0);
    if (this.controls.pauseOnResult && completed > this.lastCompletionCount) {
      this.paused = true;
      this.tweens.timeScale = 0;
      this.soundSystem?.stop();
      this.log("Paused on encounter result");
    }
    this.lastCompletionCount = completed;
    paintReviewTerrain(this);
    for (const [name, state] of Object.entries({
      shadow: this.shadow.state, wurm: this.wurm.phase, earthquake: this.quake.state })) {
      if (this.lastStates[name] !== state) {
        this.log(`${name}: ${state}`);
        this.lastStates[name] = state;
      }
    }
    this.updateSequence();
  }

  update(_time, delta) {
    if (!this.ready) return;
    if (!this.paused) {
      this.accumulator += Math.min(delta, cfg.maxFrameMs) * this.controls.speed;
      let steps = 0;
      while (this.accumulator >= cfg.stepMs && steps++ < cfg.maxStepsPerFrame) {
        try { this.step(cfg.stepMs); } catch (error) {
          this.runtimeError = error.message;
          this.paused = true;
          this.log("RUNTIME ERROR: " + error.message);
          this.soundSystem?.stop();
          console.error(error);
          break;
        }
        this.accumulator -= cfg.stepMs;
        if (this.paused) break;
      }
    }
    if (this.paused || this.clockMs >= this.nextPublishMs) {
      this.nextPublishMs = this.clockMs + cfg.refreshMs;
      this.publish(this.snapshot());
    }
  }

  snapshot() {
    return { reviewOnly: true, saveStorageUsed: false, ready: this.ready,
      elapsedMs: this.elapsedMs, paused: this.paused, runtimeError: this.runtimeError, controls: { ...this.controls },
      storage: window.eventLabStorage?.snapshot(),
      sequence: this.sequence ? { ...this.sequence } : null, metrics: { ...this.metrics, destroyed: this.worldModel.destroyedCount },
      retired: this.retired, loadErrors: [...this.loadErrors], gates: readReviewGates(this),
      shadow: this.shadow.getHealthSnapshot(), wurm: this.wurm.getSnapshot(),
      health: this.dynamicEventRuntime.getHealthSnapshot(),
      earthquake: this.quake.getStatus(), trace: [...this.trace] };
  }

  dispose() {
    this.dynamicEventRuntime?.destroy();
    this.earthquakeFeedbackUI?.destroy();
    this.dynamicEventRuntime = this.earthquakeFeedbackUI = null;
    this.shadow?.destroy();
    this.quake?.destroy();
    this.earthquakeHazardOverlay?.destroy();
    this.wurmView?.destroy();
    this.soundSystem?.destroy();
    this.shadow = this.quake = this.earthquakeHazardOverlay = this.wurmView = this.soundSystem = null;
  }
}
