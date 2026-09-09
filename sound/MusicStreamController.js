import { ASSET_KEYS } from "../values/assetKeys.js";
import { AUDIO_RUNTIME_LOADING } from "../values/audioConfig.js";
import { MUSIC_DIRECTOR_CONFIG } from "../values/musicDirector.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";
import { MUSIC_SOURCE_MIX } from "../values/musicSourceMix.generated.js";

export class MusicStreamController {
  constructor(soundSystem, assetManager, config = AUDIO_RUNTIME_LOADING) {
    this.system = soundSystem;
    this.assetManager = assetManager;
    this.config = config;
    this.musicConfig = MUSIC_DIRECTOR_CONFIG;
    this.pendingHandle = null;
    this.pendingKey = null;
    this.prefetchHandle = null;
    this.prefetchedIndex = -1;
    this.prefetchTimer = null;
    this.fadingTracks = new Set();
    this.trackGains = new Map();
    this.destroyed = false;
  }

  start() {
    const system = this.system;
    if (this.destroyed || !system.musicEnabled || system.currentTrack || this.pendingHandle) return;
    const playlist = ASSET_KEYS.audio.music.playlist;
    if (!playlist.length) return;
    const loadedIndexes = playlist
      .map((key, index) => system.scene.cache.audio.exists(key) ? index : -1)
      .filter(index => index >= 0);
    const index = this._selectNextIndex({
      availableIndexes: loadedIndexes,
      currentIndex: -1,
    });
    this._loadAndBegin(index, null);
  }

  crossfade() {
    const system = this.system;
    if (this.destroyed || !system.musicEnabled || system.isCrossfading) return;
    system.isCrossfading = true;
    this._clearTrackTimer();
    const prefetchedReady = this.prefetchedIndex >= 0
      && this.prefetchedIndex !== system.currentTrackIndex
      && (system.musicDirector?.isIndexEligible?.(this.prefetchedIndex) ?? true)
      && system.scene.cache.audio.exists(ASSET_KEYS.audio.music.playlist[this.prefetchedIndex]);
    const nextIndex = prefetchedReady ? this.prefetchedIndex : this._selectNextIndex();
    this.prefetchedIndex = -1;
    this.prefetchHandle?.cancel?.();
    this.prefetchHandle = null;
    this._loadAndBegin(nextIndex, system.currentTrack);
  }

  _loadAndBegin(index, oldTrack) {
    const playlist = ASSET_KEYS.audio.music.playlist;
    const key = playlist[index];
    if (!key) {
      this.system.isCrossfading = false;
      return;
    }
    if (this.system.scene.cache.audio.exists(key)) {
      this._beginTrack(index, oldTrack);
      return;
    }
    if (this.pendingHandle && this.pendingKey === key) return;
    this.pendingHandle?.cancel?.();
    this.pendingKey = key;
    this.pendingHandle = this.assetManager.ensure(key, {
      owner: RUNTIME_ASSET_LOADING.owners.audioMusic,
      priority: RUNTIME_ASSET_LOADING.priorities.audioMusic,
      onReady: () => {
        this.pendingHandle = null;
        this.pendingKey = null;
        if (!this.destroyed) this._beginTrack(index, oldTrack);
      },
      onError: (_asset, error) => {
        this.pendingHandle = null;
        this.pendingKey = null;
        this.system.isCrossfading = false;
        if (oldTrack && !oldTrack.isPlaying && this.system.currentTrack === oldTrack) {
          this._disposeTrack(oldTrack);
          this.system.currentTrack = null;
          this.system.scene.time?.delayedCall?.(
            this.musicConfig.errorRetryDelayMs,
            () => this.start(),
          );
        }
        console.warn(`[MusicStreamController] Track load failed: ${key}`, error);
      },
    });
  }

  _beginTrack(index, oldTrack) {
    const system = this.system;
    if (this.destroyed || !system.musicEnabled) return;
    const key = ASSET_KEYS.audio.music.playlist[index];
    if (!key || !system.scene.cache.audio.exists(key)) {
      system.isCrossfading = false;
      return;
    }

    let sound;
    try {
      sound = system.scene.sound.add(key, { volume: 0, loop: false });
      if (sound.play() === false) { this._disposeTrack(sound); system.isCrossfading = false; return; }
    } catch (error) {
      if (sound) this._disposeTrack(sound);
      system.isCrossfading = false;
      console.warn(`[MusicStreamController] Track playback failed: ${key}`, error);
      return;
    }
    system.currentTrack = sound;
    system.currentTrackIndex = index;
    this.trackGains.set(sound, { gain: 0, sourceGain: MUSIC_SOURCE_MIX[ASSET_KEYS.audio.music.files[index]]?.gain ?? 1 });
    this._fadeGain(sound, 1, 'Sine.easeIn', () => { system.isCrossfading = false; });

    if (oldTrack && oldTrack !== sound) {
      this.fadingTracks.add(oldTrack);
      this._fadeGain(oldTrack, 0, 'Sine.easeOut', () => {
          this.fadingTracks.delete(oldTrack);
          this._disposeTrack(oldTrack);
          this.assetManager.trimMusic(this._protectedMusicKeys());
      });
    } else {
      system.isCrossfading = false;
    }

    sound.on('complete', () => {
      if (system.currentTrack === sound) {
        system.musicDirector?.completeCue?.(index);
        this.crossfade();
      }
    });
    system.musicDirector?.noteTrackStarted?.(index);
    const musicSnapshot = system.musicDirector?.getSnapshot?.();
    const route = musicSnapshot?.cue
      ? `cue=${musicSnapshot.cue}`
      : `context=${musicSnapshot?.context || "unclassified"}`;
    console.info(
      `[MusicDirector] ${route} track=${ASSET_KEYS.audio.music.files[index] || key}`,
    );
    this.assetManager.noteMusicUse(key, this._protectedMusicKeys());
    this._scheduleTrackTimer();
    this._schedulePrefetch();
  }

  _selectNextIndex({ availableIndexes = null, currentIndex = undefined } = {}) {
    const playlist = ASSET_KEYS.audio.music.playlist;
    if (playlist.length <= 1) return 0;
    const directedIndex = this.system.musicDirector?.selectNextIndex?.({
      availableIndexes,
      currentIndex: Number.isInteger(currentIndex)
        ? currentIndex
        : this.system.currentTrackIndex,
    });
    if (
      Number.isInteger(directedIndex)
      && directedIndex >= 0
      && directedIndex < playlist.length
    ) return directedIndex;
    let index;
    do {
      index = Math.floor(Math.random() * playlist.length);
    } while (index === this.system.currentTrackIndex);
    return index;
  }

  _fadeGain(track, target, ease, onComplete) {
    const envelope = this.trackGains.get(track) || { gain: 1 };
    this.trackGains.set(track, envelope);
    this.system.scene.tweens.killTweensOf?.(envelope);
    this.system.scene.tweens.add({ targets: envelope, gain: target,
      duration: this.musicConfig.crossfadeMs, ease,
      onUpdate: () => this.refreshVolume(),
      onComplete: () => { this.refreshVolume(); onComplete(); },
    });
  }

  refreshVolume() {
    const tracks = [...new Set([this.system.currentTrack, this.system.nextTrack, ...this.fadingTracks])]
      .filter(track => this.system._isUsableSound(track));
    const gain = track => this.trackGains.get(track)?.gain ?? 1;
    const total = Math.max(1, tracks.reduce((sum, track) => sum + gain(track), 0));
    for (const track of tracks) this.system._setSoundVolume(track,
      this.system.getMusicMixVolume() * gain(track) * (this.trackGains.get(track)?.sourceGain ?? 1) / total, 'music crossfade');
  }

  _scheduleTrackTimer() {
    this._clearTrackTimer();
    if (!this.system.scene.time?.delayedCall) return;
    this.system.musicTrackTimer = this.system.scene.time.delayedCall(
      this.system.config.musicTrackChangeInterval,
      () => {
        if (this.system.currentTrack?.isPlaying) this.crossfade();
      },
    );
  }

  _schedulePrefetch() {
    this.prefetchTimer?.remove?.();
    this.prefetchTimer = null;
    if (!this.assetManager.streamingEnabled || ASSET_KEYS.audio.music.playlist.length <= 1) return;
    if (!this.system.scene.time?.delayedCall) return;
    this.prefetchTimer = this.system.scene.time.delayedCall(
      this.config.musicPrefetchDelayMs,
      () => this._prefetchNext(),
    );
  }

  _prefetchNext() {
    this.prefetchTimer = null;
    if (this.destroyed || !this.system.musicEnabled || this.prefetchHandle) return;
    const index = this._selectNextIndex();
    const key = ASSET_KEYS.audio.music.playlist[index];
    this.prefetchedIndex = index;
    if (this.system.scene.cache.audio.exists(key)) {
      this.assetManager.noteMusicUse(key, this._protectedMusicKeys());
      return;
    }
    this.prefetchHandle = this.assetManager.ensure(key, {
      owner: RUNTIME_ASSET_LOADING.owners.audioMusic,
      priority: RUNTIME_ASSET_LOADING.priorities.audioPrefetch,
      onReady: () => {
        this.prefetchHandle = null;
        this.assetManager.noteMusicUse(key, this._protectedMusicKeys());
      },
      onError: (_asset, error) => {
        this.prefetchHandle = null;
        this.prefetchedIndex = -1;
        console.warn(`[MusicStreamController] Track prefetch failed: ${key}`, error);
      },
    });
  }

  _protectedMusicKeys() {
    const playlist = ASSET_KEYS.audio.music.playlist;
    return [
      playlist[this.system.currentTrackIndex],
      playlist[this.prefetchedIndex],
      this.pendingKey,
    ].filter(Boolean);
  }

  _clearTrackTimer() {
    this.system.musicTrackTimer?.remove?.();
    this.system.musicTrackTimer = null;
  }

  _disposeTrack(track) {
    const envelope = this.trackGains.get(track);
    if (envelope) this.system.scene?.tweens?.killTweensOf?.(envelope);
    this.trackGains.delete(track);
    this.system.scene?.tweens?.killTweensOf?.(track);
    try { track.stop(); } catch (_) {}
    try { track.destroy(); } catch (_) {}
  }

  stop() {
    this._clearTrackTimer();
    this.prefetchTimer?.remove?.();
    this.prefetchTimer = null;
    this.pendingHandle?.cancel?.();
    this.prefetchHandle?.cancel?.();
    this.pendingHandle = null;
    this.prefetchHandle = null;
    this.pendingKey = null;
    this.prefetchedIndex = -1;
    for (const track of this.fadingTracks) this._disposeTrack(track);
    this.fadingTracks.clear();
    if (this.system.currentTrack) this._disposeTrack(this.system.currentTrack);
    if (this.system.nextTrack) this._disposeTrack(this.system.nextTrack);
    this.system.currentTrack = null;
    this.system.nextTrack = null;
    this.trackGains.clear();
    this.system.isCrossfading = false;
  }

  destroy() {
    if (this.destroyed) return;
    this.stop();
    this.destroyed = true;
  }
}
