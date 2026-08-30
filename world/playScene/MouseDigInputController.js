import {
  MINING_TARGET_FEEDBACK_CONFIG,
  resolveMouseDigEnabled,
} from "../../values/miningTargetFeedback.js";
import {
  isPrimaryMousePointer,
  resolveMouseMiningTarget,
} from "../../player/mouseMiningTarget.js";
import { hasUiInputPriority } from "../../systems/UiInputPriorityRegistry.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";

export class MouseDigInputController {
  constructor(scene, config = MINING_TARGET_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveMouseDigEnabled();
    this.pointerAimActive = false;
    this.lastPointerPosition = null;
    this.committedTarget = null;
    this.committedPointer = null;
    this.committedPointerId = null;
    this.primaryPointerDown = false;
    this.pendingPress = false;
    this.pendingPressExpiresAtMs = 0;

    this._pointerMoveHandler = (pointer) => this._handlePointerMove(pointer);
    this._pointerDownHandler = (pointer, currentlyOver) => (
      this._handlePointerDown(pointer, currentlyOver)
    );
    this._pointerUpHandler = (pointer) => this._handlePointerUp(pointer);
    this._pointerUpOutsideHandler = (pointer) => this._handlePointerUp(pointer);
    this._gameOutHandler = () => this._cancelHeldPointer();
    this._register();
  }

  _register() {
    if (!this.enabled || !this.scene.input?.on) return;
    this.scene.input.on("pointermove", this._pointerMoveHandler);
    this.scene.input.on("pointerdown", this._pointerDownHandler);
    this.scene.input.on("pointerup", this._pointerUpHandler);
    this.scene.input.on("pointerupoutside", this._pointerUpOutsideHandler);
    this.scene.input.on("gameout", this._gameOutHandler);
  }

  _handlePointerMove(pointer) {
    if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return;
    if (this.primaryPointerDown && pointer.id === this.committedPointerId) {
      this.committedPointer = pointer;
    }
    const previous = this.lastPointerPosition;
    this.lastPointerPosition = { x: pointer.x, y: pointer.y };
    if (!previous) {
      this.pointerAimActive = true;
      return;
    }

    const dx = pointer.x - previous.x;
    const dy = pointer.y - previous.y;
    const threshold = this.config.mouse.pointerActivationDistancePx;
    if (dx * dx + dy * dy >= threshold * threshold) {
      this.pointerAimActive = true;
    }
  }

  _handlePointerDown(pointer, currentlyOver = []) {
    if (
      !this.enabled
      || !this._controlsEnabled()
      || !isPrimaryMousePointer(pointer, this.config.mouse.primaryButton)
      || this._hasInteractiveHit(currentlyOver)
    ) return;

    const target = this._resolvePointerTarget(pointer, false);
    if (!target) return;

    this.pointerAimActive = true;
    this.committedTarget = target;
    this.committedPointer = pointer;
    this.committedPointerId = pointer.id;
    this.primaryPointerDown = true;
    this.pendingPress = true;
    this.pendingPressExpiresAtMs = this._nowMs() + this.config.mouse.clickBufferMs;
  }

  _handlePointerUp(pointer) {
    if (pointer?.id !== this.committedPointerId) return;
    this.primaryPointerDown = false;
    this.committedPointer = null;
    this.committedPointerId = null;
    if (!this.pendingPress) this.committedTarget = null;
  }

  _cancelHeldPointer() {
    this._clearCommit();
  }

  resolveState(keyboardTarget, keyboardAimLabel, keys) {
    if (!this.enabled || !this._controlsEnabled()) {
      this._clearCommit();
      return this._keyboardState(keyboardTarget, keyboardAimLabel);
    }

    const keyboardAimActive = this._isKeyboardAimActive(keys);
    if (keyboardAimActive) this.pointerAimActive = false;

    const pointerHeld = this._isPointerHeld();
    const committed = this._refreshCommittedTarget(pointerHeld);
    const mouseRequested = Boolean(committed && (this.pendingPress || pointerHeld));
    const hoverTarget = !keyboardAimActive && this.pointerAimActive
      ? this._resolvePointerTarget(this.scene.input?.activePointer)
      : null;
    const mouseTarget = mouseRequested ? committed : hoverTarget;

    if (!mouseTarget) return this._keyboardState(keyboardTarget, keyboardAimLabel);
    return Object.freeze({
      targetTile: Object.freeze({ tx: mouseTarget.tx, ty: mouseTarget.ty }),
      aimLabel: mouseTarget.aimLabel,
      source: "mouse",
      mouseRequested,
      mouseHeld: pointerHeld,
    });
  }

  acknowledgeMineRequest() {
    this.pendingPress = false;
    this.pendingPressExpiresAtMs = 0;
    if (!this._isPointerHeld()) this._clearCommit();
  }

  snapshot() {
    return Object.freeze({
      enabled: this.enabled,
      pointerAimActive: this.pointerAimActive,
      pendingPress: this.pendingPress,
      pointerHeld: this._isPointerHeld(),
      committedTarget: this.committedTarget
        ? Object.freeze({
          tx: this.committedTarget.tx,
          ty: this.committedTarget.ty,
          aimLabel: this.committedTarget.aimLabel,
        })
        : null,
    });
  }

  _keyboardState(targetTile, aimLabel) {
    return Object.freeze({
      targetTile,
      aimLabel,
      source: "keyboard",
      mouseRequested: false,
      mouseHeld: false,
    });
  }

  _refreshCommittedTarget(pointerHeld = this._isPointerHeld()) {
    if (this.pendingPress && this._nowMs() > this.pendingPressExpiresAtMs) {
      this.pendingPress = false;
    }

    if (pointerHeld) {
      const liveTarget = this._resolvePointerTarget(this.committedPointer);
      this.committedTarget = liveTarget;
      return liveTarget;
    }

    if (!this.committedTarget) return null;
    const tileSize = this.scene.config?.tileSize;
    const targetCenter = {
      x: (this.committedTarget.tx + 0.5) * tileSize,
      y: (this.committedTarget.ty + 0.5) * tileSize,
    };
    const refreshed = resolveMouseMiningTarget({
      body: this.scene.playerController?.physicsBody,
      tileSize,
      worldPoint: targetCenter,
      worldModel: this.scene.worldModel,
      allowRangedDirection: this._isStellarLanceActive(),
    });
    if (!refreshed || !this.pendingPress) {
      this.committedTarget = null;
      return null;
    }

    this.committedTarget = refreshed;
    return refreshed;
  }

  _resolvePointerTarget(pointer, guardInteractive = true) {
    if (
      !pointer
      || pointer.withinGame === false
      || !Number.isFinite(pointer.x)
      || !Number.isFinite(pointer.y)
      || (guardInteractive && this._hasInteractiveHit(
        this.scene.input?.hitTestPointer?.(pointer) || [],
      ))
    ) return null;

    const camera = this.scene.cameras?.main;
    const worldPoint = camera?.getWorldPoint
      ? camera.getWorldPoint(pointer.x, pointer.y)
      : { x: pointer.worldX, y: pointer.worldY };
    return resolveMouseMiningTarget({
      body: this.scene.playerController?.physicsBody,
      tileSize: this.scene.config?.tileSize,
      worldPoint,
      worldModel: this.scene.worldModel,
      allowRangedDirection: this._isStellarLanceActive(),
    });
  }

  _isStellarLanceActive() {
    return this.scene.celestialEngineController
      ?.getEmpowerSnapshot?.(this._nowMs())
      ?.projectileEnabled === true;
  }

  _isKeyboardAimActive(keys) {
    return Boolean(
      keys?.aimLeft?.isDown
      || keys?.aimRight?.isDown
      || keys?.aimUp?.isDown
      || keys?.aimDown?.isDown
    );
  }

  _controlsEnabled() {
    const gameState = this.scene.gameState;
    return (
      (typeof gameState !== "string" || gameState === "playing")
      && this.scene.playerController?.input?.controlsEnabled !== false
      && !hasUiInputPriority(this.scene)
      && !hasEscapeClosableUi(this.scene)
    );
  }

  _isPointerHeld() {
    return Boolean(
      this.primaryPointerDown
      && this.committedPointer
      && this.committedPointerId !== null
      && this.committedPointer.id === this.committedPointerId
    );
  }

  _hasInteractiveHit(currentlyOver) {
    return Array.isArray(currentlyOver) && currentlyOver.length > 0;
  }

  _nowMs() {
    if (Number.isFinite(this.scene.time?.now)) return this.scene.time.now;
    return globalThis.performance?.now?.() || Date.now();
  }

  _clearCommit() {
    this.committedTarget = null;
    this.committedPointer = null;
    this.committedPointerId = null;
    this.primaryPointerDown = false;
    this.pendingPress = false;
    this.pendingPressExpiresAtMs = 0;
  }

  destroy() {
    this.scene.input?.off?.("pointermove", this._pointerMoveHandler);
    this.scene.input?.off?.("pointerdown", this._pointerDownHandler);
    this.scene.input?.off?.("pointerup", this._pointerUpHandler);
    this.scene.input?.off?.("pointerupoutside", this._pointerUpOutsideHandler);
    this.scene.input?.off?.("gameout", this._gameOutHandler);
    this._clearCommit();
    this.scene = null;
  }
}
