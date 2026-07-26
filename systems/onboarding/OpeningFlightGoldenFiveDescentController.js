import { OPENING_FLIGHT_STAGES } from "../../values/openingFlightArtifact.js";
import {
  getOpeningFlightAnchors,
  getOpeningFlightArtifactCenterWorld,
  getOpeningFlightTileSize,
  countBrokenOpeningFlightPathTiles,
} from "./openingFlightGoldenFiveGeometry.js";
import {
  getOpeningFlightKeyLabels,
  interpolateOpeningFlightCopy,
} from "./openingFlightGoldenFiveCopy.js";

export class OpeningFlightGoldenFiveDescentController {
  constructor(runtime) {
    this.runtime = runtime;
    this.guidanceElapsedMs = 0;
    this.guidanceAssistStep = 0;
  }

  update(deltaMs, playerWorld) {
    const runtime = this.runtime;
    const { scene, config, view } = runtime;
    const anchors = getOpeningFlightAnchors(scene, config);
    const artifactWorld = getOpeningFlightArtifactCenterWorld(scene, config);
    const distanceTiles = Math.hypot(
      playerWorld.x - artifactWorld.x,
      playerWorld.y - artifactWorld.y,
    ) / getOpeningFlightTileSize(scene);
    view.setBuriedProximity(distanceTiles);
    this.guidanceElapsedMs += Math.max(0, Number(deltaMs) || 0);

    const capBroken = scene.worldModel?.isSolid?.(
      anchors.tileX,
      anchors.surfaceRow,
    ) === false;
    if (capBroken && !runtime.state.firstDigCelebrated) {
      this._celebrateFirstDig(anchors);
    }

    const progress = countBrokenOpeningFlightPathTiles(scene, config)
      / Math.max(1, config.layout.path.length);
    const keys = getOpeningFlightKeyLabels();
    const aimingDown = scene.playerController?.input?.getVerticalAim?.().down === true
      || scene.playerController?.getAimLabel?.() === "DOWN";
    let body;
    if (!runtime.state.firstDigCelebrated) {
      body = interpolateOpeningFlightCopy(
        aimingDown ? config.copy.aimedBody : config.copy.arrivalBody,
        keys,
      );
      this._applyIdleAssist(keys);
    } else {
      body = interpolateOpeningFlightCopy(
        distanceTiles <= config.presentation.artifactRevealDistanceTiles
          ? config.copy.nearArtifactBody
          : config.copy.diggingBody,
        keys,
      );
    }
    view.showHud({
      phase: config.copy.phaseDig,
      title: config.copy.arrivalTitle,
      body,
      progress,
      accent: this.guidanceAssistStep >= 2 ? "violet" : "cyan",
    });
    this._tryCollectArtifact(playerWorld, anchors, artifactWorld);
  }

  _celebrateFirstDig(anchors) {
    const { scene, config, state } = this.runtime;
    state.firstDigCelebrated = true;
    state.stage = OPENING_FLIGHT_STAGES.DIGGING;
    scene.soundSystem?.playUiConfirm?.();
    scene.floatingTextSystem?.showFloatingText?.(
      (anchors.tileX + 0.5) * getOpeningFlightTileSize(scene),
      anchors.surfaceRow * getOpeningFlightTileSize(scene),
      config.copy.firstDig,
      config.feedback.gold,
      config.feedback.firstDigDurationMs,
      config.feedback.firstDigFontSize,
    );
    scene.queueDugTilesSave?.();
  }

  _applyIdleAssist(keys) {
    const { scene, config } = this.runtime;
    const guidance = config.guidance;
    if (
      this.guidanceAssistStep < 1
      && this.guidanceElapsedMs >= guidance.firstAssistDelayMs
    ) {
      this.guidanceAssistStep = 1;
      scene.hudSystem?.flashStatus?.(
        interpolateOpeningFlightCopy(config.copy.assistAim, keys),
        config.feedback.cyan,
        config.feedback.assistOneDurationMs,
      );
    }
    if (
      this.guidanceAssistStep < 2
      && this.guidanceElapsedMs >= guidance.secondAssistDelayMs
    ) {
      this.guidanceAssistStep = 2;
      scene.hudSystem?.flashStatus?.(
        interpolateOpeningFlightCopy(config.copy.assistDig, keys),
        config.feedback.gold,
        config.feedback.assistTwoDurationMs,
      );
    }
    if (
      this.guidanceAssistStep < 3
      && this.guidanceElapsedMs >= guidance.finalAssistDelayMs
    ) {
      this.guidanceAssistStep = 3;
      scene.uiNotifications?.info?.(
        interpolateOpeningFlightCopy(config.copy.assistFinal, keys),
      );
    }
  }

  _tryCollectArtifact(playerWorld, anchors, artifactWorld) {
    const { scene, config } = this.runtime;
    if (scene.worldModel?.isSolid?.(
      anchors.tileX,
      anchors.artifactTileY,
    ) !== false) {
      return;
    }
    if (
      Math.hypot(
        playerWorld.x - artifactWorld.x,
        playerWorld.y - artifactWorld.y,
      ) > config.escape.ringRadiusTiles * getOpeningFlightTileSize(scene)
    ) {
      return;
    }
    this.runtime.flight.collectArtifact();
  }

  destroy() {
    this.runtime = null;
  }
}
