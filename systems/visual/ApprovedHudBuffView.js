import { createUiIcon, setUiIcon } from "../../ui/UiIconAtlas.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";

function normalizeEntry(value) {
  if (typeof value === "string") return { text: value };
  return value && typeof value === "object" ? value : { text: "" };
}

export class ApprovedHudBuffView {
  constructor(scene, scale = 1) {
    this.scene = scene;
    this.scale = scale;
    this.entries = [];
    this.frames = [];
    this.icons = [];
    this.texts = [];
    this.zones = [];
    this.hoveredIndex = -1;
    this._createChips();
    this._createTooltip();
  }

  _createChips() {
    const layout = APPROVED_HUD_SKIN.layout.buffs;
    const s = this.scale;
    for (let index = 0; index < layout.maxVisible; index += 1) {
      const x = (layout.x + index * (layout.width + layout.gap)) * s;
      const y = layout.y * s;
      const frame = this.scene.add.image(x, y, ASSET_KEYS.ui.approvedHud.buffChip)
        .setOrigin(0, 0)
        .setDisplaySize(layout.width * s, layout.height * s)
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudDepth - 2)
        .setVisible(false);
      const icon = createUiIcon(this.scene, "info", {
        x: x + layout.iconInsetX * s,
        y: y + layout.height * s / 2,
        size: layout.iconSize * s,
        alpha: 0.92,
        depth: HUD_LAYOUT.hudOverlayDepth,
        scrollFactor: 0,
      })?.setVisible(false);
      const text = this.scene.add.text(
        x + (layout.width / 2 + layout.textCenterOffsetX) * s,
        y + layout.height * s / 2,
        "",
        {
          fontFamily: APPROVED_HUD_SKIN.font.family,
          fontSize: `${layout.fontSize * s}px`,
          fontStyle: "bold",
          color: APPROVED_HUD_SKIN.font.cyan,
          stroke: APPROVED_HUD_SKIN.font.shadow,
          strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
          align: "center",
        },
      ).setOrigin(0.5).setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudOverlayDepth).setVisible(false);
      const zone = this.scene.add.zone(
        x + layout.width * s / 2,
        y + (layout.height / 2 + layout.hitOffsetY) * s,
        layout.width * s,
        layout.hitHeight * s,
      ).setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth + 1).setVisible(false);
      zone.on("pointerover", () => this._showTooltip(index));
      zone.on("pointerout", () => this._hideTooltip(index));
      this.frames.push(frame);
      this.icons.push(icon);
      this.texts.push(text);
      this.zones.push(zone);
    }
  }

  _createTooltip() {
    const layout = APPROVED_HUD_SKIN.layout.buffs.tooltip;
    const s = this.scale;
    this.tooltipRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 4)
      .setVisible(false);
    this.tooltipFrame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.notification)
      .setDisplaySize(layout.width * s, layout.height * s)
      .setAlpha(0.98);
    this.tooltipTitle = this.scene.add.text(0, layout.titleY * s, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${layout.titleFontSize * s}px`,
      fontStyle: "bold",
      color: APPROVED_HUD_SKIN.font.gold,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0.5);
    this.tooltipBody = this.scene.add.text(0, layout.bodyY * s, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${layout.bodyFontSize * s}px`,
      fontStyle: "bold",
      color: APPROVED_HUD_SKIN.font.secondary,
      align: "center",
      wordWrap: { width: layout.bodyWidth * s },
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0.5);
    this.tooltipRoot.add([this.tooltipFrame, this.tooltipTitle, this.tooltipBody]);
  }

  setEntries(values = []) {
    this.entries = values.map(normalizeEntry);
    const layout = APPROVED_HUD_SKIN.layout.buffs;
    this.frames.forEach((frame, index) => {
      const entry = this.entries[index] || { text: "" };
      const visible = Boolean(entry.text);
      frame.setVisible(visible).setAlpha(layout.restAlpha);
      const chipX = (
        layout.x + index * (layout.width + layout.gap)
      ) * this.scale;
      this.texts[index]
        .setX(chipX + (
          layout.width / 2 + (entry.icon ? layout.textCenterOffsetX : 0)
        ) * this.scale)
        .setText(entry.text)
        .setVisible(visible);
      const icon = this.icons[index];
      if (icon && visible && entry.icon) setUiIcon(icon, entry.icon);
      icon?.setVisible(visible && Boolean(entry.icon));
      const zone = this.zones[index];
      zone.setVisible(visible);
      if (visible) {
        if (zone.input?.enabled !== true) zone.setInteractive({ useHandCursor: false });
      } else if (zone?.scene?.sys) zone.disableInteractive();
    });
    if (!this.entries[this.hoveredIndex]?.text) this._hideTooltip();
    else if (this.hoveredIndex >= 0) this._showTooltip(this.hoveredIndex);
  }

  _showTooltip(index) {
    const entry = this.entries[index];
    if (!entry?.text || !entry.tooltip?.body) return;
    const layout = APPROVED_HUD_SKIN.layout.buffs;
    const tooltip = layout.tooltip;
    const s = this.scale;
    const chipCenterX = (
      layout.x + index * (layout.width + layout.gap) + layout.width / 2
    ) * s;
    const halfWidth = tooltip.width * s / 2;
    const viewportWidth = this.scene.scale?.width || APPROVED_HUD_SKIN.referenceViewport.width;
    const x = Math.max(
      tooltip.viewportMargin * s + halfWidth,
      Math.min(viewportWidth - tooltip.viewportMargin * s - halfWidth, chipCenterX),
    );
    const y = (layout.y + layout.height + tooltip.gap) * s
      + tooltip.height * s / 2;
    this.hoveredIndex = index;
    this.frames[index].setAlpha(layout.hoverAlpha);
    this.tooltipTitle.setText(entry.tooltip.title || entry.text)
      .setColor(entry.tooltip.color || APPROVED_HUD_SKIN.font.gold);
    this.tooltipBody.setText(entry.tooltip.body);
    this.tooltipRoot.setPosition(x, y).setVisible(true);
  }

  _hideTooltip(index = this.hoveredIndex) {
    if (index >= 0) this.frames[index]?.setAlpha(APPROVED_HUD_SKIN.layout.buffs.restAlpha);
    if (index !== this.hoveredIndex) return;
    this.hoveredIndex = -1;
    this.tooltipRoot?.setVisible(false);
  }

  getSnapshot() {
    return Object.freeze({
      visibleEntries: this.entries.filter(entry => entry.text).length,
      icons: Object.freeze(this.entries.filter(entry => entry.text).map(entry => entry.icon || null)),
      hitAreas: Object.freeze(this.zones.slice(0, this.entries.length).map(zone => ({
        width: zone.width,
        height: zone.height,
      }))),
      hoveredIndex: this.hoveredIndex,
      tooltipVisible: this.tooltipRoot?.visible === true,
      tooltipTitle: this.tooltipTitle?.text || "",
      tooltipBody: this.tooltipBody?.text || "",
    });
  }

  destroy() {
    this.zones.forEach(zone => zone?.removeAllListeners?.());
    [
      ...this.frames, ...this.icons, ...this.texts, ...this.zones, this.tooltipRoot,
    ].forEach(object => object?.destroy?.());
    this.frames = [];
    this.icons = [];
    this.texts = [];
    this.zones = [];
    this.scene = null;
  }
}
