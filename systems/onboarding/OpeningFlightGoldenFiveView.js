import { OpeningFlightGoldenFiveHudView } from "./OpeningFlightGoldenFiveHudView.js";
import { OpeningFlightGoldenFiveRewardRevealView } from "./OpeningFlightGoldenFiveRewardRevealView.js";
import { OpeningFlightGoldenFiveWorldView } from "./OpeningFlightGoldenFiveWorldView.js";

export class OpeningFlightGoldenFiveView {
  constructor(scene, config) {
    this.world = new OpeningFlightGoldenFiveWorldView(scene, config);
    this.hud = new OpeningFlightGoldenFiveHudView(scene, config);
    this.rewardReveal = new OpeningFlightGoldenFiveRewardRevealView(scene, config);
  }

  createBuriedGuidance(...args) {
    this.world.createBuriedGuidance(...args);
  }

  setBuriedProximity(...args) {
    this.world.setBuriedProximity(...args);
  }

  revealArtifact(...args) {
    this.world.revealArtifact(...args);
  }

  settleArtifact(...args) {
    this.world.settleArtifact(...args);
  }

  showEscapeRings(...args) {
    this.world.showEscapeRings(...args);
  }

  passRing(...args) {
    this.world.passRing(...args);
  }

  showCache(...args) {
    this.world.showCache(...args);
  }

  celebrateCache(...args) {
    this.world.celebrateCache(...args);
  }

  hideCache(...args) {
    this.world.hideCache(...args);
  }

  showHud(payload) {
    this.hud.show(payload);
  }

  hideHud() {
    this.hud.hide();
  }

  showRewardReveal(payload) {
    this.rewardReveal.show(payload);
  }

  hideRewardReveal(options) {
    this.rewardReveal.hide(options);
  }

  destroy() {
    this.world?.destroy();
    this.hud?.destroy();
    this.rewardReveal?.destroy();
    this.world = null;
    this.hud = null;
    this.rewardReveal = null;
  }
}
