import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";

export function resolveCaveHazardState(hazard, time) {
  if (hazard.static) {
    return { active: true, telegraph: false, progress: 1 };
  }
  const period = Math.max(1, hazard.periodMs);
  const cycle = ((time + hazard.phaseMs) % period + period) % period;
  const active = cycle < hazard.activeMs;
  const telegraph = !active && cycle >= period - hazard.telegraphMs;
  return {
    active,
    telegraph,
    progress: active
      ? cycle / Math.max(1, hazard.activeMs)
      : telegraph
        ? (cycle - (period - hazard.telegraphMs)) / Math.max(1, hazard.telegraphMs)
        : 0,
  };
}

export function getCaveHazardBounds(
  hazard,
  tileSize,
  config = CAVE_GAMEPLAY_CONFIG.hazards,
) {
  const render = config.render;
  const floorY = hazard.floorY * tileSize;
  if (hazard.kind === "spike-run") {
    return {
      left: hazard.startTx * tileSize,
      right: (hazard.endTx + 1) * tileSize,
      top: floorY - render.spikeHeightTiles * tileSize,
      bottom: floorY,
    };
  }
  const centerX = (hazard.centerTx + 0.5) * tileSize;
  if (hazard.kind === "ember-vent") {
    const availableHeight = (
      hazard.floorY - hazard.ceilingY - render.ventCeilingClearanceTiles
    ) * tileSize;
    const height = Math.min(render.ventHeightTiles * tileSize, availableHeight);
    const width = render.ventWidthTiles * tileSize;
    return {
      left: centerX - width * 0.5,
      right: centerX + width * 0.5,
      top: floorY - height,
      bottom: floorY,
    };
  }
  const halfWidth = render.gateWidthTiles * tileSize * 0.5;
  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: hazard.ceilingY * tileSize,
    bottom: floorY,
  };
}

export function caveHazardOverlapsBody(hazardBounds, bodyBounds, insetPx = 0) {
  return bodyBounds.right - insetPx > hazardBounds.left
    && bodyBounds.left + insetPx < hazardBounds.right
    && bodyBounds.bottom - insetPx > hazardBounds.top
    && bodyBounds.top + insetPx < hazardBounds.bottom;
}

/**
 * Resolves cave-trap timing, player contact, GP loss, and safe retry placement.
 */
export class CaveHazardSystem {
  constructor(scene, view, config = CAVE_GAMEPLAY_CONFIG.hazards) {
    this.scene = scene;
    this.view = view;
    this.config = config;
    this.worldModel = null;
    this.visibleEntries = [];
    this.warnedCaves = new Set();
    this.activeCaveId = null;
    this.lastRenderAt = Number.NEGATIVE_INFINITY;
    this.lastFailureAt = Number.NEGATIVE_INFINITY;
    this.failureCount = 0;
    this.lastFailure = null;
  }

  create(worldModel) {
    if (!this.config.enabled || !worldModel) return false;
    this.worldModel = worldModel;
    this.view?.create?.();
    return true;
  }

  update(time, playerTile, gameplayActive = true) {
    if (!this.worldModel || !playerTile) return;
    const hazards = this.worldModel.getCaveHazardZonesInRange?.(
      playerTile,
      this.config.renderRangeTiles,
    ) || [];
    this.visibleEntries = hazards.map(hazard => ({
      hazard,
      state: resolveCaveHazardState(hazard, time),
    }));
    if (time - this.lastRenderAt >= this.config.updateIntervalMs) {
      this.lastRenderAt = time;
      this.view?.render?.(
        this.visibleEntries,
        time,
        this.scene.config?.tileSize,
      );
    }
    this._warnForActiveCave(playerTile);
    if (!gameplayActive || time - this.lastFailureAt < this.config.failureCooldownMs) return;
    this._checkPlayerContact(time);
  }

  destroy() {
    this.view?.destroy?.();
    this.worldModel = null;
    this.visibleEntries = [];
    this.warnedCaves.clear();
    this.activeCaveId = null;
  }

  getSnapshot() {
    return {
      hazardCount: this.worldModel?.caveHazardZones?.length || 0,
      visibleCount: this.visibleEntries.length,
      activeCaveId: this.activeCaveId,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure ? { ...this.lastFailure } : null,
    };
  }

  _warnForActiveCave(playerTile) {
    const cave = this.worldModel.getCaveZoneAtTile?.(playerTile);
    this.activeCaveId = cave?.id || null;
    if (!cave?.hazards?.length || this.warnedCaves.has(cave.id)) return;
    this.warnedCaves.add(cave.id);
    const hazard = cave.hazards[0];
    this.scene.uiNotifications?.warning?.(
      `${hazard.label}${this.config.warningSeparator}${hazard.hint}`,
      {
        key: `${this.config.warningKeyPrefix}${cave.id}`,
        durationMs: this.config.warningDurationMs,
      },
    );
  }

  _checkPlayerContact(time) {
    const controller = this.scene.playerController;
    const body = controller?.physicsBody;
    const bodyBounds = body?.getBounds?.();
    if (!bodyBounds) return;
    for (const entry of this.visibleEntries) {
      if (!entry.state.active) continue;
      const hazardBounds = getCaveHazardBounds(
        entry.hazard,
        this.scene.config.tileSize,
        this.config,
      );
      if (!caveHazardOverlapsBody(
        hazardBounds,
        bodyBounds,
        this.config.collisionInsetPx,
      )) continue;
      this._handleFailure(entry.hazard, bodyBounds, time);
      return;
    }
  }

  _handleFailure(hazard, bodyBounds, time) {
    const controller = this.scene.playerController;
    const tileSize = this.scene.config.tileSize;
    const hazardWorldX = (hazard.centerTx + 0.5) * tileSize;
    const bodyCenterX = (bodyBounds.left + bodyBounds.right) * 0.5;
    const recoverLeft = bodyCenterX <= hazardWorldX;
    const checkpoint = recoverLeft ? hazard.leftCheckpoint : hazard.rightCheckpoint;
    const direction = recoverLeft ? -1 : 1;
    const drained = controller?.drainAllGemPower?.() || 0;

    this.lastFailureAt = time;
    this.failureCount += 1;
    this.lastFailure = {
      hazardId: hazard.id,
      caveId: hazard.caveId,
      drained,
      checkpoint: { ...checkpoint },
      time,
    };

    this.scene.lightSystem?.forceTorchOff?.({ manual: true, showStatus: false });
    controller?.teleportToTile?.(checkpoint.tx, checkpoint.ty);
    controller?.applyExternalKnockback?.(
      direction * this.config.hit.knockbackHorizontalPxPerSecond,
      this.config.hit.knockbackVerticalPxPerSecond,
    );
    this.scene.shakeSystem?.shake?.(
      this.config.hit.shakeSignature,
      this.config.hit.shakeIntensityScale,
      { force: true },
    );
    this.scene.soundSystem?.[this.config.hit.soundMethod]?.();
    this.scene.uiNotifications?.danger?.(
      this.config.hit.notification,
      {
        key: this.config.failureNotificationKey,
        durationMs: this.config.hit.notificationDurationMs,
      },
    );
    this.scene.hudSystem?.flashStatus?.(
      this.config.hit.recoveryStatus,
      this.config.hit.statusColor,
      this.config.hit.statusDurationMs,
    );
    const floatingText = drained > 0
      ? `-${Math.floor(drained)} GP`
      : this.config.hit.emptyFloatingText;
    this.scene.floatingTextSystem?.showFloatingText?.(
      bodyCenterX,
      (bodyBounds.top + bodyBounds.bottom) * 0.5,
      floatingText,
      this.config.hit.floatingColor,
      this.config.hit.floatingDurationMs,
      this.config.hit.floatingFontSize,
    );
  }
}
