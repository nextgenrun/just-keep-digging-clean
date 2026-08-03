import {
  OPENING_FLIGHT_ARTIFACT_CONFIG,
  OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  OPENING_FLIGHT_STAGES,
  resolveOpeningFlightGoldenFiveEnabled,
} from "../../values/openingFlightArtifact.js";
import { OpeningFlightGoldenFiveRuntime } from "./OpeningFlightGoldenFiveRuntime.js";
import { OpeningFlightLegacyRuntime } from "./OpeningFlightLegacyRuntime.js";

export class OpeningFlightArtifactSystem {
  constructor(scene, config = OPENING_FLIGHT_ARTIFACT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = config.enabled === true;
    this.goldenEnabled = this.enabled && resolveOpeningFlightGoldenFiveEnabled();
    this.runtime = !this.enabled
      ? null
      : this.goldenEnabled
        ? new OpeningFlightGoldenFiveRuntime(
          scene,
          config,
          OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
        )
        : new OpeningFlightLegacyRuntime(scene, config);
    this.goldenRuntime = this.goldenEnabled ? this.runtime : null;
  }

  get state() {
    return this.runtime?.state;
  }

  set state(value) {
    if (this.runtime) this.runtime.state = value;
  }

  get view() {
    return this.runtime?.view;
  }

  get created() {
    return this.runtime?.created === true;
  }

  create() {
    this.runtime?.create();
  }

  update(deltaMs) {
    this.runtime?.update(deltaMs);
  }

  isFreeFlightActive() {
    return this.runtime?.isFreeFlightActive() === true;
  }

  isOpeningGraceActive() {
    return this.runtime?.isOpeningGraceActive() === true;
  }

  isArtifactCollected() {
    if (!this.enabled) {
      return this.scene?.upgradeSystem?.isGemPowerUnlocked?.() === true;
    }
    return this.runtime?.isArtifactCollected() === true;
  }

  getSaveData() {
    if (this.enabled) return this.runtime?.getSaveData() || null;
    return {
      version: this.config.saveVersion,
      stage: OPENING_FLIGHT_STAGES.COMPLETE,
      artifactCollected: true,
      firstDigCelebrated: true,
      ringsPassed: OPENING_FLIGHT_GOLDEN_FIVE_CONFIG.escape.rings.length,
      trialStarted: true,
      trialRemainingMs: 0,
      trialComplete: true,
      surfaceReturnCelebrated: true,
      cacheCollected: true,
      rewardGranted: true,
      onboardingComplete: true,
    };
  }

  loadSaveData(data) {
    this.runtime?.loadSaveData(data);
  }

  destroy() {
    this.runtime?.destroy();
    this.runtime = null;
    this.goldenRuntime = null;
    this.scene = null;
  }
}
