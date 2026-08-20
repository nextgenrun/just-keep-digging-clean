import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  UNDERSTAR_ENDING_CONFIG,
  UNDERSTAR_ENDING_STATES,
  sanitizeUnderstarEndingData,
} from "../../values/understarEnding.js";

const infinity = Number.POSITIVE_INFINITY;

export class UnderstarEndingSystem {
  constructor(scene, options = {}, config = UNDERSTAR_ENDING_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = config.enabled === true
      && options.capabilities?.demoMode === true;
    this.assetCoordinator = options.assetCoordinator || null;
    this.createEndingOverlay = options.createEndingOverlay || null;
    this.onChanged = options.onChanged || null;
    this.onMainMenu = options.onMainMenu || null;
    this.data = sanitizeUnderstarEndingData(null);
    this.assetReady = scene.textures?.exists?.(ASSET_KEYS.background.understarEnding.key) === true;
    this.assetRequest = null;
    this.worldImage = null;
    this.promptTitle = null;
    this.promptAction = null;
    this.overlay = null;
  }

  update(_time, _delta, playerTile, depthMeters) {
    if (!this.enabled || !playerTile) return;
    if (depthMeters >= this.config.prefetchDepthMeters) this._ensureAsset();
    if (
      depthMeters >= this.config.triggerDepthMeters
      && this.data.state === UNDERSTAR_ENDING_STATES.LOCKED
    ) {
      this.data = sanitizeUnderstarEndingData({
        state: UNDERSTAR_ENDING_STATES.DISCOVERED,
        anchorTileX: playerTile.tx,
      });
      this._ensureAsset();
      this.onChanged?.("understar-discovered");
    }
    if (this.data.state !== UNDERSTAR_ENDING_STATES.LOCKED && this.assetReady) {
      this._ensureWorldVisual();
    }
    this._syncPrompt(playerTile);
  }

  isFinaleDepth(depthMeters) {
    return this.enabled && depthMeters >= this.config.triggerDepthMeters;
  }

  getInteractionDistance(playerTile) {
    if (
      !this.enabled
      || !this.assetReady
      || !playerTile
      || this.data.state === UNDERSTAR_ENDING_STATES.LOCKED
      || !Number.isInteger(this.data.anchorTileX)
    ) return infinity;
    const targetY = this._targetTileY();
    const distance = Math.abs(playerTile.tx - this.data.anchorTileX)
      + Math.abs(playerTile.ty - targetY);
    return distance <= this.config.interactionRadiusTiles ? distance : infinity;
  }

  handleInteract(playerTile) {
    if (this.getInteractionDistance(playerTile) === infinity) return false;
    if (this.data.state !== UNDERSTAR_ENDING_STATES.COMPLETED) {
      this.data = sanitizeUnderstarEndingData({
        ...this.data,
        state: UNDERSTAR_ENDING_STATES.COMPLETED,
      });
      this.onChanged?.("understar-completed");
      void this.scene.flushDugTilesSave?.({
        force: true,
        reason: "understar-completed",
      });
    }
    this._showOverlay();
    return true;
  }

  closeOverlay() {
    if (!this.overlay?.isVisible) return false;
    this.overlay.close();
    return true;
  }

  getSaveData() {
    return sanitizeUnderstarEndingData(this.data);
  }

  getHealthSnapshot() {
    return Object.freeze({
      enabled: this.enabled,
      state: this.data.state,
      anchorTileX: this.data.anchorTileX,
      assetReady: this.assetReady,
      textureExists: this.scene.textures?.exists?.(
        ASSET_KEYS.background.understarEnding.key,
      ) === true,
      assetPending: Boolean(this.assetRequest),
      worldImageVisible: Boolean(this.worldImage?.visible && this.worldImage?.alpha > 0),
      promptVisible: Boolean(this.promptTitle?.visible && this.promptAction?.visible),
      overlayVisible: Boolean(this.overlay?.isVisible),
    });
  }

  loadSaveData(value) {
    this.data = sanitizeUnderstarEndingData(value);
    this._destroyWorldVisual();
  }

  destroy() {
    this.assetRequest?.cancel?.();
    this.assetRequest = null;
    this.overlay?.destroy?.();
    this.overlay = null;
    this._destroyWorldVisual();
  }

  _targetTileY() {
    return this.scene.config.topAirRows + this.config.triggerDepthMeters - 1;
  }

  _ensureAsset() {
    const asset = ASSET_KEYS.background.understarEnding;
    if (this.assetReady || this.assetRequest || !asset) return;
    if (this.scene.textures?.exists?.(asset.key)) {
      this.assetReady = true;
      return;
    }
    const ready = () => {
      this.assetRequest = null;
      this.assetReady = this.scene.textures?.exists?.(asset.key) === true;
      if (this.assetReady && this.data.state !== UNDERSTAR_ENDING_STATES.LOCKED) {
        this._ensureWorldVisual();
      }
    };
    const failed = () => { this.assetRequest = null; };
    this.assetRequest = this.assetCoordinator?.request?.(asset, {
      owner: this.config.runtimeAsset.owner,
      priority: this.config.runtimeAsset.priority,
      onReady: ready,
      onError: failed,
    }) || this._requestWithSceneLoader(asset, ready, failed);
  }

  _requestWithSceneLoader(asset, ready, failed) {
    if (!this.scene.load?.image) return null;
    const completeEvent = `filecomplete-image-${asset.key}`;
    const onComplete = () => {
      this.scene.load.off?.("loaderror", onError);
      ready();
    };
    const onError = file => {
      if (file?.key !== asset.key) return;
      this.scene.load.off?.(completeEvent, onComplete);
      this.scene.load.off?.("loaderror", onError);
      failed();
    };
    this.scene.load.once(completeEvent, onComplete);
    this.scene.load.on?.("loaderror", onError);
    this.scene.load.image(asset.key, asset.path);
    if (!this.scene.load.isLoading?.()) this.scene.load.start?.();
    return Object.freeze({
      cancel: () => {
        this.scene.load.off?.(completeEvent, onComplete);
        this.scene.load.off?.("loaderror", onError);
        return true;
      },
    });
  }

  _ensureWorldVisual() {
    if (this.worldImage || !Number.isInteger(this.data.anchorTileX)) return;
    const cfg = this.config.world;
    const tileSize = this.scene.config.tileSize;
    const x = (this.data.anchorTileX + 0.5) * tileSize;
    const y = (this._targetTileY() + 0.5 + cfg.centerOffsetTilesY) * tileSize;
    this.worldImage = this.scene.add.image(
      x,
      y,
      ASSET_KEYS.background.understarEnding.key,
    )
      .setDisplaySize(cfg.sourceWidthPx, cfg.sourceHeightPx)
      .setDepth(cfg.renderDepth)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: this.worldImage,
      alpha: 1,
      duration: cfg.revealDurationMs,
      ease: "Sine.easeOut",
    });
    this._createPrompt();
  }

  _createPrompt() {
    if (this.promptTitle || !this.worldImage) return;
    const cfg = this.config.world;
    const style = {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      color: cfg.promptTitleColor,
      stroke: cfg.promptStrokeColor,
      strokeThickness: cfg.promptStrokeThickness,
      align: "center",
    };
    this.promptTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      cfg.promptY,
      this.config.copy.promptTitle,
      { ...style, fontSize: cfg.promptTitleFontSize },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.promptDepth).setVisible(false);
    this.promptAction = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      cfg.promptY + 38,
      this.config.copy.promptAction,
      { ...style, color: cfg.promptActionColor, fontSize: cfg.promptActionFontSize },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(cfg.promptDepth).setVisible(false);
  }

  _syncPrompt(playerTile) {
    const visible = this.getInteractionDistance(playerTile) < infinity
      && !this.overlay?.isVisible;
    this.promptTitle?.setVisible(visible);
    this.promptAction
      ?.setText(this.data.state === UNDERSTAR_ENDING_STATES.COMPLETED
        ? this.config.copy.replayAction
        : this.config.copy.promptAction)
      .setVisible(visible);
  }

  _showOverlay() {
    if (!this.createEndingOverlay) return;
    this.promptTitle?.setVisible(false);
    this.promptAction?.setVisible(false);
    this.overlay ||= this.createEndingOverlay(this.scene, {
      onMainMenu: () => this.onMainMenu?.(),
    });
    this.overlay.show(this._createSummary());
  }

  _createSummary() {
    const retention = this.scene.retentionProgressSystem?.getJournalSnapshot?.() || {};
    return Object.freeze({
      level: this.scene.playerLevelSystem?.getBonusesSummary?.()?.level || 1,
      tiles: this.scene.digSystem?.getTilesBroken?.() || 0,
      portals: this.scene.specialTileSystem?.getActivatedPortals?.().length || 0,
      stars: retention.stats?.starsCollected || 0,
    });
  }

  _destroyWorldVisual() {
    this.scene.tweens?.killTweensOf?.(this.worldImage);
    this.worldImage?.destroy?.();
    this.promptTitle?.destroy?.();
    this.promptAction?.destroy?.();
    this.worldImage = null;
    this.promptTitle = null;
    this.promptAction = null;
  }
}
