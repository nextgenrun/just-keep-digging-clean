import { FIRST_SESSION_SAFETY_CONFIG } from "../../values/firstSessionSafety.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { RETURN_ROUTE_KINDS } from "../../values/returnRouteTelemetry.js";

const TOWN_FLOOR_TYPES = new Set([
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
]);

export class LocalRecoverySystem {
  constructor(scene, config = FIRST_SESSION_SAFETY_CONFIG.localRecovery) {
    this.scene = scene;
    this.config = config;
    this.lastUsedAt = -Infinity;
    this.lastResult = Object.freeze({ success: false, reason: "unused" });
  }

  canRecover() {
    const source = this.scene.playerController?.getPlayerTile?.();
    const surfaceRow = this.scene.config?.topAirRows;
    if (!source || !Number.isInteger(surfaceRow)) {
      return { allowed: false, reason: "position-unavailable", source };
    }
    if (source.ty > surfaceRow + this.config.maximumDepthBelowTownTiles) {
      return { allowed: false, reason: "outside-town-zone", source };
    }
    const elapsed = (this.scene.time?.now || 0) - this.lastUsedAt;
    if (elapsed < this.config.cooldownMs) {
      return {
        allowed: false,
        reason: "cooldown",
        source,
        remainingMs: this.config.cooldownMs - elapsed,
      };
    }
    const destination = this._findSafeTownTile(source.tx, surfaceRow);
    return destination
      ? { allowed: true, reason: "ready", source, destination }
      : { allowed: false, reason: "no-safe-town-tile", source };
  }

  recover() {
    const admission = this.canRecover();
    if (!admission.allowed) {
      const message = admission.reason === "cooldown"
        ? this.config.cooldownCopy
        : this.config.unavailableCopy;
      this.scene.uiNotifications?.warning?.(message, {
        key: "local-recovery-unavailable",
        durationMs: 3200,
      });
      this.lastResult = Object.freeze({ success: false, ...admission });
      return this.lastResult;
    }
    const moved = this.scene.playerController?.teleportToTile?.(
      admission.destination.tx,
      admission.destination.ty,
    ) !== false;
    if (!moved) {
      this.lastResult = Object.freeze({ success: false, reason: "teleport-failed" });
      return this.lastResult;
    }
    this.lastUsedAt = this.scene.time?.now || 0;
    const surfaceRow = Number.isInteger(this.scene.config?.topAirRows)
      ? this.scene.config.topAirRows
      : admission.destination.ty + 1;
    this.scene.retentionProgressSystem?.recordReturnRoute?.({
      kind: RETURN_ROUTE_KINDS.LOCAL_RECOVERY,
      fromDepth: Math.max(0, admission.source.ty - surfaceRow),
      toDepth: 0,
      distanceTiles: Math.abs(admission.source.tx - admission.destination.tx)
        + Math.abs(admission.source.ty - admission.destination.ty),
    });
    this.scene.retentionProgressSystem?.recordFirstSessionAssist?.(
      "local-recovery",
      "recover",
    );
    this.scene.uiNotifications?.warning?.(this.config.successCopy, {
      key: "local-recovery-success",
      durationMs: 3800,
    });
    this.lastResult = Object.freeze({ success: true, ...admission, cargoLossRatio: 0 });
    return this.lastResult;
  }

  getSnapshot() {
    return { ...this.canRecover(), lastResult: { ...this.lastResult } };
  }

  _findSafeTownTile(preferredX, surfaceRow) {
    const world = this.scene.worldModel;
    if (!world) return null;
    for (let distance = 0; distance <= this.config.scanRadiusTiles; distance += 1) {
      const candidates = distance === 0
        ? [preferredX]
        : [preferredX - distance, preferredX + distance];
      for (const tx of candidates) {
        if (world.inBounds?.(tx, surfaceRow) === false) continue;
        const floor = world.getTileType?.(tx, surfaceRow);
        if (!TOWN_FLOOR_TYPES.has(floor)) continue;
        if (world.isSolid?.(tx, surfaceRow - 1)) continue;
        return { tx, ty: surfaceRow - 1 };
      }
    }
    return null;
  }

  destroy() {
    this.scene = null;
  }
}
