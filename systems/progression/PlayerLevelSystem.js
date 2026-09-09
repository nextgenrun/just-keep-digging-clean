import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import { GEM_POWER_CONFIG } from "../../values/gemPower.js";
import { validateBoundedNumber, validateLevel } from "../../values/progressionInvariants.js";
import { reportProgressionInvariantFailure } from "../health/progressionInvariantReporter.js";
import { calculatePlayerLevelBonuses, createPlayerLevelRewardSummary } from "./playerLevelRewardMath.js";
import { resolvePlayerLevelSaveState } from "./playerLevelSaveState.js";
import { resolvePlayerLevelXpMutation } from "./playerLevelXpMutation.js";

export class PlayerLevelSystem {
  constructor() {
    this.level = 1;
    this.currentXP = 0;
    this.totalXP = 0;
    this.calculatedBonuses = {
      level: 1,
      miningDamageMultiplier: 1,
      miningFlatDamageBonus: 0,
      miningSpeedBonus: 0,
      maxHpBonus: 0,
      xpMultiplier: 0,
      globalMiningSpeed: 0,
      perLevelSpeed: 0,
      hardcapMiningSpeed: 0,
      panicResistanceMeters: 0,
    };
    this.comboSystem = null;
    this.campfireSystem = null;
    this.choiceSelections = {
      miningPower: 0,
    };
    this.automaticMilestoneRewards = 0;
  }

  setComboSystem(comboSystem) { this.comboSystem = comboSystem; }
  setCampfireSystem(campfireSystem) { this.campfireSystem = campfireSystem; }
  getBonusesSummary() {
    return {
      level: this.level,
      miningDamageMultiplier: this.calculatedBonuses.miningDamageMultiplier,
      miningFlatDamageBonus: this.calculatedBonuses.miningFlatDamageBonus,
      miningSpeedBonus: this.calculatedBonuses.miningSpeedBonus,
      maxHpBonus: this.calculatedBonuses.maxHpBonus,
      xpMultiplier: this.getXpMultiplier(),
      globalMiningSpeed: this.calculatedBonuses.globalMiningSpeed,
      perLevelSpeed: this.calculatedBonuses.perLevelSpeed,
      hardcapMiningSpeed: this.calculatedBonuses.hardcapMiningSpeed,
      gemPowerMaxBonus: this.getGemPowerMaxBonus(),
      panicResistanceMeters: this.getPanicResistanceMeters(),
    };
  }

  getMiningDamageMultiplier() { return this.calculatedBonuses.miningDamageMultiplier; }
  getMiningFlatDamageBonus() { return this.calculatedBonuses.miningFlatDamageBonus; }
  getXpMultiplier() {
    const campfireBonus = this.campfireSystem?.getXpBonus?.() || 0;
    return this.calculatedBonuses.xpMultiplier + campfireBonus;
  }
  getMiningSpeedBonus() {
    let speed = this.calculatedBonuses.globalMiningSpeed;
    speed += this.calculatedBonuses.perLevelSpeed;
    if (this.campfireSystem) speed += this.campfireSystem.getMiningSpeedBonus();
    return Math.min(speed, this.calculatedBonuses.hardcapMiningSpeed || 0.75);
  }

  getMovementSpeedMultiplier() { return 1.0; }

  getGemPowerMaxBonus(level = this.level) {
    const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
    const legacyLevel = LEVEL_CONFIG.getLegacyEquivalentLevel(safeLevel);
    const gpPerLevel = GEM_POWER_CONFIG.gpPerLevel || 10;
    const gpPerLevelHardcap = GEM_POWER_CONFIG.gpPerLevelHardcap || 2;
    return legacyLevel <= LEVEL_CONFIG.LEGACY_SOFTCAP
      ? legacyLevel * gpPerLevel
      : LEVEL_CONFIG.LEGACY_SOFTCAP * gpPerLevel
        + (legacyLevel - LEVEL_CONFIG.LEGACY_SOFTCAP) * gpPerLevelHardcap;
  }

  getPanicResistanceMeters(level = this.level) { return LEVEL_CONFIG.getPanicResistanceMeters(level); }
  gainXP(resourceType) {
    const baseXP = LEVEL_CONFIG.TILE_XP[resourceType] || LEVEL_CONFIG.defaultXP || 1;
    const xpMultiplier = 1 + this.getXpMultiplier();
    return this._gainXPAmount(Math.floor(baseXP * xpMultiplier));
  }

  gainLevelProgress(fraction) {
    const checked = validateBoundedNumber(fraction, {
      name: "level-progress-fraction", min: Number.EPSILON, max: 1,
    });
    if (!checked.ok) return this._rejectLevelMutation(checked.reason, fraction);
    const requiredXP = this.getXPRequiredForNextLevel();
    return this._gainXPAmount(Math.round(requiredXP * checked.value));
  }

  _gainXPAmount(xpGained) {
    if (this.level >= LEVEL_CONFIG.HARDCAP) {
      return {
        xpGained: 0, levelUp: false, newLevel: null, levelsGained: 0,
        hasChoice: false, rewards: [], automaticReward: null, rewardSummary: null,
      };
    }
    const mutation = resolvePlayerLevelXpMutation({
      level: this.level,
      currentXP: this.currentXP,
      totalXP: this.totalXP,
      xpGained,
    });
    if (!mutation.ok) return this._rejectLevelMutation(mutation.reason, xpGained);
    const startLevel = this.level;
    this.level = mutation.level;
    this.currentXP = mutation.currentXP;
    this.totalXP = mutation.totalXP;
    const earnedLevels = mutation.earnedLevels;
    const levelUp = earnedLevels.length > 0;
    const newLevel = levelUp ? this.level : null;
    const automaticReward = levelUp
      ? this._applyAutomaticMilestoneRewards(earnedLevels)
      : null;
    if (levelUp) this._recalculateBonuses();
    const rewardSummary = levelUp
      ? this._createRewardSummary(startLevel, automaticReward)
      : null;
    return {
      xpGained,
      levelUp,
      newLevel,
      levelsGained: earnedLevels.length,
      hasChoice: false,
      choiceLevel: null,
      rewards: [],
      automaticReward,
      rewardSummary,
    };
  }

  gainLevel() {
    const requested = arguments.length === 0 ? 1 : arguments[0];
    const gain = validateBoundedNumber(requested, {
      name: "level-gain", min: 1, max: LEVEL_CONFIG.HARDCAP, integer: true,
    });
    const target = validateLevel(this.level + (gain.ok ? gain.value : 0));
    if (!gain.ok || !target.ok) {
      return this._rejectLevelMutation((!gain.ok ? gain : target).reason, requested);
    }
    const gainCount = gain.value;
    const startLevel = this.level;
    this.level += gainCount;
    const rewardLevels = [];
    for (let level = startLevel + 1; level <= this.level; level += 1) {
      if (LEVEL_CONFIG.hasChoiceReward(level)) rewardLevels.push(level);
    }
    const automaticReward = this._applyAutomaticMilestoneRewards(rewardLevels);
    this._recalculateBonuses();
    return {
      levelUp: true,
      newLevel: this.level,
      levelsGained: this.level - startLevel,
      hasChoice: false,
      choiceLevel: null,
      choiceLevels: [],
      rewards: [],
      automaticReward,
      rewardSummary: this._createRewardSummary(startLevel, automaticReward),
    };
  }

  getXPRequiredForNextLevel() {
    return LEVEL_CONFIG.getXPRequiredForLevel(this.level + 1);
  }

  _applyAutomaticMilestoneRewards(levels) {
    const count = Array.isArray(levels)
      ? [...new Set(levels)].reduce(
        (total, level) => total + LEVEL_CONFIG.getAutomaticRewardUnitsForLevel(level),
        0,
      )
      : 0;
    if (count <= 0) return null;
    this.automaticMilestoneRewards += count;
    this._recalculateBonuses();
    return {
      count,
      total: this.automaticMilestoneRewards,
      miningPower: LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus * count,
    };
  }

  _createRewardSummary(startLevel, automaticReward = null) {
    return createPlayerLevelRewardSummary({
      startLevel, endLevel: this.level, automaticReward,
      getGemPowerMaxBonus: level => this.getGemPowerMaxBonus(level),
    });
  }

  _recalculateBonuses() {
    Object.assign(
      this.calculatedBonuses,
      calculatePlayerLevelBonuses(
        this.level,
        this.choiceSelections,
        this.automaticMilestoneRewards,
      ),
    );
  }

  toJSON() {
    return {
      progressionVersion: LEVEL_CONFIG.PROGRESSION_VERSION,
      level: this.level,
      currentXP: this.currentXP,
      totalXP: this.totalXP,
      calculatedBonuses: { ...this.calculatedBonuses },
      choiceSelections: { ...this.choiceSelections },
      automaticMilestoneRewards: this.automaticMilestoneRewards,
    };
  }

  fromJSON(data) {
    if (!data) return false;
    const restored = resolvePlayerLevelSaveState(data);
    if (!restored.ok) {
      this._rejectLevelMutation("invalid-level-save", data.level);
      return false;
    }
    this.level = restored.level;
    this.currentXP = restored.currentXP;
    this.totalXP = restored.totalXP;
    this.automaticMilestoneRewards = Math.min(
      LEVEL_CONFIG.LEGACY_HARDCAP,
      restored.automaticMilestoneRewards,
    );
    if (restored.choiceSelections) {
      for (const key of Object.keys(this.choiceSelections)) {
        const count = Number(restored.choiceSelections[key]);
        this.choiceSelections[key] = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
      }
      this._recalculateBonuses();
      return true;
    }

    // Legacy saves did not persist choices separately. Preserve any positive
    // excess that was still present in their calculated snapshot.
    this._recalculateBonuses();
    if (restored.calculatedBonuses) {
      const legacyDamage = Number(restored.calculatedBonuses.miningDamageMultiplier);
      const damageExcess = Number.isFinite(legacyDamage)
        ? Math.max(0, legacyDamage - this.calculatedBonuses.miningDamageMultiplier)
        : 0;
      this.choiceSelections.miningPower = Math.round(
        damageExcess / Math.max(0.0001, LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus)
      );
      this._recalculateBonuses();
    }
    return true;
  }

  _rejectLevelMutation(reason, value) {
    reportProgressionInvariantFailure({ authority: "player-level", reason, value });
    return {
      success: false,
      reason,
      xpGained: 0,
      levelUp: false,
      newLevel: null,
      hasChoice: false,
      rewards: [],
    };
  }
}
