import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createHardcoreRecapAction } from "./hardcoreRecapAction.js";

export class HardcoreDeathRecapView {
  constructor(scene, parent, config = HARDCORE_MEMORIAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.mode = null;
    this.pageIndex = 0;
    this.pages = [];
    this.ready = false;
    this.onRetry = null;
    this.onReturn = null;
    this.onClose = null;
    this.root = null;
    this.buttons = [];
    this._create(parent);
  }

  _create(parent) {
    const layout = this.config.recap;
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
    const retryAction = createHardcoreRecapAction({
      scene: this.scene,
      config: this.config,
      x: -layout.actionOffsetX,
      y: layout.actionY,
      label: this.config.copy.retryLabel,
      color: UI_COLORS.success,
      activate: () => this._activate(
        this.mode === "memorial" ? this.onClose : this.onRetry,
      ),
    });
    const menuAction = createHardcoreRecapAction({
      scene: this.scene,
      config: this.config,
      x: layout.actionOffsetX,
      y: layout.actionY,
      label: this.config.copy.menuLabel,
      color: UI_COLORS.title,
      activate: () => this._activate(this.onReturn),
    });
    this.buttons.push(retryAction, menuAction);
    this.retryButton = retryAction.root;
    this.menuButton = menuAction.root;
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

  show({ reason, depth, pages, onRetry, onReturn, presentation = {} }) {
    const layout = this.config.recap;
    this.mode = "death";
    this.pages = Array.isArray(pages) && pages.length > 0
      ? pages
      : [{ title: this.config.copy.overviewTitle, body: "" }];
    this.pageIndex = 0;
    this.ready = false;
    this.onRetry = typeof onRetry === "function" ? onRetry : null;
    this.onReturn = typeof onReturn === "function" ? onReturn : null;
    this.onClose = null;
    this.presentation = presentation;
    this.retryButton
      .setPosition(-layout.actionOffsetX, layout.actionY)
      .setVisible(false);
    this.retryButton.actionLabel.setText(
      presentation.primaryLabel || this.config.copy.retryLabel,
    );
    this.menuButton
      .setPosition(layout.actionOffsetX, layout.actionY)
      .setVisible(false);
    this.menuButton.actionLabel.setText(
      presentation.secondaryLabel || this.config.copy.menuLabel,
    );
    this.title.setText(presentation.title || this.config.copy.deathTitle);
    this.subtitle.setText(
      `${presentation.subtitlePrefix || this.config.copy.deathSubtitlePrefix}  •  `
        + `${this.config.copy.depthLabel} ${Math.max(
          0,
          Math.floor(depth || 0),
        )}${this.config.copy.meterUpperSuffix}`,
    );
    this.reason.setText(reason || this.config.copy.unknownDeathReason);
    this.status
      .setText(presentation.busyStatus || this.config.copy.erasingLabel)
      .setColor(UI_COLORS.gold);
    this.detail.setText("");
    this.footer.setText(presentation.busyFooter || this.config.copy.busyFooter);
    this.buttons.forEach(button => button.root.setVisible(false));
    this.root.setVisible(true);
    this._renderPage();
  }

  showMemorial({ reason, depth, slotId, pages, onClose }) {
    const layout = this.config.recap;
    this.mode = "memorial";
    this.pages = Array.isArray(pages) && pages.length > 0
      ? pages
      : [{ title: this.config.copy.overviewTitle, body: "" }];
    this.pageIndex = 0;
    this.ready = true;
    this.onRetry = null;
    this.onReturn = null;
    this.onClose = typeof onClose === "function" ? onClose : null;
    this.title.setText(this.config.copy.memorialTitle);
    this.subtitle.setText(
      `${this.config.copy.memorialSubtitlePrefix}  •  `
        + `${this.config.copy.slotPrefix} ${Math.max(1, Math.floor(slotId || 1))}`
        + `  •  ${this.config.copy.depthLabel} ${Math.max(
          0,
          Math.floor(depth || 0),
        )}${this.config.copy.meterUpperSuffix}`,
    );
    this.reason.setText(reason || this.config.copy.unknownDeathReason);
    this.status
      .setText(this.config.copy.memorialStatus)
      .setColor(UI_COLORS.gold);
    this.detail.setText(
      `${this.config.copy.slotPrefix} ${Math.max(1, Math.floor(slotId || 1))}`
        + `  •  ${this.config.copy.memorialDetailSuffix}`,
    );
    this.footer.setText(this.config.copy.memorialFooter);
    this.retryButton
      .setPosition(0, layout.actionY)
      .setVisible(true);
    this.retryButton.actionLabel.setText(this.config.copy.memorialCloseLabel);
    this.menuButton.setVisible(false);
    this.root.setVisible(true);
    this._renderPage();
  }

  setSaving(presentation = null) {
    if (this.mode !== "death") return;
    if (presentation) this.presentation = presentation;
    const copy = this.presentation || {};
    this.ready = false;
    this.status
      .setText(copy.busyStatus || this.config.copy.erasingLabel)
      .setColor(UI_COLORS.gold);
    this.detail.setText("");
    this.footer.setText(copy.busyFooter || this.config.copy.busyFooter);
    this.buttons.forEach(button => button.root.setVisible(false));
  }

  setError(message = "LIFE STATE NOT SAVED") {
    if (this.mode !== "death") return;
    this.ready = true;
    this.status
      .setText("LIFE STATE SAVE FAILED")
      .setColor(UI_COLORS.danger);
    this.detail.setText(String(message));
    this.footer.setText("ENTER OR CLICK RETRY SAVE  •  LEAVING REMAINS LOCKED");
    this.retryButton.actionLabel.setText("RETRY SAVE");
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(false);
  }

  setReady(detail = "", presentation = null) {
    if (this.mode !== "death") return;
    if (presentation) this.presentation = presentation;
    const copy = this.presentation || {};
    this.ready = true;
    this.status
      .setText(copy.readyStatus || this.config.copy.readyLabel)
      .setColor(copy.readyColor || UI_COLORS.success);
    this.detail.setText(detail || copy.readyDetail || "");
    this.footer.setText(copy.readyFooter || this.config.copy.readyFooter);
    this.retryButton.actionLabel.setText(
      copy.primaryLabel || this.config.copy.retryLabel,
    );
    this.menuButton.actionLabel.setText(
      copy.secondaryLabel || this.config.copy.menuLabel,
    );
    this.buttons.forEach(button => button.root.setVisible(true));
  }

  handleKey(event) {
    const key = String(event?.key || "");
    if (key === "ArrowLeft") return this._changePage(-1);
    if (key === "ArrowRight") return this._changePage(1);
    if (!this.ready) return false;
    if (this.mode === "memorial") {
      if (key === "Enter" || key === "Escape") return this.requestClose();
      return false;
    }
    if (key === "Enter" || key === " ") return this._activate(this.onRetry);
    if (key === "Escape") return this._activate(this.onReturn);
    return false;
  }

  requestClose() {
    if (this.mode !== "memorial") return false;
    return this._activate(this.onClose);
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
    this.mode = null;
    this.pages = [];
    this.pageIndex = 0;
    this.ready = false;
    this.onRetry = null;
    this.onReturn = null;
    this.onClose = null;
  }

  destroy() {
    this.buttons.forEach(button => button.destroy?.());
    this.buttons = [];
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
