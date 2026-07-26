import { OpeningFlightGoldenFiveArtifactView } from "./OpeningFlightGoldenFiveArtifactView.js";
import { OpeningFlightGoldenFiveFxView } from "./OpeningFlightGoldenFiveFxView.js";
import { OpeningFlightGoldenFiveRouteView } from "./OpeningFlightGoldenFiveRouteView.js";

export class OpeningFlightGoldenFiveWorldView {
  constructor(scene, config) {
    this.fx = new OpeningFlightGoldenFiveFxView(scene, config);
    this.artifact = new OpeningFlightGoldenFiveArtifactView(scene, config, this.fx);
    this.route = new OpeningFlightGoldenFiveRouteView(scene, config, this.fx);
  }

  createBuriedGuidance(...args) {
    this.artifact.createBuriedGuidance(...args);
  }

  setBuriedProximity(...args) {
    this.artifact.setBuriedProximity(...args);
  }

  revealArtifact(...args) {
    this.artifact.revealArtifact(...args);
  }

  settleArtifact(...args) {
    this.artifact.settleAfterClaim(...args);
  }

  showEscapeRings(...args) {
    this.route.showEscapeRings(...args);
  }

  passRing(...args) {
    this.route.passRing(...args);
  }

  showCache(...args) {
    this.route.showCache(...args);
  }

  celebrateCache(...args) {
    this.route.celebrateCache(...args);
  }

  hideCache(...args) {
    this.route.hideCache(...args);
  }

  destroy() {
    this.artifact?.destroy();
    this.route?.destroy();
    this.fx?.destroy();
    this.artifact = null;
    this.route = null;
    this.fx = null;
  }
}
