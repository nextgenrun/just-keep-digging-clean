import {
  HEAVENBLOCKS_WORLD_CONFIG,
  getHeavenblocksRegionAt,
} from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";

export class HeavenblocksAccessSystem {
  constructor(options = {}) {
    this.progressionSystem = options.progressionSystem || null;
    this.playerController = options.playerController || null;
    this.onDenied = options.onDenied || null;
    this.nextDeniedAt = 0;
  }

  getTileAccess(tx, ty) {
    const region = getHeavenblocksRegionAt(tx, ty);
    if (!region) return { allowed: true, regionId: null };
    return this.progressionSystem?.getRegionAccessState?.(region.id)
      || { allowed: false, reason: "progression-unavailable", regionId: region.id };
  }

  canMutateTile(tx, ty) {
    return this.getTileAccess(tx, ty).allowed === true;
  }

  update(playerTile, now = 0) {
    if (!playerTile) return { allowed: true };
    const region = getHeavenblocksRegionAt(playerTile.tx, playerTile.ty);
    if (!region) return { allowed: true };
    const access = this.getTileAccess(playerTile.tx, playerTile.ty);
    if (access.allowed) return access;

    const fallback = region.lockedFallbackTile
      || HEAVENBLOCKS_WORLD_CONFIG.levels
        .find((level) => level.levelId === region.levelId)
        ?.groundPortal?.interactionTiles?.[0];
    if (fallback) this.playerController?.teleportToTile?.(fallback.tx, fallback.ty);
    if (now >= this.nextDeniedAt) {
      this.nextDeniedAt = now
        + HEAVENBLOCKS_PROGRESSION_CONFIG.interaction.accessDeniedCooldownMs;
      this.onDenied?.(region, access);
    }
    return { ...access, repelled: true, fallback };
  }

  getHealthSnapshot() {
    return {
      hasProgressionSystem: Boolean(this.progressionSystem),
      hasPlayerController: Boolean(this.playerController),
    };
  }
}
