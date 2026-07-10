/**
 * SoundLibraryManager
 * Manages dynamic sound pools for SFX that cycle through audio files
 * Prevents playing the same sound twice in a row
 * Allows adding new files to directories - they're automatically included
 */

export class SoundLibraryManager {
  constructor(scene) {
    this.scene = scene;
    
    // Sound pools (will be populated dynamically)
    this.libraries = {
      dig: [],
      footsteps: [],
      tileBreak: [],
      tileHit: []
    };
    
    // Track last played sound for each library to prevent repeats
    this.lastPlayed = {
      dig: null,
      footsteps: null,
      tileBreak: null,
      tileHit: null
    };
    
    // Track which libraries have already logged a warning to prevent spam
    this.warnedLibraries = new Set();
  }

  /**
   * Load sound files from a directory and populate a library
   * @param {string} libraryName - Name of the library (dig, footsteps, etc.)
   * @param {string} basePath - Base path to the directory
   * @param {Array} fileList - Array of file names
   */
  loadLibrary(libraryName, basePath, fileList) {
    if (!this.libraries[libraryName]) {
      console.warn(`[SoundLibraryManager] Unknown library: ${libraryName}`);
      return;
    }

    console.log(`[SoundLibraryManager] Loading ${libraryName} library from ${basePath}`);
    
    for (const file of fileList) {
      // Create a key for the sound (libraryName-index)
      const key = `${libraryName}-${this.libraries[libraryName].length}`;
      const filePath = `${basePath}${file}`;
      
      // Add to Phaser load queue
      this.scene.load.audio(key, filePath);
      
      // Store in library
      this.libraries[libraryName].push({
        key: key,
        file: file,
        path: filePath
      });
      
      console.log(`  [SoundLibraryManager] Loaded: ${file} -> ${key}`);
    }
    
    console.log(`[SoundLibraryManager] ${libraryName} library: ${this.libraries[libraryName].length} sounds loaded`);
  }

  /**
   * Get a random sound from a library, ensuring it's not the same as last time
   * @param {string} libraryName - Name of the library
   * @returns {string|null} Sound key or null if library is empty
   */
  getRandomSound(libraryName) {
    const library = this.libraries[libraryName];
    
    if (!library || library.length === 0) {
      // Only warn once per library to prevent console spam
      if (!this.warnedLibraries.has(libraryName)) {
        console.warn(`[SoundLibraryManager] Library '${libraryName}' is empty or doesn't exist`);
        this.warnedLibraries.add(libraryName);
      }
      return null;
    }

    // If only one sound, return it
    if (library.length === 1) {
      return library[0].key;
    }

    // Get random sound that's different from last played
    let randomSound;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomIndex = Math.floor(Math.random() * library.length);
      randomSound = library[randomIndex];
      attempts++;
      
      // If this is different from last played or we've tried too many times, use it
      if (randomSound.key !== this.lastPlayed[libraryName] || attempts >= maxAttempts) {
        break;
      }
    } while (true);

    // Update last played
    this.lastPlayed[libraryName] = randomSound.key;
    
    console.log(`[SoundLibraryManager] ${libraryName}: Playing ${randomSound.file}`);
    return randomSound.key;
  }

  /**
   * Check if a sound exists in the cache
   * @param {string} key - Sound key
   * @returns {boolean}
   */
  soundExists(key) {
    return this.scene.cache.audio.exists(key);
  }

  /**
   * Get statistics about loaded libraries
   */
  getStats() {
    return {
      dig: this.libraries.dig.length,
      footsteps: this.libraries.footsteps.length,
      tileBreak: this.libraries.tileBreak.length,
      tileHit: this.libraries.tileHit.length
    };
  }
}
