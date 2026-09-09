import { USER_SETTINGS } from "../UserSettings.js";
import {
  CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG,
  CONTEXTUAL_MECHANIC_TUTORIAL_IDS,
  isContextualMechanicTutorialId,
} from "../../values/contextualMechanicTutorials.js";
import { GRAVEBORER_WURM_PHASES } from "../../values/graveborerWurm.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";

const FINISHED_OPENING_STAGES = new Set([
  TOWN_TUTORIAL_STAGES.COMPLETE,
  TOWN_TUTORIAL_STAGES.SKIPPED,
]);

function interpolateKeys(text) {
  const keys = {
    torch: USER_SETTINGS.getKeyLabel("torch"),
  };
  return String(text || "").replace(
    /\{(\w+)\}/g,
    (_, token) => keys[token] || token,
  );
}

export class ContextualMechanicTutorialSystem {
  constructor(scene, retention, options = {}) {
    this.scene = scene;
    this.retention = retention;
    this.config = options.config || CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG;
    this.active = null;
    this.runtimeTriggers = new Set();
    this.visibleDwellById = new Map();
  }

  notifyEmberDiscovery() {
    return this._notifyRuntimeTrigger(
      CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EMBER_CAMPFIRE,
    );
  }

  update(deltaMs = 0) {
    if (this.scene.emberDiscoveryEventSystem?.active === true) return null;
    if (this.active && !this._isEligible(this.active.id)) {
      this.visibleDwellById.set(this.active.id, this.active.visibleMs);
      this.active = null;
    }
    const urgentId = this.config.priority.find(id => (
      !this.retention?.hasSeenMechanicTutorial?.(id) && this._isEligible(id)
    ));
    if (this.active && urgentId
      && this.config.priority.indexOf(urgentId) < this.config.priority.indexOf(this.active.id)) {
      this.visibleDwellById.set(this.active.id, this.active.visibleMs);
      this.active = { id: urgentId, visibleMs: this.visibleDwellById.get(urgentId) || 0 };
    }
    if (this.active) {
      this._advanceActive(deltaMs);
      return this.getNextPromiseOverride();
    }
    if (!this._openingTutorialFinished()) return null;

    const tutorialId = this.config.priority.find(id => (
      !this.retention?.hasSeenMechanicTutorial?.(id)
      && this._isEligible(id)
    ));
    if (!tutorialId) return null;
    this.active = { id: tutorialId, visibleMs: this.visibleDwellById.get(tutorialId) || 0 };
    return this.getNextPromiseOverride();
  }

  getNextPromiseOverride() {
    if (this.scene.emberDiscoveryEventSystem?.active === true) return null;
    if (this.active && !this._isEligible(this.active.id)) return null;
    const copy = this.config.entries[this.active?.id];
    if (!copy) return null;
    return {
      badgeKicker: copy.badgeKicker,
      badgeValue: copy.badgeValue,
      promise: interpolateKeys(copy.promise),
      detail: interpolateKeys(copy.detail),
    };
  }

  getHealthSnapshot() {
    return {
      activeId: this.active?.id || null,
      visibleMs: this.active?.visibleMs || 0,
      runtimeTriggers: [...this.runtimeTriggers],
      seen: this.retention?.getSeenMechanicTutorials?.() || [],
      eligible: this.config.priority.filter(id => this._isEligible(id)),
    };
  }

  _advanceActive(deltaMs) {
    if (!this._isActivePromiseVisible()) return;
    this.active.visibleMs += Math.min(
      this.config.maximumFrameMs,
      Math.max(0, Number(deltaMs) || 0),
    );
    if (this.active.visibleMs < this.config.visibleDwellMs) return;

    const completedId = this.active.id;
    this.visibleDwellById.delete(completedId);
    this.active = null;
    this.runtimeTriggers.delete(completedId);
    if (this.retention?.recordMechanicTutorialSeen?.(completedId)) {
      this.scene.queueDugTilesSave?.("mechanic-tutorial-complete");
    }
  }

  _isActivePromiseVisible() {
    const expected = this.getNextPromiseOverride();
    const presented = this.scene.nextPromiseHudSystem?.getHealthSnapshot?.();
    return Boolean(
      expected
      && presented?.visible === true
      && presented.promise === expected.promise
      && presented.detail === expected.detail
    );
  }

  _openingTutorialFinished() {
    const tutorial = this.retention?.getTutorialState?.();
    return tutorial?.choice === TOWN_TUTORIAL_CHOICES.LEGACY
      || FINISHED_OPENING_STAGES.has(tutorial?.stage);
  }

  _notifyRuntimeTrigger(id) {
    if (
      !isContextualMechanicTutorialId(id)
      || this.retention?.hasSeenMechanicTutorial?.(id)
      || this.runtimeTriggers.has(id)
    ) {
      return false;
    }
    this.runtimeTriggers.add(id);
    return true;
  }

  _isEligible(id) {
    if (id === CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EMBER_CAMPFIRE) {
      return this.runtimeTriggers.has(id);
    }
    if (id === CONTEXTUAL_MECHANIC_TUTORIAL_IDS.GRAVEBORER_WURM) {
      const runtime = this.scene.graveborerWurmRuntime;
      return runtime?.lastGate?.productionActive === true
        && runtime.system?.getSnapshot?.()?.phase
          === GRAVEBORER_WURM_PHASES.warning;
    }
    if (id === CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EARTHQUAKE) {
      const status = this.scene.earthquakeSystem?.getStatus?.();
      return status?.state === "warning" && status.playerAware !== false;
    }
    if (id === CONTEXTUAL_MECHANIC_TUTORIAL_IDS.HARDCORE) {
      return this.scene._hardcoreRuntime?.system?.getSnapshot?.()?.armed === true;
    }
    if (id === CONTEXTUAL_MECHANIC_TUTORIAL_IDS.DARKNESS) {
      const light = this.scene.lightSystem?.getShaderSnapshot?.();
      const progression = this.scene.systemIntroductionSystem?.lastSnapshot
        || this.scene.systemIntroductionSystem?.getProgressSnapshot?.();
      return progression?.caveRun === true
        && Number(light?.depth) >= LIGHT_CONFIG.depthStartTiles
        && Number(light?.darknessAlpha)
          > LIGHT_CONFIG.renderOptimization.inactiveDarknessAlphaThreshold;
    }
    return false;
  }

  destroy() {
    this.active = null;
    this.runtimeTriggers.clear();
    this.visibleDwellById.clear();
    this.scene = null;
    this.retention = null;
  }
}
