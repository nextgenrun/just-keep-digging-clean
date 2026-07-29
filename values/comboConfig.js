// ==================== COMBO CONFIG ====================
export const COMBO_CONFIG = Object.freeze({
  // Combo tracking cap. null means combo count keeps climbing while multiplier caps still apply.
  maxCombo: null,
  maxMultiplier: 3.0,

  // HUD combo-multiplier color tiers (HUDSystem)
  multiplierTiers: Object.freeze({
    warm: Object.freeze({ minMultiplier: 1.25, color: "#ffdd88" }),
    hot: Object.freeze({ minMultiplier: 1.75, color: "#ffaa44" }),
    blazing: Object.freeze({ minMultiplier: 2.25, color: "#ff6633" }),
    godlike: Object.freeze({ minMultiplier: 2.75, color: "#ff33aa" }),
  }),

  // Milestone rewards (PlaySceneSetup milestone callback).
  milestoneRewards: Object.freeze({
    10: Object.freeze({ gpRestore: 2 }),
    25: Object.freeze({ gpRestore: 3 }),
    50: Object.freeze({ gpRestore: 4 }),
    100: Object.freeze({ gpRestore: 5 }),
    200: Object.freeze({ gpRestore: 6 }),
    500: Object.freeze({ gpRestore: 8 }),
    1000: Object.freeze({ gpRestore: 10 }),
    5000: Object.freeze({ gpRestore: 15 }),
  }),

  // ── COMBO MOMENTUM ──────────────────────────────────────────────────────
  // Small, noticeable dig-speed reward for keeping a combo alive.
  // Deliberately mild: at full effect the 750ms base cooldown becomes ~690ms.
  momentum: Object.freeze({
    enabled: true,
    minCombo: 5,               // no effect below this combo
    fullEffectAtCombo: 60,     // reduction ramps linearly until this combo
    maxCooldownReduction: 0.08, // 8% faster digging at full momentum (mild)
  }),
});

export function getNextComboGpCheckpoint(comboCount = 0) {
  const current = Number.isFinite(comboCount) ? comboCount : 0;
  return Object.entries(COMBO_CONFIG.milestoneRewards)
    .map(([milestone, reward]) => ({ milestone: Number(milestone), gpRestore: reward.gpRestore || 0 }))
    .filter(entry => entry.milestone > current && entry.gpRestore > 0)
    .sort((a, b) => a.milestone - b.milestone)[0] || null;
}
