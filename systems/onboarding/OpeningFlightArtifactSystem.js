import {
  OPENING_FLIGHT_ARTIFACT_CONFIG,
  OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  resolveOpeningFlightGoldenFiveEnabled,
} from "../../values/openingFlightArtifact.js";
import { OpeningFlightGoldenFiveRuntime } from "./OpeningFlightGoldenFiveRuntime.js";
import { OpeningFlightLegacyRuntime } from "./OpeningFlightLegacyRuntime.js";

export class OpeningFlightArtifactSystem {
  constructor(scene, config = OPENING_FLIGHT_ARTIFACT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.goldenEnabled = resolveOpeningFlightGoldenFiveEnabled();
    this.runtime = this.goldenEnabled
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
    return this.runtime?.isArtifactCollected() === true;
  }

  handleStarterLevelUp(result) {
    if (this.state?.artifactCollected || result?.levelUp !== true) return false;
    const level = Number.isFinite(result.newLevel)
      ? result.newLevel
      : this.scene.playerLevelSystem?.level;
    if (result?.hasChoice === true) {
      if (!this.goldenEnabled) return false;
      const claimed = this.scene.playerLevelSystem
        ?.applyChoiceReward?.("miningPower");
      if (!claimed) return false;
      this.scene.uiNotifications?.success(
        this.config.copy.starterChoiceLevelUp.replace(
          "{level}",
          String(level),
        ),
        {
          durationMs: this.config.starterLevelUpToastDurationMs
            + this.config.starterChoiceToastExtraDurationMs,
        },
      );
      this._syncStarterLevelProgression();
      this.scene.queueDugTilesSave?.();
      return true;
    }
    this.scene.uiNotifications?.success(
      this.config.copy.starterLevelUp.replace("{level}", String(level)),
      { durationMs: this.config.starterLevelUpToastDurationMs },
    );
    this._syncStarterLevelProgression();
    this.scene.queueDugTilesSave?.();
    return true;
  }

  _syncStarterLevelProgression() {
    const levelBonus = this.scene.playerLevelSystem
      ?.getGemPowerMaxBonus?.() ?? 0;
    const milestoneBonus = this.scene.milestoneBoardSystem
      ?.getBonuses?.()?.gpMaxBonus ?? 0;
    this.scene.playerController?.setProgressionGemPowerMaxBonus?.(
      levelBonus + milestoneBonus,
    );
    this.scene.playerController?.abilities?.fillGemPower?.();
  }

  getSaveData() {
    return this.runtime?.getSaveData() || null;
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
