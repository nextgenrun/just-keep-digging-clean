import { SPECIAL_BLOCKS_CONFIG, getBlockEffect } from "../../values/specialBlocks.js";

/**
 * SpecialBlockEffectsManager
 * Manages timed effects from special blocks (speed boosts, damage boosts, etc.)
 */

export class SpecialBlockEffectsManager {
  constructor(scene) {
    this.scene = scene;
    
    // Active effects
    this.activeEffects = new Map();
    
    // Effect state
    this.effects = {
      miningSpeedBoost: { active: false, multiplier: 1.0, endTime: 0 },
      damageBoost: { active: false, multiplier: 1.0, endTime: 0 },
      guaranteedCrit: { active: false, endTime: 0 },
    };
  }

  /**
   * Apply a block effect
   */
  applyEffect(blockType) {
    const effect = getBlockEffect(blockType);
    if (!effect) return;

    const now = this.scene.time.now;

    switch (effect.type) {
      case 'timed':
        this.applyTimedEffect(effect);
        break;
      case 'instant':
      case 'popup':
        // Handled by DigSystem
        break;
    }
  }

  /**
   * Apply a timed effect
   */
  applyTimedEffect(effect) {
    const now = this.scene.time.now;
    const endTime = now + effect.duration;

    switch (effect.effect) {
      case 'miningSpeedBoost':
        this.effects.miningSpeedBoost.active = true;
        this.effects.miningSpeedBoost.multiplier = 1.0 + effect.value;
        this.effects.miningSpeedBoost.endTime = endTime;
        break;

      case 'damageBoost':
        if (effect.stacks) {
          // Stack with existing damage boost
          this.effects.damageBoost.multiplier += effect.value;
        } else {
          this.effects.damageBoost.multiplier = 1.0 + effect.value;
        }
        this.effects.damageBoost.active = true;
        this.effects.damageBoost.endTime = endTime;
        break;

      case 'guaranteedCrit':
        this.effects.guaranteedCrit.active = true;
        this.effects.guaranteedCrit.endTime = endTime;
        break;
    }

    this.showEffectToast(effect.effect, effect.duration);
  }

  /**
   * Update effects (check for expired effects)
   */
  update() {
    const now = this.scene.time.now;

    // Check mining speed boost
    if (this.effects.miningSpeedBoost.active && now > this.effects.miningSpeedBoost.endTime) {
      this.effects.miningSpeedBoost.active = false;
      this.effects.miningSpeedBoost.multiplier = 1.0;
    }

    // Check damage boost
    if (this.effects.damageBoost.active && now > this.effects.damageBoost.endTime) {
      this.effects.damageBoost.active = false;
      this.effects.damageBoost.multiplier = 1.0;
    }

    // Check guaranteed crit
    if (this.effects.guaranteedCrit.active && now > this.effects.guaranteedCrit.endTime) {
      this.effects.guaranteedCrit.active = false;
    }
  }

  /**
   * Get current mining speed multiplier
   */
  getMiningSpeedMultiplier() {
    if (this.effects.miningSpeedBoost.active) {
      return this.effects.miningSpeedBoost.multiplier;
    }
    return 1.0;
  }

  /**
   * Get current damage multiplier
   */
  getDamageMultiplier() {
    if (this.effects.damageBoost.active) {
      return this.effects.damageBoost.multiplier;
    }
    return 1.0;
  }

  /**
   * Check if guaranteed crit is active
   */
  isGuaranteedCritActive() {
    return this.effects.guaranteedCrit.active;
  }

  /**
   * Get remaining time for an effect (in seconds)
   */
  getRemainingTime(effectName) {
    const now = this.scene.time.now;
    const effect = this.effects[effectName];
    if (effect && effect.active) {
      const remaining = effect.endTime - now;
      return Math.max(0, Math.floor(remaining / 1000));
    }
    return 0;
  }

  /**
   * Show effect toast notification
   */
  showEffectToast(effectName, duration) {
    if (!this.scene.floatingTextSystem) return;

    const messages = {
      miningSpeedBoost: `⚡ SPEED BOOST! ${Math.floor(duration / 1000)}s`,
      damageBoost: `💪 DAMAGE BOOST! ${Math.floor(duration / 1000)}s`,
      guaranteedCrit: `💥 CRITICAL HITS! ${Math.floor(duration / 1000)}s`,
    };

    const colors = {
      miningSpeedBoost: '#FFD700',
      damageBoost: '#DC143C',
      guaranteedCrit: '#FF0000',
    };

    const message = messages[effectName];
    const color = colors[effectName] || '#FFFFFF';

    // Show floating text at player position
    if (this.scene.playerController) {
      const playerPos = this.scene.playerController.getPlayerPosition();
      this.scene.floatingTextSystem.showFloatingText(
        playerPos.x,
        playerPos.y - 50,
        message,
        color,
        2000
      );
    }
  }

  /**
   * Get all active effects for save/load
   */
  getSaveData() {
    const now = this.scene.time.now;
    return {
      miningSpeedBoost: {
        active: this.effects.miningSpeedBoost.active,
        multiplier: this.effects.miningSpeedBoost.multiplier,
        remainingTime: this.effects.miningSpeedBoost.active
          ? Math.max(0, this.effects.miningSpeedBoost.endTime - now)
          : 0,
      },
      damageBoost: {
        active: this.effects.damageBoost.active,
        multiplier: this.effects.damageBoost.multiplier,
        remainingTime: this.effects.damageBoost.active
          ? Math.max(0, this.effects.damageBoost.endTime - now)
          : 0,
      },
      guaranteedCrit: {
        active: this.effects.guaranteedCrit.active,
        remainingTime: this.effects.guaranteedCrit.active
          ? Math.max(0, this.effects.guaranteedCrit.endTime - now)
          : 0,
      },
    };
  }

  /**
   * Load saved effects
   */
  loadSaveData(data) {
    if (!data) return;

    const now = this.scene.time.now;

    if (data.miningSpeedBoost && data.miningSpeedBoost.active && data.miningSpeedBoost.remainingTime > 0) {
      this.effects.miningSpeedBoost.active = true;
      this.effects.miningSpeedBoost.multiplier = data.miningSpeedBoost.multiplier;
      this.effects.miningSpeedBoost.endTime = now + data.miningSpeedBoost.remainingTime;
    }

    if (data.damageBoost && data.damageBoost.active && data.damageBoost.remainingTime > 0) {
      this.effects.damageBoost.active = true;
      this.effects.damageBoost.multiplier = data.damageBoost.multiplier;
      this.effects.damageBoost.endTime = now + data.damageBoost.remainingTime;
    }

    if (data.guaranteedCrit && data.guaranteedCrit.active && data.guaranteedCrit.remainingTime > 0) {
      this.effects.guaranteedCrit.active = true;
      this.effects.guaranteedCrit.endTime = now + data.guaranteedCrit.remainingTime;
    }
  }

  /**
   * Clear all effects
   */
  clearAllEffects() {
    this.effects.miningSpeedBoost.active = false;
    this.effects.miningSpeedBoost.multiplier = 1.0;
    this.effects.damageBoost.active = false;
    this.effects.damageBoost.multiplier = 1.0;
    this.effects.guaranteedCrit.active = false;
  }

  destroy() {
    this.activeEffects.clear();
  }
}