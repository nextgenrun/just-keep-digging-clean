/**
 * Generates personalized welcome messages based on save data
 * Provides context-aware messages for new saves vs returning players
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";

export class WelcomeMessageGenerator {
  /**
   * Generate welcome message based on save data
   * @param {Object} saveData - Save data from save system
   * @returns {Object} Message object with title, body, status, and statusColor
   */
  static generateMessage(saveData) {
    // Default resources object with all 10 resources
    const defaultResources = {
      dirt: 0, stone: 0, copper: 0,
      darkDirtNormal: 0, darkDirtStrong: 0,
      steel: 0, iron: 0, bronze: 0,
      silver: 0, gold: 0
    };

    // Check if this is a new save (no data)
    if (!saveData || (!saveData.dugTiles || saveData.dugTiles.length === 0) && 
        (!saveData.resources || this.isEmptyResources(saveData.resources))) {
      return {
        title: "",
        body:       `Press ENTER,\n${USER_SETTINGS.getKeyLabel("moveLeft")}/${USER_SETTINGS.getKeyLabel("aimUp")}/${USER_SETTINGS.getKeyLabel("aimDown")}/${USER_SETTINGS.getKeyLabel("moveRight")} move and aim, ${USER_SETTINGS.getKeyLabel("fly")} fly, ${USER_SETTINGS.getKeyLabel("dig")} dig\n\n\n`,
        status: "Press ENTER to start",
        statusColor: "#9bc9ff"
      };
    }

    // Calculate total progress
    const tilesDug = saveData.dugTiles?.length || 0;
    const resources = saveData.resources || defaultResources;

    // Generate message based on progress tier
    let title = "";
    let body = "";
    let status = "";
    let statusColor = "#9de3a1";

    // Compact resource display format
    const resourceDisplay = `gold:${resources.gold} silver:${resources.silver} iron:${resources.iron} Bronze:${resources.bronze} steel:${resources.steel} Copper:${resources.copper} Stone:${resources.stone} Dirt:${resources.dirt}`;

    if (tilesDug < 100) {
      // Early game - just starting out
      title = "";
      body = `Your progress has been saved.\n\nStats: ${tilesDug} tiles dug\n\n${resourceDisplay}\n\nPress ENTER or click to continue your journey.`;
      status = "Continue digging - the depths await!";
    } else if (tilesDug < 500) {
      // Mid game - experienced digger
      title = "";
      body = `You've dug ${tilesDug} tiles and collected:\n\n${resourceDisplay}\n\nContinue your descent - riches await below!\n\nPress ENTER to resume.`;
      status = "Keep going - you're making great progress!";
      statusColor = "#4ecb71";
    } else {
      // Late game - master miner
      title = "";
      body = `Impressive progress: ${tilesDug} tiles excavated\n\n${resourceDisplay}\n\nThe depths hold even greater treasures. Keep digging!\n\nPress ENTER to continue.`;
      status = "Legendary progress - the depths tremble at your name!";
      statusColor = "#ffd700";
    }

    return { title, body, status, statusColor };
  }

  /**
   * Check if resources object is empty (all zeros)
   * @param {Object} resources - Resources object
   * @returns {boolean} True if all resources are 0 or undefined
   */
  static isEmptyResources(resources) {
    if (!resources) return true;
    const resourceFields = ['dirt', 'stone', 'copper', 'darkDirtNormal', 'darkDirtStrong', 'steel', 'iron', 'bronze', 'silver', 'gold'];
    return resourceFields.every(field => !resources[field] || resources[field] === 0);
  }
}
