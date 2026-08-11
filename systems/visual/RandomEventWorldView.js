import {
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
} from "../../values/randomWorldEvents.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";

function cropFor(type, config) {
  if (type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) return config.visuals.crops.choir;
  if (type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) return config.visuals.crops.blackout;
  return config.visuals.crops.rush;
}

export function getRandomEventRibbonGeometry(
  viewportWidth = APPROVED_HUD_SKIN.referenceViewport.width,
  viewportHeight = APPROVED_HUD_SKIN.referenceViewport.height,
  config = RANDOM_WORLD_EVENT_CONFIG,
) {
  const reference = APPROVED_HUD_SKIN.referenceViewport;
  const layout = APPROVED_HUD_SKIN.layout;
  const visuals = config.visuals;
  const scale = Math.min(
    viewportWidth / reference.width,
    viewportHeight / reference.height,
  );
  const safeGap = visuals.ribbonSafeGap * scale;
  const left = (layout.playerCore.x + layout.playerCore.width) * scale + safeGap;
  const right = viewportWidth
    - (layout.worldState.right + layout.worldState.width) * scale
    - safeGap;
  const width = Math.max(0, Math.min(visuals.ribbonWidth * scale, right - left));
  return Object.freeze({
    scale,
    left,
    right,
    x: (left + right) / 2,
    y: visuals.ribbonTop * scale,
    width,
    height: visuals.ribbonHeight * scale,
  });
}

export class RandomEventWorldView {
  constructor(scene, config = RANDOM_WORLD_EVENT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.activeId = null;
    this.nodeImages = [];
    this._createRibbon();
    this.prompt = scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: "13px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      backgroundColor: "#071321e8",
      padding: { x: 10, y: 6 },
      stroke: "#020711",
      strokeThickness: 3,
    }).setOrigin(0.5, 1)
      .setDepth(config.visuals.promptDepth)
      .setVisible(false);
  }

  _createRibbon() {
    const visuals = this.config.visuals;
    this.ribbon = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(visuals.ribbonDepth)
      .setVisible(false);
    this.ribbonFrame = this.scene.add.image(0, 0, visuals.ribbonKey)
      .setOrigin(0.5, 0)
      .setDisplaySize(visuals.ribbonWidth, visuals.ribbonHeight);
    this.ribbonIcon = this.scene.add.image(-visuals.ribbonWidth / 2 + 44, 41, visuals.sigilKey)
      .setDisplaySize(68, 58);
    this.ribbonTitle = this.scene.add.text(-visuals.ribbonWidth / 2 + 90, 24, "", {
      fontFamily: UI_FONTS.display,
      fontSize: "15px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      stroke: "#020711",
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    this.ribbonDetail = this.scene.add.text(-visuals.ribbonWidth / 2 + 90, 54, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: "12px",
      color: "#8defff",
      stroke: "#020711",
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    this.ribbon.add([this.ribbonFrame, this.ribbonIcon, this.ribbonTitle, this.ribbonDetail]);
    this._layoutRibbon();
  }

  _layoutRibbon() {
    const geometry = getRandomEventRibbonGeometry(
      this.scene.scale?.width,
      this.scene.scale?.height,
      this.config,
    );
    const scale = geometry.scale;
    this.ribbon?.setPosition(geometry.x, geometry.y);
    this.ribbonFrame?.setDisplaySize(geometry.width, geometry.height);
    this.ribbonIcon?.setPosition(-geometry.width / 2 + 44 * scale, 41 * scale)
      .setDisplaySize(68 * scale, 58 * scale);
    this.ribbonTitle?.setPosition(-geometry.width / 2 + 90 * scale, 24 * scale)
      .setFontSize(Math.max(11, Math.round(15 * scale)));
    this.ribbonDetail?.setPosition(-geometry.width / 2 + 90 * scale, 54 * scale)
      .setFontSize(Math.max(10, Math.round(12 * scale)));
  }

  sync(active, nowMs, communication = {}) {
    if (!active || active.suspended) {
      this._hideActive();
      return;
    }
    const signature = `${active.id}|${active.anchors?.length || 0}`;
    if (signature !== this.activeId) this._build(active, signature);
    this.ribbon.setVisible(true);
    this.ribbonTitle.setText(communication.title || "RANDOM EVENT");
    this.ribbonDetail.setText(communication.detail || "");
    this._syncNodes(active, nowMs);
  }

  _build(active, signature) {
    this.nodeImages.forEach(image => image.destroy());
    this.nodeImages = [];
    this.activeId = signature;
    const points = active.anchors;
    const crop = cropFor(active.type, this.config);
    const size = this.config.visuals.nodeDisplaySize;
    for (let index = 0; index < (points?.length || 0); index += 1) {
      const point = points[index];
      const world = this.scene.worldModel.tileToWorld(point.tx, point.ty);
      const image = this.scene.add.image(world.x, world.y, this.config.visuals.sigilKey)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDisplaySize(size, size * 0.76)
        .setDepth(this.config.visuals.renderDepth)
        .setBlendMode(Phaser.BlendModes.ADD);
      image._eventNodeIndex = index;
      image._eventBaseWidth = size;
      image._eventBaseHeight = size * 0.76;
      this.nodeImages.push(image);
    }
    const ribbonCrop = cropFor(active.type, this.config);
    this.ribbonIcon.setCrop(
      ribbonCrop.x,
      ribbonCrop.y,
      ribbonCrop.width,
      ribbonCrop.height,
    );
  }

  _syncNodes(active, nowMs) {
    const pulse = 0.5 + Math.sin((Number(nowMs) || 0) * 0.006) * 0.5;
    const choirCurrent = active.sequence?.[active.progress] ?? -1;
    this.nodeImages.forEach((image, index) => {
      let alpha = 0.48;
      let scale = 1;
      if (active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) {
        alpha = index === choirCurrent ? 0.75 + pulse * 0.25 : 0.42;
        scale = index === choirCurrent ? 1 + pulse * 0.16 : 0.92;
      } else if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) {
        alpha = 0.72 + pulse * 0.28;
        scale = 1 + pulse * 0.08;
      }
      image.setVisible(true).setAlpha(alpha).setDisplaySize(
        image._eventBaseWidth * scale,
        image._eventBaseHeight * scale,
      );
    });
  }

  showPrompt(point, text) {
    if (!point || !text) {
      this.prompt.setVisible(false);
      return;
    }
    const world = this.scene.worldModel.tileToWorld(point.tx, point.ty);
    this.prompt.setPosition(world.x, world.y - 38).setText(text).setVisible(true);
  }

  hidePrompt() { this.prompt.setVisible(false); }

  _hideActive() {
    this.ribbon?.setVisible(false);
    this.prompt?.setVisible(false);
    this.nodeImages.forEach(image => image.setVisible(false));
  }

  clear() {
    this.nodeImages.forEach(image => image.destroy());
    this.nodeImages = [];
    this.activeId = null;
    this.ribbon?.setVisible(false);
    this.prompt?.setVisible(false);
  }

  resize() {
    this._layoutRibbon();
  }

  destroy() {
    this.clear();
    this.ribbon?.destroy(true);
    this.prompt?.destroy();
    this.ribbon = null;
    this.prompt = null;
    this.scene = null;
  }
}
