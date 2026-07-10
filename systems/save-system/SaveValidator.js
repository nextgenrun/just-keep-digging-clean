/**
 * Validates save data structure and content
 * Ensures data integrity before loading saves
 */
import { RESOURCE_KEYS } from "../../values/resourceTypes.js";

export class SaveValidator {
  /**
   * Validate save data structure
   * @param {Object} saveData - Save data to validate
   * @returns {Object} Validation result with isValid flag and errors
   */
  static validateSaveData(saveData) {
    const errors = [];

    if (!saveData) {
      return { isValid: false, errors: ['Save data is null or undefined'] };
    }

    // Check version
    if (typeof saveData.version !== 'number') {
      errors.push('Missing or invalid version field');
    }

    // Check updatedAt
    if (!saveData.updatedAt) {
      errors.push('Missing updatedAt field');
    }

    // Check dugTiles
    if (!Array.isArray(saveData.dugTiles)) {
      errors.push('dugTiles must be an array');
    } else {
      for (const tileKey of saveData.dugTiles) {
        if (typeof tileKey !== 'string') {
          errors.push(`Invalid tile key: ${tileKey} (not a string)`);
          continue;
        }
        const parts = tileKey.split(',');
        if (parts.length !== 2) {
          errors.push(`Invalid tile key format: ${tileKey}`);
        } else {
          const tx = Number.parseInt(parts[0], 10);
          const ty = Number.parseInt(parts[1], 10);
          if (isNaN(tx) || isNaN(ty)) {
            errors.push(`Invalid tile coordinates: ${tileKey}`);
          }
        }
      }
    }

    // Check resources
    if (!saveData.resources || typeof saveData.resources !== 'object') {
      errors.push('Missing or invalid resources object');
    } else {
      for (const field of RESOURCE_KEYS) {
        if (saveData.resources[field] !== undefined &&
            (typeof saveData.resources[field] !== 'number' || saveData.resources[field] < 0)) {
          errors.push(`Invalid resource ${field}: ${saveData.resources[field]}`);
        }
      }
    }

    // Check upgrades (optional)
    if (saveData.upgrades) {
      if (typeof saveData.upgrades !== 'object') {
        errors.push('upgrades must be an object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if save data is essentially empty (new game)
   * @param {Object} saveData - Save data to check
   * @returns {boolean} True if save is empty/new
   */
  static isNewSave(saveData) {
    if (!saveData) return true;

    const hasDugTiles = saveData.dugTiles && saveData.dugTiles.length > 0;
    const hasResources = saveData.resources && Object.values(saveData.resources).some(v => v > 0);

    return !hasDugTiles && !hasResources;
  }
}
