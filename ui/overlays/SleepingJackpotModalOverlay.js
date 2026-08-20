import { RANDOM_WORLD_EVENT_CONFIG } from "../../values/randomWorldEvents.js";
import { getResourceDisplayName } from "../../values/resourceTypes.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createUiIcon } from "../UiIconAtlas.js";

const formatMoney = value => `${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString()} M`;
const formatOdds = basisPoints => `${(Math.max(0, basisPoints) / 100).toFixed(0)}% WIN CHANCE`;

function escrowLines(resources) {
  const entries = Object.entries(resources || {}).filter(([, amount]) => amount > 0);
  if (!entries.length) return "NO ELIGIBLE RESOURCE STACKS";
  const midpoint = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, midpoint), entries.slice(midpoint)];
  const rows = [];
  for (let index = 0; index < midpoint; index += 1) {
    rows.push(columns.map(column => {
      const entry = column[index];
      return entry
        ? `${getResourceDisplayName(entry[0]).toUpperCase()} ${entry[1].toLocaleString()}`.padEnd(25)
        : "";
    }).join(""));
  }
  return rows.join("\n");
}

export class SleepingJackpotModalOverlay {
  constructor(scene, config = RANDOM_WORLD_EVENT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.mode = null;
    this.selected = "immediate";
    this.buffer = "";
    this.busy = false;
    this.quote = null;
    this.onConfirm = null;
    this.onCancel = null;
    this.onResultClose = null;
    this._keyHandler = event => this._handleKey(event);
    this._create();
  }

  get isVisible() { return this.root?.visible === true; }

  _create() {
    const layout = this.config.visuals.modal;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    if (!this.scene.textures.exists(this.config.visuals.panelKey)) {
      throw new Error("[SleepingJackpotModalOverlay] Approved panel art is missing.");
    }
    this.root = this.scene.add.container(width / 2, height / 2)
      .setScrollFactor(0)
      .setDepth(layout.depth)
      .setVisible(false);
    this.shade = this.scene.add.rectangle(0, 0, width, height, 0x020814, 0.9).setInteractive();
    this.panel = this.scene.add.image(0, 0, this.config.visuals.panelKey)
      .setDisplaySize(layout.panelWidth, layout.panelHeight);
    this.title = this._text(0, layout.titleY, "", 32, UI_COLORS.title, UI_FONTS.display);
    this.subtitle = this._text(0, layout.subtitleY, "", 13, "#7eeeff", UI_FONTS.mono);
    this.title.setFontStyle("bold");
    this.subtitle.setFontStyle("bold");

    this.leftTitle = this._text(-layout.cardCenterX, layout.cardTitleY, "GAMBLE NOW", 22, UI_COLORS.gold, UI_FONTS.display);
    this.rightTitle = this._text(layout.cardCenterX, layout.cardTitleY, "LET IT MATURE", 22, UI_COLORS.gold, UI_FONTS.display);
    this.leftBody = this._text(-layout.cardCenterX, layout.cardBodyY, "", 15, UI_COLORS.body, UI_FONTS.mono, 390);
    this.rightBody = this._text(layout.cardCenterX, layout.cardBodyY, "", 13, UI_COLORS.body, UI_FONTS.mono, 405);
    this.leftBody.setOrigin(0.5, 0).setLineSpacing(7);
    this.rightBody.setOrigin(0.5, 0).setLineSpacing(4);
    this.leftFocus = this._text(-layout.cardCenterX, layout.cardFocusY, "", 17, "#78f5ff", UI_FONTS.mono);
    this.rightFocus = this._text(layout.cardCenterX, layout.cardFocusY, "", 17, "#78f5ff", UI_FONTS.mono);
    this.leftFocusIcon = createUiIcon(this.scene, "check", {
      x: -layout.cardCenterX - layout.cardFocusIconInsetX,
      y: layout.cardFocusY,
      size: 20,
      alpha: 0.94,
    });
    this.rightFocusIcon = createUiIcon(this.scene, "check", {
      x: layout.cardCenterX - layout.cardFocusIconInsetX,
      y: layout.cardFocusY,
      size: 20,
      alpha: 0.94,
    });
    this.instruction = this._text(0, layout.inputY - 16, "", 14, UI_COLORS.gold, UI_FONTS.mono);
    this.typed = this._text(0, layout.inputY + 18, "", 22, "#ff8f9d", UI_FONTS.mono);
    this.typed.setFontStyle("bold");
    this.footer = this._text(0, layout.footerY, "A/D OR ←/→ SELECT  •  ESC CANCEL", 11, UI_COLORS.hint, UI_FONTS.mono);

    this.resultTitle = this._text(0, layout.resultTitleY, "", 30, UI_COLORS.gold, UI_FONTS.display);
    this.resultBody = this._text(0, layout.resultBodyY, "", 16, UI_COLORS.body, UI_FONTS.mono, 820);
    this.resultBody.setOrigin(0.5, 0).setLineSpacing(8);
    this.resultFooter = this._text(0, layout.resultFooterY, "ENTER OR ESC  •  CLOSE", 12, UI_COLORS.hint, UI_FONTS.mono);

    this.leftHit = this.scene.add.zone(
      -layout.cardCenterX,
      layout.cardY,
      layout.cardWidth,
      layout.cardHeight,
    ).setInteractive({ useHandCursor: true }).on("pointerdown", () => this._select("immediate"));
    this.rightHit = this.scene.add.zone(
      layout.cardCenterX,
      layout.cardY,
      layout.cardWidth,
      layout.cardHeight,
    ).setInteractive({ useHandCursor: true }).on("pointerdown", () => this._select("maturity"));
    this.choiceObjects = [
      this.leftTitle, this.rightTitle, this.leftBody, this.rightBody,
      this.leftFocus, this.rightFocus, this.leftFocusIcon, this.rightFocusIcon,
      this.instruction, this.typed,
      this.leftHit, this.rightHit,
    ].filter(Boolean);
    this.resultObjects = [this.resultTitle, this.resultBody, this.resultFooter];
    this.root.add([
      this.shade, this.panel, this.title, this.subtitle,
      ...this.choiceObjects, this.footer, ...this.resultObjects,
    ]);
    this._showModeObjects(false);
    this.resize();
  }

  _text(x, y, value, size, color, family, wrapWidth = null) {
    return this.scene.add.text(x, y, value, {
      fontFamily: family,
      fontSize: `${size}px`,
      color,
      align: "center",
      stroke: "#030814",
      strokeThickness: 3,
      wordWrap: wrapWidth ? { width: wrapWidth, useAdvancedWrap: true } : undefined,
    }).setOrigin(0.5);
  }

  showChoice({ quote, onConfirm, onCancel }) {
    if (this.isVisible || !quote) return false;
    this.mode = "choice";
    this.quote = quote;
    this.selected = quote.immediate.enabled ? "immediate" : "maturity";
    this.buffer = "";
    this.busy = false;
    this.onConfirm = typeof onConfirm === "function" ? onConfirm : null;
    this.onCancel = typeof onCancel === "function" ? onCancel : null;
    this.onResultClose = null;
    this.title.setText(this.config.copy.sleepingTitle);
    this.subtitle.setText(this.config.copy.sleepingSubtitle);
    this.leftBody.setText([
      `YOU WILL GAMBLE ${formatMoney(quote.immediate.wager)}`,
      `YOU CAN GAIN +${formatMoney(quote.immediate.possibleGain)}`,
      `OR LOSE ${formatMoney(quote.immediate.wager)}`,
      "",
      formatOdds(quote.immediate.oddsBps),
      quote.immediate.enabled ? "" : quote.immediate.reason,
    ].filter(Boolean).join("\n"));
    this.rightBody.setText([
      `MATURITY: ${quote.maturity.targetDepth || "—"}M`,
      "STAKE: ALL YOUR RESOURCES",
      `WIN: ×${quote.maturity.multiplier} ALL RESOURCES`,
      "LOSE: ALL STAKED RESOURCES",
      formatOdds(quote.maturity.oddsBps),
      "THIS CAN EMPTY YOUR ENTIRE RESOURCE INVENTORY",
      "",
      escrowLines(quote.maturity.escrow),
      quote.maturity.enabled ? "" : quote.maturity.reason,
    ].filter(Boolean).join("\n"));
    this._showModeObjects(true);
    this._refreshChoice();
    this._open();
    return true;
  }

  showResult({ title, body, kind = "success", onClose = null }) {
    this.mode = "result";
    this.busy = false;
    this.onResultClose = typeof onClose === "function" ? onClose : null;
    this.title.setText("SLEEPING JACKPOT");
    this.subtitle.setText("FATE COMMITTED  •  RELOAD CANNOT REROLL IT");
    this.resultTitle.setText(title || "JACKPOT RESULT");
    this.resultTitle.setColor(kind === "danger" ? UI_COLORS.danger : UI_COLORS.gold);
    this.resultBody.setText(body || "");
    this._showModeObjects(false);
    if (!this.isVisible) this._open();
  }

  _showModeObjects(choiceVisible) {
    this.choiceObjects?.forEach(object => object.setVisible(choiceVisible));
    this.resultObjects?.forEach(object => object.setVisible(!choiceVisible));
    this.footer?.setVisible(choiceVisible);
  }

  _open() {
    this.root.setVisible(true).setAlpha(0);
    this.scene._randomEventModalVisible = true;
    this.scene.uiNotifications?.setPaused?.(true);
    this.scene.input.keyboard.on("keydown", this._keyHandler);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 170, ease: "Power2.out" });
  }

  _select(choice) {
    if (this.mode !== "choice" || this.busy) return;
    const selectedQuote = this.quote?.[choice];
    if (!selectedQuote?.enabled) {
      this.scene.soundSystem?.playUiSelect?.();
      return;
    }
    this.selected = choice;
    this.buffer = "";
    this._refreshChoice();
    this.scene.soundSystem?.playUiSelect?.();
  }

  _refreshChoice() {
    const phrase = this.selected === "immediate"
      ? this.config.sleepingJackpot.phrases.immediate
      : this.config.sleepingJackpot.phrases.maturity;
    this.leftFocus.setText(this.selected === "immediate" ? "SELECTED  •  TYPE TO CONFIRM" : "");
    this.rightFocus.setText(this.selected === "maturity" ? "SELECTED  •  TYPE TO CONFIRM" : "");
    this.leftFocusIcon?.setVisible(this.selected === "immediate");
    this.rightFocusIcon?.setVisible(this.selected === "maturity");
    this.leftTitle.setColor(this.selected === "immediate" ? "#78f5ff" : UI_COLORS.gold);
    this.rightTitle.setColor(this.selected === "maturity" ? "#78f5ff" : UI_COLORS.gold);
    this.instruction.setText(`TYPE ${phrase} THEN PRESS ENTER`);
    this.typed.setText(this.buffer.padEnd(phrase.length, "_").split("").join(" "));
    this.typed.setColor(this.buffer === phrase ? UI_COLORS.success : "#ff8f9d");
  }

  _handleKey(event) {
    if (!this.isVisible) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const key = String(event?.key || "");
    if (this.mode === "result") {
      if (key === "Enter" || key === "Escape") this.closeResult();
      return;
    }
    if (this.busy) return;
    if (key === "Escape") {
      const callback = this.onCancel;
      this._close();
      callback?.();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      this._select(key === "ArrowLeft" ? "immediate" : "maturity");
      return;
    }
    if (this.buffer.length === 0 && (key.toLowerCase() === "a" || key.toLowerCase() === "d")) {
      this._select(key.toLowerCase() === "a" ? "immediate" : "maturity");
      return;
    }
    if (key === "Backspace") {
      this.buffer = this.buffer.slice(0, -1);
      this._refreshChoice();
      return;
    }
    const phrase = this.selected === "immediate"
      ? this.config.sleepingJackpot.phrases.immediate
      : this.config.sleepingJackpot.phrases.maturity;
    if (key === "Enter") {
      if (this.buffer === phrase) this._commit();
      else this.scene.soundSystem?.playUiSelect?.();
      return;
    }
    if (/^[a-z0-9]$/i.test(key) && this.buffer.length < phrase.length) {
      this.buffer += key.toUpperCase();
      this._refreshChoice();
      this.scene.soundSystem?.playUiSelect?.();
    }
  }

  async _commit() {
    if (this.busy) return;
    this.busy = true;
    this.instruction.setText("COMMITTING FATE...");
    this.typed.setText("");
    try {
      const result = await this.onConfirm?.(this.selected);
      if (!result) throw new Error("JACKPOT COULD NOT BE COMMITTED");
      if (result.title || result.body) this.showResult(result);
      else this._close();
    } catch (error) {
      this.busy = false;
      this.instruction.setText(error?.message || "ACTION FAILED");
      this.instruction.setColor(UI_COLORS.danger);
    }
  }

  closeResult() {
    if (this.mode !== "result") return false;
    const callback = this.onResultClose;
    this._close();
    callback?.();
    return true;
  }

  _close() {
    this.scene.input.keyboard.off("keydown", this._keyHandler);
    this.root.setVisible(false).setAlpha(1);
    this.scene._randomEventModalVisible = false;
    this.scene.uiNotifications?.setPaused?.(false);
    this.scene.input.keyboard.resetKeys?.();
    this.mode = null;
    this.buffer = "";
    this.busy = false;
    this.quote = null;
    this.onConfirm = null;
    this.onCancel = null;
    this.onResultClose = null;
    this.instruction.setColor(UI_COLORS.gold);
  }

  resize() {
    if (!this.root) return;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const layout = this.config.visuals.modal;
    const scale = Math.min(
      1,
      width * layout.maxViewportWidthRatio / layout.panelWidth,
      height * layout.maxViewportHeightRatio / layout.panelHeight,
    );
    this.root.setPosition(width / 2, height / 2).setScale(scale);
    this.shade.setSize(width / scale, height / scale);
  }

  destroy() {
    this.scene?.input?.keyboard?.off?.("keydown", this._keyHandler);
    if (this.scene) this.scene._randomEventModalVisible = false;
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
