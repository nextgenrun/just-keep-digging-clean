import { getBlockEffect } from "../../values/specialBlocks.js";

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
    };
    this.abilityGrant = {
      pending: false,
      abilityId: null,
      endTime: 0,
    };
    this.abilityChoiceListener = null;
  }

  _now() {
    return Number(this.scene?.time?.now) || 0;
  }

  setAbilityChoiceListener(listener) {
    this.abilityChoiceListener = typeof listener === 'function' ? listener : null;
  }

  _emitAbilityChoice(type, detail = {}) {
    this.abilityChoiceListener?.(Object.freeze({
      type,
      ...this.getFreeAbilitySnapshot(),
      ...detail,
    }));
  }

  /**
   * Apply a block effect
   */
  applyEffect(blockType) {
    const effect = getBlockEffect(blockType);
    if (!effect) return { ok: false, reason: 'unknown-effect' };

    switch (effect.type) {
      case 'timed':
        this.applyTimedEffect(effect);
        return { ok: true, effect: effect.effect };
      case 'choice':
        return this.beginAbilityChoice(effect);
      case 'instant':
      case 'popup':
        // Handled by DigSystem
        return { ok: true, effect: effect.effect };
      default:
        return { ok: false, reason: 'unsupported-effect-type' };
    }
  }

  beginAbilityChoice(effect = getBlockEffect('abilityBlock')) {
    if (effect?.effect !== 'temporaryFreeAbility') {
      return { ok: false, reason: 'invalid-ability-choice-effect' };
    }
    this.abilityGrant.pending = true;
    this.abilityGrant.abilityId = null;
    this.abilityGrant.endTime = 0;
    this._emitAbilityChoice('opened');
    return {
      ok: true,
      pending: true,
      eligibleAbilityIds: [...effect.eligibleAbilityIds],
    };
  }

  selectFreeAbility(abilityId) {
    const effect = getBlockEffect('abilityBlock');
    if (!this.abilityGrant.pending) return { ok: false, reason: 'no-pending-choice' };
    if (!effect?.eligibleAbilityIds?.includes?.(abilityId)) {
      return { ok: false, reason: 'ineligible-ability' };
    }
    const durationMs = Math.max(0, Number(effect.duration) || 0);
    this.abilityGrant.pending = false;
    this.abilityGrant.abilityId = abilityId;
    this.abilityGrant.endTime = this._now() + durationMs;
    this._emitAbilityChoice('selected', { abilityId, durationMs });
    return {
      ok: true,
      abilityId,
      durationMs,
      endTime: this.abilityGrant.endTime,
    };
  }

  _expireAbilityGrant(now = this._now()) {
    if (
      !this.abilityGrant.abilityId
      || now < this.abilityGrant.endTime
    ) return false;
    const abilityId = this.abilityGrant.abilityId;
    this.abilityGrant.abilityId = null;
    this.abilityGrant.endTime = 0;
    this._emitAbilityChoice('expired', { abilityId });
    return true;
  }

  isAbilityChoicePending() {
    return this.abilityGrant.pending === true;
  }

  isFreeAbilityActive(abilityId) {
    this._expireAbilityGrant();
    return Boolean(
      abilityId
      && this.abilityGrant.abilityId === abilityId
      && this._now() < this.abilityGrant.endTime
    );
  }

  getFreeAbilitySnapshot() {
    const now = this._now();
    const effect = getBlockEffect('abilityBlock');
    const remainingMs = this.abilityGrant.abilityId
      ? Math.max(0, this.abilityGrant.endTime - now)
      : 0;
    return Object.freeze({
      pending: this.abilityGrant.pending === true,
      active: remainingMs > 0,
      abilityId: remainingMs > 0 ? this.abilityGrant.abilityId : null,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      eligibleAbilityIds: Object.freeze([...(effect?.eligibleAbilityIds || [])]),
    });
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

    }
  }

  /**
   * Update effects (check for expired effects)
   */
  update() {
    const now = this._now();

    // Check mining speed boost
    if (this.effects.miningSpeedBoost.active && now >= this.effects.miningSpeedBoost.endTime) {
      this.effects.miningSpeedBoost.active = false;
      this.effects.miningSpeedBoost.multiplier = 1.0;
    }

    // Check damage boost
    if (this.effects.damageBoost.active && now > this.effects.damageBoost.endTime) {
      this.effects.damageBoost.active = false;
      this.effects.damageBoost.multiplier = 1.0;
    }

    this._expireAbilityGrant(now);

  }

  /**
   * Get current mining speed multiplier
   */
  getMiningSpeedMultiplier() {
    if (this.effects.miningSpeedBoost.active
      && this.scene.time.now < this.effects.miningSpeedBoost.endTime) {
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
   * Get remaining time for an effect (in seconds)
   */
  getRemainingTime(effectName) {
    const now = this._now();
    if (effectName === 'freeAbility') {
      return this.getFreeAbilitySnapshot().remainingSeconds;
    }
    const effect = this.effects[effectName];
    if (effect && effect.active) {
      const remaining = effect.endTime - now;
      return Math.max(0, Math.ceil(remaining / 1000));
    }
    return 0;
  }

  /**
   * Get all active effects for save/load
   */
  getSaveData() {
    const now = this._now();
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
      abilityGrant: {
        pending: this.abilityGrant.pending,
        abilityId: this.abilityGrant.abilityId,
        remainingTime: this.abilityGrant.abilityId
          ? Math.max(0, this.abilityGrant.endTime - now)
          : 0,
      },
    };
  }

  /**
   * Load saved effects
   */
  loadSaveData(data) {
    if (!data) return;

    const now = this._now();

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

    const abilityEffect = getBlockEffect('abilityBlock');
    const savedAbility = data.abilityGrant;
    if (savedAbility?.pending === true) {
      this.abilityGrant.pending = true;
      this.abilityGrant.abilityId = null;
      this.abilityGrant.endTime = 0;
    } else if (
      savedAbility?.remainingTime > 0
      && abilityEffect?.eligibleAbilityIds?.includes?.(savedAbility.abilityId)
    ) {
      this.abilityGrant.pending = false;
      this.abilityGrant.abilityId = savedAbility.abilityId;
      this.abilityGrant.endTime = now + savedAbility.remainingTime;
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
    this.abilityGrant.pending = false;
    this.abilityGrant.abilityId = null;
    this.abilityGrant.endTime = 0;
  }

  destroy() {
    this.activeEffects.clear();
    this.abilityChoiceListener = null;
  }
}
