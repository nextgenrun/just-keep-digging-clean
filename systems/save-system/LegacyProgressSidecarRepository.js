import { CAMPFIRE_CONFIG, getCampfireStorageKey, sanitizeCampfireData } from
  "../../values/campfireConfig.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { migrateLegacyStarCountToXp } from "../../values/starRarityProgressionMath.js";
import { sanitizeMilestoneData, sanitizeStarCollectionData } from
  "../../values/savePayloadV15.js";

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export class LegacyProgressSidecarRepository {
  constructor({ slotId = 1, storage = globalThis.localStorage } = {}) {
    this.slotId = Number.isInteger(Number(slotId)) && Number(slotId) > 0
      ? Math.floor(Number(slotId))
      : 1;
    this.storage = storage;
  }

  readCampfireData() {
    const scoped = this._read(getCampfireStorageKey(this.slotId));
    const raw = scoped ?? (this.slotId === 1 ? this._read(CAMPFIRE_CONFIG.persistence.legacyKey) : null);
    return raw === null ? null : sanitizeCampfireData({ level: Number.parseInt(raw, 10) });
  }

  readMilestoneData() {
    const scoped = this._read(`dig-game-milestones-slot-${this.slotId}`);
    const raw = scoped ?? (this.slotId === 1 ? this._read("dig-game-milestones") : null);
    return raw === null ? null : sanitizeMilestoneData({ reachedDepths: parseJson(raw, []) });
  }

  readStarCollectionData() {
    const countsRaw = this._readScoped("dig-game-star-counts");
    const xpRaw = this._readScoped(STAR_RARITY_PROGRESSION_CONFIG.signProgression.saveKey);
    const rarityRaw = this._readScoped("dig-game-star-rarity-counts");
    const unlockedRaw = this._readScoped("dig-game-constellations");
    if ([countsRaw, xpRaw, rarityRaw, unlockedRaw].every(value => value === null)) return null;
    const constellationCounts = parseJson(countsRaw, {});
    const storedXp = parseJson(xpRaw, null);
    const unlockedConstellations = parseJson(unlockedRaw, []);
    const unlocked = new Set(Array.isArray(unlockedConstellations) ? unlockedConstellations : []);
    const signXp = {};
    for (const [resourceType, requiredXp] of Object.entries(
      STAR_RARITY_PROGRESSION_CONFIG.signProgression.xpTotals,
    )) {
      const current = Number(storedXp?.xp?.[resourceType]);
      signXp[resourceType] = unlocked.has(resourceType)
        ? requiredXp
        : Number.isFinite(current)
          ? current
          : migrateLegacyStarCountToXp(resourceType, constellationCounts?.[resourceType] || 0);
    }
    return sanitizeStarCollectionData({
      constellationCounts,
      signXp,
      rarityCounts: parseJson(rarityRaw, []),
      unlockedConstellations,
    });
  }

  _readScoped(baseKey) {
    const scoped = this._read(`${baseKey}-slot-${this.slotId}`);
    return scoped ?? (this.slotId === 1 ? this._read(baseKey) : null);
  }

  _read(key) {
    try { return this.storage?.getItem?.(key) ?? null; } catch { return null; }
  }
}
