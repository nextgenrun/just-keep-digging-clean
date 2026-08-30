// Full authored three-Engine talent tree shared by ESC and the physical Star Pillar.

import {
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS,
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
  getCelestialTalentNodeIconKey,
  getCelestialTalentNodePosition,
} from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { CelestialTalentTreeConnectorLayer } from "./CelestialTalentTreeConnectorLayer.js";
import { CelestialTalentTreeNodeView } from "./CelestialTalentTreeNodeView.js";
import { CelestialTalentTooltipView } from "./CelestialTalentTooltipView.js";

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
    this._pointerDownHandler = pointer => this._handlePointerDown(pointer);
    this.scene.input?.on?.("pointerdown", this._pointerDownHandler);
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
      .setDisplaySize(layout.referenceWidthPx, layout.referenceHeightPx);
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
    this.closeText = this._text(this._x(layout.closeXFraction), this._y(layout.closeYFraction), copy.close,
      presentation.closeFontSizePx, presentation.titleColor).setInteractive({ useHandCursor: true });
    this.closeText.disableInteractive();
    // A real authored-image display object is intentional here. Phaser Zones
    // nested in the scaled immersive tree did not receive browser pointer
    // events consistently, even though the Input Manager registered them.
    this.closeHit = this.scene.add.image(
      this._x(layout.closeXFraction),
      this._y(layout.closeYFraction),
      assets.nodeHalo.key,
    )
      .setDisplaySize(layout.closeHitWidthPx, layout.closeHitHeightPx)
      .setAlpha(0.001)
      .setInteractive({ useHandCursor: true });
    this.root.add([
      this.title,
      this.subtitle,
      this.levelText,
      this.moneyText,
      this.starsText,
      this.closeText,
      this.closeHit,
    ]);

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
            onHover: current => this.selectNode(current.node.id, true),
            onOut: () => this.tooltip?.hide(),
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
    this.tooltip = new CelestialTalentTooltipView(this.scene, this.root);
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

  _handlePointerDown(pointer) {
    if (!this.isOpen() || !pointer) return false;
    const { layout } = this.config;
    const closePoint = this.root.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    const closeX = this._x(layout.closeXFraction);
    const closeY = this._y(layout.closeYFraction);
    if (
      Math.abs(closePoint.x - closeX) <= layout.closeHitWidthPx / 2
      && Math.abs(closePoint.y - closeY) <= layout.closeHitHeightPx / 2
    ) {
      this.onClose?.();
      return true;
    }

    for (const view of this.nodes) {
      const point = view.root.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
      if (
        Math.abs(point.x) <= layout.nodeHitWidthPx / 2
        && Math.abs(point.y) <= layout.nodeHitHeightPx / 2
      ) {
        // Touch has no prior hover state, so a lit node must purchase on this
        // same reliable scene-level pointer event. Locked nodes stay inspect-only.
        this.selectNode(view.node.id, true);
        if (view.snapshot?.available === true) this.purchaseNode(view.node.id);
        return true;
      }
    }
    return false;
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
    this.tooltip?.hide();
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

  selectNode(nodeId, showPopup = false) {
    const nextIndex = this.nodes.findIndex(view => view.node.id === nodeId);
    if (nextIndex < 0) return false;
    this.selectedIndex = nextIndex;
    this.refresh();
    if (showPopup) {
      const view = this.nodes[nextIndex];
      this.tooltip?.show(view, view.snapshot);
    }
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
      this.selectNode(this.nodes[next].node.id, true);
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
    this.tooltip?.refresh(node);
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
    this.tooltip?.setViewportScale(scale);
    const compact = scale < layout.compactStatusScaleThreshold;
    this.nodes.forEach(node => node.setCompactStatus(compact));
  }

  getControls() {
    return this.nodes.map((view, index) => ({
      activate: () => this.purchaseNode(view.node.id),
      isEnabled: () => true,
      setFocused: focused => {
        if (focused) this.selectControl(index, true);
      },
    }));
  }

  selectControl(index, showPopup = false) {
    const nextIndex = Math.max(0, Math.min(
      this.nodes.length - 1,
      Number(index) || 0,
    ));
    if (!this.nodes[nextIndex]) return false;
    return this.selectNode(this.nodes[nextIndex].node.id, showPopup);
  }

  get selectedControlIndex() {
    return this.selectedIndex;
  }

  getHealthSnapshot() {
    const missingTextureKeys = CELESTIAL_TALENT_TREE_PRELOAD_ASSETS
      .map(asset => asset.key)
      .filter(key => this.scene.textures?.exists?.(key) !== true);
    return Object.freeze({
      ready: !this.destroyed && this.expectedNodeCount > 0
        && this.nodes.length === this.expectedNodeCount
        && missingTextureKeys.length === 0,
      visible: this.visible,
      nodeCount: this.nodes.length,
      connectorCount: this.connectorLayer?.count || 0,
      selectedIndex: this.selectedIndex,
      tooltipVisible: this.tooltip?.visible === true,
      tooltipNodeId: this.tooltip?.nodeId || null,
      missingTextureKeys,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.scene.input?.off?.("pointerdown", this._pointerDownHandler);
    this.scene.scale?.off?.("resize", this._resizeHandler);
    for (const node of this.nodes) node.destroy();
    this.nodes = [];
    this.nodesById.clear();
    this.connectorLayer?.destroy();
    this.connectorLayer = null;
    this.tooltip?.destroy();
    this.tooltip = null;
    this.root?.destroy(true);
    this.onClose = null;
    this.onNodePurchased = null;
  }
}
