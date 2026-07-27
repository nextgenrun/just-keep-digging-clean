/**
 * Defers the visual lighting pass until Phaser has finalized camera follow,
 * rounding, bounds, and shake for the frame being rendered.
 */
export class LightFrameSync {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene?.cameras?.main || null;
    this.pending = null;
    this._handleFollowUpdate = () => this.flush();
    this.camera?.on?.("followupdate", this._handleFollowUpdate);
  }

  queue(time, delta, depth, gameplayActive) {
    const lightSystem = this.scene?.lightSystem;
    lightSystem?.prepareFrame?.(time, delta, depth, gameplayActive);
    this.pending = {
      time: Number.isFinite(time) ? time : 0,
      delta: Number.isFinite(delta) ? delta : 0,
    };

    const cameraWillEmitFollowUpdate = Boolean(
      this.camera?._follow
      && this.camera?.panEffect?.isRunning !== true
    );
    if (!cameraWillEmitFollowUpdate) this.flush();
  }

  flush() {
    if (!this.pending) return false;
    const frame = this.pending;
    this.pending = null;
    this.scene?.lightSystem?.renderPreparedFrame?.(frame.time);
    this.scene?.shaderSystem?.update?.(frame.time, frame.delta);
    return true;
  }

  destroy() {
    this.camera?.off?.("followupdate", this._handleFollowUpdate);
    this.pending = null;
    this.camera = null;
    this.scene = null;
    this._handleFollowUpdate = null;
  }
}
