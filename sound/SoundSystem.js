import { ASSET_KEYS } from "../values/assetKeys.js";
import { AUDIO_CONFIG } from "../values/audioConfig.js";
import { SoundLibraryManager } from "./SoundLibraryManager.js";
import { VoiceLineManager } from "./VoiceLineManager.js";
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
    this.lastFootstepTime = 0;

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

    this.soundLibraryManager = new SoundLibraryManager(scene);
    this.voiceLineManager = new VoiceLineManager(scene, this);
  }

  init() {
    this.audioInitialized = false;
    console.log('[SoundSystem] Skipping pre-cache - using library system for on-demand loading');
    this.scene.sound.volume = this.masterVolume;
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
    if (scheduleVoiceLines) {
      console.log('[SoundSystem] Audio started after user gesture - scheduling voice lines');
      this.scheduleNextVoiceLine();
    } else {
      console.log('[SoundSystem] Audio started after user gesture - voice lines disabled for this scene');
    }
  }

  startBackgroundMusic() {
    if (!this.musicEnabled) return;
    this.currentTrackIndex = Math.floor(Math.random() * ASSET_KEYS.audio.music.playlist.length);
    const startTrackKey = ASSET_KEYS.audio.music.playlist[this.currentTrackIndex];
    if (!this.scene.cache.audio.exists(startTrackKey)) {
      console.warn(`[SoundSystem] Music track not available: ${startTrackKey}`);
      return;
    }
    this.currentTrack = this.scene.sound.add(startTrackKey, { volume: 0, loop: false });
    this.currentTrack.play();
    this.scene.tweens.add({
      targets: this.currentTrack, volume: this.musicVolume * this.masterVolume, duration: 2000, ease: 'Sine.easeIn',
    });
    this.currentTrack.on('complete', () => this.crossfadeToNextTrack());
    this.musicTrackTimer = this.scene.time.delayedCall(
      this.config.musicTrackChangeInterval, () => {
        if (this.currentTrack && this.currentTrack.isPlaying) this.crossfadeToNextTrack();
      }
    );
  }

  crossfadeToNextTrack() {
    if (!this.musicEnabled || this.isCrossfading) return;
    this.isCrossfading = true;
    if (this.musicTrackTimer) { this.musicTrackTimer.remove(); this.musicTrackTimer = null; }
    const oldTrack = this.currentTrack;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * ASSET_KEYS.audio.music.playlist.length);
    } while (nextIndex === this.currentTrackIndex && ASSET_KEYS.audio.music.playlist.length > 1);
    this.currentTrackIndex = nextIndex;
    const nextTrackKey = ASSET_KEYS.audio.music.playlist[this.currentTrackIndex];
    if (!this.scene.cache.audio.exists(nextTrackKey)) {
      console.warn(`[SoundSystem] Music track not available: ${nextTrackKey}`);
      this.isCrossfading = false;
      return;
    }
    this.currentTrack = this.scene.sound.add(nextTrackKey, { volume: 0, loop: false });
    this.currentTrack.play();
    if (oldTrack) {
      this.scene.tweens.add({
        targets: oldTrack, volume: 0, duration: 2000, ease: 'Sine.easeOut',
        onComplete: () => { oldTrack.stop(); oldTrack.destroy(); }
      });
    }
    this.scene.tweens.add({
      targets: this.currentTrack, volume: this.musicVolume * this.masterVolume, duration: 2000, ease: 'Sine.easeIn',
      onComplete: () => { this.isCrossfading = false; }
    });
    this.currentTrack.on('complete', () => this.crossfadeToNextTrack());
    this.musicTrackTimer = this.scene.time.delayedCall(
      this.config.musicTrackChangeInterval, () => {
        if (this.currentTrack && this.currentTrack.isPlaying) this.crossfadeToNextTrack();
      }
    );
  }

  stopBackgroundMusic() {
    if (this.musicTrackTimer) { this.musicTrackTimer.remove(); this.musicTrackTimer = null; }
    if (this.currentTrack) {
      this.scene?.tweens?.killTweensOf(this.currentTrack);
      this.currentTrack.stop(); this.currentTrack.destroy(); this.currentTrack = null;
    }
    if (this.nextTrack) {
      this.scene?.tweens?.killTweensOf(this.nextTrack);
      this.nextTrack.stop(); this.nextTrack.destroy(); this.nextTrack = null;
    }
    this.isCrossfading = false;
  }

  getSfxVolumeForKey(key) {
    const baseVolume = this.sfxVolume * this.masterVolume;
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
        volume: this.getSfxVolumeForKey(key) * volumeMultiplier,
        rate: Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1,
      });
      sound.once('complete', () => {
        try { sound.destroy(); } catch (_) {}
      });
      sound.once('destroy', () => {});
      sound.play();
      return sound;
    } catch (error) {
      console.warn(`[SoundSystem] Failed to play sound effect: ${key}`, error);
      return null;
    }
  }

  playFirstAvailableSfx(keys, volumeMultiplier = 1.0) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const key = keys.find((candidate) => this.scene.cache.audio.exists(candidate));
    return key ? this.playSfx(key, volumeMultiplier) : null;
  }

  playUiSelect() {
    return this.playFirstAvailableSfx([
      ASSET_KEYS.audio.sfx.uiSelect,
      "tileHit-0",
      "footsteps-0",
    ], 0.45);
  }

  playUiConfirm() {
    return this.playFirstAvailableSfx([
      ASSET_KEYS.audio.sfx.uiConfirm,
      "tileBreak-0",
      "dig-0",
    ], 0.55);
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
        sound = this.scene.sound.add(key, { volume: this.sfxVolume * this.masterVolume * this.voiceVolume });
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

  scheduleNextVoiceLine() {
    if (this.voiceLineTimer) { this.voiceLineTimer.remove(); this.voiceLineTimer = null; }
    const interval = this.getRandomVoiceLineInterval();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SoundSystem] Next voice line scheduled in ${interval}ms`);
    this.voiceLineTimer = this.scene.time.delayedCall(interval, () => {
      this.playRandomVoiceLine();
      this.scheduleNextVoiceLine();
    });
  }

  stopVoiceLineTimer() {
    if (this.voiceLineTimer) {
      console.log('[SoundSystem] Stopping voice line timer');
      this.voiceLineTimer.remove();
      this.voiceLineTimer = null;
    }
  }

  playFootstep() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('footsteps');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) return this.playSfx(soundKey);
    return null;
  }

  playDig(options = {}) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('dig');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) return this.playSfx(soundKey, 1, options);
    return null;
  }

  playTileBreak(options = {}) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('tileBreak');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) {
      const volume = Number.isFinite(options.volume) ? options.volume : 1;
      return this.playSfx(soundKey, volume, options);
    }
    return null;
  }

  playTileHit() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('tileHit');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) return this.playSfx(soundKey);
    return null;
  }

  playStarDig() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    const soundKey = this.soundLibraryManager.getRandomSound('starDig');
    if (soundKey && this.soundLibraryManager.soundExists(soundKey)) return this.playSfx(soundKey, 0.85);
    return null;
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.scene.sound.volume = this.masterVolume;
    this.updateMusicVolume();
    this.updateVoiceVolume();
    // SFX volume is applied per-instance at creation time; next plays will use new volume.
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  updateMusicVolume() {
    const volume = this.musicVolume * this.masterVolume;
    if (this.currentTrack && !this._setSoundVolume(this.currentTrack, volume, 'current music track')) this.currentTrack = null;
    if (this.nextTrack && !this._setSoundVolume(this.nextTrack, volume, 'next music track')) this.nextTrack = null;
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    // SFX cache is no longer used; new instances will pick up the volume on next play.
    this.updateVoiceVolume();
  }

  setVoiceVolume(volume) {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
    this.updateVoiceVolume();
  }

  updateVoiceVolume() {
    const volume = this.sfxVolume * this.masterVolume * this.voiceVolume;
    for (const [key, sound] of this.voiceLineCache) {
      if (!this._setSoundVolume(sound, volume, `voice line ${key}`)) {
        this.voiceLineCache.delete(key);
      }
    }
    const currentVoiceLine = this.voiceLineManager?.currentVoiceLine;
    if (currentVoiceLine && !this._setSoundVolume(currentVoiceLine, volume, 'current voice line')) {
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
      this.soundLibraryManager.libraries.starDig.push({ key: 'dig-star-0', file: 'dig-star-0', path: 'sound/soundEffects/costume-sounds/dig/dig-star/MUSCChim_Chimes dream 3 (ID 2081)_BigSoundBank.com.wav' });
    }

    const totalLoaded = this.soundLibraryManager.libraries.dig.length
      + this.soundLibraryManager.libraries.footsteps.length
      + this.soundLibraryManager.libraries.tileBreak.length
      + this.soundLibraryManager.libraries.tileHit.length
      + (this.soundLibraryManager.libraries.starDig?.length || 0);
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
    const totalVoiceLines = playerRandomFiles.length + moneyMonsterFiles.length + gearUpgradeFiles.length + playerUpgradeTotal + gemMerchantTotal;
    console.log(`[SoundSystem] Populated ${totalVoiceLines} voice lines from voice-lines directories`);
  }

  playNPCVoiceLine(npcName) {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.voiceLineManager.playNPCVoiceLine(npcName);
  }

  playRandomPlayerVoiceLine() {
    if (!this.sfxEnabled || !this.audioInitialized) return null;
    return this.voiceLineManager.playRandomPlayerVoiceLine();
  }

  printStats() {
    const sfxStats = this.soundLibraryManager.getStats();
    const voiceStats = this.voiceLineManager.getStats();
    const musicStats = ASSET_KEYS.audio.music.playlist.length;
    console.log(`[SoundSystem] Stats — SFX: ${JSON.stringify(sfxStats)}, Voice: ${JSON.stringify(voiceStats)}, Music tracks: ${musicStats}`);
  }

  destroy() {
    console.log('[SoundSystem] Destroying sound system');
    this.stopBackgroundMusic();
    this.stopVoiceLineTimer();
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
