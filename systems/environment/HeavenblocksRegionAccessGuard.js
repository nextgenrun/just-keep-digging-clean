import {
  HEAVENBLOCKS_ACCESS_CONFIG,
  getHeavenblockAccessRegion,
  resolveHeavenblocksGameplayEnabled,
} from "../../values/heavenblocksAccessConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  getHeavenblocksRegionAt,
  isHeavenblocksSafetyFloor,
} from "../../values/heavenblocksWorldConfig.js";

export class HeavenblocksRegionAccessGuard {
  constructor(scene, {
    worldModel,
    playerController,
    progressionSystem,
    ancientRelicSystem,
    artifactSystem = null,
    config = HEAVENBLOCKS_ACCESS_CONFIG,
  }) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.playerController = playerController;
    this.progressionSystem = progressionSystem;
    this.ancientRelicSystem = ancientRelicSystem;
    this.artifactSystem = artifactSystem;
    this.config = config;
    this.enabled = resolveHeavenblocksGameplayEnabled(config);
    this.lastBarrierSignature = "";
    this.lastRepelAt = -Infinity;
    this.lastRepelledRegionId = null;
  }

  getRegionAccessState(regionId) {
    const region = getHeavenblockAccessRegion(regionId);
    if (!region) {
      return {
        allowed: false,
        reason: "unknown-region",
        regionId,
      };
    }
    if (!this.enabled || this.progressionSystem?.isRegionUnlocked?.(regionId)) {
      return {
        allowed: true,
        reason: null,
        regionId,
      };
    }
    const have = this.ancientRelicSystem?.getCount?.() || 0;
    if (region === this.config.regions[0]) {
      return {
        allowed: false,
        reason: "relics",
        regionId,
        have,
        required: this.config.requiredRelics,
      };
    }
    return {
      allowed: false,
      reason: "prerequisite-region",
      regionId,
      requiredRegionId: this.config.regions[0].id,
    };
  }

  getTileAccess(tx, ty) {
    const region = getHeavenblocksRegionAt(tx, ty);
    if (!region) {
      return {
        allowed: true,
        reason: null,
        regionId: null,
      };
    }
    return this.getRegionAccessState(region.id);
  }

  canMutateTile(tx, ty) {
    const access = this.getTileAccess(tx, ty);
    if (!access.allowed) {
      return {
        ...access,
        reason: this.config.regionGuard.blockedDamageReason,
      };
    }
    if (isHeavenblocksSafetyFloor(tx, ty)) {
      return {
        allowed: false,
        reason: this.config.regionGuard.safetyAnchorDamageReason,
        regionId: access.regionId,
      };
    }
    return access;
  }

  update(playerTile) {
    if (!this.enabled || !playerTile) return;
    this.syncProgressionState();
    const region = getHeavenblocksRegionAt(playerTile.tx, playerTile.ty);
    if (!region) {
      this.lastRepelledRegionId = null;
      return;
    }
    const access = this.getRegionAccessState(region.id);
    if (access.allowed) {
      this.lastRepelledRegionId = null;
      return;
    }
    const now = this.scene.time?.now || 0;
    if (
      this.lastRepelledRegionId === region.id
      && now - this.lastRepelAt < this.config.regionGuard.repelCooldownMs
    ) {
      return;
    }
    this.lastRepelledRegionId = region.id;
    this.lastRepelAt = now;
    this.playerController?.teleportToTile?.(
      this.config.surfaceReturn.tx,
      this.config.surfaceReturn.ty,
    );
    this.scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
    this.scene.earthquakeHazardOverlay?.clear?.();
    this.artifactSystem?.playLockedPortalFeedback?.(region.id, access);
    const accessRegion = getHeavenblockAccessRegion(region.id);
    this.scene.hudSystem?.flashStatus?.(
      this.config.copy.directEntryLocked.replace(
        "{label}",
        accessRegion?.label || region.displayName,
      ),
      "#ff8ea6",
      this.config.regionGuard.statusDurationMs,
    );
  }

  syncProgressionState() {
    if (!this.enabled) return 0;
    const signature = this.config.regions
      .map((region) => (
        this.progressionSystem?.isRegionUnlocked?.(region.id) ? "1" : "0"
      ))
      .join("");
    if (signature === this.lastBarrierSignature) return 0;
    this.lastBarrierSignature = signature;
    let changed = 0;
    for (const region of this.config.regions) {
      if (!region.barrier) continue;
      const unlocked = this.progressionSystem?.isRegionUnlocked?.(region.id) === true;
      for (let offset = 0; offset < region.barrier.height; offset += 1) {
        const tx = region.barrier.tx;
        const ty = region.barrier.topTy + offset;
        const targetType = unlocked ? TILE_TYPES.AIR : TILE_TYPES.HEAVEN_BARRIER;
        if (this.worldModel.getTileType(tx, ty) === targetType) continue;
        this.worldModel.setTile(tx, ty, targetType, 0);
        this.scene.worldRenderer?.applyTileUpdate?.(tx, ty);
        changed += 1;
      }
    }
    this.artifactSystem?.refreshProgressionVisuals?.();
    return changed;
  }

  getHealthSnapshot() {
    const barrierMismatches = [];
    for (const region of this.config.regions) {
      if (!region.barrier) continue;
      const unlocked = this.progressionSystem?.isRegionUnlocked?.(region.id) === true;
      const expected = unlocked ? TILE_TYPES.AIR : TILE_TYPES.HEAVEN_BARRIER;
      for (let offset = 0; offset < region.barrier.height; offset += 1) {
        const ty = region.barrier.topTy + offset;
        if (this.worldModel.getTileType(region.barrier.tx, ty) !== expected) {
          barrierMismatches.push(`${region.barrier.tx},${ty}`);
        }
      }
    }
    return {
      enabled: this.enabled,
      damageGuardReady: !this.enabled || this.worldModel?.hasDamageGuard?.() === true,
      barriersReady: !this.enabled || barrierMismatches.length === 0,
      barrierMismatches,
    };
  }

  destroy() {
    this.lastBarrierSignature = "";
    this.lastRepelledRegionId = null;
  }
}
