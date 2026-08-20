import { playTitanUnlockFx } from "./titanDiscoveryFx.js";
import { isTitanEncounterReady } from "./titanDiscoveryEncounter.js";
import { syncTitanCoverageState } from "./titanDiscoveryView.js";
import { clearRemainingTitanCoverage } from "./titanCoverageAutoClear.js";

export class TitanUnlockController {
  constructor({
    scene,
    worldModel,
    config,
    experienceConfig,
    surfaceGallery,
    guidance,
    registerTransient,
    releaseTransient,
  }) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.experienceConfig = experienceConfig;
    this.surfaceGallery = surfaceGallery;
    this.guidance = guidance;
    this.registerTransient = registerTransient;
    this.releaseTransient = releaseTransient;
  }

  unlockReady(views, playerTile, encounterMode, retention, discovered) {
    if (!retention?.discoverTitan) return 0;
    let unlocked = 0;
    for (const view of views) {
      if (
        !view.ready
        || !isTitanEncounterReady(
          view,
          playerTile,
          encounterMode,
          this.experienceConfig
        )
      ) {
        continue;
      }
      if (!this._clearRemainder(view)) continue;
      if (!retention.discoverTitan(view.definition.id)) continue;
      view.ready = false;
      view.discovered = true;
      discovered?.add?.(view.definition.id);
      this.scene.titanClueSystem?.completeClue?.(view.definition.id);
      playTitanUnlockFx(
        this.scene,
        view,
        view.definition,
        this.config,
        this.registerTransient,
        this.releaseTransient
      );
      this.scene.soundSystem?.playRareDiscovery?.();
      this.surfaceGallery.unlock(view.definition);
      this.guidance.announceDiscovery(view.definition);
      this.scene.queueDugTilesSave?.();
      unlocked += 1;
    }
    return unlocked;
  }

  _clearRemainder(view) {
    const encounter = this.experienceConfig.encounter;
    if (
      !encounter.autoClearRemainingCoverage
      || view.coverageRemaining <= 0
    ) {
      return true;
    }
    const applied = clearRemainingTitanCoverage(
      this.worldModel,
      view.coverageCells
    );
    const renderers = new Set([
      this.scene.worldRenderer,
      this.scene.worldVisualRuntime,
    ]);
    for (const tile of applied) {
      renderers.forEach(renderer => (
        renderer?.applyTileUpdate?.(tile.tx, tile.ty)
      ));
    }
    syncTitanCoverageState(this.worldModel, view);
    return view.coverageRemaining === 0;
  }
}
