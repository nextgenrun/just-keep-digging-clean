import { CORE_ACTION_AUDIO } from "../values/coreActionAudio.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  APPROVED_SFX_FAMILIES,
  AUDIO_CONFIG,
} from "../values/audioConfig.js";
import { SoundLibraryManager } from "./SoundLibraryManager.js";
import { VoiceLineManager } from "./VoiceLineManager.js";
import { RuntimeAudioAssetManager } from "./RuntimeAudioAssetManager.js";
import { MusicDirector } from "./MusicDirector.js";
import { MusicStreamController } from "./MusicStreamController.js";
import { EventVoiceLineDirector } from "./EventVoiceLineDirector.js";
import { ActiveSfxMixer } from "./ActiveSfxMixer.js";
import { ReviewedSfxController } from "./ReviewedSfxController.js";
import { ReviewedAmbienceController } from "./ReviewedAmbienceController.js";
import { REVIEWED_AUDIO_MIX } from "../values/reviewedAudioMix.js";
import { REVIEWED_AUDIO_ASSETS } from "../values/reviewedAudioAssets.js";
import { FreesoundAudioDirector } from "./FreesoundAudioDirector.js";
export class SoundSystem {
  constructor(scene) {
    this.scene = scene;
    this.config = AUDIO_CONFIG;

    this.audioContextUnlocked = false;
    this.waitingForUserGesture = false;
    this.audioInitialized = false;

    this.currentTrack = null;
    this.nextTrack = null;
    this.musicEnabled = true;
    this.isCrossfading = false;
    this.musicTrackTimer = null;
    this.currentTrackIndex = -1;

    this.sfxEnabled = true;
    this.lastFootstepTime = -Infinity;
    this.lastUiSelectTime = -Infinity;
    this.lastXpGatherTime = -Infinity;
    this.activeSeismicWarning = null;
    this.activeStarDestruction = null;
    this.activeLevelUpCue = null;

    this.voiceLineTimer = null;
    this.lastVoiceLineTime = 0;
    this.voiceLinesPlayedCount = 0;
    this.minVoiceLineInterval = this.config.voiceLineMinInterval;
    this.maxVoiceLineInterval = this.config.voiceLineMaxInterval;

    this.masterVolume = this.config.masterVolume;
    this.musicVolume = this.config.musicVolume;
    this.sfxVolume = this.config.sfxVolume;
    this.voiceVolume = this.config.voiceVolume;
    this.npcVoiceVolume = this.config.npcVoiceVolume;

    this.sfxCache = new Map();
    this.voiceLineCache = new Map();

    this.soundLibraryManager = new SoundLibraryManager(
      scene,
      Object.keys(APPROVED_SFX_FAMILIES),
    );
    this.voiceLineManager = new VoiceLineManager(scene, this);
    this.runtimeAudioAssetManager = new RuntimeAudioAssetManager(scene);
    this.musicDirector = new MusicDirector(this);
    this.musicStreamController = new MusicStreamController(this, this.runtimeAudioAssetManager);
    this.eventVoiceLineDirector = new EventVoiceLineDirector(scene, this);
    this.activeSfxMixer = new ActiveSfxMixer(this);
    this.reviewedSfx = new ReviewedSfxController(this);
    this.reviewedAmbience = new ReviewedAmbienceController(this);
    this.freesoundAudio = new FreesoundAudioDirector(this);
    this.voiceDucked = false;
    this._reviewedTick = (time, delta) => {
      this.freesoundAudio.updateFromScene(time, delta);
      this.reviewedAmbience.updateFromScene(time, delta);
    };
    this._suspendAudio = () => {
      this.activeSfxMixer.stopAll();
      this.reviewedSfx.stop();
      this.reviewedAmbience.stop();
      this.freesoundAudio.stop();
      this.scene.weatherSystem?.audioController?.stop?.();
    };
    this._audioVisibility = () => { if (typeof document !== "undefined" && document.hidden) this._suspendAudio(); };
  }

  init() {
    this.audioInitialized = false;
    console.log('[SoundSystem] Runtime audio uses a bounded current/next working set');
    this.scene.sound.volume = this.masterVolume;
    this.scene.events?.off?.("postupdate", this._reviewedTick);
    this.scene.events?.on?.("postupdate", this._reviewedTick);
    this.scene.events?.on?.("pause", this._suspendAudio);
    this.scene.events?.on?.("sleep", this._suspendAudio);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this._audioVisibility);
    this.tryUnlockAudioContext();
    console.log('[SoundSystem] Initialized - waiting for user interaction to start audio');
  }

  startAudioAfterUserGesture(options = {}) {
    const scheduleVoiceLines = options.voiceLines !== false;
    if (this.audioInitialized) {
      console.log('[SoundSystem] Audio already initialized, skipping startAudioAfterUserGesture');
      return;
    }
    this.audioInitialized = true;
    this.tryUnlockAudioContext();
    if (this.musicEnabled && !this.currentTrack) {
      this.startBackgroundMusic();
    }
    if (scheduleVoiceLines && this.eventVoiceLineDirector.shouldScheduleLegacyAmbient()) {
      console.log('[SoundSystem] Audio started after user gesture - scheduling legacy player voice lines');
      this.scheduleNextVoiceLine();
    } else if (scheduleVoiceLines) {
      console.log('[SoundSystem] Legacy random player voice lines are disabled; gameplay events own player speech');
    } else {
      console.log('[SoundSystem] Audio started after user gesture - voice lines disabled for this scene');
    }
  }

  startBackgroundMusic() {
    return this.musicStreamController.start();
  }

  crossfadeToNextTrack() {
    return this.musicStreamController.crossfade();
  }

  stopBackgroundMusic() {
    return this.musicStreamController.stop();
  }

  updateMusicContext(snapshot, options = {}) {
    this.freesoundAudio?.setContext(snapshot);
    return this.musicDirector.update(snapshot, options);
  }

  playMusicCue(cueId, options = {}) {
    return this.musicDirector.requestCue(cueId, options);
  }

  getMusicSnapshot() {
    return this.musicDirector.getSnapshot();
  }

  getSfxVolumeForKey(key) {
    return this.getSfxMixVolume() * this.getSfxCategoryGainForKey(key);
  }

  getSfxMixVolume() {
    return this.sfxEnabled ? this.sfxVolume * (this.voiceDucked ? this.config.voiceSfxDuckMultiplier : 1) : 0;
  }

  getMusicMixVolume() {
    return this.musicVolume * (this.voiceDucked ? this.config.voiceMusicDuckMultiplier : 1);
  }

  getVoiceMixVolume(isNpc = false) {
    return this.sfxEnabled ? this.voiceVolume * REVIEWED_AUDIO_MIX.voiceHeadroom * (isNpc ? this.npcVoiceVolume : 1) : 0;
  }

  refreshMixVolumes() {
    this.updateMusicVolume();
    this.activeSfxMixer.refresh();
    this.reviewedAmbience.bus.refreshVolume();
    this.freesoundAudio.refreshVolume();
    this.scene.weatherSystem?.audioController?.recordedAmbience?.bus?.refreshVolume?.();
    this.updateVoiceVolume();
  }

  getSfxCategoryGainForKey(key) {
    const baseVolume = 1;
    if (key.startsWith('footsteps-')) return baseVolume * this.config.footstepVolume;
    if (key.startsWith('dig-') || key.startsWith('tileBreak-') || key.startsWith('tileHit-')) return baseVolume * 0.7;
    switch (key) {
      case ASSET_KEYS.audio.sfx.footstep: return baseVolume * this.config.footstepVolume;
      case ASSET_KEYS.audio.sfx.dig: return baseVolume * this.config.digVolume;
      case ASSET_KEYS.audio.sfx.digStep: return baseVolume * this.config.digVolume * this.config.digStepVolumeMultiplier;
      case ASSET_KEYS.audio.sfx.tileBreak: return baseVolume * this.config.tileBreakVolume;
      case ASSET_KEYS.audio.sfx.tileHit: return baseVolume * this.config.tileHitVolume;
      case ASSET_KEYS.audio.sfx.copperCollect: return baseVolume * this.config.copperCollectVolume;
      case ASSET_KEYS.audio.sfx.reward: return baseVolume * this.config.rewardVolume;
      case ASSET_KEYS.audio.sfx.uiSelect: case ASSET_KEYS.audio.sfx.uiConfirm: return baseVolume * this.config.uiVolume;
      default: return baseVolume;
    }
  }

  _isUsableSound(sound) {
    return Boolean(sound && !sound.pendingDestroy && sound.manager);
  }

  _setSoundVolume(sound, volume, label = 'sound') {
    if (!this._isUsableSound(sound)) return false;
    try {
      sound.volume = volume;
      return true;
    } catch (error) {
      console.warn(`[SoundSystem] Skipped stale ${label} while updating volume`, error);
      return false;
    }
  }

  playSfx(key, volumeMultiplier = 1.0, options = {}) {
    if (!this.sfxEnabled) return null;
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[SoundSystem] Audio asset not available: ${key}`);
      return null;
    }
    try {
      // Create a new sound instance each time to allow overlapping playback.
      // Important for rapid dig sounds where multiple hits happen in quick succession.
      const sound = this.scene.sound.add(key, { 
        volume: 0,
        rate: Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1,
        pan: Math.max(-1, Math.min(1, Number(options.pan) || 0)),
      });
      const priority = options.priority ?? (REVIEWED_AUDIO_MIX.protectedKeyParts.some(part => key.toLowerCase().includes(part))
        ? REVIEWED_AUDIO_MIX.protectedPriority : REVIEWED_AUDIO_MIX.defaultPriority);
      const admitted = this.activeSfxMixer.add(sound,
        Math.max(0, volumeMultiplier) * (options.rawGain ? 1 : this.getSfxCategoryGainForKey(key)),
        options.sourcePeak ?? 1, priority);
      if (!admitted) { sound.destroy(); return null; }
      sound.once('complete', () => {
        try { sound.destroy(); } catch (_) {}
      });
      sound.play();
      return sound;
    } catch (error) {
      console.warn(`[SoundSystem] Failed to play sound effect: ${key}`, error);
      return null;
    }
  }

  playFirstAvailableSfx(keys, volumeMultiplier = 1.0, options = {}) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const key = keys.find((candidate) => this.scene.cache.audio.exists(candidate));
    return key ? this.playSfx(key, volumeMultiplier, options) : null;
  }

  playUiSelect() {
    return this.reviewedSfx.play("libUiHover");
  }

  playUiClick() { return this.freesoundAudio.play("uiClick", { context: "interface" }, () => this.reviewedSfx.play("libUiClick")); }
  playMenuOpen() { return this.freesoundAudio.play("uiMechanical", { context: "interface" }, () => this.reviewedSfx.play("libMenuOpen")); }
  playPurchase() { return this.freesoundAudio.play("coinReward", {}, () => this.reviewedSfx.play("libPurchaseCoin")); }
  playCoinReward() { return this.freesoundAudio.play("coinPickup", {}, () => this.reviewedSfx.play("libRewardCoins")); }
  playResourcePickup() { return this.reviewedSfx.play("libResourcePop"); }
  playManualSave() { return this.freesoundAudio.play("uiMechanical", { context: "interface" }, () => this.reviewedSfx.play("libSaveCard")); }
  playTorchExtinguish() { return this.reviewedSfx.play("libTorchReact"); }
  playDigSwing() { return this.reviewedSfx.play("libDirtSwingA", { gain: CORE_ACTION_AUDIO.swingGain }); }
  stopTrackedSfx(sound) { this.activeSfxMixer.stop(sound); }

  playUiConfirm() {
    return this.freesoundAudio.play("uiMechanical", { context: "interface" }, () => this.reviewedSfx.play("libUiConfirm"));
  }

  playXpGather({ special = false, levelUp = false, segmentIndex = 0 } = {}) {
    const now = Number(this.scene.time?.now) || 0;
    if (now - this.lastXpGatherTime < this.config.xpGatherMinIntervalMs) return null;
    this.lastXpGatherTime = now;
    const safeSegment = Math.max(
      0,
      Math.min(this.config.xpGatherMaxSegmentIndex, Math.floor(Number(segmentIndex) || 0)),
    );
    const rate = this.config.xpGatherBaseRate
      + safeSegment * this.config.xpGatherSegmentRateStep
      + (levelUp ? this.config.xpGatherLevelRateBoost : 0);
    const volume = special || levelUp
      ? this.config.xpGatherSpecialVolumeMultiplier
      : this.config.xpGatherVolumeMultiplier;
    return this.playFirstAvailableSfx([ASSET_KEYS.audio.sfx.uiSelect], volume, { rate });
  }

  playLevelUpReward() {
    this.stopLevelUpReward();
    const sound = this.playApprovedSfxFamily(
      "levelUpReward",
      this.config.levelUpRewardVolume,
    );
    this.activeLevelUpCue = sound;
    sound?.once?.("complete", () => {
      if (this.activeLevelUpCue === sound) this.activeLevelUpCue = null;
    });
    return sound;
  }

  playLegendReward() {
    this.stopLevelUpReward();
    const asset = REVIEWED_AUDIO_ASSETS.levelUpEpic;
    if (!asset) return this.playLevelUpReward();
    const sound = this.playSfx(
      asset.key,
      this.config.levelUpRewardVolume,
      { sourcePeak: asset.peak ?? 1 },
    );
    this.activeLevelUpCue = sound;
    sound?.once?.("complete", () => {
      if (this.activeLevelUpCue === sound) this.activeLevelUpCue = null;
    });
    return sound;
  }

  stopLevelUpReward() {
    const sound = this.activeLevelUpCue;
    this.activeLevelUpCue = null;
    this.stopTrackedSfx(sound);
  }

  playVoiceLine(key) {
    if (!this.sfxEnabled) { console.log('[SoundSystem] Voice line skipped - SFX disabled'); return null; }
    if (!this.scene.cache.audio.exists(key)) {
      console.error(`[SoundSystem] ERROR: Voice line asset not available: ${key}`);
      return null;
    }
    try {
      let sound = this.voiceLineCache.get(key);
      if (sound && !this._isUsableSound(sound)) { this.voiceLineCache.delete(key); sound = null; }
      if (!sound) {
        sound = this.scene.sound.add(key, { volume: this.getVoiceMixVolume() });
        this.voiceLineCache.set(key, sound);
      }
      sound.play();
      this.lastVoiceLineTime = this.scene.time.now;
      this.voiceLinesPlayedCount++;
      console.log(`[SoundSystem] ✓ Voice line playing: ${key} (total played: ${this.voiceLinesPlayedCount})`);
      return sound;
    } catch (error) {
      console.error(`[SoundSystem] ERROR: Failed to play voice line: ${key}`, error);
      return null;
    }
  }

  loadVoiceLineAsset(entry, onReady, onError = null) {
    return this.runtimeAudioAssetManager.ensure(entry, {
      onReady,
      onError: (asset, error) => {
        console.warn(`[SoundSystem] Voice line load failed: ${asset?.key || entry?.key}`, error);
        onError?.(asset, error);
      },
    });
  }

  prefetchVoiceLine(library, selectedEntry) {
    return this.runtimeAudioAssetManager.prefetchVoiceLine(library, selectedEntry);
  }

  noteVoiceLineUse(key) {
    this.runtimeAudioAssetManager.noteVoiceUse(key, this.voiceLineManager?.currentVoiceLineKey);
  }

  getRuntimeAudioSnapshot() {
    return this.runtimeAudioAssetManager.snapshot();
  }

  playRandomVoiceLine() {
    const timestamp = new Date().toISOString();
    if (!this.sfxEnabled) {
      console.log(`[${timestamp}] [SoundSystem] Voice line skipped - SFX disabled`);
      return null;
    }
    if (!this.audioInitialized) {
      console.error(`[${timestamp}] [SoundSystem] ERROR: Voice line skipped - audio not initialized!`);
      return null;
    }
    return this.playRandomPlayerVoiceLine();
  }

  getRandomVoiceLineInterval() {
    return Phaser.Math.Between(this.minVoiceLineInterval, this.maxVoiceLineInterval);
  }

  scheduleNextVoiceLine(delayOverrideMs = null) {
    if (!this.eventVoiceLineDirector.shouldScheduleLegacyAmbient()) {
      this.stopVoiceLineTimer();
      return null;
    }
    if (this.voiceLineTimer) { this.voiceLineTimer.remove(); this.voiceLineTimer = null; }
    const interval = delayOverrideMs ?? this.getRandomVoiceLineInterval();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SoundSystem] Next voice line scheduled in ${interval}ms`);
    this.voiceLineTimer = this.scene.time.delayedCall(interval, () => {
      this.playRandomVoiceLine();
      this.scheduleNextVoiceLine(
        this.eventVoiceLineDirector.getAmbientRetryDelayMs(),
      );
    });
  }

  stopVoiceLineTimer() {
    if (this.voiceLineTimer) {
      console.log('[SoundSystem] Stopping voice line timer');
      this.voiceLineTimer.remove();
      this.voiceLineTimer = null;
    }
  }

  groundAudioMaterial(controller, worldModel) {
    const body = controller?.physicsBody;
    const size = worldModel?.tileSize || this.scene.config?.tileSize;
    return body && size ? worldModel?.getTileType?.(
      Math.floor((body.x + (body.width || 0) / 2) / size),
      Math.floor((body.y + (body.height || 0)) / size + this.freesoundAudio.config.floorProbeTiles),
    ) : null;
  }

  playFootstep({ controller = this.scene.playerController, worldModel = this.scene.worldModel, landingGain = null } = {}) {
    if (!this.sfxEnabled || !this.audioInitialized || this.audioSuspended || !controller?.isGrounded?.()) return null;
    if (landingGain === null && Math.abs(controller.physicsBody?.vx || 0) < CORE_ACTION_AUDIO.minWalkSpeed) return null;
    const now = this.freesoundAudio.now();
    if (now - this.lastFootstepTime < CORE_ACTION_AUDIO.minFootstepMs) return null;
    const fallback = () => {
      const soundKey = this.soundLibraryManager.getRandomSound('footsteps');
      return soundKey && this.soundLibraryManager.soundExists(soundKey)
        ? this.playSfx(soundKey, landingGain ?? CORE_ACTION_AUDIO.legacyFootstepGain) : null;
    };
    const floor = this.groundAudioMaterial(controller, worldModel);
    const sound = this.freesoundAudio.config.softTypes.includes(floor)
      ? this.freesoundAudio.play("footstepDirt", { gain: landingGain ?? 1,
        group: landingGain === null ? "footstep" : "landing", cooldownKey: "ground-contact" }, fallback) : fallback();
    if (sound) this.lastFootstepTime = now;
    return sound;
  }

  playLanding(controller, speed, worldModel = this.scene.worldModel) {
    const strength = Math.max(0.3, Math.min(1, speed / REVIEWED_AUDIO_MIX.landing.fullSpeed));
    this.reviewedSfx.stop("footstep");
    if (speed < CORE_ACTION_AUDIO.hardLandingSpeed) {
      return this.playFootstep({ controller, worldModel, landingGain: strength * CORE_ACTION_AUDIO.landingFootstepGain });
    }
    const soft = this.freesoundAudio.config.softTypes.includes(this.groundAudioMaterial(controller, worldModel));
    const sound = this.reviewedSfx.play(soft ? "libDirtBreak" : "libLandingDebris", {
      group: "landing", cooldownKey: "landing", gain: strength * CORE_ACTION_AUDIO.hardLandingGain,
    });
    if (sound) this.lastFootstepTime = this.freesoundAudio.now();
    return sound;
  }

  playDig(options = {}) {
    this.freesoundAudio.noteAction();
    const role = this.freesoundAudio.materialRole(options.tileType);
    const id = role === "mineEarth" ? this.reviewedSfx.choose("dig", ["digOne", "digTwo"]) : "libToolContact";
    return this.freesoundAudio.play(role, { ...options, group: "contact", cooldownKey: "dig-contact" },
      () => this.reviewedSfx.play(id, { ...options, group: "contact", cooldownKey: "dig-contact",
        gain: (options.gain ?? 1) * CORE_ACTION_AUDIO.fallbackContactGain }));
  }

  playTileBreak(options = {}) {
    this.freesoundAudio.noteAction();
    const id = REVIEWED_AUDIO_MIX.softMaterialTypes.includes(options.tileType) ? "libDirtBreak" : "libStoneBreak";
    const fallback = () => this.reviewedSfx.play(id, { ...options,
      gain: Math.min(1.2, options.volume ?? 1) * CORE_ACTION_AUDIO.breakGain });
    return this.freesoundAudio.isCrystal(options.tileType)
      ? this.freesoundAudio.play("crystalBreak", { ...options, gain: options.volume ?? options.gain ?? 1 }, fallback) : fallback();
  }

  playTileHit(options = {}) {
    return this.reviewedSfx.play("libToolContact", options);
  }

  playStarDig() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('starDig');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) {
      return this.playSfx(soundKey, this.config.starDigVolume);
    }
    return null;
  }

  playStarDestruction() {
    this.freesoundAudio.stars.consumed(this.freesoundAudio.now());
    this.stopStarDestruction();
    const sound = this.playApprovedSfxFamily(
      "starDestruction",
      this.config.starDestructionVolume,
    );
    this.activeStarDestruction = sound;
    sound?.once?.("complete", () => {
      if (this.activeStarDestruction === sound) this.activeStarDestruction = null;
    });
    return sound;
  }

  stopStarDestruction() {
    const sound = this.activeStarDestruction;
    this.activeStarDestruction = null;
    this.stopTrackedSfx(sound);
  }

  playApprovedSfxFamily(libraryName, volumeMultiplier = 1, options = {}) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound(libraryName);
    if (!soundKey || !this.soundLibraryManager.soundExists(soundKey)) return null;
    const entry = this.soundLibraryManager.getSoundEntry(libraryName, soundKey);
    const assetVolume = Number.isFinite(entry?.volumeMultiplier)
      ? entry.volumeMultiplier
      : 1;
    const reviewed = Object.values(REVIEWED_AUDIO_ASSETS).find(asset => asset.key === soundKey);
    return this.playSfx(soundKey, volumeMultiplier * assetVolume, {
      sourcePeak: reviewed?.peak ?? 1, ...options,
    });
  }

  playSeismicWarning(proximity = 1) {
    const sound = this.reviewedSfx.play("libFarCollapse", { gain: Math.max(0, Math.min(1, proximity)) });
    if (!sound) return null;
    this.activeSeismicWarning = sound;
    sound?.once?.("complete", () => {
      if (this.activeSeismicWarning === sound) this.activeSeismicWarning = null;
    });
    return sound;
  }

  playHardcoreNearDeath() {
    const sound = this.reviewedSfx.play("libPressureRumble", { gain: 1.15 });
    if (!sound) return null;
    this.activeSeismicWarning = sound;
    sound?.once?.("complete", () => {
      if (this.activeSeismicWarning === sound) this.activeSeismicWarning = null;
    });
    return sound;
  }

  playHardcoreStressWarning(critical = false) {
    const sound = this.reviewedSfx.play(critical ? "libPressureRumble" : "libSupportCreak");
    if (!sound) return null;
    this.activeSeismicWarning = sound;
    sound?.once?.("complete", () => {
      if (this.activeSeismicWarning === sound) this.activeSeismicWarning = null;
    });
    return sound;
  }

  stopSeismicWarning() {
    const sound = this.activeSeismicWarning;
    this.activeSeismicWarning = null;
    this.stopTrackedSfx(sound);
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.scene.sound.volume = this.masterVolume;
    this.updateMusicVolume();
    this.updateVoiceVolume();
    // Phaser's master stage changes all currently playing voices immediately.
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  updateMusicVolume() {
    if (this.currentTrack && !this._isUsableSound(this.currentTrack)) this.currentTrack = null;
    if (this.nextTrack && !this._isUsableSound(this.nextTrack)) this.nextTrack = null;
    this.musicStreamController.refreshVolume();
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.refreshMixVolumes();
  }

  setVoiceVolume(volume) {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
    this.updateVoiceVolume();
  }

  updateVoiceVolume() {
    const volume = this.getVoiceMixVolume();
    for (const [key, sound] of this.voiceLineCache) {
      if (!this._setSoundVolume(sound, volume, `voice line ${key}`)) {
        this.voiceLineCache.delete(key);
      }
    }
    const currentVoiceLine = this.voiceLineManager?.currentVoiceLine;
    if (currentVoiceLine && !this._setSoundVolume(currentVoiceLine,
      this.getVoiceMixVolume(this.voiceLineManager.currentVoiceIsNpc), 'current voice line')) {
      this.voiceLineManager.currentVoiceLine = null;
    }
  }

  applySettings(settings = {}) {
    if (Object.prototype.hasOwnProperty.call(settings, 'masterVolume')) this.setMasterVolume(settings.masterVolume);
    if (Object.prototype.hasOwnProperty.call(settings, 'musicVolume')) this.setMusicVolume(settings.musicVolume);
    if (Object.prototype.hasOwnProperty.call(settings, 'sfxVolume')) this.setSfxVolume(settings.sfxVolume);
    if (Object.prototype.hasOwnProperty.call(settings, 'voiceVolume')) this.setVoiceVolume(settings.voiceVolume);
    if (Object.prototype.hasOwnProperty.call(settings, 'musicEnabled')) this.toggleMusic(Boolean(settings.musicEnabled));
    if (Object.prototype.hasOwnProperty.call(settings, 'sfxEnabled')) this.toggleSfx(Boolean(settings.sfxEnabled));
  }

  toggleMusic(enabled) {
    this.musicEnabled = enabled;
    if (enabled && this.audioInitialized && !this.currentTrack) this.startBackgroundMusic();
    else if (!enabled) this.stopBackgroundMusic();
  }

  toggleSfx(enabled) {
    this.sfxEnabled = enabled;
    if (!enabled) {
      this._suspendAudio();
      this.voiceLineManager?.stopCurrentVoiceLine?.();
    }
    this.refreshMixVolumes();
    console.log(`[SoundSystem] SFX ${enabled ? 'enabled' : 'disabled'} (includes voice lines)`);
  }

  tryUnlockAudioContext() {
    if (this.audioContextUnlocked) return;
    const audioContext = this.scene.sound.context;
    if (!audioContext) { console.warn('[SoundSystem] Audio context not available'); return; }
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    try {
      source.start(0);
      this.audioContextUnlocked = true;
      console.log('[SoundSystem] Audio context unlocked successfully');
    } catch (error) {
      console.log('[SoundSystem] Audio context requires user interaction, will unlock on first user gesture');
      this.waitingForUserGesture = true;
      const unlockHandler = () => {
        if (this.audioContextUnlocked) return;
        try {
          source.start(0);
          this.audioContextUnlocked = true;
          console.log('[SoundSystem] Audio context unlocked via user gesture');
          if (this.musicEnabled && this.audioInitialized && !this.currentTrack) this.startBackgroundMusic();
        } catch (e) { console.warn('[SoundSystem] Failed to unlock audio context:', e); }
        this.scene.game.canvas.removeEventListener('click', unlockHandler);
        this.scene.game.canvas.removeEventListener('keydown', unlockHandler);
        this.scene.game.canvas.removeEventListener('touchstart', unlockHandler);
        this._unlockHandler = null;
      };
      this._unlockHandler = unlockHandler;
      this.scene.game.canvas.addEventListener('click', unlockHandler);
      this.scene.game.canvas.addEventListener('keydown', unlockHandler);
      this.scene.game.canvas.addEventListener('touchstart', unlockHandler);
    }
  }

  loadSoundLibraries() {
    const digCount = 7;
    for (let i = 0; i < digCount; i++) {
      const key = `dig-${i}`;
      if (this.scene.cache.audio.exists(key)) {
        this.soundLibraryManager.libraries.dig.push({ key, file: `dig-${i}`, path: `sound/soundEffects/costume-sounds/dig/dig-${i}.wav` });
      }
    }
    const footstepCount = 4;
    for (let i = 0; i < footstepCount; i++) {
      const key = `footsteps-${i}`;
      if (this.scene.cache.audio.exists(key)) {
        this.soundLibraryManager.libraries.footsteps.push({ key, file: `footstep-${i}`, path: `sound/soundEffects/costume-sounds/footsteps/footstep-${i}.wav` });
      }
    }
    const tileBreakCount = 1;
    for (let i = 0; i < tileBreakCount; i++) {
      const key = `tileBreak-${i}`;
      if (this.scene.cache.audio.exists(key)) {
        this.soundLibraryManager.libraries.tileBreak.push({ key, file: `tileBreak-${i}`, path: `sound/soundEffects/costume-sounds/tile-break/tileBreak-${i}.wav` });
      }
    }
    const tileHitCount = 1;
    for (let i = 0; i < tileHitCount; i++) {
      const key = `tileHit-${i}`;
      if (this.scene.cache.audio.exists(key)) {
        this.soundLibraryManager.libraries.tileHit.push({ key, file: `tileHit-${i}`, path: `sound/soundEffects/costume-sounds/hit-reource-tile/tileHit-${i}.wav` });
      }
    }
    if (!this.soundLibraryManager.libraries.starDig) this.soundLibraryManager.libraries.starDig = [];
    if (this.scene.cache.audio.exists('dig-star-0')) {
      this.soundLibraryManager.libraries.starDig.push({ key: 'dig-star-0', file: 'dig-star-0', path: 'sound/soundEffects/costume-sounds/dig/dig-star/MUSCChim_Chimes dream 3 (ID 2081)_BigSoundBank.com.ogg' });
    }

    for (const [libraryName, assets] of Object.entries(APPROVED_SFX_FAMILIES)) {
      for (const asset of assets) {
        if (this.scene.cache.audio.exists(asset.key)) {
          this.soundLibraryManager.libraries[libraryName].push(asset);
        }
      }
    }

    const totalLoaded = Object.values(this.soundLibraryManager.libraries)
      .reduce((total, library) => total + library.length, 0);
    console.log(`[SoundSystem] Populated ${totalLoaded} sound effect libraries from pre-loaded cache`);
  }

  loadVoiceLineLibraries() {
    const playerRandomFiles = ASSET_KEYS.audio.voiceLines.playerRandomFiles;
    this.voiceLineManager.loadLibrary('player', 'random', 'sound/voice-lines/player-voice-lines/random-voice-lines/', playerRandomFiles);

    const moneyMonsterFiles = ['c1coj-ox77x.wav', 'jmukr-6e0r4.wav', 'money-monster-voice.wav', 'money-monster-voice(1).wav', 'money-monster-voice(2).wav', 'money-monster-voice(3).wav', 'money-monster-voice(4).wav', 'money-monster-voice(5).wav', 'sjm2f-q0axa.wav'];
    this.voiceLineManager.loadLibrary('npc', 'moneyMonster', 'sound/voice-lines/npc-voicelines/voice-lines-money-monster/', moneyMonsterFiles);

    const gearUpgradeFiles = ['gear-upgrades.wav', 'gear-upgrades2.wav', 'gear-upgrades2(1).wav', 'gear-upgrades3.wav', 'gear-upgrades3(1).wav', 'gear-upgrades3(2).wav'];
    this.voiceLineManager.loadLibrary('npc', 'gearUpgrades', 'sound/voice-lines/npc-voicelines/gear-upgrade-npc-voicelines/', gearUpgradeFiles);

    // === UPDATE-2 VOICELINES ===
    // Extended voice lines for playerUpgrades NPC: 34 files from update-2.
    const playerUpgradeUpdate2Files = [
      'update-2/Big One Coming for You.wav',
      'update-2/Big One Coming for You(1).wav',
      'update-2/Big Upgrade.wav',
      'update-2/Big Upgrade(1).wav',
      'update-2/Dead in the Dark.wav',
      'update-2/Dead in the Dark(1).wav',
      'update-2/Dont Press N Key.wav',
      'update-2/Dont You Dare.wav',
      'update-2/Dwarf Uplifted.wav',
      'update-2/Dwarf Uplifted(1).wav',
      'update-2/Dwarf Villager.wav',
      'update-2/Dwarf Villager(1).wav',
      'update-2/got poop in my glasses dont make any pas.wav',
      'update-2/Got That Heavy Punch.wav',
      'update-2/Hey.wav',
      'update-2/Hey(1).wav',
      'update-2/I Got Many Yooo.wav',
      'update-2/I Got Nightmares Every Day.wav',
      'update-2/I Like Big.wav',
      'update-2/I Like Big(1).wav',
      'update-2/I Like Guys.wav',
      'update-2/I Like Guys(1).wav',
      'update-2/I Will Haunt You.wav',
      'update-2/I Will Haunt You(1).wav',
      'update-2/I Will Haunt You(2).wav',
      'update-2/Nightmare in my brain.wav',
      "update-2/They Ask Me Why I'm Happy.wav",
      "update-2/They Ask Me Why I'm Happy(1).wav",
      'update-2/We make a big hit.wav',
      'update-2/Why am I happy_.wav',
      'update-2/Why am I happy_(1).wav',
      'update-2/Yes yes yo yes yo.wav',
      'update-2/Yes yes yo yes yo(1).wav'
    ];
    // Merge original + update-2 files: original (0-2) + update-2 (3-36) = 37 total
    const playerUpgradeFiles = [
      'player-upgrades.wav', 'player-upgrades(1).wav', 'player-upgrades(2).wav',
      ...playerUpgradeUpdate2Files
    ];
    this.voiceLineManager.loadLibrary('npc', 'playerUpgrades', 'sound/voice-lines/npc-voicelines/player-upgrade-npc-voicelines/', playerUpgradeFiles);

    // === GEM MERCHANT UPDATE-2 VOICELINES ===
    // New voice lines for gemPowerMerchant — previously had no voice lines
    const gemMerchantUpdate2Files = [
      'update-2/A A A A A A.wav',
      'update-2/A A A A A A(1).wav',
      'update-2/Beyond 1000 Meter Lies the.wav',
      'update-2/Beyond 1000 Meter Lies the(1).wav',
      'update-2/Creepy Creep.wav',
      'update-2/Creepy Creep(1).wav',
      'update-2/Dark_ Darkness_ Demon_.wav',
      'update-2/Dark_ Darkness_ Demon_(1).wav',
      'update-2/Dig Deeper.wav',
      'update-2/Dig Deeper(1).wav',
      'update-2/Dont Dig Too Deep.wav',
      'update-2/Dont Dig Too Deep(1).wav',
      'update-2/Evil Laugh.wav',
      'update-2/Evil Laugh(1).wav',
      'update-2/Glad too see you!.wav',
      'update-2/Glad too see you!(1).wav',
      'update-2/Glad too see you!(2).wav',
      'update-2/I am the nightmare.wav',
      'update-2/I Got the Power for You!.wav',
      'update-2/I Got the Power for You!(1).wav',
      'update-2/I was born too glow AND.wav',
      'update-2/I was born too glow AND(1).wav',
      'update-2/I wish I was mortal.wav',
      'update-2/I wish I was mortal(1).wav',
      'update-2/I Wish This Stupid Dwarf Would.wav',
      'update-2/I Wish This Stupid Dwarf Would(1).wav',
      'update-2/My Existence is Agony.wav',
      'update-2/My Existence is Agony(1).wav',
      'update-2/Oke, Yes Oke.wav',
      'update-2/Oke, Yes Oke(1).wav',
      'update-2/That God Dam Happy Dwarf.wav',
      'update-2/The 300 Meter Mark.wav',
      'update-2/The 300 Meter Mark(1).wav',
      'update-2/The Caves They Rumble Under My.wav',
      'update-2/The Caves They Rumble Under My(1).wav',
      'update-2/The Gem Burns.wav',
      'update-2/The Gem Burns(1).wav',
      'update-2/The Gem, It Holds Great Power!.wav',
      'update-2/The Gem, It Holds Great Power!(1).wav',
      'update-2/The Gem.wav',
      'update-2/The Gem(1).wav',
      'update-2/The Gem(2).wav',
      'update-2/The Truth Is Sometimes Upside.wav',
      'update-2/The Truth Is Sometimes Upside(1).wav',
      'update-2/They Say I\'m a Monster.wav',
      'update-2/They Say I\'m a Monster(1).wav',
      'update-2/This Gem It Hurts Me.wav',
      'update-2/To the Core.wav',
      'update-2/To the Core(1).wav',
      'update-2/U want the power.wav',
      'update-2/U want the power(1).wav',
      'update-2/Where Are Your Shoes_.wav',
      'update-2/Where Are Your Shoes_(1).wav'
    ];
    this.voiceLineManager.loadLibrary('npc', 'gemPowerMerchant', 'sound/voice-lines/npc-voicelines/gem-merchant-voice-lines/', gemMerchantUpdate2Files);

    const boboFiles = ['Bobo2.wav', 'Bobo2(1).wav', 'Bobo2(2).wav', 'Bobo2(3).wav', 'Bobo2(4).wav', 'Bobo2(5).wav'];
    this.voiceLineManager.loadLibrary('npc', 'boboMerchant', 'sound/voice-lines/npc-voicelines/bobo-voice-lines/', boboFiles);

    // Update total count: playerRandom + moneyMonster + gearUpgrades + playerUpgrades + gemMerchant
    const playerUpgradeTotal = playerUpgradeFiles.length;
    const gemMerchantTotal = gemMerchantUpdate2Files.length;
    const totalVoiceLines = playerRandomFiles.length + moneyMonsterFiles.length
      + gearUpgradeFiles.length + playerUpgradeTotal + gemMerchantTotal + boboFiles.length;
    console.log(`[SoundSystem] Registered ${totalVoiceLines} voice lines from voice-lines directories`);
  }

  playNPCVoiceLine(npcName) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.eventVoiceLineDirector.requestMerchantOpen(npcName);
  }

  playRandomPlayerVoiceLine() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.eventVoiceLineDirector.requestAmbient();
  }

  playEventVoiceLine(eventId, context = {}) {
    return this.playPlayerVoiceEvent(eventId, context);
  }

  playPlayerVoiceEvent(eventId, context = {}) {
    this.musicDirector?.handleVoiceEvent?.(eventId, {
      ...context,
      now: this.scene.time?.now,
    });
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.eventVoiceLineDirector.requestEvent(eventId, context);
  }

  getPlayerVoiceSnapshot() {
    return this.eventVoiceLineDirector.getSnapshot();
  }

  playNarrationVoiceLine(entry, cueId = entry?.key) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.eventVoiceLineDirector.requestNarration(entry, cueId);
  }

  onVoiceLineIdle(result = {}) {
    this.eventVoiceLineDirector?.onChannelIdle(result);
  }

  printStats() {
    const sfxStats = this.soundLibraryManager.getStats();
    const voiceStats = this.voiceLineManager.getStats();
    const musicStats = ASSET_KEYS.audio.music.playlist.length;
    console.log(`[SoundSystem] Stats — SFX: ${JSON.stringify(sfxStats)}, Voice: ${JSON.stringify(voiceStats)}, Music tracks: ${musicStats}`);
  }

  destroy() {
    console.log('[SoundSystem] Destroying sound system');
    this.scene.events?.off?.("postupdate", this._reviewedTick);
    this.scene.events?.off?.("pause", this._suspendAudio);
    this.scene.events?.off?.("sleep", this._suspendAudio);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this._audioVisibility);
    this.reviewedSfx.destroy();
    this.reviewedAmbience.destroy();
    this.activeSfxMixer.stopAll();
    this.freesoundAudio.destroy();
    this.stopLevelUpReward();
    this.stopStarDestruction();
    this.stopSeismicWarning();
    this.stopVoiceLineTimer();
    this.eventVoiceLineDirector?.destroy();
    this.voiceLineManager?.destroy();
    this.musicStreamController?.destroy();
    this.musicDirector?.destroy();
    this.runtimeAudioAssetManager?.destroy();
    // Kill any remaining tweens targeting cached sounds to prevent "Cannot set properties of null (setting 'volume')"
    for (const [key, sound] of this.sfxCache) {
      this.scene?.tweens?.killTweensOf(sound);
    }
    for (const [key, sound] of this.voiceLineCache) {
      this.scene?.tweens?.killTweensOf(sound);
    }
    this.sfxCache.clear();
    this.voiceLineCache.clear();
    if (this._unlockHandler && this.scene?.game?.canvas) {
      this.scene.game.canvas.removeEventListener('click', this._unlockHandler);
      this.scene.game.canvas.removeEventListener('keydown', this._unlockHandler);
      this.scene.game.canvas.removeEventListener('touchstart', this._unlockHandler);
      this._unlockHandler = null;
    }
  }
}
