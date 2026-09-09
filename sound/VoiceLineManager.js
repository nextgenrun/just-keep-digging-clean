import { VoiceLineVolumeDucker } from "./VoiceLineVolumeDucker.js";
import { VOICE_SOURCE_MIX } from "../values/voiceSourceMix.generated.js";
import { applySfxWindow } from "./coreSfxWindow.js";

/**
 * VoiceLineManager
 * Manages random player lines and ordered, non-repeating NPC voice cycles
 * Supports multiple NPC categories with separate voice line pools
 */

export class VoiceLineManager {
  constructor(scene, soundSystem) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    
    // Voice line libraries
    this.libraries = {
      player: {
        random: [],
        special: []
      },
      npc: {
        moneyMonster: [],
        gearUpgrades: [],
        playerUpgrades: [],
        gemPowerMerchant: [],
        boboMerchant: []
      }
    };
    
    // Track last played to prevent repeats
    this.lastPlayed = {
      'player-random': null,
      'player-special': null,
      'npc-moneyMonster': null,
      'npc-gearUpgrades': null,
      'npc-playerUpgrades': null,
      'npc-gemPowerMerchant': null,
      'npc-boboMerchant': null
    };
    
    // Current voice line playing
    this.currentVoiceLine = null;
    this.currentVoiceLineKey = null;
    this.pendingVoiceLineKey = null;
    this.pendingVoiceLineHandle = null;
    this.volumeDucker = new VoiceLineVolumeDucker(soundSystem);
    this.destroyed = false;
  }

  /**
   * Load voice lines for a specific category
   * @param {string} category - 'player' or 'npc'
   * @param {string} subCategory - 'random', 'special', or NPC name
   * @param {string} basePath - Base path to the directory
   * @param {Array} fileList - Array of file names
   * Boot seeds one entry per library; the remaining registered entries stream on demand.
   */
  loadLibrary(category, subCategory, basePath, fileList) {
    if (!this.libraries[category]) {
      console.warn(`[VoiceLineManager] Unknown category: ${category}`);
      return;
    }

    if (!this.libraries[category][subCategory]) {
      this.libraries[category][subCategory] = [];
    }

    console.log(`[VoiceLineManager] Registering ${category}/${subCategory} voice lines`);
    const library = this.libraries[category][subCategory];
    library.length = 0;
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const key = `${category}-${subCategory}-${i}`;
      const filePath = `${basePath}${file}`;
      
      library.push({ key, file, path: filePath });
    }
    
    console.log(`[VoiceLineManager] ${category}/${subCategory}: ${library.length} voice lines registered`);
  }

  /**
   * Play a random voice line from player random pool
   */
  playRandomPlayerVoiceLine() {
    return this.playVoiceLine('player', 'random');
  }

  /**
   * Play a special player voice line
   */
  playSpecialPlayerVoiceLine() {
    return this.playVoiceLine('player', 'special');
  }

  /**
   * Play NPC voice line
   * @param {string} npcName - Name of the NPC (moneyMonster, gearUpgrades, etc.)
   */
  playNPCVoiceLine(npcName) {
    // Resolve merchantId aliases (NPCManager keys vs VoiceLineManager library keys)
    const aliases = { gearMerchant: 'gearUpgrades' };
    const resolvedName = aliases[npcName] ?? npcName;

    if (!this.libraries.npc[resolvedName]) {
      console.warn(`[VoiceLineManager] No voice lines for NPC: ${npcName}`);
      return null;
    }
    return this.playVoiceLine('npc', resolvedName);
  }

  /**
   * Internal method to play a voice line from a library
   * @param {string} category - 'player' or 'npc'
   * @param {string} subCategory - Subcategory name
   */
  playVoiceLine(category, subCategory) {
    if (this.isBusy()) return null;
    const library = this.libraries[category][subCategory];
    if (!library || library.length === 0) {
      console.warn(`[VoiceLineManager] Library ${category}/${subCategory} is empty`);
      return null;
    }
    const trackKey = `${category}-${subCategory}`;
    const lastPlayedKey = this.lastPlayed[trackKey];
    let selectedVoiceLine;
    if (category === 'npc') {
      const lastPlayedIndex = library.findIndex(entry => entry.key === lastPlayedKey);
      selectedVoiceLine = library[(lastPlayedIndex + 1) % library.length];
    } else {
      const loaded = library.filter(entry => this.scene.cache.audio.exists(entry.key));
      const candidates = loaded.length > 0 ? loaded : library;
      let attempts = 0;
      do {
        selectedVoiceLine = candidates[Math.floor(Math.random() * candidates.length)];
        attempts += 1;
      } while (selectedVoiceLine.key === lastPlayedKey && attempts < 10 && candidates.length > 1);
    }
    if (!this.scene.cache.audio.exists(selectedVoiceLine.key)) {
      this._loadSelectedVoiceLine(category, subCategory, selectedVoiceLine, library);
      return null;
    }
    return this._playSelectedVoiceLine(category, subCategory, selectedVoiceLine, library);
  }

  /**
   * Play one deterministic authored cue through the same streaming and ducking
   * path as NPC voice lines.
   */
  playExactVoiceLine(entry, callbacks = {}) {
    if (!entry?.key || !entry?.path) return null;
    if (this.isBusy()) return null;
    const selectedVoiceLine = {
      key: String(entry.key),
      path: String(entry.path),
      file: String(entry.file || entry.path).split("/").pop(),
    };
    const library = [selectedVoiceLine];
    if (!this.scene.cache.audio.exists(selectedVoiceLine.key)) {
      this._loadSelectedVoiceLine("tutorial", "named", selectedVoiceLine, library, callbacks);
      return null;
    }
    return this._playSelectedVoiceLine(
      "tutorial",
      "named",
      selectedVoiceLine,
      library,
      callbacks,
    );
  }

  _playSelectedVoiceLine(category, subCategory, selectedVoiceLine, library, callbacks = {}) {
    if (this.destroyed || this.soundSystem.sfxEnabled === false || this.soundSystem.audioSuspended
      || globalThis.document?.hidden || !this.scene.cache.audio.exists(selectedVoiceLine.key)) return null;
    this.pendingVoiceLineHandle?.cancel?.();
    this.pendingVoiceLineHandle = null;
    this.pendingVoiceLineKey = null;
    if (this.currentVoiceLine || this.externalVoiceOwner) return null;
    this.currentVoiceIsNpc = category === "npc";
    const sourceMix = VOICE_SOURCE_MIX[selectedVoiceLine.path];
    this.currentVoiceSourceGain = sourceMix?.gain ?? 1;
    let sound;
    const finish = (played, dispose = true) => {
      if (this.currentVoiceLine !== sound) return;
      this.currentVoiceLine = null;
      this.currentVoiceLineKey = null;
      this.volumeDucker.restore();
      const destroy = () => { try { if (sound.manager) sound.destroy(); } catch (_) {} };
      if (dispose === "defer") queueMicrotask(destroy);
      else if (dispose) destroy();
      if (played) this.soundSystem.prefetchVoiceLine(library, selectedVoiceLine);
      this.soundSystem.onVoiceLineIdle?.({ played, key: selectedVoiceLine.key, category, subCategory });
    };
    try {
      sound = this.scene.sound.add(selectedVoiceLine.key, {
        volume: this.soundSystem.getVoiceMixVolume(this.currentVoiceIsNpc) * this.currentVoiceSourceGain, loop: false,
      });
      this.currentVoiceLine = sound;
      this.currentVoiceLineKey = selectedVoiceLine.key;
      sound.once('complete', () => finish(true));
      sound.once('stop', () => finish(false, "defer"));
      sound.once('destroy', () => finish(false, false));
      const marker = applySfxWindow(sound, this.scene.sound.context, sourceMix?.window);
      if (sound.play(marker) === false) { finish(false); return null; }
      this.volumeDucker.duck();
    } catch (error) {
      if (sound) finish(false);
      console.warn(`[VoiceLineManager] Voice playback failed: ${selectedVoiceLine.key}`, error);
      return null;
    }
    this.lastPlayed[`${category}-${subCategory}`] = selectedVoiceLine.key;
    this.soundSystem.noteVoiceLineUse(selectedVoiceLine.key);
    try { callbacks.onStarted?.(sound, selectedVoiceLine); } catch (error) {
      console.warn("[VoiceLineManager] Voice start callback failed", error);
    }
    return sound;
  }

  _loadSelectedVoiceLine(category, subCategory, entry, library, callbacks) {
    if (this.destroyed || this.soundSystem.sfxEnabled === false) return;
    const request = {};
    this.pendingVoiceRequest = request;
    this.pendingVoiceLineKey = entry.key;
    const handle = this.soundSystem.loadVoiceLineAsset(entry, () => {
      if (this.pendingVoiceRequest !== request) return;
      this.pendingVoiceRequest = null;
      this.pendingVoiceLineHandle = null;
      this.pendingVoiceLineKey = null;
      this._playSelectedVoiceLine(category, subCategory, entry, library, callbacks);
    }, (_asset, error) => {
      if (this.pendingVoiceRequest !== request) return;
      this.pendingVoiceRequest = null;
      this._handlePendingLoadError(entry.key, error);
    });
    if (this.pendingVoiceRequest === request) this.pendingVoiceLineHandle = handle;
  }

  isBusy() {
    return Boolean(this.currentVoiceLine || this.pendingVoiceLineKey || this.externalVoiceOwner);
  }

  _handlePendingLoadError(key, error) {
    if (this.pendingVoiceLineKey !== key) return;
    this.pendingVoiceLineHandle = null;
    this.pendingVoiceLineKey = null;
    this.soundSystem.onVoiceLineIdle?.({ played: false, key, error });
  }

  /**
   * Stop current voice line
   */
  stopCurrentVoiceLine() {
    this.pendingVoiceRequest = null;
    this.pendingVoiceLineHandle?.cancel?.();
    this.pendingVoiceLineHandle = null;
    this.pendingVoiceLineKey = null;
    const sound = this.currentVoiceLine;
    this.currentVoiceLine = null;
    this.currentVoiceLineKey = null;
    this.externalVoiceOwner?.stop?.();
    try { sound?.stop(); } catch (_) {}
    try { sound?.destroy(); } catch (_) {}
    this.volumeDucker.restore();
  }

  /**
   * Clean up all voice line resources
   */
  destroy() {
    this.destroyed = true;
    this.pendingVoiceLineHandle?.cancel?.();
    this.pendingVoiceLineHandle = null;
    this.pendingVoiceLineKey = null;
    this.stopCurrentVoiceLine();
    if (this.currentVoiceLine) {
      this.currentVoiceLine.destroy();
      this.currentVoiceLine = null;
    }
    this.currentVoiceLineKey = null;
    this.libraries = { player: {}, npc: {} };
  }

  /**
   * Get statistics about loaded voice lines
   */
  getStats() {
    return {
      playerRandom: this.libraries.player.random.length,
      playerSpecial: this.libraries.player.special.length,
      moneyMonster: this.libraries.npc.moneyMonster.length,
      gearUpgrades: this.libraries.npc.gearUpgrades.length,
      playerUpgrades: this.libraries.npc.playerUpgrades.length,
      gemPowerMerchant: this.libraries.npc.gemPowerMerchant.length,
      boboMerchant: this.libraries.npc.boboMerchant.length
    };
  }
}
