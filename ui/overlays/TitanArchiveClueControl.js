import { TITAN_CLUE_CATALOG_CONFIG } from "../../values/titanClueCatalog.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../PhaserUiKit.js";

export class TitanArchiveClueControl {
  constructor(scene, options = {}, config = TITAN_CLUE_CATALOG_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.clueSystem = options.clueSystem || null;
    this.directionProvider = options.directionProvider || null;
    this.getPlayerTile = options.getPlayerTile || null;
    this.onFocus = options.onFocus || null;
    this.onChanged = options.onChanged || null;
    this.definition = null;
    this.discovered = false;
    this.button = createButton(scene, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: config.layout.buttonHeightPx,
      label: config.copy.buyButton,
      hint: config.copy.unavailableDirection,
      icon: "journal",
      accent: UI_COLORS.borderSel,
      fontSize: config.layout.buttonFontSize,
      align: "left",
      parent: options.parent,
      onFocus: () => this.onFocus?.(),
      onClick: () => this._activate(),
    });
    this.button.setEnabled(false);
    this.button.setVisible(false);
  }

  _getDirection(titanId) {
    const playerTile = this.getPlayerTile?.();
    return this.directionProvider?.getDirection?.(titanId, playerTile) || null;
  }

  setDefinition(definition, discovered) {
    this.definition = definition || null;
    this.discovered = Boolean(discovered);
    const visible = Boolean(
      this.definition
      && !this.discovered
      && this.clueSystem?.enabled
    );
    this.button.setVisible(visible);
    if (!visible) {
      this.button.setEnabled(false);
      return;
    }

    const state = this.clueSystem.getClueState(this.definition.id);
    if (state.purchased) {
      const direction = this._getDirection(this.definition.id);
      this.button.setLabel(
        state.active
          ? this.config.copy.trackingButton
          : this.config.copy.trackButton
      );
      this.button.setHint(
        direction?.directionText || this.config.copy.unavailableDirection
      );
      this.button.setEnabled(true);
      return;
    }

    const formattedCost = state.cost.toLocaleString();
    this.button.setLabel(this.config.copy.buyButton);
    this.button.setHint(
      `${this.config.copy.costPrefix} ${formattedCost} ${this.config.copy.walletUnit}`
    );
    if (state.canAfford) {
      this.button.setEnabled(true);
      return;
    }
    const missing = Math.max(0, state.cost - state.walletMoney);
    this.button.setEnabled(
      false,
      `${this.config.copy.needPrefix} ${missing.toLocaleString()} ${this.config.copy.walletUnit}`
    );
  }

  _activate() {
    if (!this.definition || this.discovered) return;
    const state = this.clueSystem.getClueState(this.definition.id);
    const result = state.purchased
      ? this.clueSystem.trackClue(this.definition.id)
      : this.clueSystem.purchaseClue(this.definition.id);
    this.setDefinition(this.definition, this.discovered);
    this.onChanged?.(result);
  }

  getControl() {
    return this.button;
  }

  destroy() {
    this.button?.destroy?.();
    this.button = null;
    this.scene = null;
    this.clueSystem = null;
    this.directionProvider = null;
    this.getPlayerTile = null;
    this.onFocus = null;
    this.onChanged = null;
  }
}
