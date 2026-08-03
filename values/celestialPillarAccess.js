// Physical access points for the single Star Pillar talent controller.

import { CAMPFIRE_CONFIG } from "./campfireConfig.js";
import { TOWN_SQUARE_CONFIG } from "./townSquareConfig.js";

const moneyMonsterTileX = TOWN_SQUARE_CONFIG.merchantSlots.moneyMonster.tileX;

export const CELESTIAL_PILLAR_ACCESS_CONFIG = Object.freeze({
  town: Object.freeze({
    id: "town-celestial-pillar",
    tileX: (moneyMonsterTileX + CAMPFIRE_CONFIG.surfaceTileX) / 2,
    surfaceTileYOffset: -1,
    proximityTiles: 2,
    verticalProximityTiles: 3,
    maxHeightPx: 220,
    promptText: "Open Celestial Talents",
  }),
});
