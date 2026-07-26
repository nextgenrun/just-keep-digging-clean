/**
 * Generates personalized welcome messages based on save data
 * Provides context-aware messages for new saves vs returning players
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { RESOURCE_KEYS, sanitizeResourceTotals } from "../../values/resourceTypes.js";

export class WelcomeMessageGenerator {
  /**
   * Generate welcome message based on save data
   * @param {Object} saveData - Save data from save system
   * @returns {Object} Message object with title, body, status, and statusColor
   */
  static generateMessage(saveData) {
    const defaultResources = sanitizeResourceTotals(null);

    // Check if this is a new save (no data)
    if (!saveData || (!saveData.dugTiles || saveData.dugTiles.length === 0) && 
        (!saveData.resources || this.isEmptyResources(saveData.resources))) {
      return {
        title: "",
        body: [
          "Press ENTER",
          `${USER_SETTINGS.getKeyLabel("moveLeft")}/${USER_SETTINGS.getKeyLabel("moveRight")} move  •  `
            + `${USER_SETTINGS.getKeyLabel("aimDown")} aim down  •  `
            + `${USER_SETTINGS.getKeyLabel("dig")} dig`,
          "",
          "FLIGHT IS BURIED BELOW THE HUGE ARROWS",
        ].join("\n"),
        status: "Press ENTER to start",
        statusColor: "#9bc9ff"
      };
    }

    // Calculate total progress
    const tilesDug = saveData.dugTiles?.length || 0;
    const resources = sanitizeResourceTotals(saveData.resources || defaultResources);
    const stats = saveData.retentionData?.stats || {};
    const level = saveData.levelData?.level || 1;
    const wallet = saveData.upgrades?.money || 0;
    const bestDepth = stats.bestDepth || 0;
    const currentDepth = stats.currentDepth || 0;
    const cargoUnits = RESOURCE_KEYS.reduce(
      (total, key) => total + Math.max(0, Number(resources[key]) || 0),
      0
    );
    const deepestPortal = (saveData.specialTileData?.pairedTeleporters || [])
      .map(pair => Math.max(0, (pair.dungeonTy || 0) - (saveData.world?.topAirRows || 0)))
      .sort((a, b) => b - a)[0] || 0;
    const suggestedAction = cargoUnits > 0
      ? `Sell ${Math.floor(cargoUnits)} cargo, then choose your next upgrade.`
      : deepestPortal > 0
        ? `Use quick resume to return to your ${deepestPortal}m portal.`
        : `Push beyond your ${bestDepth}m depth record.`;

    return {
      title: "",
      body: [
        `WELCOME BACK  •  LEVEL ${level}`,
        `Last depth ${currentDepth}m  •  Best ${bestDepth}m  •  Wallet ${Number(wallet).toLocaleString()} M`,
        `Journey: ${tilesDug.toLocaleString()} tiles dug  •  ${stats.starsCollected || 0} stars`,
        "",
        `NEXT: ${suggestedAction}`,
        "",
        "Press ENTER or click to continue.",
      ].join("\n"),
      status: bestDepth > 0 ? `One more dig: beat ${bestDepth}m.` : "The first layer is waiting.",
      statusColor: "#9de3a1",
    };
  }

  /**
   * Check if resources object is empty (all zeros)
   * @param {Object} resources - Resources object
   * @returns {boolean} True if all resources are 0 or undefined
   */
  static isEmptyResources(resources) {
    if (!resources) return true;
    return RESOURCE_KEYS.every(field => !resources[field] || resources[field] === 0);
  }
}
