import {
  FIRST_FIVE_MINUTES_CONFIG,
  resolveFirstFiveMinutesEnabled,
} from "../../values/firstFiveMinutes.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { prepareTownTutorialDigSite } from "./TownSquareTutorialDigSite.js";
import { TutorialNarrationController } from "./TutorialNarrationController.js";
import { TutorialPortalGhostGuide } from "./TutorialPortalGhostGuide.js";
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
    this.portalGhostGuide = new TutorialPortalGhostGuide(scene);
    this.townExitBarrier = new TutorialTownExitBarrierSystem(scene, retention);
    this._surfaceBlockedUntil = 0;
  }

  create() {
    if (!this.enabled) return;
    this.surfaceSafety.setPolicy(
      () => this.isSurfaceSafetyBlocked(),
      () => this.handleDescentBlocked(),
    );
    this.surfaceSafety.create();
    this.townExitBarrier.create();
    this.portalGhostGuide.sync(
      this.retention?.getTutorialState?.()?.stage,
    );
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
    this.portalGhostGuide.update(
      this.retention?.getTutorialState?.()?.stage,
    );
  }

  onStageEntered(stage) {
    if (!this.enabled) return false;
    this.narration.onStageEntered(stage);
    this.townExitBarrier.sync();
    this.portalGhostGuide.sync(stage);
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
    if (this.isDescentBlocked()) return true;
    if (!this._isPortalStage()) return false;
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    return !this._isStarterRouteX(playerTile?.tx);
  }

  isDescentBlocked() {
    if (!this.enabled) return false;
    const stage = this.retention?.getTutorialState?.()?.stage;
    return stage === TOWN_TUTORIAL_STAGES.MOVE
      || stage === TOWN_TUTORIAL_STAGES.DIG
      || stage === TOWN_TUTORIAL_STAGES.FLIGHT;
  }

  shouldBlockDownwardMine(targetTile) {
    if (this.isDescentBlocked()) return true;
    if (!this._isPortalStage()) return false;
    return !this.isStarterRouteTile(targetTile);
  }

  isSurfaceSafetyBlocked() {
    if (this.isDescentBlocked()) return true;
    if (!this._isPortalStage()) return false;
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    const surfaceRow = this.scene.config?.topAirRows;
    if (!playerTile || !Number.isInteger(surfaceRow)) return false;
    if (playerTile.ty < surfaceRow) return false;
    return !this.isStarterRouteTile(playerTile);
  }

  isStarterRouteTile(tile) {
    const bounds = this._getStarterRouteBounds();
    return Boolean(
      bounds
      && Number.isInteger(tile?.tx)
      && Number.isInteger(tile?.ty)
      && tile.tx >= bounds.minTx
      && tile.tx <= bounds.maxTx
      && tile.ty >= bounds.minTy
      && tile.ty <= bounds.maxTy
    );
  }

  _isTutorialPortalTarget({ tile = null, pairData = null, levelId = null } = {}) {
    const portal = this.scene.firstSessionPortalSystem?.getPortalTile?.();
    if (!portal) return false;
    if (pairData) {
      return Number(pairData.levelId) === this.config.firstPortal.levelId
        && Number(pairData.dungeonTx) === portal.tx
        && Number(pairData.dungeonTy) === portal.ty;
    }
    if (tile) {
      return Number(tile.tx) === portal.tx && Number(tile.ty) === portal.ty;
    }
    return Number(levelId) === this.config.firstPortal.levelId;
  }

  _getTutorialTeleportPass({ kind = null, ...target } = {}) {
    if (!this.enabled) return false;
    const state = this.retention?.getTutorialState?.();
    if (
      state?.choice !== TOWN_TUTORIAL_CHOICES.YES
      || !this._isTutorialPortalTarget(target)
    ) {
      return null;
    }

    return RETENTION_CONFIG.tutorial.freeTeleports.rules.find(rule => (
      rule.kind === kind && rule.stages.includes(state.stage)
    ))?.id || null;
  }

  isTutorialTeleportFree(options = {}) {
    const state = this.retention?.getTutorialState?.();
    if (
      options.kind === "undergroundToSky"
      && state?.stage === TOWN_TUTORIAL_STAGES.PORTAL
      && options.tile
      && this._isTutorialPortalTarget(options)
    ) {
      return true;
    }
    const passId = this._getTutorialTeleportPass(options);
    return Boolean(passId && this.retention?.hasTutorialFreeTeleportPass?.(passId));
  }

  consumeTutorialTeleportFreePass(options = {}) {
    const passId = this._getTutorialTeleportPass(options);
    return Boolean(passId && this.retention?.consumeTutorialFreeTeleportPass?.(passId));
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
      surfaceSafetyBlocked: this.isSurfaceSafetyBlocked(),
      portalDistance: this.scene?.firstSessionPortalSystem?.getDistance?.()
        ?? Number.POSITIVE_INFINITY,
      narration: this.narration?.getHealthSnapshot?.() || null,
      townExitBarrier: this.townExitBarrier?.getHealthSnapshot?.() || null,
      portalGhostGuide: this.portalGhostGuide?.getHealthSnapshot?.() || null,
    };
  }

  _isAimingAtProtectedGround() {
    const target = this.scene.playerController?.getAimTargetTile?.();
    if (!target) return false;
    return PROTECTED_TOWN_TYPES.has(
      this.scene.worldModel?.getTileType?.(target.tx, target.ty),
    );
  }

  _isPortalStage() {
    return this.enabled
      && this.retention?.getTutorialState?.()?.stage
        === TOWN_TUTORIAL_STAGES.PORTAL;
  }

  _getStarterRouteBounds() {
    const surfaceRow = this.scene?.config?.topAirRows;
    const route = this.config.townExitBarrier?.starterRoute;
    const portal = this.scene?.firstSessionPortalSystem?.getPortalTile?.();
    if (!Number.isInteger(surfaceRow) || !route || !portal) return null;
    return {
      minTx: portal.tx - route.halfWidthTiles + 1,
      maxTx: portal.tx + route.halfWidthTiles - 1,
      minTy: surfaceRow,
      maxTy: surfaceRow + route.floorDepthMeters - 1,
    };
  }

  _isStarterRouteX(tx) {
    const bounds = this._getStarterRouteBounds();
    return Boolean(
      bounds
      && Number.isInteger(tx)
      && tx >= bounds.minTx
      && tx <= bounds.maxTx
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
    this.portalGhostGuide?.destroy();
    this.portalGhostGuide = null;
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
