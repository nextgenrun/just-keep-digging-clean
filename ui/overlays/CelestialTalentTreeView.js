// Tree selection and one focused twelve-node tree share the existing progression owner.
import {
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS, CELESTIAL_TALENT_TREE_UI_CONFIG,
} from "../../values/celestialTalentTreeUi.js";
import {
  CELESTIAL_FOCUS_LAYOUT as G, CELESTIAL_FOCUS_BRANCH_ASSETS, celestialFocusPoint,
} from "../../values/celestialTalentFocusUi.js";
import { fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { buildCelestialTalentFocusView } from "./buildCelestialTalentFocusView.js";

const justDown = key => Boolean(key && Phaser.Input.Keyboard.JustDown(key));

export class CelestialTalentTreeView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.progression = options.progression;
    this.onClose = options.onClose || null;
    this.onNodePurchased = options.onNodePurchased || null;
    this.onControlsChanged = options.onControlsChanged || null;
    this.config = CELESTIAL_TALENT_TREE_UI_CONFIG;
    this.nodes = [];
    this.nodesById = new Map();
    this.selectedIndex = 0;
    this.selectedBranchIndex = 0;
    this.activeBranchId = null;
    this.visible = false;
    this.destroyed = false;
    this.branches = this.progression?.getSnapshot?.()?.branches || [];
    this.expectedNodeCount = this.branches.reduce((count, branch) => count + branch.nodes.length, 0);
    buildCelestialTalentFocusView(this);
    this.pointerHandler = pointer => this._handlePointerDown(pointer);
    this.scene.input?.on?.("pointerdown", this.pointerHandler);
    this.unsubscribe = this.progression?.subscribe?.(() => this.refresh());
    this.resizeHandler = () => this.resize();
    this.scene.scale?.on?.("resize", this.resizeHandler);
    this.resize();
  }

  get visibleNodes() {
    return this.activeBranchId ? this.nodes.filter(view => view.node.branchId === this.activeBranchId) : [];
  }

  _handlePointerDown(pointer) {
    if (!this.isOpen() || !pointer) return false;
    const point = this.root.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    const close = celestialFocusPoint(G.closeX, this.activeBranchId ? G.closeY : G.selectorCloseY);
    if (Math.abs(point.x - close.x) <= G.closeWidth / 2 && Math.abs(point.y - close.y) <= G.closeHeight / 2) {
      this.onClose?.();
      return true;
    }
    if (!this.activeBranchId) {
      const index = this.selector.hitTest(point);
      if (index >= 0) return this.selectTree(this.branches[index].id);
      return false;
    }
    const back = celestialFocusPoint(G.backX, G.backY);
    if (Math.abs(point.x - back.x) <= G.backWidth / 2 && Math.abs(point.y - back.y) <= G.backHeight / 2) {
      return this.backToSelection();
    }
    if (this.detail.hitTest(point)) { this.activateSelected(); return true; }
    for (const view of this.visibleNodes) {
      if (Math.abs(point.x - view.root.x) <= G.nodeHitWidth / 2
        && Math.abs(point.y - view.root.y) <= G.nodeHitHeight / 2) {
        this.selectNode(view.node.id);
        this._syncControls();
        return true;
      }
    }
    return false;
  }

  open() {
    if (this.destroyed) return false;
    this.visible = true;
    this.root.setVisible(true);
    this.feedback.warmAudio();
    this.backToSelection();
    return true;
  }

  close() {
    this.visible = false;
    this.feedback.stop();
    this.root.setVisible(false);
  }

  isOpen() { return this.visible && !this.destroyed; }

  selectTree(branchId) {
    const branch = this.branches.find(item => item.id === branchId);
    if (!branch) return false;
    this.feedback.stop();
    this.activeBranchId = branch.id;
    this.selectedBranchIndex = this.branches.indexOf(branch);
    this.foundation.setTexture(CELESTIAL_FOCUS_BRANCH_ASSETS[branch.id].key);
    this.selector.setVisible(false);
    this.focusRoot.setVisible(true);
    this.nodes.forEach(view => view.setBranchVisible(view.node.branchId === branchId));
    this.connectorLayer.setBranch(branchId);
    const remembered = this.lastSelections?.[branchId] || branch.rootNodeId;
    this.selectedIndex = Math.max(0, this.nodes.findIndex(view => view.node.id === remembered));
    this.refresh();
    this._syncControls();
    return true;
  }

  backToSelection() {
    this.feedback.stop();
    this.activeBranchId = null;
    this.focusRoot.setVisible(false);
    this.connectorLayer.setBranch(null);
    this.nodes.forEach(view => view.setBranchVisible(false));
    this.selector.setVisible(true);
    this.selector.setFocused(this.selectedBranchIndex);
    this.refresh();
    this._syncControls();
    return true;
  }

  focusBranch(index) {
    if (this.activeBranchId || index === this.selectedBranchIndex) return;
    this.selectedBranchIndex = index;
    this.selector.setFocused(index);
    this._syncControls();
  }

  refresh() {
    if (this.destroyed) return;
    const snapshot = this.progression?.getSnapshot?.();
    if (!snapshot) return;
    this.snapshot = snapshot;
    [this.levelText, this.talentPointsText, this.starsText].forEach((text, index) => {
      text.setText([snapshot.playerLevel, snapshot.talentPoints, snapshot.stars.toLocaleString("en-US")][index]);
      fitLiveUiText(text, G.headerWidth, G.headerHeight);
    });
    for (const branch of snapshot.branches) for (const node of branch.nodes) {
      this.nodesById.get(node.id)?.setState(node, this.nodes[this.selectedIndex]?.node.id === node.id);
    }
    if (this.activeBranchId) {
      const view = this.nodes[this.selectedIndex];
      this.connectorLayer.refresh(this.nodesById, view?.node.id);
      this.detail.show(view, view?.snapshot);
    }
  }

  selectNode(nodeId) {
    const view = this.nodesById.get(nodeId);
    if (!view) return false;
    if (view.node.branchId !== this.activeBranchId) this.selectTree(view.node.branchId);
    this.selectedIndex = this.nodes.indexOf(view);
    this.lastSelections = { ...this.lastSelections, [view.node.branchId]: nodeId };
    this.refresh();
    return true;
  }

  purchaseNode(nodeId = this.nodes[this.selectedIndex]?.node.id) {
    const view = this.nodesById.get(nodeId);
    if (!view || view.node.branchId !== this.activeBranchId) return { ok: false, reason: "hidden-node" };
    const availability = this.progression?.getNodeAvailability?.(nodeId);
    if (!availability?.available) return { ok: false, reason: availability?.reason || "unavailable" };
    const action = availability.action;
    const result = (action === "upgrade"
      ? this.progression.upgradeNode(nodeId) : this.progression.purchaseNode(nodeId))
      || { ok: false, reason: "missing-progression" };
    this.refresh();
    if (result.ok) {
      this.feedback.play(view, action);
      this.onNodePurchased?.(result);
    }
    return result;
  }

  activateSelected() {
    return this.activeBranchId ? this.purchaseNode()
      : this.selectTree(this.branches[this.selectedBranchIndex]?.id);
  }

  moveSelection(dx, dy) {
    if (!this.activeBranchId) {
      const direction = Math.sign(dx || dy);
      this.selectedBranchIndex = (this.selectedBranchIndex + direction + this.branches.length) % this.branches.length;
      this.selector.setFocused(this.selectedBranchIndex);
      return this.selectedBranchIndex;
    }
    const current = this.nodes[this.selectedIndex];
    const directionX = Math.sign(dx || 0), directionY = Math.sign(dy || 0);
    const candidates = this.visibleNodes.filter(view => view !== current).map(view => ({
      view, deltaX: view.root.x - current.root.x, deltaY: view.root.y - current.root.y,
    })).filter(item => directionX ? Math.sign(item.deltaX) === directionX : Math.sign(item.deltaY) === directionY)
      .sort((left, right) => {
        const score = item => directionX
          ? Math.abs(item.deltaX) + Math.abs(item.deltaY) * 2
          : Math.abs(item.deltaY) + Math.abs(item.deltaX) * 2;
        return score(left) - score(right);
      });
    if (candidates[0]) this.selectNode(candidates[0].view.node.id);
    return this.selectedControlIndex;
  }

  handleInput(keys) {
    if (!this.isOpen()) return false;
    if (justDown(keys?.escape)) {
      if (this.activeBranchId) this.backToSelection(); else this.onClose?.();
      return true;
    }
    if (justDown(keys?.interact)) { this.onClose?.(); return true; }
    if (justDown(keys?.enter)) { this.activateSelected(); return true; }
    if (justDown(keys?.moveLeft) || justDown(keys?.aimLeft)) return this.moveSelection(-1, 0) >= 0;
    if (justDown(keys?.moveRight) || justDown(keys?.aimRight)) return this.moveSelection(1, 0) >= 0;
    if (justDown(keys?.moveUp) || justDown(keys?.aimUp)) return this.moveSelection(0, -1) >= 0;
    if (justDown(keys?.moveDown) || justDown(keys?.aimDown)) return this.moveSelection(0, 1) >= 0;
    return false;
  }

  resize() {
    if (this.destroyed) return;
    const width = this.scene.scale?.width || G.width, height = this.scene.scale?.height || G.height;
    const scale = Math.min((width - G.viewportInset * 2) / G.width, (height - G.viewportInset * 2) / G.height);
    this.root.setPosition(width / 2, height / 2).setScale(Math.max(0, scale));
    this.nodes.forEach(view => view.setViewportScale(scale));
    if (this.activeBranchId) this.detail.setViewportScale(scale);
  }

  getControls() {
    if (!this.activeBranchId) return this.selector.cards.map((card, index) => ({
      root: card.image, activate: () => this.selectTree(card.branchId), isEnabled: () => !this.activeBranchId,
      setFocused: focused => { if (focused) this.selectControl(index); },
    }));
    return this.visibleNodes.map((view, index) => ({
      root: view.root, activate: () => this.purchaseNode(view.node.id),
      isEnabled: () => view.root.visible,
      setFocused: focused => { if (focused) this.selectControl(index); },
    }));
  }

  selectControl(index) {
    if (!this.activeBranchId) {
      this.selectedBranchIndex = Math.max(0, Math.min(this.branches.length - 1, index || 0));
      this.selector.setFocused(this.selectedBranchIndex);
      return true;
    }
    const view = this.visibleNodes[Math.max(0, Math.min(this.visibleNodes.length - 1, index || 0))];
    return view ? this.selectNode(view.node.id) : false;
  }

  get selectedControlIndex() {
    return this.activeBranchId ? this.visibleNodes.indexOf(this.nodes[this.selectedIndex]) : this.selectedBranchIndex;
  }

  _syncControls() { this.onControlsChanged?.(this.getControls(), this.selectedControlIndex); }

  getHealthSnapshot() {
    const missingTextureKeys = CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.map(asset => asset.key)
      .filter(key => this.scene.textures?.exists?.(key) !== true);
    return {
      ready: !this.destroyed && this.nodes.length === this.expectedNodeCount && !missingTextureKeys.length,
      visible: this.visible, nodeCount: this.nodes.length, visibleNodeCount: this.visibleNodes.length,
      mode: this.activeBranchId ? "tree" : "selector", activeBranchId: this.activeBranchId,
      selectedIndex: this.selectedIndex, selectedNodeId: this.activeBranchId ? this.nodes[this.selectedIndex]?.node.id : null,
      bakedNodeFaces: this.nodes.filter(view => view.icon.getData("bakedTalentNode") === view.node.id).length,
      connectorCount: this.connectorLayer.count,
      connectorStates: this.connectorLayer.getStateSnapshot(), tooltipVisible: false,
      detailNodeId: this.activeBranchId ? this.detail.nodeId : null,
      feedback: this.feedback.getSnapshot(), missingTextureKeys,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe?.();
    this.scene.input?.off?.("pointerdown", this.pointerHandler);
    this.scene.scale?.off?.("resize", this.resizeHandler);
    this.feedback.destroy();
    this.nodes.forEach(view => view.destroy());
    this.nodes = [];
    this.nodesById.clear();
    this.connectorLayer.destroy();
    this.root.destroy(true);
    this.onClose = this.onNodePurchased = this.onControlsChanged = null;
  }
}
