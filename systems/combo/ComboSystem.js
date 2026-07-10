/**
 * Combo System
 * Manages combo tracking, multipliers, and rewards
 */

import { COMBO_CONFIG } from "../../values/comboConfig.js";

const DEFAULT_MAX_MULTIPLIER = 1.5;

function getMaxCombo() {
  return Number.isFinite(COMBO_CONFIG.maxCombo) && COMBO_CONFIG.maxCombo > 0
    ? COMBO_CONFIG.maxCombo
    : Number.POSITIVE_INFINITY;
}

function getMaxMultiplier() {
  return Number.isFinite(COMBO_CONFIG.maxMultiplier)
    ? COMBO_CONFIG.maxMultiplier
    : DEFAULT_MAX_MULTIPLIER;
}

export class ComboSystem {
  constructor() {
    // Current combo state
    this.comboCount = 0;
    this.lastComboTime = 0;
    this.currentMultiplier = 1.0;
    
    // Timer settings
    this.comboDurationMs = 6000; // 6 seconds to maintain combo
    
    // Milestone rewards tracking (to avoid granting same milestone twice)
    this.milestonesReached = new Set();
    
    // Callbacks for system integration
    this.onMultiplierChanged = null;
    this.onMilestoneReached = null;
    this.onComboBreak = null;
  }

  /**
   * Increment combo counter
   * @param {number} nowMs - Current timestamp in milliseconds
   */
  incrementCombo(nowMs) {
    // Check if combo has expired
    if (nowMs - this.lastComboTime > this.comboDurationMs) {
      this.resetCombo();
    }
    
    // Increment combo, respecting an optional tracking cap.
    this.comboCount = Math.min(getMaxCombo(), this.comboCount + 1);
    this.lastComboTime = nowMs;
    
    // Calculate new multiplier
    const oldMultiplier = this.currentMultiplier;
    this.currentMultiplier = this.calculateMultiplier(this.comboCount);
    
    // Check for multiplier changes
    if (oldMultiplier !== this.currentMultiplier && this.onMultiplierChanged) {
      this.onMultiplierChanged(this.currentMultiplier, oldMultiplier);
    }
    
    // Check for milestones
    this.checkMilestones(nowMs);
  }

  /**
   * Calculate multiplier based on combo count
   * @param {number} combo - Current combo count
   * @returns {number} Multiplier value
   */
  calculateMultiplier(combo) {
    if (combo <= 0) return 1.0;
    
    // AGGRESSIVE NERF: Much weaker scaling with strong diminishing returns
    // Phase 1: Very slow progression to 1.1x at combo 50
    if (combo <= 50) {
      // Linear interpolation from 1.0 to 1.1
      return Math.min(1.0 + (combo / 50) * 0.1, getMaxMultiplier());
    }
    
    // Phase 2: Slow progression to 1.25x at combo 200
    if (combo <= 200) {
      // Linear interpolation from 1.1 to 1.25
      const excess = combo - 50;
      const range = 150;
      return Math.min(1.1 + (excess / range) * 0.15, getMaxMultiplier());
    }
    
    // Phase 3: Very slow progression from 1.25x to 1.5x cap at combo 9999
    // Strong logarithmic diminishing returns
    const excess = combo - 200;
    const maxExcess = 9999 - 200; // 9799
    const excessRatio = excess / maxExcess;
    
    // Logarithmic scaling: 1.25 + (0.25 * log10(1 + excessRatio * 9))
    const calculated = 1.25 + 0.25 * Math.log10(1 + excessRatio * 9);
    return Math.min(calculated, getMaxMultiplier());
  }

  /**
   * Check for combo milestones
   * @param {number} nowMs - Current timestamp
   */
  checkMilestones(nowMs) {
    const milestones = [10, 25, 50, 100, 200, 500, 1000, 5000];
    
    for (const milestone of milestones) {
      if (this.comboCount >= milestone && !this.milestonesReached.has(milestone)) {
        this.milestonesReached.add(milestone);
        
        if (this.onMilestoneReached) {
          this.onMilestoneReached(milestone, this.currentMultiplier, nowMs);
        }
      }
    }
  }

  /**
   * Update combo timer and check for break
   * @param {number} nowMs - Current timestamp
   * @returns {boolean} True if combo is still active, false if broken
   */
  update(nowMs) {
    if (this.comboCount === 0) return false;
    
    if (nowMs - this.lastComboTime > this.comboDurationMs) {
      this.resetCombo();
      return false;
    }
    
    return true;
  }

  /**
   * Reset combo to zero
   */
  resetCombo() {
    if (this.comboCount > 0 && this.onComboBreak) {
      this.onComboBreak(this.comboCount, this.currentMultiplier);
    }
    
    this.comboCount = 0;
    this.currentMultiplier = 1.0;
    this.milestonesReached.clear();
  }

  /**
   * Get current combo count
   * @returns {number}
   */
  getComboCount() {
    return this.comboCount;
  }

  /**
   * Get current multiplier
   * @returns {number}
   */
  getMultiplier() {
    return this.currentMultiplier;
  }

  /**
   * Get time remaining before combo breaks
   * @param {number} nowMs - Current timestamp
   * @returns {number} Time remaining in milliseconds
   */
  getTimeRemaining(nowMs) {
    if (this.comboCount === 0) return 0;
    return Math.max(0, this.comboDurationMs - (nowMs - this.lastComboTime));
  }

  /**
   * Get combo duration as fraction (0.0 to 1.0)
   * @param {number} nowMs - Current timestamp
   * @returns {number}
   */
  getTimerFraction(nowMs) {
    if (this.comboCount === 0) return 0;
    return this.getTimeRemaining(nowMs) / this.comboDurationMs;
  }

  /**
   * Add combo points directly (for special blocks)
   * @param {number} amount - Amount of combo to add
   * @param {number} nowMs - Current timestamp in milliseconds (game clock)
   */
  addCombo(amount = 1, nowMs) {
    // Validate amount is positive
    if (amount <= 0) return;
    
    // Add combo points while respecting an optional tracking cap.
    this.comboCount = Math.min(getMaxCombo(), this.comboCount + amount);
    this.lastComboTime = nowMs;
    
    // Calculate new multiplier
    const oldMultiplier = this.currentMultiplier;
    this.currentMultiplier = this.calculateMultiplier(this.comboCount);
    
    // Check for multiplier changes
    if (oldMultiplier !== this.currentMultiplier && this.onMultiplierChanged) {
      this.onMultiplierChanged(this.currentMultiplier, oldMultiplier);
    }
    
    // Check for milestones
    this.checkMilestones(nowMs);
  }

  /**
   * Get XP multiplier (1.1x at combo 500 and above)
   * @returns {number} XP multiplier (1.0 or 1.1)
   */
  getXPMultiplier() {
    // AGGRESSIVE NERF: Only +10% XP at 500+ combo (was +100% at 100 combo)
    return this.comboCount >= 500 ? 1.1 : 1.0;
  }

  /**
   * Set combo duration (for talent system or configuration)
   * @param {number} durationMs - New duration in milliseconds
   */
  setComboDuration(durationMs) {
    this.comboDurationMs = durationMs;
  }

  /**
   * Register callback for multiplier changes
   * @param {Function} callback - Callback function(newMultiplier, oldMultiplier)
   */
  setMultiplierChangedCallback(callback) {
    this.onMultiplierChanged = callback;
  }

  /**
   * Register callback for milestone events
   * @param {Function} callback - Callback function(milestone, multiplier, timestamp)
   */
  setMilestoneReachedCallback(callback) {
    this.onMilestoneReached = callback;
  }

  /**
   * Register callback for combo break events
   * @param {Function} callback - Callback function(finalCombo, finalMultiplier)
   */
  setComboBreakCallback(callback) {
    this.onComboBreak = callback;
  }

  /**
   * Serialize to JSON for save system
   * @returns {Object}
   */
  toJSON() {
    return {
      comboCount: this.comboCount,
      currentMultiplier: this.currentMultiplier,
      lastComboTime: this.lastComboTime
    };
  }

  /**
   * Deserialize from JSON for save system
   * @param {Object} data
   */
  fromJSON(data) {
    if (data.comboCount !== undefined) {
      // Ensure comboCount is a valid number, default to 0 if invalid
      const comboCount = Number(data.comboCount);
      if (Number.isFinite(comboCount)) {
        // Clamp combo count to valid range and optional maxCombo, then ensure integer.
        this.comboCount = Math.max(0, Math.min(getMaxCombo(), Math.floor(comboCount)));
      } else {
        this.comboCount = 0; // Reset to 0 on invalid data
      }
    }
    if (data.currentMultiplier !== undefined) {
      // Ensure multiplier is a valid number, default to 1.0 if invalid
      const multiplier = Number(data.currentMultiplier);
      if (Number.isFinite(multiplier)) {
        // Clamp multiplier to valid range (1.0 to maxMultiplier)
        this.currentMultiplier = Math.max(1.0, Math.min(getMaxMultiplier(), multiplier));
      } else {
        this.currentMultiplier = 1.0; // Reset to 1.0 on invalid data
      }
    }
    if (data.lastComboTime !== undefined) {
      this.lastComboTime = data.lastComboTime;
    }
    
    // Clear milestones on load (player will earn them again)
    this.milestonesReached.clear();
  }
}
