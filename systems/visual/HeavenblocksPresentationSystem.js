import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class HeavenblocksPresentationSystem {
  constructor(scene, worldModel, config = HEAVENBLOCKS_ACCESS_CONFIG) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.fxObjects = new Set();
    this._lastGateSignature = "";
  }

  create() {
    const depth = this.config.presentation.depth;
    this.altarGraphics = this.scene.add.graphics().setDepth(depth);
    this.promptText = this.scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      stroke: "#07111b",
      strokeThickness: 5,
    }).setOrigin(0.5, 1).setDepth(depth + 0.2).setVisible(false);
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
    if (!this.altarGraphics) return;
    const signature = JSON.stringify(progressionSystem?.getSaveData?.() || {});
    if (!force && signature === this._lastGateSignature) return;
    this._lastGateSignature = signature;
    this.altarGraphics.clear();

    for (const gate of this.config.surfaceGates) {
      const unlocked = progressionSystem.isRegionUnlocked(gate.regionId);
      const point = this.worldModel.tileToWorld(gate.tx, gate.ty);
      this.altarGraphics.lineStyle(3, gate.color, unlocked ? 0.95 : 0.28);
      this.altarGraphics.strokeCircle(point.x, point.y, this.config.presentation.altarRadiusPx);
      this.altarGraphics.fillStyle(gate.color, unlocked ? 0.2 : 0.06);
      this.altarGraphics.fillCircle(point.x, point.y, this.config.presentation.altarRadiusPx - 6);
    }
    for (const region of this.config.regions) {
      if (!progressionSystem.isRegionUnlocked(region.id)) continue;
      for (const anchor of [region.returnAltar, region.rewardShrine]) {
        const point = this.worldModel.tileToWorld(anchor.tx, anchor.ty);
        this.altarGraphics.lineStyle(2, region.color, 0.78);
        this.altarGraphics.strokeCircle(point.x, point.y, 22);
      }
    }
  }

  playTransit(point, color, firstUnlock, delay) {
    if (!point || !this.scene.add) return;
    const ring = this.scene.add.circle(point.x, point.y, 26, color, 0.12)
      .setStrokeStyle(4, color, 0.9)
      .setDepth(this.config.presentation.depth + 0.3);
    this.fxObjects.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: firstUnlock ? 4.2 : 2.4,
      alpha: 0,
      duration: delay,
      ease: "Cubic.easeOut",
      onComplete: () => this._destroyFx(ring),
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
    const point = this.worldModel.tileToWorld(region.rewardShrine.tx, region.rewardShrine.ty);
    if (!this.scene.textures?.exists?.(region.componentAssetKey)) return;
    const icon = this.scene.add.image(point.x, point.y - 8, region.componentAssetKey)
      .setDepth(this.config.presentation.depth + 0.6)
      .setScale(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.fxObjects.add(icon);
    this.scene.tweens.add({
      targets: icon,
      y: point.y - 150,
      scale: 1.1,
      angle: 18,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: "Cubic.easeOut",
      onComplete: () => this._destroyFx(icon),
    });
  }

  playVault(region, keystoneGranted) {
    const point = this.worldModel.tileToWorld(region.rewardShrine.tx, region.rewardShrine.ty);
    this.playTransit(point, keystoneGranted ? 0xffffff : region.color, true, 1200);
  }

  getHealthSnapshot() {
    return {
      promptReady: Boolean(this.promptText),
      altarGraphicsReady: Boolean(this.altarGraphics),
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
    this.altarGraphics?.destroy();
    this.promptText = null;
    this.altarGraphics = null;
    for (const object of this.fxObjects) object.destroy?.();
    this.fxObjects.clear();
  }
}

export default HeavenblocksPresentationSystem;
