import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { getResourceDisplayName } from "../../values/resourceTypes.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { getStarIdentity } from "../../values/starIdentityLibraryMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  installStarIdentityTextureFrames,
} from "./installStarIdentityTextureFrames.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function setFillFraction(image, fraction) {
  if (!image) return;
  const width = Math.max(1, image.width || image.texture?.source?.[0]?.width || 1);
  const height = Math.max(1, image.height || image.texture?.source?.[0]?.height || 1);
  image.setCrop?.(0, 0, Math.max(1, width * clamp01(fraction)), height);
}

export class StarDiscoveryPopupView {
  constructor(scene, config = STAR_RARITY_PROGRESSION_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.active = false;
    this.priority = -1;
    this.rarityIndex = 0;
    this._objects = new Set();
    this._onComplete = null;
  }

  static isSupported(scene) {
    return typeof scene?.add?.container === "function"
      && typeof scene?.add?.image === "function"
      && typeof scene?.add?.text === "function"
      && typeof scene?.tweens?.add === "function";
  }

  play({ rarity = 0, progress, onComplete = null } = {}) {
    if (!StarDiscoveryPopupView.isSupported(this.scene) || !progress) return false;
    const popup = this.config.popup;
    const tier = getStarRarityTier(rarity, this.config);
    const plateAsset = popup.plateAssets[tier.index];
    const fillAsset = popup.fillAssets[tier.index];
    if (
      !plateAsset?.key
      || !fillAsset?.key
      || (this.scene.textures?.exists && (
        !this.scene.textures.exists(plateAsset.key)
        || !this.scene.textures.exists(fillAsset.key)
      ))
    ) {
      return false;
    }

    this.active = true;
    this.rarityIndex = tier.index;
    this.priority = tier.index
      + (progress.levelsGained > 0 ? popup.priorityLevelUpBonus : 0);
    this._onComplete = onComplete;

    const width = this.scene.scale?.width || this.scene.config?.viewportWidth || 1280;
    const container = this.scene.add.container(
      width / 2,
      popup.topYPx + popup.enterOffsetYPx,
    );
    container
      .setDepth?.(HUD_LAYOUT.hudDepth + popup.depthOffset)
      .setScrollFactor?.(0)
      .setAlpha?.(0)
      .setScale?.(tier.wow ? popup.wowStartScale : popup.startScale);
    this.container = container;
    this._objects.add(container);

    const identity = getStarIdentity(progress.identityIndex);
    const identityAtlas = STAR_IDENTITY_LIBRARY_CONFIG.atlases[
      identity.rarityIndex
    ];
    const identityLightAtlas = STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[
      identity.rarityIndex
    ];
    const framesReady = identity.rarityIndex === tier.index
      && installStarIdentityTextureFrames(this.scene);
    const identityReady = framesReady
      && this.scene.textures?.exists?.(identityAtlas?.key);
    const identityLightReady = framesReady
      && this.scene.textures?.exists?.(identityLightAtlas?.key);
    const rarityPulseAsset = LIGHT_CONFIG.skyTileLights?.beaconPulse?.visuals
      ?.rarityAssets?.[tier.index];
    const pulseSize = popup.starPulseSizePx
      + tier.index * popup.starPulseRarityBonusPx;
    if (identityLightReady) {
      this._addPulseImage(
        container,
        identityLightAtlas.key,
        identity.lightFrameName,
        pulseSize * STAR_IDENTITY_LIBRARY_CONFIG.visual.popupLightScale,
        STAR_IDENTITY_LIBRARY_CONFIG.visual.popupLightAlpha,
        popup,
      );
    }
    if (identityReady) {
      this._addPulseImage(
        container,
        identityAtlas.key,
        identity.frameName,
        pulseSize * STAR_IDENTITY_LIBRARY_CONFIG.visual.popupArtScale,
        STAR_IDENTITY_LIBRARY_CONFIG.visual.popupArtAlpha,
        popup,
      );
    } else if (rarityPulseAsset?.key) {
      this._addPulseImage(
        container,
        rarityPulseAsset.key,
        undefined,
        pulseSize,
        popup.starPulseAlpha,
        popup,
      );
    }

    const plate = this.scene.add.image(0, 0, plateAsset.key)
      .setDisplaySize(popup.widthPx, popup.heightPx);
    container.add(plate);
    this._objects.add(plate);

    const fill = this.scene.add.image(
      -popup.fillWidthPx / 2,
      popup.fillOffsetYPx,
      fillAsset.key,
    ).setOrigin(0, 0.5)
      .setDisplaySize(popup.fillWidthPx, popup.fillHeightPx);
    container.add(fill);
    this._objects.add(fill);

    const beforeFraction = progress.levelBefore === progress.level
      ? progress.levelProgressBefore
      : 0;
    const afterFraction = progress.mastered ? 1 : progress.levelProgress;
    const fillState = { value: beforeFraction };
    setFillFraction(fill, fillState.value);
    this.scene.tweens.add({
      targets: fillState,
      value: afterFraction,
      delay: popup.enterMs,
      duration: popup.fillTweenMs,
      ease: "Cubic.Out",
      onUpdate: () => setFillFraction(fill, fillState.value),
    });

    this._addText(
      container,
      popup.titleOffsetYPx,
      tier.encounterCopy,
      popup.titleFontSizePx,
      tier.palette.text,
      UI_FONTS.display,
    );
    const constellationName = String(
      progress.constellationName || getResourceDisplayName(progress.resourceType),
    ).toUpperCase();
    const identityLine = identityReady
      ? `${identity.name.toUpperCase()}  •  ${constellationName}`
      : constellationName;
    this._addText(
      container,
      popup.signOffsetYPx,
      identityLine,
      popup.signFontSizePx,
      identityReady ? identity.secondary : tier.palette.secondary,
      UI_FONTS.display,
    );
    const materialRewardCopy = progress.rewardSource === "bonus"
      ? popup.copy.bonusReward
      : `${Math.max(
          1,
          Number(progress.materialMultiplier) || tier.multiplier,
        )}x ${popup.copy.materialReward}`;
    this._addText(
      container,
      popup.rewardOffsetYPx,
      `+${progress.xpGained} ${popup.copy.signXp}`
        + `  •  ${materialRewardCopy}`,
      popup.rewardFontSizePx,
      tier.palette.highlight,
      UI_FONTS.mono,
    );
    const levelCopy = progress.mastered
      ? `${popup.copy.signLevel} ${progress.maxLevel}  •  ${popup.copy.mastered}`
      : `${popup.copy.signLevel} ${progress.level}`
        + `  •  ${progress.levelXp}/${progress.levelXpRequired}`
        + ` ${popup.copy.toLevel} ${progress.level + 1}`;
    this._addText(
      container,
      popup.levelOffsetYPx,
      levelCopy,
      popup.levelFontSizePx,
      tier.palette.text,
      UI_FONTS.mono,
    );

    this.scene.tweens.add({
      targets: container,
      y: popup.topYPx,
      alpha: 1,
      scaleX: popup.settleScale,
      scaleY: popup.settleScale,
      duration: popup.enterMs,
      ease: tier.wow ? "Back.Out" : "Cubic.Out",
    });
    this.scene.tweens.add({
      targets: container,
      y: popup.topYPx + popup.exitOffsetYPx,
      alpha: 0,
      delay: popup.enterMs + popup.holdMsByRarity[tier.index],
      duration: popup.exitMs,
      ease: "Cubic.In",
      onComplete: () => this._complete(),
    });
    return true;
  }

  _addPulseImage(container, key, frame, size, alpha, popup) {
    if (
      !key
      || (this.scene.textures?.exists && !this.scene.textures.exists(key))
    ) return null;
    const pulse = this.scene.add.image(0, 0, key, frame)
      .setDisplaySize(size, size)
      .setAlpha(alpha);
    const additiveBlendMode = globalThis.Phaser?.BlendModes?.ADD;
    if (additiveBlendMode !== undefined) {
      pulse.setBlendMode?.(additiveBlendMode);
    }
    container.add(pulse);
    this._objects.add(pulse);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: pulse.scaleX * popup.pulseEndScale,
      scaleY: pulse.scaleY * popup.pulseEndScale,
      duration: popup.pulseMs,
      ease: "Sine.Out",
    });
    return pulse;
  }

  _addText(container, y, value, fontSize, color, fontFamily) {
    const text = this.scene.add.text(0, y, value, {
      fontFamily,
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color,
      align: "center",
      stroke: this.config.popup.textStroke,
      strokeThickness: this.config.popup.textStrokeThicknessPx,
    }).setOrigin(0.5);
    container.add(text);
    this._objects.add(text);
    return text;
  }

  _complete() {
    if (!this.active) return;
    const onComplete = this._onComplete;
    this.destroy();
    onComplete?.();
  }

  destroy() {
    if (!this.active && this._objects.size === 0) return;
    this.active = false;
    for (const object of this._objects) {
      this.scene.tweens?.killTweensOf?.(object);
    }
    this.container?.destroy?.(true);
    this._objects.clear();
    this.container = null;
  }
}
