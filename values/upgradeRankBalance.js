// Current-game shop prices: useful first purchases, then a finite late-game tail.
// Dormant Level Two / Arc content deliberately keeps its existing tuning.
const prices = values => Object.freeze(values);

export const UPGRADE_RANK_COSTS = Object.freeze({
  gemPowerTank: prices([225, 500, 1100, 2400, 5500, 12500, 30000, 70000]),
  gemPowerEfficiency: prices([375, 1000, 2800, 8000, 23000, 65000]),
  gemPowerRegeneration: prices([1700, 2600, 4000, 6500, 10500, 17000, 27500, 44000, 70000, 110000, 175000, 280000]),
  gemFlySpeed: prices([900, 2200, 5500, 14000, 35000, 90000]),
  agility: prices([18, 35, 65, 120, 220, 400, 700, 1200, 2000, 3300,
    5400, 8800, 14500, 24000, 39000, 64000, 105000, 172000, 282000, 460000]),
  strength: prices([85, 160, 300, 600, 1200, 2500, 5500, 12000, 27000, 60000]),
  quickReflexes: prices([120, 240, 480, 950, 1900, 3800, 7800, 16000, 33000, 68000]),
  heavyPunch: prices([1800, 2800, 4300, 6500, 9500, 13500, 18500, 25000, 33000, 43000,
    56000, 72000, 92000, 117000, 149000, 190000, 242000, 308000, 392000, 500000]),
  startResourcePrices: prices([750, 2000, 5500, 15000, 41000]),
  nextResourcePrices: prices([1500, 4500, 13500, 40000, 120000]),
  marketInsight: prices([3000, 9500, 30000, 95000, 300000]),
  torchDrainEfficiency: prices([1200, 3200, 8500, 23000, 62000]),
  torchRange: prices([950, 4000, 17000, 72000]),
  boboCaveEyes: prices([1100, 3200, 9500, 28000, 82000]),
});

// Version 2 saved *compressed* ranks, not the much older long-track levels.
// Keep that exact effect curve so loading either generation never removes power.
export const COMPRESSED_V2_UPGRADE_EFFECTS = Object.freeze({
  gemPowerTank: Object.freeze({ baseEffect: 150, maxEffect: 600, maxLevel: 4 }),
  gemPowerEfficiency: Object.freeze({ baseEffect: 0.10, maxEffect: 0.30, maxLevel: 3 }),
  gemPowerRegeneration: Object.freeze({ baseEffect: 7.5, maxEffect: 45, maxLevel: 6 }),
  gemFlySpeed: Object.freeze({ baseEffect: 140, maxEffect: 400, maxLevel: 3 }),
  strength: Object.freeze({ baseEffect: 8, maxEffect: 40, maxLevel: 5 }),
  quickReflexes: Object.freeze({ baseEffect: 0.06, maxEffect: 0.30, maxLevel: 5 }),
  startResourcePrices: Object.freeze({ baseEffect: 0.40, maxEffect: 1, maxLevel: 3 }),
  nextResourcePrices: Object.freeze({ baseEffect: 0.40, maxEffect: 1, maxLevel: 3 }),
  marketInsight: Object.freeze({ baseEffect: 0.20, maxEffect: 0.50, maxLevel: 3 }),
  torchDrainEfficiency: Object.freeze({ baseEffect: 2.5, maxEffect: 5, maxLevel: 2 }),
  torchRange: Object.freeze({ baseEffect: 0.6, maxEffect: 1.2, maxLevel: 2 }),
  boboCaveEyes: Object.freeze({ baseEffect: 0.32, maxEffect: 0.8, maxLevel: 3 }),
});
