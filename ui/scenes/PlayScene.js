import {
  createPlaySceneConfig,
  createPlaySceneWorld,
  installPlaySceneWorldMethods,
  updatePlaySceneCameraPhase,
  updatePlaySceneLightingPhase,
  updatePlayScenePresentationPhase,
  updatePlaySceneWorld,
  updatePlaySceneWorldPhase,
} from "../../world/PlayScene.js?rev=20260901-worldroot-v4-clean-matte-v2";
import { setupUIMethods } from "../../world/playScene/PlaySceneUI.js?rev=20260818-feedback-session-v1";
import { SceneModeController } from "../../systems/runtime/SceneModeController.js";
import { SceneLifecycleRegistry } from "../../systems/runtime/SceneLifecycleRegistry.js";
import { FramePhaseScheduler } from "../../systems/runtime/FramePhaseScheduler.js";
import { reportSceneRuntimeFailure } from "../../systems/health/sceneRuntimeFailureReporter.js";
import { DEFAULT_GAMEPLAY_CAPABILITIES } from "../../values/gameplayCapabilities.js";
import {
  FRAME_CRITICALITIES,
  SCENE_BASE_PHASES,
  SCENE_SUSPENSION_KINDS,
} from "../../values/sceneRuntime.js";
import { SessionAwakeningController } from "../../world/playScene/SessionAwakeningController.js";
import { installUiReviewHarness } from "../../testing/UiReviewHarness.js";
import { PLAY_SCENE_UI_METHOD_DEPENDENCIES, PLAY_SCENE_UI_PORTS } from
  "./PlayScenePorts.js?rev=20260826-inventory-codex-v3";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
    this.config = createPlaySceneConfig();
    this.uiPorts = PLAY_SCENE_UI_PORTS;
    this._installCompatibilityGetters();
    this._resetSceneAuthorities();
    this._resetStableFields();
  }

  async create(data = {}) {
    this._resetSceneAuthorities();
    this.gameplayCapabilities = this.registry?.get?.("gameplayCapabilities")
      || DEFAULT_GAMEPLAY_CAPABILITIES;
    this.sessionAwakeningController = new SessionAwakeningController(
      this, this.uiPorts.createSessionAwakeningView, { enabled: data.autoStart !== false },
    );
    this._sceneSetupReady = await createPlaySceneWorld(this, data, this.uiPorts) === true;
    if (!this._sceneSetupReady) this.sessionAwakeningController?.destroy();
    this._uiReviewHarness = installUiReviewHarness(this);
  }

  update(time, delta) {
    if (!this._sceneSetupReady) return;
    this.framePhaseScheduler?.runFrame(time, delta, this);
  }

  acquireSceneSuspension(kind, owner) {
    return this.sceneModeController.acquire(kind, owner);
  }

  setSceneBasePhase(phase, context = {}) {
    return this.sceneModeController.setBasePhase(phase, context);
  }

  restartFromLastValidSave() {
    this.scene.restart({
      autoStart: true,
      saveSlot: this.saveSlot,
      worldIdentity: this.worldIdentity,
      playerCharacterId: this.playerCharacterId,
    });
  }

  returnToMenuFromRecovery() {
    this.scene.start("MainMenuScene");
  }

  _resetSceneAuthorities() {
    this._sceneSetupReady = false;
    this._continueFrame = false;
    this._recoveryOverlay = null;
    this._dialogSuspension = null;
    this._pauseSuspension = null;
    this._hardcoreModalSuspension = null;
    this._shopSuspensionTokens = [];
    this.lifecycleRegistry = new SceneLifecycleRegistry({
      onDisposeError: finding => reportSceneRuntimeFailure({
        ...finding,
        phase: "lifecycle",
        criticality: FRAME_CRITICALITIES.PRESENTATION,
      }),
    });
    this.sceneModeController = new SceneModeController();
    this.framePhaseScheduler = new FramePhaseScheduler({
      onPresentationFailure: finding => this._handlePresentationFailure(finding),
      onAuthorityFailure: finding => this._handleAuthorityFailure(finding),
    });
    this.framePhaseScheduler.register({
      id: "play-frame-input-boundary",
      phase: "input",
      criticality: FRAME_CRITICALITIES.SIMULATION,
      update: () => { this._continueFrame = false; },
    });
    this.framePhaseScheduler.register({
      id: "player-ability-asset-unlocks",
      phase: "simulation",
      criticality: FRAME_CRITICALITIES.PRESENTATION,
      update: () => this.playerAbilityAssetController?.update(),
    });
    this.framePhaseScheduler.register({
      id: "player-action-asset-residency",
      phase: "simulation",
      criticality: FRAME_CRITICALITIES.PRESENTATION,
      update: () => this.playerDeferredAnimationAssetController?.update(),
    });
    this.framePhaseScheduler.register({
      id: "play-frame-authority",
      phase: "simulation",
      criticality: FRAME_CRITICALITIES.PROGRESSION,
      update: (time, delta) => { this._continueFrame = updatePlaySceneWorld(this, time, delta); },
    });
    this.framePhaseScheduler.register({
      id: "play-frame-world",
      phase: "world",
      criticality: FRAME_CRITICALITIES.SIMULATION,
      update: () => { if (this._continueFrame) updatePlaySceneWorldPhase(this); },
    });
    this.framePhaseScheduler.register({
      id: "play-frame-presentation",
      phase: "presentation",
      criticality: FRAME_CRITICALITIES.PRESENTATION,
      update: () => { if (this._continueFrame) updatePlayScenePresentationPhase(this); },
    });
    this.framePhaseScheduler.register({
      id: "play-frame-camera",
      phase: "camera",
      criticality: FRAME_CRITICALITIES.PRESENTATION,
      update: (time, delta) => { if (this._continueFrame) updatePlaySceneCameraPhase(this, time, delta); },
    });
    this.framePhaseScheduler.register({
      id: "play-frame-lighting",
      phase: "camera",
      criticality: FRAME_CRITICALITIES.SIMULATION,
      update: (time, delta) => { if (this._continueFrame) updatePlaySceneLightingPhase(this, time, delta); },
    });
    this.framePhaseScheduler.register({
      id: "play-frame-telemetry-boundary",
      phase: "telemetry",
      criticality: FRAME_CRITICALITIES.PRESENTATION,
      update: () => { this._cameraLightingStartedAtMs = null; },
    });
  }

  _handlePresentationFailure(finding) {
    reportSceneRuntimeFailure(finding);
    this.uiNotifications?.warning?.(
      "A visual effect was turned off so you can keep playing.",
      { key: `presentation-quarantine-${finding.id}`, priority: 9 },
    );
  }

  _handleAuthorityFailure(finding) {
    this._saveWritesBlocked = true;
    this.sceneModeController.enterSafePause({ subsystem: finding.id });
    this.playerController?.setControlsEnabled?.(false);
    this.uiNotifications?.setPaused?.(true);
    reportSceneRuntimeFailure(finding, true);
    this._recoveryOverlay ||= this.uiPorts.createRecoveryOverlay(this);
    this._recoveryOverlay.show(finding);
  }

  _installCompatibilityGetters() {
    Object.defineProperties(this, {
      gameState: { enumerable: true, get: () => this.sceneModeController.legacyGameState },
      paused: { enumerable: true, get: () => this.gameState === "paused" },
      isInDialogue: { enumerable: true, get: () => this.gameState === "dialog" },
      isInShop: {
        enumerable: true,
        get: () => this.sceneModeController.snapshot().suspensions
          .some(token => token.kind === SCENE_SUSPENSION_KINDS.SHOP),
      },
    });
  }

  _resetStableFields() {
    this.gameplayCapabilities = DEFAULT_GAMEPLAY_CAPABILITIES;
    this.isDigAnimating = false;
    this.dugTileSaveStore = null;
    this.openingFlightArtifactSystem = null;
    this.starHeartProgressionSystem = null;
    this.celestialEngineController = null;
    this.tileHitOriginStrength = 0;
    this.crouching = false;
    this.hudReady = false;
    this._lastCutscene = null;
    this.setSceneBasePhase(SCENE_BASE_PHASES.LOADING);
  }
}

setupUIMethods(PlayScene.prototype, PLAY_SCENE_UI_METHOD_DEPENDENCIES);
installPlaySceneWorldMethods(PlayScene.prototype);
