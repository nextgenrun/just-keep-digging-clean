// A successful transaction gets one bounded authored burst and reward chime.
import { CELESTIAL_FOCUS_FEEDBACK as F, celestialFocusPoint } from "../../values/celestialTalentFocusUi.js";
import { prepareArt, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";

export class CelestialTalentUpgradeFeedback {
  constructor(scene, parent, detail) {
    this.scene = scene;
    this.detail = detail;
    this.root = scene.add.container(0, 0).setVisible(false);
    const image = asset => {
      const art = prepareArt(scene, asset);
      const view = scene.add.image(0, 0, art.key, art.frame);
      this.root.add(view);
      return view;
    };
    this.flash = image(F.flash);
    this.ring = image(F.ring);
    this.plaque = image(F.unlock);
    this.plaque.setPosition(...Object.values(celestialFocusPoint(F.plaqueXFraction, F.plaqueYFraction)));
    fitBakedUiImage(this.plaque, F.plaqueWidth, F.plaqueHeight);
    parent.add(this.root);
    this.updateHandler = (time, delta) => this.update(delta);
    this.scene.events.on("update", this.updateHandler);
    this.playCount = 0;
  }

  warmAudio() { this.scene.soundSystem?.reviewedSfx?.warm?.(F.audioId); }

  play(view, action) {
    this.stop();
    this.reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    this.elapsed = 0;
    this.active = true;
    this.playCount++;
    this.nodeId = view.node.id;
    this.action = action;
    this.root.setVisible(true);
    const art = prepareArt(this.scene, F[action]);
    this.plaque.setTexture(art.key, art.frame).setAlpha(1);
    fitBakedUiImage(this.plaque, F.plaqueWidth, F.plaqueHeight);
    [this.flash, this.ring].forEach(image => image.setPosition(view.root.x, view.root.y).setVisible(!this.reduced));
    this.detail.status.root.setAlpha(0);
    this.sound = this.scene.soundSystem?.reviewedSfx?.play?.(F.audioId, {
      gain: F.audioGain, rate: F.audioRate, group: "ui", cooldownKey: F.audioId,
    });
    this.update(0);
  }

  update(delta = 0) {
    if (!this.active) return;
    this.elapsed += Math.max(0, delta);
    const duration = this.reduced ? F.reducedDurationMs : F.durationMs;
    if (this.elapsed >= duration) { this.stop(false); return; }
    const flashProgress = Math.min(1, this.elapsed / F.flashDurationMs);
    const ringProgress = Math.min(1, this.elapsed / F.ringDurationMs);
    const easeOut = value => 1 - (1 - value) ** 3;
    fitBakedUiImage(this.flash, F.flashStartSize + (F.flashEndSize - F.flashStartSize) * easeOut(flashProgress),
      F.flashStartSize + (F.flashEndSize - F.flashStartSize) * easeOut(flashProgress));
    fitBakedUiImage(this.ring, F.ringStartSize + (F.ringEndSize - F.ringStartSize) * easeOut(ringProgress),
      F.ringStartSize + (F.ringEndSize - F.ringStartSize) * easeOut(ringProgress));
    this.flash.setAlpha((1 - flashProgress) ** 2);
    this.ring.setAlpha(1 - ringProgress);
    this.plaque.setAlpha(this.reduced ? 1 : Math.max(0, Math.min(1,
      (duration - this.elapsed) / F.plaqueFadeMs)));
  }

  stop(stopSound = true) {
    this.active = false;
    this.root.setVisible(false);
    this.detail.status.root.setAlpha(1);
    if (stopSound && this.sound) this.scene.soundSystem?.stopTrackedSfx?.(this.sound);
    if (stopSound) this.sound = null;
  }

  getSnapshot() {
    return { active: this.active === true, playCount: this.playCount, nodeId: this.nodeId || null,
      action: this.action || null, elapsed: this.elapsed || 0, reduced: this.reduced === true,
      soundKey: this.sound?.key || null, flashAlpha: this.flash.alpha, ringAlpha: this.ring.alpha };
  }

  destroy() {
    this.stop();
    this.scene.events.off("update", this.updateHandler);
    this.root.destroy(true);
  }
}
