import {
  FIRST_FIVE_MINUTES_CONFIG,
  resolveFirstFiveMinutesEnabled,
} from "../../values/firstFiveMinutes.js";
import {
  FIRST_FIVE_STARTER_UPGRADE_ID,
  UPGRADES,
} from "../../values/upgradeDefinitions.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  getTownTutorialPayoffSite,
  prepareTownTutorialDigSite,
  prepareTownTutorialPayoffSite,
} from "./TownSquareTutorialDigSite.js";
import { TutorialSurfaceSafetySystem } from "./TutorialSurfaceSafetySystem.js";

const PROTECTED_TOWN_TYPES = new Set([
  TILE_TYPES.FLOOR_TOWN_1,
  TILE_TYPES.FLOOR_TOWN_2,
]);

export class FirstFiveMinutesTutorialBridge {
  constructor(scene, retention, view, interpolateCopy, options = {}) {
    this.scene = scene;
    this.retention = retention;
    this.view = view;
    this.interpolateCopy = interpolateCopy;
    this.config = FIRST_FIVE_MINUTES_CONFIG;
    this.search = options.search ?? globalThis.location?.search ?? "";
    this.enabled = options.enabled
      ?? resolveFirstFiveMinutesEnabled(this.config, this.search);
    this.surfaceSafety = new TutorialSurfaceSafetySystem(this.scene, this.config);
    this._surfaceBlockedUntil = 0;
    this._wasFlightPracticePending = false;
    this._wasPayoffPending = false;
  }

  create() {
    if (!this.enabled) return;
    this.surfaceSafety.setPolicy(
      () => this.isDescentBlocked(),
      () => this.handleDescentBlocked(),
    );
    this.surfaceSafety.create();
    this._wasFlightPracticePending = this._isFlightPracticePending();
    this._wasPayoffPending = this._syncPayoff();
    this.scene.playerController?.surfaceDrop?.setAccessPolicy?.(
      () => !this.isSurfaceDropBlocked(),
      () => this.handleSurfaceDropBlocked(),
    );
  }

  update() {
    if (!this.enabled) return;

    this.enforceSurfaceSafety();
    const flightPracticePending = this._isFlightPracticePending();
    if (
      this._wasFlightPracticePending
      && !flightPracticePending
      && this.scene.playerController?.abilities?.isFlying?.() === true
    ) {
      this.scene.queueDugTilesSave?.();
    }
    this._wasFlightPracticePending = flightPracticePending;

    const payoffPending = this._syncPayoff();
    if (this._wasPayoffPending && !payoffPending) {
      this.view.clearMarker();
      this.view.showCompletion(this._interpolate(this.config.copy.complete));
      this.scene.queueDugTilesSave?.();
    }
    this._wasPayoffPending = payoffPending;
  }

  onStageEntered(stage) {
    if (!this.enabled) return false;
    this.view.closeGuideNotification();
    if (
      stage === TOWN_TUTORIAL_STAGES.UPGRADE
      && this.scene.upgradeSystem?.getUpgradeLevel?.(
        FIRST_FIVE_STARTER_UPGRADE_ID,
      ) > 0
    ) {
      this.retention.recordUpgrade(
        UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].name,
        { upgradeId: FIRST_FIVE_STARTER_UPGRADE_ID },
      );
    }
    if (stage !== TOWN_TUTORIAL_STAGES.MOVE) return false;
    const site = prepareTownTutorialDigSite(this.scene, this.search);
    if (!site) return false;
    this._pointAtSite(site);
    return true;
  }

  isEnabled() {
    return this.enabled;
  }

  hasPersistentGuide() {
    return this.getNextPromiseOverride() !== null;
  }

  getNextPromiseOverride() {
    if (!this.enabled) return null;
    const state = this.retention?.getTutorialState?.();
    if (!state) return null;

    let template = null;
    if (RETENTION_CONFIG.tutorial.activeStages.includes(state.stage)) {
      template = this.config.copy[state.stage] || null;
    } else if (this._isFlightPracticePending(state)) {
      template = this.config.copy.flight;
    } else if (this._wasPayoffPending) {
      template = this.config.copy.payoff;
    }
    if (!template) return null;

    const copy = this._interpolate(template);
    if (this.scene.time?.now < this._surfaceBlockedUntil) {
      const blocked = this._isFlightPracticePending(state)
        ? this.config.copy.surfaceDropBlocked
        : this.config.copy.trainingDropBlocked;
      copy.detail = this._interpolate(blocked).detail;
    } else if (
      (state.stage === TOWN_TUTORIAL_STAGES.MOVE
        || state.stage === TOWN_TUTORIAL_STAGES.DIG)
      && this._isAimingAtProtectedGround()
    ) {
      copy.detail = this._interpolate(this.config.copy.protectedGround).detail;
    }
    return copy;
  }

  isSurfaceDropBlocked() {
    return this.isDescentBlocked();
  }

  isDescentBlocked() {
    if (!this.enabled) return false;
    return this.retention?.isTutorialActive?.() === true
      || this._isFlightPracticePending();
  }

  handleSurfaceDropBlocked() {
    if (!this.enabled) return;
    this._surfaceBlockedUntil = (this.scene.time?.now || 0)
      + this.config.surfaceSafety.blockedDetailMs;
  }

  handleDescentBlocked() {
    this.handleSurfaceDropBlocked();
  }

  enforceSurfaceSafety() {
    return this.surfaceSafety?.enforce?.() === true;
  }

  getFocusedUpgradeId(merchantId) {
    const state = this.retention?.getTutorialState?.();
    if (
      !this.enabled
      || state?.stage !== TOWN_TUTORIAL_STAGES.UPGRADE
      || merchantId !== RETENTION_CONFIG.tutorial.merchants.upgrade
    ) {
      return null;
    }
    return FIRST_FIVE_STARTER_UPGRADE_ID;
  }

  isUpgradeAvailable(upgradeId) {
    if (upgradeId !== FIRST_FIVE_STARTER_UPGRADE_ID) return true;
    if (!this.enabled) return false;
    const state = this.retention?.getTutorialState?.();
    const blockedByGuidedStage = state?.choice === TOWN_TUTORIAL_CHOICES.YES
      && RETENTION_CONFIG.tutorial.activeStages.includes(state.stage)
      && state.stage !== TOWN_TUTORIAL_STAGES.UPGRADE;
    return !blockedByGuidedStage;
  }

  getPreferredMerchantMode(merchantId) {
    const state = this.retention?.getTutorialState?.();
    if (
      this.enabled
      && state?.stage === TOWN_TUTORIAL_STAGES.SELL
      && merchantId === RETENTION_CONFIG.tutorial.merchants.sell
    ) {
      return "sell";
    }
    return null;
  }

  getUpgradePreview(upgradeId) {
    if (!this.enabled || upgradeId !== FIRST_FIVE_STARTER_UPGRADE_ID) return null;
    const digSystem = this.scene.digSystem;
    const upgradeSystem = this.scene.upgradeSystem;
    if (!digSystem || !upgradeSystem) return null;

    const site = getTownTutorialPayoffSite(this.scene, this.search);
    const before = digSystem.getHitsToBreakPreview(
      TILE_TYPES.DIRT,
      site.tx,
      site.ty,
      upgradeSystem.getUpgradeEffects(),
    );
    const after = digSystem.getHitsToBreakPreview(
      TILE_TYPES.DIRT,
      site.tx,
      site.ty,
      upgradeSystem.getProjectedUpgradeEffects(upgradeId),
    );
    return {
      upgradeId,
      beforeHits: before.hits,
      afterHits: after.hits,
      beforeDamage: before.damage,
      afterDamage: after.damage,
    };
  }

  getHealthSnapshot() {
    const state = this.retention?.getTutorialState?.() || null;
    return {
      enabled: this.enabled,
      stage: state?.stage || null,
      persistentGuideVisible: this.hasPersistentGuide(),
      surfaceDropBlocked: this.isSurfaceDropBlocked(),
      flightPracticePending: this._isFlightPracticePending(state),
      payoffPending: this._wasPayoffPending,
    };
  }

  _isFlightPracticePending(state = this.retention?.getTutorialState?.()) {
    if (!this.enabled || !state) return false;
    if (state.choice === TOWN_TUTORIAL_CHOICES.LEGACY) return false;
    if (
      state.stage !== TOWN_TUTORIAL_STAGES.COMPLETE
      && state.stage !== TOWN_TUTORIAL_STAGES.SKIPPED
    ) {
      return false;
    }
    if (state.completionRewardGranted !== true) return false;
    return state.freeFlightRemainingMs
      >= RETENTION_CONFIG.tutorial.completionReward.freeFlightMs;
  }

  _syncPayoff() {
    if (!this._isPayoffEligible()) return false;
    const site = prepareTownTutorialPayoffSite(this.scene, this.search);
    if (!site) return false;
    const key = `${site.tx},${site.ty}`;
    const pending = this.scene.worldModel?.dugTiles?.has?.(key) !== true;
    if (pending) this._pointAtSite(site);
    return pending;
  }

  _isPayoffEligible() {
    const state = this.retention?.getTutorialState?.();
    return this.enabled
      && state?.choice === TOWN_TUTORIAL_CHOICES.YES
      && state.stage === TOWN_TUTORIAL_STAGES.COMPLETE
      && state.completionRewardGranted === true
      && !this._isFlightPracticePending(state)
      && this.scene.upgradeSystem?.getUpgradeLevel?.(
        FIRST_FIVE_STARTER_UPGRADE_ID,
      ) > 0;
  }

  _isAimingAtProtectedGround() {
    const target = this.scene.playerController?.getAimTargetTile?.();
    if (!target) return false;
    return PROTECTED_TOWN_TYPES.has(
      this.scene.worldModel?.getTileType?.(target.tx, target.ty),
    );
  }

  _pointAtSite(site) {
    const tileSize = this.scene.config.tileSize;
    this.view.pointAt(
      (site.tx + 0.5) * tileSize,
      site.ty * tileSize + RETENTION_CONFIG.tutorial.ui.digMarkerOffsetYPx,
    );
  }

  _interpolate(copy) {
    return this.interpolateCopy(copy, {
      upgrade: UPGRADES[FIRST_FIVE_STARTER_UPGRADE_ID].name,
    });
  }

  destroy() {
    this.scene?.playerController?.surfaceDrop?.setAccessPolicy?.(null, null);
    this.surfaceSafety?.destroy?.();
    this.surfaceSafety = null;
    this.scene = null;
    this.retention = null;
    this.view = null;
    this.interpolateCopy = null;
  }
}
