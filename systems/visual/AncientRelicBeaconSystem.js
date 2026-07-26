/** Makes the next underground Ancient Relic and the Sky Altar requirement readable in play. */
import { ANCIENT_RELIC_CONFIG, resolveAncientRelicGuidanceEnabled } from "../../values/ancientRelics.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const replace = (template, values) => Object.entries(values).reduce(
  (text, [key, value]) => text.replace(`{${key}}`, String(value)),
  template,
);

export class AncientRelicBeaconSystem {
  constructor(
    scene,
    worldModel,
    ancientRelicSystem,
    progressionSystem,
    config = ANCIENT_RELIC_CONFIG.guidance,
    accessConfig = HEAVENBLOCKS_ACCESS_CONFIG,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.ancientRelicSystem = ancientRelicSystem;
    this.progressionSystem = progressionSystem;
    this.config = config;
    this.accessConfig = accessConfig;
    this.enabled = resolveAncientRelicGuidanceEnabled(config);
    this.altarTokens = [];
    this._target = null;
    this._nextTargetRefreshMs = 0;
  }

  create() {
    if (!this.enabled) return;
    const tokenKey = ASSET_KEYS.ui.heavenblocks.ancientRelicToken;
    if (!this.scene.textures?.exists?.(tokenKey)) return;
    this._createHud(tokenKey);
    this._createWorldMarker(tokenKey);
    this._createAltarProgress(tokenKey);
  }

  _createHud(tokenKey) {
    const config = this.config;
    this.hudIcon = this.scene.add.image(config.hudIconX, config.hudIconY, tokenKey)
      .setScrollFactor(0)
      .setDepth(config.hudDepth)
      .setDisplaySize(config.hudIconSizePx, config.hudIconSizePx)
      .setVisible(false);
    this.hudText = this.scene.add.text(config.hudTextX, config.hudTextY, "", {
      fontFamily: config.hudFontFamily,
      fontSize: `${config.hudFontSizePx}px`,
      fontStyle: "bold",
      color: config.hudTextColor,
      stroke: config.hudStrokeColor,
      strokeThickness: config.hudStrokeThicknessPx,
    })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(config.hudDepth)
      .setVisible(false);
  }

  _createWorldMarker(tokenKey) {
    const config = this.config;
    const tileSize = this.worldModel.tileSize;
    this.worldGlow = this.scene.add.image(0, 0, tokenKey)
      .setDepth(config.worldMarkerDepth)
      .setDisplaySize(
        config.markerGlowDisplayTiles * tileSize,
        config.markerGlowDisplayTiles * tileSize,
      )
      .setAlpha(config.markerGlowAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.worldMarker = this.scene.add.image(0, 0, tokenKey)
      .setDepth(config.worldMarkerDepth + 1)
      .setDisplaySize(
        config.markerDisplayTiles * tileSize,
        config.markerDisplayTiles * tileSize,
      )
      .setAlpha(config.markerAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    for (const object of [this.worldGlow, this.worldMarker]) {
      const scaleX = object.scaleX;
      const scaleY = object.scaleY;
      this.scene.tweens.add({
        targets: object,
        scaleX: scaleX * config.markerPulseScale,
        scaleY: scaleY * config.markerPulseScale,
        duration: config.markerPulseDurationMs,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _createAltarProgress(tokenKey) {
    const gate = this.accessConfig.surfaceGates[0];
    if (!gate) return;
    const config = this.config;
    const tileSize = this.worldModel.tileSize;
    const center = this.worldModel.tileToWorld(gate.tx, gate.ty);
    const required = this.accessConfig.requiredRelics;
    const centerOffset = (required - 1) / 2;
    for (let index = 0; index < required; index += 1) {
      const token = this.scene.add.image(
        center.x + (index - centerOffset) * config.altarTokenSpacingTiles * tileSize,
        center.y - config.altarTokenOffsetTilesY * tileSize,
        tokenKey,
      )
        .setDepth(this.accessConfig.presentation.depth + 0.35)
        .setDisplaySize(
          config.altarTokenDisplayTiles * tileSize,
          config.altarTokenDisplayTiles * tileSize,
        )
        .setAlpha(config.altarLockedAlpha);
      this.altarTokens.push(token);
    }
    this.altarLabel = this.scene.add.text(
      center.x,
      center.y - config.altarLabelOffsetTilesY * tileSize,
      "",
      {
        fontFamily: config.hudFontFamily,
        fontSize: `${config.hudFontSizePx}px`,
        fontStyle: "bold",
        color: config.hudTextColor,
        align: "center",
        stroke: config.hudStrokeColor,
        strokeThickness: config.hudStrokeThicknessPx,
      },
    )
      .setOrigin(0.5)
      .setDepth(this.accessConfig.presentation.depth + 0.36);
  }

  update(playerTile, timeMs = this.scene.time?.now || 0) {
    if (!this.enabled || !playerTile || !this.hudIcon) return;
    this._refreshTarget(playerTile, timeMs);
    const count = Math.max(0, Math.floor(this.ancientRelicSystem?.getCount?.() || 0));
    const required = this.accessConfig.requiredRelics;
    const activated = this.progressionSystem?.isSkyGateActivated?.() === true;
    const distance = this._target?.distanceTiles ?? Infinity;
    const signalVisible = distance <= this.config.signalRadiusTiles;
    const markerVisible = distance <= this.config.worldRevealRadiusTiles;

    this._syncWorldMarker(markerVisible);
    this._syncHud(count, required, activated, signalVisible);
    this._syncAltar(count, required, activated);
  }

  _refreshTarget(playerTile, timeMs) {
    const targetStillValid = this._target && (
      this.worldModel.getType(this._target.tx, this._target.ty)
      === TILE_TYPES.ANCIENT_RELIC_CACHE
    );
    if (targetStillValid && timeMs < this._nextTargetRefreshMs) {
      const dx = this._target.tx - playerTile.tx;
      const dy = this._target.ty - playerTile.ty;
      this._target.distanceTiles = Math.hypot(dx, dy);
      return;
    }
    this._target = this.worldModel.getNearestAncientRelicCache?.(
      playerTile.tx,
      playerTile.ty,
      { includeHeavenblocks: false },
    ) || null;
    this._nextTargetRefreshMs = timeMs + this.config.targetRefreshMs;
  }

  _syncWorldMarker(visible) {
    if (!visible || !this._target) {
      this.worldGlow?.setVisible(false);
      this.worldMarker?.setVisible(false);
      return;
    }
    const point = this.worldModel.tileToWorld(this._target.tx, this._target.ty);
    this.worldGlow?.setPosition(point.x, point.y).setVisible(true);
    this.worldMarker?.setPosition(point.x, point.y).setVisible(true);
  }

  _syncHud(count, required, activated, signalVisible) {
    let text = "";
    if (!activated && count >= required) {
      text = this.config.copy.altarReady;
    } else if (signalVisible && this._target) {
      const template = activated ? this.config.copy.extraSignal : this.config.copy.signal;
      text = replace(template, {
        count,
        required,
        distance: Math.ceil(this._target.distanceTiles),
        direction: this._directionTo(this._target),
      });
    } else if (!activated) {
      text = replace(this.config.copy.progress, {
        count,
        required,
        depth: this.config.firstTraceDepthMeters,
      });
    }
    this.hudIcon.setVisible(Boolean(text));
    this.hudText.setText(text).setVisible(Boolean(text));
  }

  _syncAltar(count, required, activated) {
    const filled = activated ? required : Math.min(count, required);
    this.altarTokens.forEach((token, index) => {
      token.setAlpha(
        index < filled
          ? this.config.altarReadyAlpha
          : this.config.altarLockedAlpha,
      );
    });
    const template = activated || count >= required
      ? this.config.copy.altarLabelReady
      : this.config.copy.altarLabel;
    this.altarLabel?.setText(replace(template, { count, required }));
  }

  _directionTo(target) {
    const player = this.scene.playerController?.getPlayerTile?.();
    if (!player) return this.config.copy.directionDown;
    const dx = target.tx - player.tx;
    const dy = target.ty - player.ty;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? this.config.copy.directionLeft : this.config.copy.directionRight;
    }
    return dy < 0 ? this.config.copy.directionUp : this.config.copy.directionDown;
  }

  getHealthSnapshot() {
    const cacheCount = this.worldModel.getAncientRelicCachePositions?.({
      includeHeavenblocks: false,
    }).length || 0;
    return {
      enabled: this.enabled,
      ready: !this.enabled || Boolean(
        this.hudIcon
        && this.hudText
        && this.worldMarker
        && this.worldGlow
        && this.altarTokens.length === this.accessConfig.requiredRelics
        && this.altarLabel
        && cacheCount >= this.accessConfig.requiredRelics
      ),
      cacheCount,
      altarTokenCount: this.altarTokens.length,
      target: this._target ? { ...this._target } : null,
    };
  }

  destroy() {
    for (const object of [
      this.hudIcon,
      this.hudText,
      this.worldMarker,
      this.worldGlow,
      this.altarLabel,
      ...this.altarTokens,
    ]) {
      if (!object) continue;
      this.scene.tweens?.killTweensOf?.(object);
      object.destroy?.();
    }
    this.altarTokens = [];
    this._target = null;
  }
}

export default AncientRelicBeaconSystem;
