// One primary unlock per purchase. Depth opens rank batches, not a second
// player-level requirement. Relics are permanent discoveries, never a price.
const rule = (first, bands = []) => Object.freeze({
  first: Object.freeze(first),
  bands: Object.freeze(bands.map(([depth, ranks]) => Object.freeze({ depth, ranks }))),
});

export const SHOP_UPGRADE_PROGRESSION = Object.freeze({
  bronzePickaxe: rule({ depth: 40 }),
  ironPickaxe: rule({ depth: 100 }),
  steelPickaxe: rule({ depth: 300 }),
  mithrilPickaxe: rule({ depth: 500 }),
  adamantPickaxe: rule({ depth: 750 }),
  runePickaxe: rule({ depth: 1100 }),
  dragonPickaxe: rule({ depth: 1600 }),
  agility: rule({}, [[0, 8], [250, 14], [950, 20]]),
  strength: rule({}, [[0, 4], [300, 7], [1000, 10]]),
  quickReflexes: rule({ firstReturn: true }, [[0, 4], [350, 7], [1050, 10]]),
  heavyPunch: rule({ relics: 2 }, [[0, 8], [800, 14], [1400, 20]]),
  gemPowerTank: rule({ firstReturn: true }, [[0, 3], [400, 5], [1100, 8]]),
  gemPowerEfficiency: rule({ firstReturn: true }, [[0, 2], [500, 4], [1200, 6]]),
  gemPowerRegeneration: rule({ depth: 140 }, [[0, 4], [550, 8], [1250, 12]]),
  gemFlySpeed: rule({ depth: 180 }, [[0, 2], [600, 4], [1300, 6]]),
  torchDrainEfficiency: rule({ flightReady: true }, [[0, 2], [650, 4], [1350, 5]]),
  torchRange: rule({ flightReady: true }, [[0, 2], [700, 3], [1400, 4]]),
  boboCaveEyes: rule({ flightReady: true }, [[0, 2], [750, 4], [1450, 5]]),
  startResourcePrices: rule({}, [[0, 2], [600, 4], [1200, 5]]),
  nextResourcePrices: rule({ firstReturn: true }, [[0, 2], [700, 4], [1300, 5]]),
  marketInsight: rule({ depth: 220 }, [[0, 2], [800, 4], [1500, 5]]),
  quickslashAbility: rule({ depth: 100 }),
  thunderStrikeAbility: rule({ relics: 1 }),
  seismicSuppression: rule({ relics: 4 }),
});

const ready = Object.freeze({
  available: true, reason: null, feature: "core", short: "AVAILABLE NOW", detail: "",
});
const locked = (feature, short, detail) => ({
  available: false, reason: "progression_locked", feature, short, detail,
});

export function getShopUpgradeProgression(upgradeId, currentRank, maximumRank, progress) {
  const entry = SHOP_UPGRADE_PROGRESSION[upgradeId];
  if (!entry) return null;
  if (currentRank >= maximumRank) return ready;
  const depth = Number(progress.bestDepth) || 0;
  if (currentRank === 0) {
    const first = entry.first;
    if (first.relics && (Number(progress.relicCount) || 0) < first.relics) {
      return locked("relics", `FIND ${first.relics} RELIC${first.relics === 1 ? "" : "S"}`,
        `Find ${first.relics} Ancient Relic${first.relics === 1 ? "" : "s"} to unlock this. `
        + `Found: ${progress.relicCount || 0}/${first.relics}. You keep your relics.`);
    }
    if (first.depth && depth < first.depth) {
      return locked("depth", `REACH ${first.depth}m`,
        `Reach ${first.depth}m on any trip to unlock this. Best depth: ${depth}m.`);
    }
    if (first.firstReturn && !progress.firstReturn) {
      return locked("firstReturn", "RETURN ONCE", "Return to town after your first mining trip.");
    }
    if (first.flightReady && !progress.flightReady) {
      return locked("flightReady", "UNLOCK FLIGHT", "Complete the opening path and unlock Flight.");
    }
  }
  const nextBand = entry.bands.find(band => currentRank < band.ranks);
  if (nextBand && depth < nextBand.depth) {
    return locked("depth", `REACH ${nextBand.depth}m`,
      `Reach ${nextBand.depth}m on any trip to buy rank ${currentRank + 1}. `
      + `Your current upgrades stay active. Best depth: ${depth}m.`);
  }
  return ready;
}
