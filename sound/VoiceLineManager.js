/**
 * VoiceLineManager
 * Manages player and NPC voice lines with random selection
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
      playerRandom: null,
      playerSpecial: null,
      moneyMonster: null,
      gearUpgrades: null,
      playerUpgrades: null,
      gemPowerMerchant: null,
      boboMerchant: null
    };
    
    // Current voice line playing
    this.currentVoiceLine = null;
    this.currentVoiceLineKey = null;
    this.pendingVoiceLineKey = null;
    this.pendingVoiceLineHandle = null;
    
    // Original volumes before ducking
    this.originalVolumes = {
      music: null,
      sfx: null
    };
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
    const library = this.libraries[category][subCategory];
    if (!library || library.length === 0) {
      console.warn(`[VoiceLineManager] Library ${category}/${subCategory} is empty`);
      return null;
    }
    const trackKey = `${category}-${subCategory}`;
    const lastPlayedKey = this.lastPlayed[trackKey];
    const loaded = library.filter(entry => this.scene.cache.audio.exists(entry.key));
    const candidates = loaded.length > 0 ? loaded : library;
    let selectedVoiceLine;
    let attempts = 0;
    do {
      selectedVoiceLine = candidates[Math.floor(Math.random() * candidates.length)];
      attempts += 1;
      if (selectedVoiceLine.key !== lastPlayedKey || attempts >= 10 || candidates.length === 1) {
        break;
      }
    } while (true);
    this.lastPlayed[trackKey] = selectedVoiceLine.key;

    if (!this.scene.cache.audio.exists(selectedVoiceLine.key)) {
      this.pendingVoiceLineHandle?.cancel?.();
      this.pendingVoiceLineKey = selectedVoiceLine.key;
      this.pendingVoiceLineHandle = this.soundSystem.loadVoiceLineAsset(
        selectedVoiceLine,
        () => {
          if (this.pendingVoiceLineKey !== selectedVoiceLine.key) return;
          this.pendingVoiceLineHandle = null;
          this.pendingVoiceLineKey = null;
          this._playSelectedVoiceLine(category, subCategory, selectedVoiceLine, library);
        },
      );
      return null;
    }
    return this._playSelectedVoiceLine(category, subCategory, selectedVoiceLine, library);
  }

  _playSelectedVoiceLine(category, subCategory, selectedVoiceLine, library) {
    if (!this.scene.cache.audio.exists(selectedVoiceLine.key)) return null;
    this.pendingVoiceLineHandle?.cancel?.();
    this.pendingVoiceLineHandle = null;
    this.pendingVoiceLineKey = null;
    if (this.currentVoiceLine) {
      const oldVoiceLine = this.currentVoiceLine;
      this.currentVoiceLine = null;
      this.currentVoiceLineKey = null;
      try { oldVoiceLine.stop(); } catch (_) {}
      try { oldVoiceLine.destroy(); } catch (_) {}
      this.restoreVolumes();
    }
    this.duckVolumes();
    console.log(`[VoiceLineManager] Playing ${category}/${subCategory}: ${selectedVoiceLine.file}`);
    const sound = this.scene.sound.add(selectedVoiceLine.key, {
      volume: this.soundSystem.voiceVolume * this.soundSystem.masterVolume,
      loop: false
    });
    sound.play();
    this.currentVoiceLine = sound;
    this.currentVoiceLineKey = selectedVoiceLine.key;
    this.soundSystem.noteVoiceLineUse(selectedVoiceLine.key);
    sound.once('complete', () => {
      if (this.currentVoiceLine !== sound) return;
      this.currentVoiceLine = null;
      this.currentVoiceLineKey = null;
      this.restoreVolumes();
      try { sound.destroy(); } catch (_) {}
      this.soundSystem.prefetchVoiceLine(library, selectedVoiceLine);
    });
    return sound;
  }

  /**
   * Lower music and SFX volumes when voice line plays
   */
  duckVolumes() {
    // Store original volumes
    this.originalVolumes.music = this.soundSystem.musicVolume;
    this.originalVolumes.sfx = this.soundSystem.sfxVolume;

    // Duck volumes (music to 30%, SFX to 50%)
    this.soundSystem.setMusicVolume(this.originalVolumes.music * 0.3);
    this.soundSystem.setSfxVolume(this.originalVolumes.sfx * 0.5);

    console.log('[VoiceLineManager] Volumes ducked');
  }

  /**
   * Restore volumes after voice line finishes
   */
  restoreVolumes() {
    if (this.originalVolumes.music !== null && this.originalVolumes.sfx !== null) {
      this.soundSystem.setMusicVolume(this.originalVolumes.music);
      this.soundSystem.setSfxVolume(this.originalVolumes.sfx);
      
      this.originalVolumes.music = null;
      this.originalVolumes.sfx = null;
      
      console.log('[VoiceLineManager] Volumes restored');
    }
  }

  /**
   * Stop current voice line
   */
  stopCurrentVoiceLine() {
    if (this.currentVoiceLine && this.currentVoiceLine.isPlaying) {
      const oldVoiceLine = this.currentVoiceLine;
      this.currentVoiceLine = null;
      this.currentVoiceLineKey = null;
      oldVoiceLine.stop();
      oldVoiceLine.destroy();
      this.restoreVolumes();
    }
  }

  /**
   * Clean up all voice line resources
   */
  destroy() {
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
