import {
  FIRST_FIVE_MINUTES_CONFIG,
  resolveFirstFiveMinutesEnabled,
} from "../../values/firstFiveMinutes.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { prepareTownTutorialDigSite } from "./TownSquareTutorialDigSite.js";
import { TutorialNarrationController } from "./TutorialNarrationController.js";
import { TutorialSurfaceSafetySystem } from "./TutorialSurfaceSafetySystem.js";
import { TutorialTownExitBarrierSystem } from "./TutorialTownExitBarrierSystem.js";

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
    this.narration = new TutorialNarrationController(scene, retention);
    this.townExitBarrier = new TutorialTownExitBarrierSystem(scene, retention);
    this._surfaceBlockedUntil = 0;
  }

  create() {
    if (!this.enabled) return;
    this.surfaceSafety.setPolicy(
      () => this.isDescentBlocked(),
      () => this.handleDescentBlocked(),
    );
    this.surfaceSafety.create();
    this.townExitBarrier.create();
    this.scene.playerController?.surfaceDrop?.setAccessPolicy?.(
      () => !this.isSurfaceDropBlocked(),
      () => this.handleSurfaceDropBlocked(),
    );
  }

  update() {
    if (!this.enabled) return;

    this.enforceSurfaceSafety();
    this.narration.update();
    this.townExitBarrier.update();
  }

  onStageEntered(stage) {
    if (!this.enabled) return false;
    this.narration.onStageEntered(stage);
    this.townExitBarrier.sync();
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

    const template = RETENTION_CONFIG.tutorial.activeStages.includes(state.stage)
      ? this.narration.getCaption(state.stage)
      : null;
    if (!template) return null;

    const copy = this._interpolate(template);
    if (this.scene.time?.now < this._surfaceBlockedUntil) {
      const blocked = state.stage === TOWN_TUTORIAL_STAGES.FLIGHT
        ? this.config.copy.surfaceDropBlocked
        : this.config.copy.protectedGround;
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
    const stage = this.retention?.getTutorialState?.()?.stage;
    return stage === TOWN_TUTORIAL_STAGES.MOVE
      || stage === TOWN_TUTORIAL_STAGES.DIG
      || stage === TOWN_TUTORIAL_STAGES.FLIGHT;
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
    return null;
  }

  isUpgradeAvailable(upgradeId) {
    return true;
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
    return null;
  }

  getHealthSnapshot() {
    const state = this.retention?.getTutorialState?.() || null;
    return {
      enabled: this.enabled,
      stage: state?.stage || null,
      persistentGuideVisible: this.hasPersistentGuide(),
      surfaceDropBlocked: this.isSurfaceDropBlocked(),
      portalDistance: this.scene?.firstSessionPortalSystem?.getDistance?.()
        ?? Number.POSITIVE_INFINITY,
      narration: this.narration?.getHealthSnapshot?.() || null,
      townExitBarrier: this.townExitBarrier?.getHealthSnapshot?.() || null,
    };
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
    return this.interpolateCopy(copy);
  }

  destroy() {
    this.scene?.playerController?.surfaceDrop?.setAccessPolicy?.(null, null);
    this.townExitBarrier?.destroy();
    this.townExitBarrier = null;
    this.narration?.destroy();
    this.narration = null;
    this.surfaceSafety?.destroy?.();
    this.surfaceSafety = null;
    this.scene = null;
    this.retention = null;
    this.view = null;
    this.interpolateCopy = null;
  }
}
