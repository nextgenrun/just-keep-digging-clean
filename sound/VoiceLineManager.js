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
   * NOTE: Sounds are pre-loaded in BootScene, this just populates the library arrays
   */
  loadLibrary(category, subCategory, basePath, fileList) {
    if (!this.libraries[category]) {
      console.warn(`[VoiceLineManager] Unknown category: ${category}`);
      return;
    }

    if (!this.libraries[category][subCategory]) {
      this.libraries[category][subCategory] = [];
    }

    console.log(`[VoiceLineManager] Populating ${category}/${subCategory} voice lines from pre-loaded cache`);
    
    // Populate from pre-loaded cache instead of loading again
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Use the same key pattern as BootScene
      const key = `${category}-${subCategory}-${i}`;
      const filePath = `${basePath}${file}`;
      
      // Only add if the sound exists in cache
      if (this.scene.cache.audio.exists(key)) {
        this.libraries[category][subCategory].push({
          key: key,
          file: file,
          path: filePath
        });
      } else {
        console.warn(`[VoiceLineManager] Voice line not found in cache: ${key}`);
      }
    }
    
    console.log(`[VoiceLineManager] ${category}/${subCategory}: ${this.libraries[category][subCategory].length} voice lines populated from cache`);
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

    // Kill any currently playing voiceline to prevent overlap
    if (this.currentVoiceLine && this.currentVoiceLine.isPlaying) {
      const oldVoiceLine = this.currentVoiceLine;
      this.currentVoiceLine = null;
      oldVoiceLine.stop();
      oldVoiceLine.destroy();
      this.restoreVolumes();
    }

    // Get the last played key for this category
    // Key uses "category-subCategory" format, matching how voice line keys are stored
    const trackKey = `${category}-${subCategory}`;
    const lastPlayedKey = this.lastPlayed[trackKey];
    
    // Select a random voice line that's different from last played
    let selectedVoiceLine;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomIndex = Math.floor(Math.random() * library.length);
      selectedVoiceLine = library[randomIndex];
      attempts++;
      
      if (selectedVoiceLine.key !== lastPlayedKey || attempts >= maxAttempts || library.length === 1) {
        break;
      }
    } while (true);

    // Update last played (same key format as lookup above)
    this.lastPlayed[trackKey] = selectedVoiceLine.key;

    // Duck volumes before playing
    this.duckVolumes();

    // Play the voice line
    console.log(`[VoiceLineManager] Playing ${category}/${subCategory}: ${selectedVoiceLine.file}`);
    
    const sound = this.scene.sound.add(selectedVoiceLine.key, {
      volume: this.soundSystem.voiceVolume * this.soundSystem.masterVolume,
      loop: false
    });

    sound.play();
    
    // Set up completion handler to restore volumes
    this.currentVoiceLine = sound;
    sound.once('complete', () => {
      if (this.currentVoiceLine !== sound) return;
      this.currentVoiceLine = null;
      this.restoreVolumes();
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
      oldVoiceLine.stop();
      this.restoreVolumes();
    }
  }

  /**
   * Clean up all voice line resources
   */
  destroy() {
    this.stopCurrentVoiceLine();
    if (this.currentVoiceLine) {
      this.currentVoiceLine.destroy();
      this.currentVoiceLine = null;
    }
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
