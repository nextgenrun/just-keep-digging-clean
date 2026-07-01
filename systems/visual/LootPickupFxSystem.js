import { ASSET_KEYS } from "../../values/assetKeys.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";

const RESOURCE_COLORS = Object.freeze({
  dirt: 0xc2905f,
  stone: 0xb9c2c9,
  copper: 0xd37b3b,
  darkDirtNormal: 0x6f472d,
  darkDirtStrong: 0x4d2f1d,
  steel: 0x9fb5c4,
  iron: 0xc6c6c6,
  bronze: 0xcd7f32,
  silver: 0xd8dde8,
  gold: 0xffd34d,
});

const RESOURCE_ORE_COLORS = Object.freeze({
  dirt: 0x6a3e24,
  stone: 0xd5dbdf,
  copper: 0xf28a32,
  darkDirtNormal: 0x2a1b14,
  darkDirtStrong: 0x160f0b,
  steel: 0xa8c2d2,
  iron: 0xb8a185,
  bronze: 0xcf7e32,
  silver: 0xd9e2ed,
  gold: 0xffb51e,
});

function isLootVisualsEnabled(scene) {
  const config = scene?.config || GAME_CONFIG;
  if (config.lootVisuals === false) return false;
  if (config.featureFlags?.lootVisuals === false) return false;
  if (config.featureFlags?.["loot-visuals"] === false) return false;
  return true;
}

export class LootPickupFxSystem {
  constructor(scene, targetProvider = null) {
    this.scene = scene;
    this.targetProvider = targetProvider;
    this.activeSprites = [];
    this.maxActiveSprites = 24;
    this._destroyed = false;
  }

  showResourcePickup({ worldX, worldY, resourceType, amount = 1, isLuckyDrop = false, isSkyTileBonus = false } = {}) {
    if (this._destroyed || !isLootVisualsEnabled(this.scene)) return;
    if (!resourceType || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return;

    const pickupCount = this._getPickupCount(amount, isLuckyDrop, isSkyTileBonus);
    if (pickupCount <= 0) return;

    for (let i = 0; i < pickupCount; i += 1) {
      if (this.activeSprites.length >= this.maxActiveSprites) {
        this._removeSprite(this.activeSprites[0]);
      }
      this._spawnPickup(worldX, worldY, resourceType, i, pickupCount, isLuckyDrop, isSkyTileBonus);
    }
  }

  _getPickupCount(amount, isLuckyDrop = false, isSkyTileBonus = false) {
    const awardedAmount = Math.max(1, Math.round(Number.isFinite(amount) ? amount : 1));
    const cap = isSkyTileBonus ? 4 : 3;
    return Math.min(awardedAmount, cap);
  }

  _spawnPickup(worldX, worldY, resourceType, index, pickupCount, isLuckyDrop, isSkyTileBonus) {
    const start = this._worldToScreen(worldX, worldY);
    const target = this.targetProvider?.getLootPickupTarget?.(resourceType) || this._fallbackTarget();
    const textureKey = this._getTextureKey(resourceType);
    const startOffsetX = (Math.random() - 0.5) * 22 + (index - (pickupCount - 1) / 2) * 8;
    const startOffsetY = (Math.random() - 0.5) * 14;
    const sprite = this.scene.add.image(start.x + startOffsetX, start.y + startOffsetY, textureKey)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 60)
      .setAlpha(0)
      .setScale(0.4);

    const displaySize = isSkyTileBonus ? 21 : 20;
    sprite.setDisplaySize(displaySize, displaySize);
    if (isLuckyDrop) sprite.setTint(0xeaffb0);
    else if (isSkyTileBonus) sprite.setTint(0xc7fbff);

    this.activeSprites.push(sprite);

    const hoverY = sprite.y - 8 - Math.random() * 6;
    this.scene.tweens.add({
      targets: sprite,
      alpha: 1,
      scaleX: 1.15,
      scaleY: 1.15,
      y: hoverY,
      duration: 95,
      ease: "Back.out",
      onComplete: () => this._flyToTarget(sprite, target, resourceType, isLuckyDrop, isSkyTileBonus),
    });
  }

  _flyToTarget(sprite, target, resourceType, isLuckyDrop, isSkyTileBonus) {
    if (!sprite?.active) return;

    const startX = sprite.x;
    const startY = sprite.y;
    const curveLift = Math.min(120, Math.max(45, Math.abs(target.y - startY) * 0.25 + 35));
    const controlX = (startX + target.x) / 2 + (Math.random() - 0.5) * 80;
    const controlY = Math.min(startY, target.y) - curveLift;
    const duration = 420 + Math.random() * 100;
    const state = { t: 0 };

    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration,
      ease: "Cubic.easeInOut",
      onUpdate: () => {
        if (!sprite.active) return;
        const t = state.t;
        const inv = 1 - t;
        sprite.x = inv * inv * startX + 2 * inv * t * controlX + t * t * target.x;
        sprite.y = inv * inv * startY + 2 * inv * t * controlY + t * t * target.y;
        sprite.alpha = 1 - Math.max(0, t - 0.82) / 0.18;
        const scale = 1.05 - t * 0.38;
        sprite.setScale(scale);
        sprite.rotation += 0.045;
      },
      onComplete: () => {
        this._arrivalBurst(target.x, target.y, resourceType, isLuckyDrop, isSkyTileBonus);
        this.targetProvider?.pulseLootTarget?.(resourceType, isLuckyDrop || isSkyTileBonus);
        this._removeSprite(sprite);
      },
    });
  }

  _arrivalBurst(x, y, resourceType, isLuckyDrop, isSkyTileBonus) {
    const color = isLuckyDrop ? 0x9dff75 : isSkyTileBonus ? 0xa8f5ff : (RESOURCE_COLORS[resourceType] || 0xffffff);
    const count = isLuckyDrop || isSkyTileBonus ? 7 : 4;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const spark = this.scene.add.circle(x, y, 2, color, 0.9)
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudOverlayDepth + 58);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (12 + Math.random() * 10),
        y: y + Math.sin(angle) * (12 + Math.random() * 10),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 220,
        ease: "Power2.out",
        onComplete: () => spark.destroy(),
      });
    }
  }

  _worldToScreen(worldX, worldY) {
    const camera = this.scene.cameras?.main;
    if (!camera) return { x: worldX, y: worldY };
    return {
      x: (worldX - camera.scrollX) * camera.zoom + camera.x,
      y: (worldY - camera.scrollY) * camera.zoom + camera.y,
    };
  }

  _fallbackTarget() {
    const width = this.scene.scale?.width || 1280;
    const height = this.scene.scale?.height || 720;
    return { x: width - 42, y: height - 42 };
  }

  _getTextureKey(resourceType) {
    const key = ASSET_KEYS.ui.lootPickups?.[resourceType];
    if (key && this.scene.textures.exists(key)) return key;
    return this._ensureFallbackTexture(resourceType);
  }

  _ensureFallbackTexture(resourceType) {
    const key = `loot-pickup-fallback-${resourceType || "resource"}`;
    if (this.scene.textures.exists(key)) return key;

    const color = RESOURCE_COLORS[resourceType] || 0xffffff;
    const oreColor = RESOURCE_ORE_COLORS[resourceType] || 0xffd98f;
    const canvas = this.scene.textures.createCanvas(key, 32, 32);
    const ctx = canvas.getContext();
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(5, 7, 24, 22);

    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.beginPath();
    ctx.moveTo(4, 3);
    ctx.lineTo(27, 3);
    ctx.lineTo(30, 7);
    ctx.lineTo(30, 25);
    ctx.lineTo(26, 30);
    ctx.lineTo(7, 30);
    ctx.lineTo(3, 26);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `#${oreColor.toString(16).padStart(6, "0")}`;
    ctx.fillRect(6, 6, 8, 7);
    ctx.fillRect(19, 8, 6, 6);
    ctx.fillRect(12, 20, 8, 5);

    ctx.fillStyle = "rgba(255, 245, 210, 0.55)";
    ctx.fillRect(7, 7, 5, 3);
    ctx.fillRect(20, 9, 4, 2);
    ctx.fillRect(13, 21, 5, 2);

    ctx.strokeStyle = "rgba(245, 225, 180, 0.86)";
    ctx.lineWidth = 2;
    ctx.stroke();
    canvas.refresh();
    return key;
  }

  _removeSprite(sprite) {
    if (!sprite) return;
    this.scene.tweens.killTweensOf(sprite);
    const idx = this.activeSprites.indexOf(sprite);
    if (idx !== -1) this.activeSprites.splice(idx, 1);
    sprite.destroy();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    [...this.activeSprites].forEach(sprite => this._removeSprite(sprite));
    this.activeSprites = [];
  }
}
