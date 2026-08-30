// Development-only God Mode tuning and presentation.
export const GOD_MODE_CONFIG = Object.freeze({
  movementSpeedPxPerSec: 2000,
  miningDamage: 999,
  mineCooldownReduction: 0.8,
  activationGrant: Object.freeze({
    money: 50000,
    resourceTotals: Object.freeze({
      dirt: 5000,
      stone: 5000,
      copper: 5000,
      bronze: 5000,
      silver: 5000,
      gold: 5000,
      lavaDirt: 5000,
      obsidian: 5000,
      emberOre: 5000,
      magmaCrystal: 5000,
    }),
  }),
  presentation: Object.freeze({
    enabledText: "GOD MODE ON  •  ALL ABILITIES  •  999 DMG  •  80% FASTER DIGGING  •  V TO DISABLE",
    disabledText: "GOD MODE OFF  •  ABILITY AND STAT OVERRIDES DISABLED  •  V TO ENABLE",
    color: "#ff00ff",
    durationMs: 2800,
  }),
});
