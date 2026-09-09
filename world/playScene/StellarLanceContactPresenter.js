import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";
import { resolveStellarLanceOrigin } from "../../systems/celestial/stellarLanceTravel.js";
import { captureDigImpactPose, resolveDigImpactContact } from "../../systems/visual/digImpactContact.js";

/** Releases contact-triggered shots from the rendered hand/foot before this frame renders. */
export class StellarLanceContactPresenter {
  constructor(scene) {
    this.scene = scene;
    this.pending = [];
    this.cadenceHold = null;
    this._flush = () => this.flush();
    scene.events?.on?.(C.postUpdateEvent, this._flush);
  }

  get hasPendingContact() { return this.pending.length > 0; }

  queue(projectile, launch) {
    if (!projectile || typeof launch !== "function") return false;
    const event = projectile.contactEvent;
    const player = this.scene.player;
    const entry = { projectile, launch, pose: captureDigImpactPose(player, event) };
    this._protectContactFrame(entry.pose, event);
    this.pending.push(entry);
    if (!event?.animationKey || !this.scene.events?.on) this.flush();
    return true;
  }

  _protectContactFrame(pose, event) {
    const state = this.scene.player?.anims;
    if (!event?.animationKey || pose.animationKey !== event.animationKey
      || typeof state?.skipMissedFrames !== "boolean") return;
    if (this.cadenceHold?.animation !== state.currentAnim) this._releaseCadence();
    this.cadenceHold ||= { state, animation: state.currentAnim,
      skipMissedFrames: state.skipMissedFrames, paused: false };
    state.skipMissedFrames = false;
    // Stop a catch-up loop on the real contact frame; never seek or rewind a pose.
    if (pose.visibleFrame === pose.contactFrame && state.isPlaying && !state.isPaused) {
      state.pause();
      this.cadenceHold.paused = true;
    }
  }

  _resumeContactFrame() {
    const hold = this.cadenceHold;
    if (hold?.paused && hold.state.currentAnim === hold.animation && hold.state.isPaused) {
      hold.state.resume();
    }
    if (hold) hold.paused = false;
  }

  _releaseCadence() {
    this._resumeContactFrame();
    const hold = this.cadenceHold;
    if (hold && hold.state.currentAnim === hold.animation && hold.state.skipMissedFrames === false) {
      hold.state.skipMissedFrames = hold.skipMissedFrames;
    }
    this.cadenceHold = null;
  }

  flush() {
    for (const entry of this.pending.splice(0)) {
      const { projectile, launch } = entry;
      const player = this.scene.player;
      const event = projectile.contactEvent;
      const pose = captureDigImpactPose(player, event);
      if (event?.animationKey) {
        // A wall-clock watchdog may run ahead of the rendered animation.
        // Wait for the real extremity pose, and discard cancelled/missed poses.
        if (pose.animationKey !== event.animationKey || pose.sheet !== entry.pose.sheet
          || this.scene.ualActionContactTimeline?.isActive === false) continue;
        const actionId = this.scene.ualActionContactTimeline?._activeAction?.actionId;
        if (actionId != null && event.actionId != null && actionId !== event.actionId) continue;
        if (pose.visibleFrame !== pose.contactFrame) {
          const sequence = Number(player?.anims?.currentFrame?.index) - 1;
          const beforeContact = Number.isFinite(sequence) && Number.isInteger(event.contactSequenceIndex)
            ? sequence < event.contactSequenceIndex : pose.visibleFrame < pose.contactFrame;
          if (beforeContact) this.pending.push(entry);
          continue;
        }
      }
      const contact = resolveDigImpactContact({ pose,
        body: this.scene.playerController?.physicsBody,
        targetTile: projectile.targetTile, tileSize: this.scene.config.tileSize });
      if (!contact) continue;
      const point = resolveStellarLanceOrigin(contact, pose);
      launch({ ...projectile, originWorld: { x: point.x, y: point.y },
        originSource: contact.authored ? "authored-hand-foot" : "tile-contact",
        releasedAtMs: this.scene.time?.now ?? 0,
        releaseFrame: this.scene.game?.loop?.frame ?? null,
        contactPose: { sheet: pose.sheet, contactFrame: pose.contactFrame,
          visibleFrame: pose.visibleFrame, animationKey: pose.animationKey, flipX: pose.flipX } });
    }
    if (this.pending.length) this._resumeContactFrame();
    else this._releaseCadence();
  }

  destroy() {
    this.pending.length = 0;
    this._releaseCadence();
    this.scene.events?.off?.(C.postUpdateEvent, this._flush);
  }
}
