import {
  TELEPORT_TRANSITION_CONFIG,
  isTeleportTransitionEnabled,
} from "../../values/teleportTransition.js";
import { SCENE_BASE_PHASES } from "../../values/sceneRuntime.js";

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

function tileDistance(left, right) {
  if (!left || !right) return 0;
  return Math.hypot(
    Number(right.tx) - Number(left.tx),
    Number(right.ty) - Number(left.ty),
  );
}

export class TeleportTransitionController {
  constructor(
    scene,
    createOverlay,
    config = TELEPORT_TRANSITION_CONFIG,
    search = globalThis.location?.search || "",
  ) {
    this.scene = scene;
    this.createOverlay = createOverlay;
    this.config = config;
    this.enabled = isTeleportTransitionEnabled(search, config);
    this.active = false;
    this.destroyed = false;
    this.phase = "idle";
    this.overlay = null;
    this.request = null;
    this.startedAtMs = 0;
    this.preparationStartedAtMs = 0;
    this.coverFramesRemaining = 0;
    this.settleFramesRemaining = 0;
    this.animationReady = false;
    this.animationSettled = false;
    this.snapshot = this._emptySnapshot();
    this._publishDiagnostics();
  }

  _emptySnapshot() {
    return {
      status: "idle",
      totalAssets: 1,
      loadedAssets: 0,
      pendingAssets: 1,
      progress: 0,
      active: false,
      phase: "idle",
      timedOut: false,
    };
  }

  begin({
    target,
    label = "PORTAL",
    commit,
    afterCommit = null,
    allowFromPaused = false,
  } = {}) {
    const sceneState = this.scene?.gameState;
    const canStartFromState = sceneState === "playing"
      || (allowFromPaused === true && sceneState === "paused");
    if (
      !this.enabled
      || this.destroyed
      || this.active
      || !canStartFromState
      || !Number.isFinite(target?.tx)
      || !Number.isFinite(target?.ty)
      || typeof commit !== "function"
    ) return false;
    const source = this.scene.playerController?.getPlayerTile?.();
    if (tileDistance(source, target) < this.config.minimumDistanceTiles) return false;

    this.request = {
      target: { tx: target.tx, ty: target.ty },
      label,
      commit,
      afterCommit: typeof afterCommit === "function" ? afterCommit : null,
    };
    this.startedAtMs = this.scene.time?.now || 0;
    this.preparationStartedAtMs = 0;
    this.coverFramesRemaining = 1;
    this.animationReady = false;
    this.animationSettled = false;
    this.snapshot = {
      ...this._emptySnapshot(),
      status: "covering",
      active: true,
      phase: "covering",
    };
    this.overlay = this.createOverlay?.(this.scene, {
      config: this.config,
      getProgress: () => this.snapshot,
    }) || null;
    if (!this.overlay) {
      this.request = null;
      this.snapshot = this._emptySnapshot();
      return false;
    }

    this.active = true;
    this.phase = "covering";
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.setSceneBasePhase?.(SCENE_BASE_PHASES.TRANSITIONING, {
      source: "portal-teleport",
    });
    const animationKey = this.scene.playerAssetProfile?.teleportInAnim;
    const animationController = this.scene.playerDeferredAnimationAssetController;
    const animationRequest = animationKey
      && typeof animationController?.ensureForAnimation === "function"
      ? animationController.ensureForAnimation(animationKey)
      : { ready: true };
    Promise.resolve(animationRequest).then(result => {
      if (!this.active || this.destroyed) return;
      this.animationReady = result?.ready === true;
      this.animationSettled = true;
    }).catch(() => {
      if (!this.active || this.destroyed) return;
      this.animationSettled = true;
    });
    this._publishDiagnostics();
    return true;
  }

  isActive() {
    return this.active;
  }

  update(time) {
    if (!this.active || this.destroyed) return false;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    if (this.phase === "covering") {
      if (this.coverFramesRemaining > 0) {
        this.coverFramesRemaining -= 1;
        this.snapshot = {
          ...this.snapshot,
          elapsedMs: Math.max(0, now - this.startedAtMs),
        };
        this.overlay?.refresh?.();
        this._publishDiagnostics();
        return true;
      }
      // Pointer callbacks can begin a transition before the scene's update.
      // Consuming one full update above guarantees one covered render first.
      this.preparationStartedAtMs = now;
      this.scene.worldRenderer?.updateRenderWindow?.(this.request.target);
      this.phase = "preparing";
      this._refreshPreparation(now);
      return true;
    }
    if (this.phase === "preparing") {
      this.scene.worldRenderer?.updateRenderWindow?.(this.request.target);
      this._refreshPreparation(now);
      const elapsed = now - this.startedAtMs;
      const preparationElapsed = now - this.preparationStartedAtMs;
      const rendererReady = this.snapshot.pendingAssets <= 0;
      const minimumShown = elapsed >= this.config.minimumVisibleMs;
      const timedOut = preparationElapsed >= this.config.maximumPreparationMs;
      if (minimumShown && ((rendererReady && this.animationSettled) || timedOut)) {
        this._commit(timedOut);
      }
      return true;
    }
    if (this.phase === "settling") {
      this.settleFramesRemaining -= 1;
      if (this.settleFramesRemaining <= 0) {
        this.phase = "exiting";
        this.snapshot = {
          ...this.snapshot,
          status: "ready",
          loadedAssets: this.snapshot.totalAssets,
          pendingAssets: 0,
          progress: 1,
          phase: "exiting",
        };
        this.overlay?.refresh?.();
        this.overlay?.complete?.(() => this._finish());
        this._publishDiagnostics();
      }
      return true;
    }
    return true;
  }

  _refreshPreparation(now) {
    const renderer = this.scene.worldRenderer
      ?.getTransitionPreparationSnapshot?.() || {
        totalAssets: 0,
        loadedAssets: 0,
        pendingAssets: 0,
      };
    const totalAssets = Math.max(
      1,
      Math.max(0, Number(renderer.totalAssets) || 0) + 1,
    );
    const loadedAssets = Math.min(
      totalAssets,
      Math.max(0, Number(renderer.loadedAssets) || 0)
        + (this.animationSettled ? 1 : 0),
    );
    const pendingAssets = Math.max(0, totalAssets - loadedAssets);
    this.snapshot = {
      status: "loading",
      totalAssets,
      loadedAssets,
      pendingAssets,
      progress: clamp(loadedAssets / totalAssets),
      active: true,
      phase: this.phase,
      timedOut: false,
      elapsedMs: Math.max(0, now - this.startedAtMs),
      destination: { ...this.request.target },
      label: this.request.label,
    };
    this.overlay?.refresh?.();
    this._publishDiagnostics();
  }

  _commit(timedOut) {
    if (!this.active || this.phase !== "preparing") return;
    this.phase = "settling";
    this.snapshot = {
      ...this.snapshot,
      status: timedOut ? "timeout" : "committing",
      phase: "settling",
      timedOut,
    };
    try {
      this.request.commit();
      const playerTile = this.scene.playerController?.getPlayerTile?.()
        || this.request.target;
      this.scene._framePlayerTile = playerTile;
      this.scene.worldRenderer?.updateRenderWindow?.(playerTile);
      const player = this.scene.player;
      if (Number.isFinite(player?.x) && Number.isFinite(player?.y)) {
        this.scene.cameras?.main?.centerOn?.(player.x, player.y);
      }
      this.request.afterCommit?.();
      this.scene.queueDugTilesSave?.("portal-teleport-arrival");
    } catch (error) {
      console.error("[TeleportTransition] Portal commit failed", error);
      this._finish();
      return;
    }
    this.settleFramesRemaining = Math.max(
      1,
      Math.trunc(Number(this.config.settleFrames) || 1),
    );
    this._publishDiagnostics();
  }

  _finish() {
    if (!this.active) return;
    this.overlay?.destroy?.();
    this.overlay = null;
    this.active = false;
    this.phase = "idle";
    this.request = null;
    if (!this.destroyed && !this.scene?._isShuttingDown) {
      this.scene.setSceneBasePhase?.(SCENE_BASE_PHASES.ACTIVE, {
        source: "portal-teleport-complete",
      });
      this.scene.playerController?.setControlsEnabled?.(true);
    }
    this.snapshot = {
      ...this._emptySnapshot(),
      status: "complete",
      loadedAssets: 1,
      pendingAssets: 0,
      progress: 1,
    };
    this._publishDiagnostics();
  }

  _publishDiagnostics() {
    if (typeof globalThis === "undefined") return;
    globalThis[this.config.diagnosticsGlobalKey] = {
      ...this.snapshot,
      enabled: this.enabled,
      active: this.active,
      phase: this.phase,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.overlay?.destroy?.();
    this.overlay = null;
    this.active = false;
    this.phase = "idle";
    this.request = null;
    this.scene = null;
    this.createOverlay = null;
    this._publishDiagnostics();
  }
}
