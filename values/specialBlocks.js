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
    berserkBlock: 0.0007,        // 0.07% - reduced by 65%
    comboBlock: 0.0014,          // 0.14% - reduced by 65%
    legendBlock: 0.000175,        // 0.0175% - extremely rare, legendary
    abilityBlock: 0.0000875,      // 0.00875% - half the Crown rate
  },

  worldSpawns: Object.freeze({
    abilityBlock: Object.freeze({
      minimumDepthTiles: 8,
      maximumDepthTiles: 1000,
      occurrenceHashSalt: 0x0ab11e,
    }),
  }),

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
    abilityBlock: {
      color: 0xB57CFF,         // Celestial violet
      intensity: 0.65,
      pulseSpeed: 1250,
      edgeAlpha: 0.9,
      sparkles: true,
    },
  },

  // Effect configurations
  effects: {
    gemPowerBlock: {
      type: 'instant',
      effect: 'restoreGemPower',
      restoreTiers: Object.freeze([
        Object.freeze({
          id: 'gp100',
          minDepthTiles: 0,
          restoreAmount: 100,
          semanticFrame: 0,
          recognitionFrame: 62,
          assetPath: 'sprites/tiles/special-tiles-imagegen-v4/gem-power-100.webp',
        }),
        Object.freeze({
          id: 'gp250',
          minDepthTiles: 250,
          restoreAmount: 250,
          semanticFrame: 1,
          recognitionFrame: 63,
          assetPath: 'sprites/tiles/special-tiles-imagegen-v4/gem-power-250.webp',
        }),
        Object.freeze({
          id: 'gp500',
          minDepthTiles: 500,
          restoreAmount: 500,
          semanticFrame: 2,
          recognitionFrame: 64,
          assetPath: 'sprites/tiles/special-tiles-imagegen-v4/gem-power-500.webp',
        }),
        Object.freeze({
          id: 'gp1000',
          minDepthTiles: 1000,
          restoreAmount: 1000,
          semanticFrame: 3,
          recognitionFrame: 65,
          assetPath: 'sprites/tiles/special-tiles-imagegen-v4/gem-power-1000.webp',
        }),
        Object.freeze({
          id: 'gp1700',
          minDepthTiles: 1500,
          restoreAmount: 1700,
          semanticFrame: 4,
          recognitionFrame: 66,
          assetPath: 'sprites/tiles/special-tiles-imagegen-v4/gem-power-1700.webp',
        }),
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
      effect: 'addLevelProgress',
      value: 0.1,              // One former level in the ten-to-one scale
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
      effect: 'addLevelProgress',
      value: 1,                // One complete player level, with progress carried
    },
    abilityBlock: {
      type: 'choice',
      effect: 'temporaryFreeAbility',
      duration: 20000,
      eligibleAbilityIds: Object.freeze([
        'quickslash',
        'thunderStrike',
        'wayward-star',
        'hollow-sun',
        'comet-engine',
      ]),
    },
  },

  // Rare rewards must confirm both the granted amount and the live total.
  feedback: Object.freeze({
    comboBlock: Object.freeze({
      title: "COMBO BLOCK ACTIVATED",
      message: "COMBO BLOCK  •  +{amount} COMBO  •  {total} TOTAL",
      color: "#F1C56A",
      notificationKey: "special-block-combo-reward",
      priority: 6,
    }),
    abilityBlock: Object.freeze({
      choicePrompt: "ABILITY BLOCK  •  CHOOSE A POWER ON THE ACTION BAR",
      selectedMessage: "{ability}  •  FREE USE FOR {seconds} SECONDS",
      expiredMessage: "{ability} FREE USE ENDED",
      color: "#C69BFF",
      durationMs: 5200,
    }),
    legendBlock: Object.freeze({
      message: "ULTRA-RARE CROWN  •  +{levels} LEVEL",
      cappedMessage: "ULTRA-RARE CROWN FOUND  •  LEVEL CAP REACHED",
      color: "#FFE08A",
      durationMs: 3600,
    }),
  }),
});

export const GEM_POWER_BLOCK_TIERS = SPECIAL_BLOCKS_CONFIG.effects.gemPowerBlock.restoreTiers;

/**
 * Get effect configuration for a block type
 */
export function getBlockEffect(blockType) {
  return SPECIAL_BLOCKS_CONFIG.effects[blockType] || null;
}

export function getGemPowerBlockTier(depthTiles) {
  const safeDepth = Number.isFinite(depthTiles) ? Math.max(0, depthTiles) : 0;
  let selected = GEM_POWER_BLOCK_TIERS[0];
  for (const tier of GEM_POWER_BLOCK_TIERS) {
    if (safeDepth >= tier.minDepthTiles) selected = tier;
  }
  return selected;
}

export function getGemPowerBlockRestoreAmount(depthTiles) {
  return getGemPowerBlockTier(depthTiles).restoreAmount;
}
