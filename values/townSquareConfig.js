export const TOWN_SQUARE_CONFIG = Object.freeze({
  layoutId: "town-square-option-a-v1",
  merchantSurfaceTileOffset: -1,
  merchantInteractionRangeTiles: 3,
  milestonePillar: Object.freeze({
    tileX: 3,
    displayTileYOffset: -3,
    interactionTileYOffset: -1,
    interactionRangeTiles: 2,
  }),
  surfaceMerchantOrder: Object.freeze([
    "boboMerchant",
    "playerUpgrades",
    "gemPowerMerchant",
    "gearMerchant",
    "moneyMonster",
  ]),
  merchantSlots: Object.freeze({
    boboMerchant: Object.freeze({ tileX: 5 }),
    playerUpgrades: Object.freeze({ tileX: 7 }),
    gemPowerMerchant: Object.freeze({ tileX: 10.25 }),
    gearMerchant: Object.freeze({ tileX: 14.5 }),
    moneyMonster: Object.freeze({ tileX: 17 }),
  }),
});
