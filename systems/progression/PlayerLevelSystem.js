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
    this._choiceRewards = {
      miningPower: { miningDamageMultiplier: 0.1, miningSpeedBonus: 0.01 },
      resourceLuck: { resourceLuck: 0.05, criticalHitChance: 0.01 },
    };
  }

  setComboSystem(comboSystem) { this.comboSystem = comboSystem; }
  setCampfireSystem(campfireSystem) { this.campfireSystem = campfireSystem; }

  getBonusesSummary() {
    return {
      level: this.level,
      miningDamageMultiplier: this.calculatedBonuses.miningDamageMultiplier,
      miningFlatDamageBonus: this.calculatedBonuses.miningFlatDamageBonus,
      miningSpeedBonus: this.calculatedBonuses.miningSpeedBonus,
      criticalHitChance: this.calculatedBonuses.criticalHitChance,
      criticalHitDamage: this.calculatedBonuses.criticalHitDamage,
      maxHpBonus: this.calculatedBonuses.maxHpBonus,
      xpMultiplier: this.calculatedBonuses.xpMultiplier,
      resourceLuck: this.calculatedBonuses.resourceLuck,
      globalMiningSpeed: this.calculatedBonuses.globalMiningSpeed,
      perLevelSpeed: this.calculatedBonuses.perLevelSpeed,
      hardcapMiningSpeed: this.calculatedBonuses.hardcapMiningSpeed,
      gemPowerMaxBonus: this.getGemPowerMaxBonus(),
    };
  }

  getMiningDamageMultiplier() { return this.calculatedBonuses.miningDamageMultiplier; }
  getMiningFlatDamageBonus() { return this.calculatedBonuses.miningFlatDamageBonus; }
  getCriticalHitDamageMultiplier() {
    return 1.5 + (this.calculatedBonuses.criticalHitDamage || 0) / 100;
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
    const xpMultiplier = 1 + this.calculatedBonuses.xpMultiplier;
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
      hasChoice = this.level % 5 === 0;
      if (hasChoice) rewards = Object.keys(this._choiceRewards);
    }
    return { xpGained, levelUp, newLevel, hasChoice, rewards };
  }

  gainLevel() {
    this.level += 1;
    this._recalculateBonuses();
  }

  getXPRequiredForNextLevel() {
    return LEVEL_CONFIG.xpFormula ? LEVEL_CONFIG.xpFormula(this.level) : 100 * Math.pow(1.15, this.level - 1);
  }

  applyChoiceReward(choice) {
    const reward = this._choiceRewards[choice];
    if (!reward) return;
    for (const [key, val] of Object.entries(reward)) {
      if (this.calculatedBonuses[key] !== undefined) this.calculatedBonuses[key] += val;
    }
  }

  _recalculateBonuses() {
    const config = LEVEL_CONFIG;
    this.calculatedBonuses.level = this.level;
    this.calculatedBonuses.miningDamageMultiplier = 1 + (this.level - 1) * (config.damagePerLevel || 0.05);
    this.calculatedBonuses.miningFlatDamageBonus = Math.floor((this.level - 1) * (config.flatDamagePerLevel || 0.25));
    this.calculatedBonuses.miningSpeedBonus = Math.min((this.level - 1) * 0.005, 0.5);
    this.calculatedBonuses.criticalHitChance = Math.min((this.level - 1) * 0.002, 0.15);
    this.calculatedBonuses.criticalHitDamage = Math.floor((this.level - 1) * 0.5);
    this.calculatedBonuses.maxHpBonus = (this.level - 1) * 5;
    this.calculatedBonuses.xpMultiplier = (this.level - 1) * 0.02;
    this.calculatedBonuses.resourceLuck = Math.min((this.level - 1) * 0.002, 0.08);
    this.calculatedBonuses.globalMiningSpeed = Math.min((this.level - 1) * 0.005, 0.5);
    this.calculatedBonuses.perLevelSpeed = 0;
    this.calculatedBonuses.hardcapMiningSpeed = 0.75;
  }

  toJSON() {
    return { level: this.level, currentXP: this.currentXP, totalXP: this.totalXP, calculatedBonuses: { ...this.calculatedBonuses } };
  }

  fromJSON(data) {
    if (!data) return;
    this.level = data.level || 1;
    this.currentXP = data.currentXP || 0;
    this.totalXP = data.totalXP || 0;
    if (data.calculatedBonuses) this.calculatedBonuses = { ...this.calculatedBonuses, ...data.calculatedBonuses };
  }
}
