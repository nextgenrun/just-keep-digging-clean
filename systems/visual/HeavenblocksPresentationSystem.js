import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class HeavenblocksPresentationSystem {
  constructor(
    scene,
    worldModel,
    worldVisualSystem = null,
    config = HEAVENBLOCKS_ACCESS_CONFIG,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.worldVisualSystem = worldVisualSystem;
    this.config = config;
    this.fxObjects = new Set();
    this.shaftBeacons = new Map();
  }

  create() {
    const depth = this.config.presentation.depth;
    this.promptText = this.scene.add.text(0, 0, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      stroke: "#07111b",
      strokeThickness: 5,
    }).setOrigin(0.5, 1).setDepth(depth + 0.2).setVisible(false);

    for (const region of this.config.regions) this._createShaftBeacon(region);
    const firstRegion = this.config.regions[0];
    if (firstRegion && this.scene.textures?.exists?.(firstRegion.heartAssetKey)) {
      this.objectiveIcon = this.scene.add.image(
        this.config.presentation.objectiveIconX,
        this.config.presentation.objectiveY,
        firstRegion.heartAssetKey,
      )
        .setScrollFactor(0)
        .setDepth(depth + 0.45)
        .setDisplaySize(
          this.config.presentation.objectiveIconSizePx,
          this.config.presentation.objectiveIconSizePx,
        )
        .setVisible(false);
    }
    this.objectiveText = this.scene.add.text(
      this.config.presentation.objectiveX,
      this.config.presentation.objectiveY,
      "",
      {
        fontFamily: this.config.presentation.objectiveFontFamily,
        fontSize: `${this.config.presentation.objectiveFontSizePx}px`,
        fontStyle: "bold",
        color: this.config.presentation.objectiveTextColor,
        align: "center",
        stroke: this.config.presentation.objectiveStrokeColor,
        strokeThickness: this.config.presentation.objectiveStrokeThicknessPx,
      },
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 0.45)
      .setVisible(false);
  }

  _createShaftBeacon(region) {
    if (
      !region.entryShaft
      || !this.scene.textures?.exists?.(region.heartAssetKey)
    ) return;
    const point = this.worldModel.tileToWorld(region.entryShaft.tx, region.entryShaft.ty);
    const size = this.config.presentation.shaftBeaconDisplayTiles * this.worldModel.tileSize;
    const beacon = this.scene.add.image(point.x, point.y, region.heartAssetKey)
      .setDepth(this.config.presentation.depth + 0.18)
      .setDisplaySize(size, size)
      .setTint(region.color)
      .setAlpha(this.config.presentation.shaftBeaconAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    beacon.name = `${region.id}:entry-shaft-beacon`;
    this.scene.tweens.add({
      targets: beacon,
      y: point.y - this.config.presentation.shaftBeaconBobPx,
      duration: this.config.presentation.shaftBeaconBobDurationMs,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
    this.shaftBeacons.set(region.id, beacon);
  }

  setPrompt(anchor, label) {
    if (!anchor || !label || !this.promptText) {
      this.hidePrompt();
      return;
    }
    const point = this.worldModel.tileToWorld(anchor.tx, anchor.ty);
    this.promptText
      .setPosition(point.x, point.y - this.config.presentation.promptOffsetPx)
      .setText(`[${USER_SETTINGS.getKeyLabel("interact")}] ${label}`)
      .setVisible(true);
  }

  hidePrompt() {
    this.promptText?.setVisible(false);
  }

  redrawAltars(progressionSystem, force = false) {
    this.worldVisualSystem?.syncProgression?.(progressionSystem, force);
    for (const region of this.config.regions) {
      const unlocked = progressionSystem?.isRegionUnlocked?.(region.id) === true;
      const completed = progressionSystem?.isRegionCompleted?.(region.id) === true;
      this.shaftBeacons.get(region.id)?.setVisible(unlocked && !completed);
    }
  }

  updateObjective(playerTile, progressionSystem) {
    const region = playerTile
      ? this.worldModel.getHeavenblockRegionAt?.(playerTile.tx, playerTile.ty)
      : null;
    if (
      !region
      || progressionSystem?.isRegionCompleted?.(region.id) === true
      || !this.objectiveIcon
      || !this.objectiveText
    ) {
      this._hideObjective();
      return;
    }
    const dx = region.core.tx - playerTile.tx;
    const dy = region.core.ty - playerTile.ty;
    const direction = this._directionLabel(dx, dy);
    const text = this.config.copy.coreSignal
      .replace("{part}", region.partLabel.toUpperCase())
      .replace("{distance}", Math.ceil(Math.hypot(dx, dy)))
      .replace("{direction}", direction);
    this.objectiveIcon
      .setTexture(region.heartAssetKey)
      .setTint(region.color)
      .setVisible(true);
    this.objectiveText.setText(text).setVisible(true);
  }

  _directionLabel(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? this.config.copy.directionLeft : this.config.copy.directionRight;
    }
    return dy < 0 ? this.config.copy.directionUp : this.config.copy.directionDown;
  }

  _hideObjective() {
    this.objectiveIcon?.setVisible(false);
    this.objectiveText?.setVisible(false);
  }

  playTransit(point, region, firstUnlock, delay) {
    if (
      !point
      || !region
      || !this.scene.textures?.exists?.(region.portalAssetKey)
    ) return;
    const tileSize = this.worldModel.tileSize;
    const portalEcho = this.scene.add.image(point.x, point.y, region.portalAssetKey)
      .setDepth(this.config.presentation.depth + 0.3)
      .setDisplaySize(tileSize * 2, tileSize * 2)
      .setTint(region.color)
      .setAlpha(0.95);
    this.fxObjects.add(portalEcho);
    const startScaleX = portalEcho.scaleX;
    const startScaleY = portalEcho.scaleY;
    this.scene.tweens.add({
      targets: portalEcho,
      scaleX: startScaleX * (firstUnlock ? this.config.presentation.portalEchoScale : 1.7),
      scaleY: startScaleY * (firstUnlock ? this.config.presentation.portalEchoScale : 1.7),
      alpha: 0,
      duration: delay,
      ease: "Cubic.easeOut",
      onComplete: () => this._destroyFx(portalEcho),
    });
    const relicKey = ASSET_KEYS.ui.heavenblocks.ancientRelicToken;
    if (!firstUnlock || !this.scene.textures?.exists?.(relicKey)) return;

    for (let index = 0; index < 3; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / 3);
      const token = this.scene.add.image(point.x, point.y, relicKey)
        .setDepth(this.config.presentation.depth + 0.5)
        .setScale(0.25)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.fxObjects.add(token);
      this.scene.tweens.add({
        targets: token,
        x: point.x + Math.cos(angle) * this.config.presentation.relicProjectionRadiusPx,
        y: point.y + Math.sin(angle) * this.config.presentation.relicProjectionRadiusPx,
        scale: this.config.presentation.relicProjectionScale,
        alpha: { from: 0, to: 0.95 },
        angle: index % 2 === 0 ? 12 : -12,
        duration: Math.max(240, delay * 0.58),
        ease: "Back.easeOut",
        yoyo: true,
        hold: Math.max(0, delay * 0.18),
        onComplete: () => this._destroyFx(token),
      });
    }
  }

  playComponentClaim(region) {
    const point = this.worldModel.tileToWorld(region.core.tx, region.core.ty);
    const assetKey = this.scene.textures?.exists?.(region.heartAssetKey)
      ? region.heartAssetKey
      : region.componentAssetKey;
    if (!this.scene.textures?.exists?.(assetKey)) return;
    const icon = this.scene.add.image(point.x, point.y, assetKey)
      .setDepth(this.config.presentation.depth + 0.6)
      .setBlendMode(Phaser.BlendModes.ADD);
    icon.setDisplaySize(this.worldModel.tileSize * 1.7, this.worldModel.tileSize * 1.7);
    const startScaleX = icon.scaleX;
    const startScaleY = icon.scaleY;
    this.fxObjects.add(icon);
    this.scene.tweens.add({
      targets: icon,
      y: point.y - 150,
      scaleX: startScaleX * 1.4,
      scaleY: startScaleY * 1.4,
      angle: 18,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: "Cubic.easeOut",
      onComplete: () => this._destroyFx(icon),
    });
  }

  playVault(region, keystoneGranted) {
    const point = this.worldModel.tileToWorld(region.arcVault.tx, region.arcVault.ty);
    const fxRegion = keystoneGranted ? { ...region, color: 0xffffff } : region;
    this.playTransit(point, fxRegion, true, 1200);
  }

  getHealthSnapshot() {
    return {
      promptReady: Boolean(this.promptText),
      worldVisualReady: this.worldVisualSystem?.getHealthSnapshot?.()?.ready === true,
      objectiveReady: Boolean(this.objectiveIcon && this.objectiveText),
      shaftBeaconCount: this.shaftBeacons.size,
      activeFxCount: this.fxObjects.size,
    };
  }

  _destroyFx(object) {
    if (!object) return;
    this.fxObjects.delete(object);
    object.destroy?.();
  }

  destroy() {
    this.promptText?.destroy();
    this.promptText = null;
    this.objectiveIcon?.destroy();
    this.objectiveIcon = null;
    this.objectiveText?.destroy();
    this.objectiveText = null;
    for (const beacon of this.shaftBeacons.values()) {
      this.scene.tweens?.killTweensOf?.(beacon);
      beacon.destroy?.();
    }
    this.shaftBeacons.clear();
    for (const object of this.fxObjects) object.destroy?.();
    this.fxObjects.clear();
  }
}

export default HeavenblocksPresentationSystem;
