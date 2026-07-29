import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class HardcoreDeathRecapView {
  constructor(scene, parent, config = HARDCORE_MEMORIAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.pageIndex = 0;
    this.pages = [];
    this.ready = false;
    this.onRetry = null;
    this.onReturn = null;
    this.root = null;
    this.buttons = [];
    this._create(parent);
  }

  _create(parent) {
    const layout = this.config.recap;
    const buttonKey = ASSET_KEYS.ui.hardcore.deathActionButton;
    if (!this.scene.textures.exists(buttonKey)) {
      throw new Error(
        "[HardcoreDeathRecapView] Approved Hardcore action art is missing.",
      );
    }
    this.root = this.scene.add.container(0, 0).setVisible(false);
    this.title = this._text(0, layout.titleY, layout.font.titlePx, {
      family: UI_FONTS.display,
      color: UI_COLORS.title,
      bold: true,
      stroke: 5,
    });
    this.subtitle = this._text(0, layout.subtitleY, layout.font.subtitlePx, {
      family: UI_FONTS.mono,
      color: UI_COLORS.danger,
      bold: true,
    });
    this.reason = this._text(0, layout.reasonY, layout.font.reasonPx, {
      family: UI_FONTS.body,
      color: UI_COLORS.body,
      width: layout.pageBodyWidth,
    });
    this.pageTitle = this._text(0, layout.pageTitleY, layout.font.pageTitlePx, {
      family: UI_FONTS.display,
      color: UI_COLORS.gold,
      bold: true,
    });
    this.pageBody = this._text(0, layout.pageBodyY, layout.font.pageBodyPx, {
      family: UI_FONTS.mono,
      color: UI_COLORS.body,
      width: layout.pageBodyWidth,
      originY: 0,
      lineSpacing: 4,
    });
    this.pageIndicator = this._text(
      0,
      layout.pageIndicatorY,
      layout.font.pageIndicatorPx,
      { family: UI_FONTS.mono, color: UI_COLORS.dim, bold: true },
    );
    this.status = this._text(0, layout.statusY, layout.font.statusPx, {
      family: UI_FONTS.mono,
      color: UI_COLORS.gold,
      bold: true,
    });
    this.detail = this._text(0, layout.detailY, layout.font.detailPx, {
      family: UI_FONTS.mono,
      color: UI_COLORS.danger,
      bold: true,
    });
    this.retryButton = this._button(
      -layout.actionOffsetX,
      layout.actionY,
      this.config.copy.retryLabel,
      UI_COLORS.success,
      () => this._activate(this.onRetry),
    );
    this.menuButton = this._button(
      layout.actionOffsetX,
      layout.actionY,
      this.config.copy.menuLabel,
      UI_COLORS.title,
      () => this._activate(this.onReturn),
    );
    this.footer = this._text(0, layout.footerY, layout.font.footerPx, {
      family: UI_FONTS.mono,
      color: UI_COLORS.dim,
    });
    this.root.add([
      this.title,
      this.subtitle,
      this.reason,
      this.pageTitle,
      this.pageBody,
      this.pageIndicator,
      this.status,
      this.detail,
      this.retryButton,
      this.menuButton,
      this.footer,
    ]);
    parent.add(this.root);
  }

  _text(x, y, size, options = {}) {
    return this.scene.add.text(x, y, "", {
      fontFamily: options.family || UI_FONTS.body,
      fontSize: `${size}px`,
      fontStyle: options.bold ? "bold" : "normal",
      color: options.color || UI_COLORS.body,
      stroke: options.stroke ? "#080204" : undefined,
      strokeThickness: options.stroke || 0,
      align: "center",
      lineSpacing: options.lineSpacing || 0,
      wordWrap: options.width
        ? { width: options.width, useAdvancedWrap: true }
        : undefined,
    }).setOrigin(0.5, options.originY ?? 0.5);
  }

  _button(x, y, label, color, activate) {
    const layout = this.config.recap;
    const root = this.scene.add.container(x, y).setVisible(false);
    const image = this.scene.add.image(
      0,
      0,
      ASSET_KEYS.ui.hardcore.deathActionButton,
    )
      .setDisplaySize(layout.actionWidth, layout.actionHeight)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: UI_FONTS.display,
      fontSize: `${layout.font.actionPx}px`,
      fontStyle: "bold",
      color,
      stroke: "#080204",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5);
    root.add([image, text]);
    image.on("pointerover", () => {
      this.scene.tweens.add({
        targets: root,
        scale: layout.actionHoverScale,
        duration: layout.actionTweenMs,
        ease: "Power2.out",
      });
    });
    image.on("pointerout", () => {
      this.scene.tweens.add({
        targets: root,
        scale: 1,
        duration: layout.actionTweenMs,
        ease: "Power2.out",
      });
    });
    image.on("pointerdown", () => {
      this.scene.tweens.add({
        targets: root,
        scale: layout.actionPressScale,
        duration: layout.actionTweenMs,
        yoyo: true,
        ease: "Power2.out",
      });
    });
    image.on("pointerup", activate);
    this.buttons.push({ root, image });
    return root;
  }

  show({ reason, depth, pages, onRetry, onReturn }) {
    this.pages = Array.isArray(pages) && pages.length > 0
      ? pages
      : [{ title: this.config.copy.overviewTitle, body: "" }];
    this.pageIndex = 0;
    this.ready = false;
    this.onRetry = typeof onRetry === "function" ? onRetry : null;
    this.onReturn = typeof onReturn === "function" ? onReturn : null;
    this.title.setText(this.config.copy.deathTitle);
    this.subtitle.setText(
      `${this.config.copy.deathSubtitlePrefix}  •  `
        + `${this.config.copy.depthLabel} ${Math.max(
          0,
          Math.floor(depth || 0),
        )}${this.config.copy.meterUpperSuffix}`,
    );
    this.reason.setText(reason || this.config.copy.unknownDeathReason);
    this.status.setText(this.config.copy.erasingLabel).setColor(UI_COLORS.gold);
    this.detail.setText("");
    this.footer.setText(this.config.copy.busyFooter);
    this.buttons.forEach(button => button.root.setVisible(false));
    this.root.setVisible(true);
    this._renderPage();
  }

  setReady(detail = "") {
    this.ready = true;
    this.status.setText(this.config.copy.readyLabel).setColor(UI_COLORS.success);
    this.detail.setText(detail);
    this.footer.setText(this.config.copy.readyFooter);
    this.buttons.forEach(button => button.root.setVisible(true));
  }

  handleKey(event) {
    const key = String(event?.key || "");
    if (key === "ArrowLeft") return this._changePage(-1);
    if (key === "ArrowRight") return this._changePage(1);
    if (!this.ready) return false;
    if (key === "Enter" || key === " ") return this._activate(this.onRetry);
    if (key === "Escape") return this._activate(this.onReturn);
    return false;
  }

  _changePage(direction) {
    if (this.pages.length <= 1) return false;
    this.pageIndex = (
      this.pageIndex + direction + this.pages.length
    ) % this.pages.length;
    this._renderPage();
    this.scene.soundSystem?.playUiSelect?.();
    return true;
  }

  _renderPage() {
    const page = this.pages[this.pageIndex] || this.pages[0];
    this.pageTitle.setText(page?.title || "");
    this.pageBody.setText(page?.body || "");
    this.pageIndicator.setText(
      `${this.config.copy.pagePrefix} ${this.pageIndex + 1} `
        + `${this.config.copy.ofLabel} ${this.pages.length}`,
    );
  }

  _activate(callback) {
    if (!this.ready || typeof callback !== "function") return false;
    this.ready = false;
    this.buttons.forEach(button => button.root.setVisible(false));
    this.scene.soundSystem?.playUiConfirm?.();
    callback();
    return true;
  }

  hide() {
    this.root?.setVisible(false);
    this.pages = [];
    this.pageIndex = 0;
    this.ready = false;
    this.onRetry = null;
    this.onReturn = null;
  }

  destroy() {
    this.buttons.forEach(button => {
      button.image?.removeAllListeners?.();
      button.image?.disableInteractive?.();
    });
    this.buttons = [];
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
