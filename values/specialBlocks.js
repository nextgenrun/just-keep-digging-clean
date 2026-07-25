// ==================== SPECIAL BLOCKS CONFIG ====================

/**
 * Special blocks configuration
 * Each block has: spawn rate, visual effect, duration (if timed), and effect type
 */

export const SPECIAL_BLOCKS_CONFIG = Object.freeze({
  // Spawn rates for each special block
  spawnRates: {
    gemPowerBlock: 0.00315,      // 0.315% - reduced by 65%
    speedBlock: 0.000525,        // 0.0525% - very rare
    xpBlock: 0.00105,            // 0.105% - reduced by 65%
    critBlock: 0.00028,          // 0.028% - very rare
    berserkBlock: 0.0007,        // 0.07% - reduced by 65%
    comboBlock: 0.0014,          // 0.14% - reduced by 65%
    legendBlock: 0.000175,        // 0.0175% - extremely rare, legendary
  },

  // Cave bonus multiplier for special blocks
  // Makes exploring caves rewarding with special blocks
  caveMultiplier: 3.0,         // 3x more special blocks near caves

  // Visual glow effects (color hex, intensity, pulse speed)
  glowEffects: {
    gemPowerBlock: {
      color: 0x9900FF,         // Purple
      intensity: 0.4,
      pulseSpeed: 2000,
      edgeAlpha: 0.6,
    },
    speedBlock: {
      color: 0xFFD700,         // Gold
      intensity: 0.5,
      pulseSpeed: 1500,
      edgeAlpha: 0.7,
    },
    xpBlock: {
      color: 0xFFFF00,         // Yellow
      intensity: 0.6,
      pulseSpeed: 1800,
      edgeAlpha: 0.8,
      particles: true,          // Upward particles
    },
    critBlock: {
      color: 0xFF0000,         // Red
      intensity: 0.7,
      pulseSpeed: 1000,
      edgeAlpha: 0.9,
      symbols: true,           // Crit symbol
    },
    berserkBlock: {
      color: 0xDC143C,         // Crimson
      intensity: 0.6,
      pulseSpeed: 1200,
      edgeAlpha: 0.8,
    },
    comboBlock: {
      color: 0xFFFFFF,         // Rainbow (multi-color handled separately)
      intensity: 0.5,
      pulseSpeed: 800,
      edgeAlpha: 0.7,
      rainbow: true,            // Rotating colors
    },
    legendBlock: {
      color: 0xFFD700,         // Legendary gold
      intensity: 0.8,
      pulseSpeed: 1000,
      edgeAlpha: 1.0,
      sparkles: true,          // Sparkle effect
      crown: true,             // Crown effect
    },
  },

  // Effect configurations
  effects: {
    gemPowerBlock: {
      type: 'instant',
      effect: 'restoreGemPower',
      restoreTiers: Object.freeze([
        Object.freeze({ minDepthTiles: 0, restoreAmount: 25 }),
        Object.freeze({ minDepthTiles: 250, restoreAmount: 40 }),
        Object.freeze({ minDepthTiles: 500, restoreAmount: 60 }),
        Object.freeze({ minDepthTiles: 1000, restoreAmount: 90 }),
        Object.freeze({ minDepthTiles: 1500, restoreAmount: 130 }),
      ]),
    },
    speedBlock: {
      type: 'timed',
      effect: 'miningSpeedBoost',
      value: 0.5,              // +50%
      duration: 20000,         // 20 seconds
      stacks: true,
    },
    xpBlock: {
      type: 'instant',
      effect: 'addLevel',
      value: 1,                // +1 level
    },
    critBlock: {
      type: 'timed',
      effect: 'guaranteedCrit',
      duration: 20000,         // 20 seconds
    },
    berserkBlock: {
      type: 'timed',
      effect: 'damageBoost',
      value: 0.5,              // +50%
      duration: 20000,         // 20 seconds
      stacks: true,            // Stacks with everything
    },
    comboBlock: {
      type: 'instant',
      effect: 'addCombo',
      value: 50,               // +50 combo
    },
    legendBlock: {
      type: 'instant',
      effect: 'addLevel',
      value: 5,                // +5 levels
    },
  },
});

/**
 * Get effect configuration for a block type
 */
export function getBlockEffect(blockType) {
  return SPECIAL_BLOCKS_CONFIG.effects[blockType] || null;
}

export function getGemPowerBlockRestoreAmount(depthTiles) {
  const tiers = SPECIAL_BLOCKS_CONFIG.effects.gemPowerBlock.restoreTiers;
  const safeDepth = Number.isFinite(depthTiles) ? Math.max(0, depthTiles) : 0;
  let selected = tiers[0];
  for (const tier of tiers) {
    if (safeDepth >= tier.minDepthTiles) selected = tier;
  }
  return selected.restoreAmount;
}
