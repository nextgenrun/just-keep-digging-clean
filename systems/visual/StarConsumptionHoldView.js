import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STAR_SANCTUARY_COPY } from "../../values/playerFacingCopy.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class StarConsumptionHoldView {
  constructor(scene, config = STAR_SANCTUARY_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.frame = null;
    this.fill = null;
    this.title = null;
    this.status = null;
    this.consequence = null;
    this.progress = 0;
    this.artReady = false;
    this._resizeHandler = () => this.layout();
    this._create();
  }

  _create() {
    const ui = this.config.consumption.holdUi;
    if (!this.scene.textures?.exists?.(ui.holdFrameKey)) return;
    this.artReady = true;
    this.root = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(ui.depth)
      .setVisible(false);
    this.frame = this.scene.add.image(0, 0, ui.holdFrameKey);
    this.fill = this.scene.add.rectangle(
      0,
      0,
      1,
      1,
      ui.fillColor,
      ui.fillAlpha,
    ).setOrigin(0, 0.5);
    this.title = this._addText(ui.titleY, STAR_SANCTUARY_COPY.hold.title, ui.titleFontPx, ui.titleColor);
    this.status = this._addText(ui.statusY, "", ui.statusFontPx, ui.statusColor);
    this.consequence = this._addText(
      ui.consequenceY,
      STAR_SANCTUARY_COPY.hold.consequence,
      ui.consequenceFontPx,
      ui.consequenceColor,
    );
    this.root.add([
      this.fill,
      this.frame,
      this.title,
      this.status,
      this.consequence,
    ]);
    this.scene.scale?.on?.("resize", this._resizeHandler);
    this.layout();
  }

  _addText(y, copy, fontSize, color) {
    const ui = this.config.consumption.holdUi;
    return this.scene.add.text(0, y, copy, {
      fontFamily: UI_FONTS.display,
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color,
      stroke: ui.strokeColor,
      strokeThickness: ui.strokeThickness,
      align: "center",
    }).setOrigin(0.5);
  }

  update(pendingConsumption) {
    const visible = pendingConsumption?.phase === "holding";
    if (!this.root || !visible) {
      this.progress = 0;
      this.root?.setVisible(false);
      return;
    }
    this.progress = clamp01(pendingConsumption.progress);
    const percent = Math.round(this.progress * 100);
    const copy = STAR_SANCTUARY_COPY.hold.status
      .replace("{percent}", String(percent));
    this.status.setText(copy);
    this.root.setVisible(true);
    this.layout();
  }

  layout() {
    if (!this.root) return;
    const ui = this.config.consumption.holdUi;
    const width = this.scene.cameras?.main?.width || this.scene.scale.width;
    const height = this.scene.cameras?.main?.height || this.scene.scale.height;
    const desired = Math.max(ui.minimumWidthPx, width * ui.widthRatio);
    const frameWidth = Math.min(
      ui.maximumWidthPx,
      width * ui.viewportMaximumRatio,
      desired,
    );
    const frameHeight = frameWidth / ui.frameAspectRatio;
    const fillMaximumWidth = frameWidth * ui.fillWidthRatio;
    this.root.setPosition(width / 2, height * ui.yRatio);
    this.frame.setDisplaySize(frameWidth, frameHeight);
    this.fill
      .setPosition(-fillMaximumWidth / 2, 0)
      .setDisplaySize(Math.max(1, fillMaximumWidth * this.progress), frameHeight * ui.fillHeightRatio)
      .setVisible(this.progress > 0);
  }

  getSnapshot() {
    return {
      artReady: this.artReady,
      visible: this.root?.visible === true,
      progress: this.progress,
    };
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
