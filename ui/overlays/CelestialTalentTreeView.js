// Full authored three-Engine talent tree, opened only through a physical Star Pillar.

import {
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
  getCelestialTalentNodeIconKey,
  getCelestialTalentNodePosition,
} from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { CelestialTalentTreeConnectorLayer } from "./CelestialTalentTreeConnectorLayer.js";
import { CelestialTalentTreeNodeView } from "./CelestialTalentTreeNodeView.js";

function justDown(key) {
  return Boolean(key && Phaser.Input.Keyboard.JustDown(key));
}

export class CelestialTalentTreeView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.progression = options.progression;
    this.getMoney = options.getMoney || (() => 0);
    this.onClose = options.onClose || null;
    this.onNodePurchased = options.onNodePurchased || null;
    this.config = CELESTIAL_TALENT_TREE_UI_CONFIG;
    this.nodes = [];
    this.nodesById = new Map();
    this.expectedNodeCount = 0;
    this.selectedIndex = 0;
    this.visible = false;
    this.destroyed = false;
    this._build();
    this.unsubscribe = this.progression?.subscribe?.(() => this.refresh());
    this._resizeHandler = () => this.resize();
    this.scene.scale?.on?.("resize", this._resizeHandler);
    this.resize();
  }

  _build() {
    const { assets, layout, presentation, copy } = this.config;
    this.root = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(presentation.depth)
      .setVisible(false);
    this.foundation = this.scene.add.image(0, 0, assets.foundation.key)
      .setDisplaySize(layout.referenceWidthPx, layout.referenceHeightPx)
      .setInteractive();
    this.root.add(this.foundation);
    this.title = this._text(0, this._y(layout.titleYFraction), copy.title,
      presentation.titleFontSizePx, presentation.titleColor);
    this.subtitle = this._text(0, this._y(layout.subtitleYFraction), copy.subtitle,
      presentation.subtitleFontSizePx, presentation.bodyColor);
    this.levelText = this._text(this._x(layout.levelXFraction), this._y(layout.headerYFraction), "",
      presentation.headerFontSizePx, presentation.titleColor);
    this.moneyText = this._text(this._x(layout.moneyXFraction), this._y(layout.headerYFraction), "",
      presentation.headerFontSizePx, presentation.titleColor);
    this.starsText = this._text(this._x(layout.starsXFraction), this._y(layout.headerYFraction), "",
      presentation.headerFontSizePx, presentation.readyColor);
    this.closeText = this._text(this._x(layout.closeXFraction), this._y(layout.headerYFraction), copy.close,
      presentation.headerFontSizePx, presentation.titleColor).setInteractive({ useHandCursor: true });
    this.closeText.on("pointerdown", () => this.onClose?.());
    this.root.add([this.title, this.subtitle, this.levelText, this.moneyText, this.starsText, this.closeText]);

    const branches = this.progression?.getSnapshot?.()?.branches || [];
    this.expectedNodeCount = branches.reduce((total, branch) => total + branch.nodes.length, 0);
    branches.forEach((branch, branchIndex) => {
      const accent = presentation.branchAccents[branchIndex];
      const header = this._text(
        this._x(layout.branchCenterXFractions[branchIndex]),
        this._y(layout.branchTitleYFraction),
        branch.name,
        presentation.branchFontSizePx,
        `#${accent.toString(16).padStart(6, "0")}`,
      );
      this.root.add(header);
    });
    this.connectorLayer = new CelestialTalentTreeConnectorLayer(
      this.scene,
      this.root,
      branches,
    );
    branches.forEach((branch, branchIndex) => {
      const accent = presentation.branchAccents[branchIndex];
      branch.nodes.forEach(node => {
        const position = getCelestialTalentNodePosition(branchIndex, node);
        const view = new CelestialTalentTreeNodeView(
          this.scene,
          node,
          getCelestialTalentNodeIconKey(node.id),
          accent,
          {
            onHover: current => this.selectNode(current.node.id),
            onOut: () => {},
            onActivate: current => this.purchaseNode(current.node.id),
          },
        );
        view.branchIndex = branchIndex;
        view.tier = node.tier;
        view.row = node.row;
        view.lane = node.lane;
        view.setPosition(
          this._x(position.xFraction),
          this._y(position.yFraction),
        );
        this.nodes.push(view);
        this.nodesById.set(node.id, view);
        this.root.add(view.root);
      });
    });

    this.detailTitle = this._text(
      this._x(layout.detailTitleXFraction), this._y(layout.detailTitleYFraction), "",
      presentation.detailTitleFontSizePx, presentation.titleColor,
    );
    this.detailBody = this._text(
      this._x(layout.detailBodyXFraction), this._y(layout.detailBodyYFraction), copy.inspect,
      presentation.detailBodyFontSizePx, presentation.bodyColor,
    ).setWordWrapWidth(layout.detailBodyWidthPx).setOrigin(0.5);
    this.detailStatus = this._text(
      this._x(layout.detailStatusXFraction), this._y(layout.detailStatusYFraction), "",
      presentation.detailStatusFontSizePx, presentation.readyColor,
    );
    this.root.add([this.detailTitle, this.detailBody, this.detailStatus]);
  }

  _x(fraction) {
    return (fraction - 0.5) * this.config.layout.referenceWidthPx;
  }

  _y(fraction) {
    return (fraction - 0.5) * this.config.layout.referenceHeightPx;
  }

  _text(x, y, value, size, color) {
    const p = this.config.presentation;
    return this.scene.add.text(x, y, value, {
      fontFamily: UI_FONTS.display,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: p.shadowColor,
      strokeThickness: p.shadowThicknessPx,
      align: "center",
    }).setOrigin(0.5);
  }

  open() {
    if (this.destroyed) return false;
    this.visible = true;
    this.root.setVisible(true);
    this.refresh();
    return true;
  }

  close() {
    this.visible = false;
    this.root?.setVisible(false);
  }

  isOpen() {
    return this.visible && !this.destroyed;
  }

  refresh() {
    if (this.destroyed) return;
    const snapshot = this.progression?.getSnapshot?.();
    if (!snapshot) return;
    this.snapshot = snapshot;
    this.levelText.setText(`LEVEL ${snapshot.playerLevel}`);
    this.moneyText.setText(`M ${Math.max(0, Number(this.getMoney?.()) || 0).toLocaleString("en-US")}`);
    this.starsText.setText(`STAR POINTS ${snapshot.stars.toLocaleString("en-US")}`);
    for (const branch of snapshot.branches) {
      for (const node of branch.nodes) {
        const index = this.nodes.findIndex(view => view.node.id === node.id);
        this.nodesById.get(node.id)?.setState(node, index === this.selectedIndex);
      }
    }
    this.connectorLayer?.refresh(this.nodesById);
    this._refreshDetail();
  }

  selectNode(nodeId) {
    const nextIndex = this.nodes.findIndex(view => view.node.id === nodeId);
    if (nextIndex < 0) return false;
    this.selectedIndex = nextIndex;
    this.refresh();
    return true;
  }

  purchaseNode(nodeId = this.nodes[this.selectedIndex]?.node.id) {
    if (!nodeId) return { ok: false, reason: "missing-node" };
    const result = this.progression?.purchaseNode?.(nodeId)
      || { ok: false, reason: "missing-progression" };
    this.refresh();
    if (result.ok) this.onNodePurchased?.(result);
    return result;
  }

  activateSelected() {
    return this.purchaseNode();
  }

  moveSelection(dx, dy) {
    const current = this.nodes[this.selectedIndex];
    if (!current) return this.selectedIndex;
    const directionX = Math.sign(dx || 0);
    const directionY = Math.sign(dy || 0);
    const candidates = this.nodes
      .map((view, index) => ({
        index,
        deltaX: view.root.x - current.root.x,
        deltaY: view.root.y - current.root.y,
      }))
      .filter(candidate => candidate.index !== this.selectedIndex)
      .filter(candidate => directionX !== 0
        ? Math.sign(candidate.deltaX) === directionX
        : Math.sign(candidate.deltaY) === directionY)
      .sort((left, right) => {
        const score = candidate => directionX !== 0
          ? Math.abs(candidate.deltaX) + Math.abs(candidate.deltaY) * 2
          : Math.abs(candidate.deltaY) + Math.abs(candidate.deltaX) * 2;
        return score(left) - score(right);
      });
    const next = candidates[0]?.index ?? -1;
    if (next >= 0) {
      this.selectedIndex = next;
      this.refresh();
    }
    return this.selectedIndex;
  }

  handleInput(keys) {
    if (!this.isOpen()) return false;
    if (justDown(keys?.escape) || justDown(keys?.interact)) {
      this.onClose?.();
      return true;
    }
    if (justDown(keys?.enter)) {
      this.activateSelected();
      return true;
    }
    if (justDown(keys?.moveLeft) || justDown(keys?.aimLeft)) return this.moveSelection(-1, 0) >= 0;
    if (justDown(keys?.moveRight) || justDown(keys?.aimRight)) return this.moveSelection(1, 0) >= 0;
    if (justDown(keys?.moveUp) || justDown(keys?.aimUp)) return this.moveSelection(0, -1) >= 0;
    if (justDown(keys?.moveDown) || justDown(keys?.aimDown)) return this.moveSelection(0, 1) >= 0;
    return false;
  }

  _refreshDetail() {
    const view = this.nodes[this.selectedIndex];
    const node = view?.snapshot;
    if (!view || !node) return;
    this.detailTitle.setText(view.node.name.toUpperCase());
    this.detailBody.setText(view.node.description);
    this.detailStatus.setText(describeCelestialTalentAvailability(node));
  }

  resize() {
    if (this.destroyed) return;
    const { layout } = this.config;
    const width = this.scene.scale?.width || layout.referenceWidthPx;
    const height = this.scene.scale?.height || layout.referenceHeightPx;
    const inset = layout.viewportInsetPx * 2;
    const scale = Math.max(layout.minimumScale, Math.min(
      (width - inset) / layout.referenceWidthPx,
      (height - inset) / layout.referenceHeightPx,
    ));
    this.root.setPosition(width / 2, height / 2).setScale(scale);
    const compact = scale < layout.compactStatusScaleThreshold;
    this.nodes.forEach(node => node.setCompactStatus(compact));
  }

  getControls() {
    return this.nodes.map(view => view.root);
  }

  getHealthSnapshot() {
    return Object.freeze({
      ready: !this.destroyed && this.expectedNodeCount > 0
        && this.nodes.length === this.expectedNodeCount
        && this.scene.textures?.exists?.(this.config.assets.foundation.key) === true,
      visible: this.visible,
      nodeCount: this.nodes.length,
      connectorCount: this.connectorLayer?.count || 0,
      selectedIndex: this.selectedIndex,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.scene.scale?.off?.("resize", this._resizeHandler);
    for (const node of this.nodes) node.destroy();
    this.nodes = [];
    this.nodesById.clear();
    this.connectorLayer?.destroy();
    this.connectorLayer = null;
    this.root?.destroy(true);
    this.onClose = null;
    this.onNodePurchased = null;
  }
}
