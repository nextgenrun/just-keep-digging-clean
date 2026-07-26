import { LEVEL_CONFIG } from "../../values/levelConfig.js";
import { GEM_POWER_CONFIG } from "../../values/gemPower.js";

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
      criticalHitChance: 0,
      criticalHitDamage: 0,
      maxHpBonus: 0,
      xpMultiplier: 0,
      resourceLuck: 0,
      globalMiningSpeed: 0,
      perLevelSpeed: 0,
      hardcapMiningSpeed: 0,
    };
    this.comboSystem = null;
    this.campfireSystem = null;
    this.temporaryCriticalDamageBonusProvider = null;
    this.choiceSelections = {
      miningPower: 0,
      resourceLuck: 0,
    };
  }

  setComboSystem(comboSystem) { this.comboSystem = comboSystem; }
  setCampfireSystem(campfireSystem) { this.campfireSystem = campfireSystem; }
  setTemporaryCriticalDamageBonusProvider(provider) {
    this.temporaryCriticalDamageBonusProvider = typeof provider === "function" ? provider : null;
  }

  getBonusesSummary() {
    return {
      level: this.level,
      miningDamageMultiplier: this.calculatedBonuses.miningDamageMultiplier,
      miningFlatDamageBonus: this.calculatedBonuses.miningFlatDamageBonus,
      miningSpeedBonus: this.calculatedBonuses.miningSpeedBonus,
      criticalHitChance: this.getCriticalHitChance(),
      criticalHitDamage: this.calculatedBonuses.criticalHitDamage,
      maxHpBonus: this.calculatedBonuses.maxHpBonus,
      xpMultiplier: this.getXpMultiplier(),
      resourceLuck: this.calculatedBonuses.resourceLuck,
      globalMiningSpeed: this.calculatedBonuses.globalMiningSpeed,
      perLevelSpeed: this.calculatedBonuses.perLevelSpeed,
      hardcapMiningSpeed: this.calculatedBonuses.hardcapMiningSpeed,
      gemPowerMaxBonus: this.getGemPowerMaxBonus(),
    };
  }

  getMiningDamageMultiplier() { return this.calculatedBonuses.miningDamageMultiplier; }
  getMiningFlatDamageBonus() { return this.calculatedBonuses.miningFlatDamageBonus; }
  getCriticalHitChance() {
    const campfireBonus = this.campfireSystem?.getCritBonus?.() || 0;
    return Math.min(1, this.calculatedBonuses.criticalHitChance + campfireBonus);
  }
  getXpMultiplier() {
    const campfireBonus = this.campfireSystem?.getXpBonus?.() || 0;
    return this.calculatedBonuses.xpMultiplier + campfireBonus;
  }
  getCriticalHitDamageMultiplier() {
    const temporaryBonus = Number(this.temporaryCriticalDamageBonusProvider?.()) || 0;
    return 1.5 + (this.calculatedBonuses.criticalHitDamage || 0) / 100 + Math.max(0, temporaryBonus);
  }
  checkResourceLuck() {
    return this.calculatedBonuses.resourceLuck > 0 && Math.random() < this.calculatedBonuses.resourceLuck;
  }

  getMiningSpeedBonus() {
    let speed = this.calculatedBonuses.globalMiningSpeed;
    speed += this.calculatedBonuses.perLevelSpeed;
    if (this.campfireSystem) speed += this.campfireSystem.getMiningSpeedBonus();
    return Math.min(speed, this.calculatedBonuses.hardcapMiningSpeed || 0.75);
  }

  getMovementSpeedMultiplier() {
    return 1.0;
  }

  getGemPowerMaxBonus(level = this.level) {
    const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
    const gpPerLevel = GEM_POWER_CONFIG.gpPerLevel || 10;
    const gpPerLevelHardcap = GEM_POWER_CONFIG.gpPerLevelHardcap || 2;
    return safeLevel <= 99
      ? safeLevel * gpPerLevel
      : 99 * gpPerLevel + (safeLevel - 99) * gpPerLevelHardcap;
  }

  gainXP(resourceType) {
    const baseXP = LEVEL_CONFIG.TILE_XP[resourceType] || LEVEL_CONFIG.defaultXP || 1;
    const xpMultiplier = 1 + this.getXpMultiplier();
    const xpGained = Math.floor(baseXP * xpMultiplier);
    this.currentXP += xpGained;
    this.totalXP += xpGained;
    const required = this.getXPRequiredForNextLevel();
    let levelUp = false, newLevel = null, hasChoice = false, rewards = null;
    if (this.currentXP >= required) {
      this.currentXP -= required;
      this.level += 1;
      newLevel = this.level;
      this._recalculateBonuses();
      levelUp = true;
      hasChoice = LEVEL_CONFIG.hasChoiceReward(this.level);
      if (hasChoice) rewards = Object.keys(LEVEL_CONFIG.CHOICE_REWARDS);
    }
    return {
      xpGained,
      levelUp,
      newLevel,
      hasChoice,
      choiceLevel: hasChoice ? newLevel : null,
      rewards,
    };
  }

  gainLevel() {
    const levelGain = Number.isFinite(arguments[0]) ? Math.floor(arguments[0]) : 1;
    const gainCount = Math.max(1, levelGain);
    const startLevel = this.level;
    this.level += gainCount;
    this._recalculateBonuses();
    const choiceLevels = [];
    for (let level = startLevel + 1; level <= this.level; level += 1) {
      if (LEVEL_CONFIG.hasChoiceReward(level)) choiceLevels.push(level);
    }
    return {
      levelUp: true,
      newLevel: this.level,
      levelsGained: this.level - startLevel,
      hasChoice: choiceLevels.length > 0,
      choiceLevel: choiceLevels[0] ?? null,
      choiceLevels,
      rewards: choiceLevels.length > 0 ? Object.keys(LEVEL_CONFIG.CHOICE_REWARDS) : [],
    };
  }

  getXPRequiredForNextLevel() {
    return LEVEL_CONFIG.getXPRequiredForLevel(this.level + 1);
  }

  applyChoiceReward(choice) {
    const reward = LEVEL_CONFIG.CHOICE_REWARDS[choice];
    if (!reward || !Object.hasOwn(this.choiceSelections, choice)) return null;
    this.choiceSelections[choice] += 1;
    this._recalculateBonuses();
    return { choice, count: this.choiceSelections[choice], reward };
  }

  _recalculateBonuses() {
    const config = LEVEL_CONFIG;
    this.calculatedBonuses.level = this.level;
    const miningChoiceBonus = this.choiceSelections.miningPower
      * (config.CHOICE_REWARDS.miningPower.damageBonus || 0);
    const luckChoiceBonus = this.choiceSelections.resourceLuck
      * (config.CHOICE_REWARDS.resourceLuck.luckBonus || 0);
    this.calculatedBonuses.miningDamageMultiplier = 1
      + (this.level - 1) * (config.damagePerLevel || 0.05)
      + miningChoiceBonus;
    this.calculatedBonuses.miningFlatDamageBonus = Math.floor((this.level - 1) * (config.flatDamagePerLevel || 0.25));
    this.calculatedBonuses.miningSpeedBonus = Math.min((this.level - 1) * 0.005, 0.5);
    this.calculatedBonuses.criticalHitChance = Math.min((this.level - 1) * 0.002, 0.15);
    this.calculatedBonuses.criticalHitDamage = Math.floor((this.level - 1) * 0.5);
    this.calculatedBonuses.maxHpBonus = (this.level - 1) * 5;
    this.calculatedBonuses.xpMultiplier = (this.level - 1) * 0.02;
    this.calculatedBonuses.resourceLuck = Math.min(
      (this.level - 1) * 0.002 + luckChoiceBonus,
      0.95
    );
    this.calculatedBonuses.globalMiningSpeed = Math.min((this.level - 1) * 0.005, 0.5);
    this.calculatedBonuses.perLevelSpeed = 0;
    this.calculatedBonuses.hardcapMiningSpeed = 0.75;
  }

  toJSON() {
    return {
      level: this.level,
      currentXP: this.currentXP,
      totalXP: this.totalXP,
      calculatedBonuses: { ...this.calculatedBonuses },
      choiceSelections: { ...this.choiceSelections },
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.level = data.level || 1;
    this.currentXP = data.currentXP || 0;
    this.totalXP = data.totalXP || 0;
    if (data.choiceSelections && typeof data.choiceSelections === "object") {
      for (const key of Object.keys(this.choiceSelections)) {
        const count = Number(data.choiceSelections[key]);
        this.choiceSelections[key] = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
      }
      this._recalculateBonuses();
      return;
    }

    // Legacy saves did not persist choices separately. Preserve any positive
    // excess that was still present in their calculated snapshot.
    this._recalculateBonuses();
    if (data.calculatedBonuses) {
      const legacyDamage = Number(data.calculatedBonuses.miningDamageMultiplier);
      const legacyLuck = Number(data.calculatedBonuses.resourceLuck);
      const damageExcess = Number.isFinite(legacyDamage)
        ? Math.max(0, legacyDamage - this.calculatedBonuses.miningDamageMultiplier)
        : 0;
      const luckExcess = Number.isFinite(legacyLuck)
        ? Math.max(0, legacyLuck - this.calculatedBonuses.resourceLuck)
        : 0;
      this.choiceSelections.miningPower = Math.round(
        damageExcess / Math.max(0.0001, LEVEL_CONFIG.CHOICE_REWARDS.miningPower.damageBonus)
      );
      this.choiceSelections.resourceLuck = Math.round(
        luckExcess / Math.max(0.0001, LEVEL_CONFIG.CHOICE_REWARDS.resourceLuck.luckBonus)
      );
      this._recalculateBonuses();
    }
  }
}
