// Baked talent descriptions with a separate rail for live rank and cost values.
import { CELESTIAL_TALENT_TREE_UI_CONFIG, getCelestialTalentChoiceLabel } from "../../values/celestialTalentTreeUi.js";
import { BAKED_TALENT_NODES, BAKED_CELESTIAL_LABELS, BAKED_CELESTIAL_LAYOUT } from "../../values/bakedCelestialUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { prepareArt, fitBakedUiImage, fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { addCelestialLabel, setCelestialArt } from "./bakedCelestialUi.js";
import { CelestialTalentStateView } from "./CelestialTalentStateView.js";

export class CelestialTalentTooltipView {
  constructor(scene, parent) {
    this.scene = scene;
    this.config = CELESTIAL_TALENT_TREE_UI_CONFIG;
    this.nodeId = null;
    this.visible = false;
    const g = BAKED_CELESTIAL_LAYOUT;
    this.root = scene.add.container(0, 0).setVisible(false);
    this.frame = fitBakedUiImage(scene.add.image(0, g.tooltipFooterY, this.config.assets.tooltip.key),
      g.tooltipWidth, g.tooltipFooterHeight);
    if (this.frame) this.root.add(this.frame);
    const first = prepareArt(scene, Object.values(BAKED_TALENT_NODES)[0].card);
    this.card = scene.add.image(0, g.tooltipCardY, first.key, first.frame);
    this.choice = scene.add.image(0, g.tooltipChoiceY, first.key, first.frame);
    this.costUnit = scene.add.image(g.tooltipCostUnitX, g.tooltipRankY, first.key, first.frame);
    this.rank = this._text(g.tooltipRankValueX, g.tooltipRankY);
    this.cost = this._text(g.tooltipCostValueX, g.tooltipRankY);
    this.root.add([this.card, this.choice, this.costUnit, this.rank, this.cost]);
    addCelestialLabel(scene, this.root, "RANK", g.tooltipRankLabelX, g.tooltipRankY,
      g.headerValueWidth, g.statusLabelHeight);
    addCelestialLabel(scene, this.root, "COST", g.tooltipCostLabelX, g.tooltipRankY,
      g.headerValueWidth, g.statusLabelHeight);
    this.status = new CelestialTalentStateView(scene, this.root, 0, g.tooltipStatusY,
      g.tooltipStatusWidth, g.tooltipStatusHeight);
    parent.add(this.root);
  }

  _text(x, y) {
    const p = this.config.presentation;
    return this.scene.add.text(x, y, "", {
      fontFamily: UI_FONTS.mono, fontSize: BAKED_CELESTIAL_LAYOUT.metadataFontSize,
      color:p.bodyColor, align:"center",
    }).setOrigin(0.5);
  }

  show(nodeView, snapshot) {
    if (!nodeView || !snapshot) return false;
    const g = BAKED_CELESTIAL_LAYOUT;
    this.nodeId = nodeView.node.id;
    this.nodeView = nodeView;
    setCelestialArt(this.scene, this.card, BAKED_TALENT_NODES[this.nodeId].card,
      g.tooltipWidth, g.tooltipCardHeight);
    this.card.setData("bakedTalentDescription", this.nodeId);
    setCelestialArt(this.scene, this.choice,
      BAKED_CELESTIAL_LABELS[getCelestialTalentChoiceLabel(nodeView.node)],
      g.tooltipChoiceWidth, g.tooltipChoiceHeight);
    this.rank.setText(`${snapshot.rank}/${snapshot.maxRank}`);
    const special = snapshot.rank >= snapshot.maxRank ? "MAX" : snapshot.godMode ? "FREE" : null;
    this.cost.setText(special ? "" : String(snapshot.purchased ? snapshot.starsCost : snapshot.talentPointsCost));
    setCelestialArt(this.scene, this.costUnit,
      BAKED_CELESTIAL_LABELS[special || (snapshot.purchased ? "SP" : "TP")],
      g.headerValueWidth / 2, g.statusLabelHeight);
    [this.rank, this.cost].forEach(text => fitLiveUiText(text, g.headerValueWidth / 2, g.headerValueHeight));
    this.status.setState(snapshot);
    this._position(nodeView);
    this.visible = true;
    this.root.setVisible(true);
    return true;
  }

  _position(nodeView) {
    const layout = this.config.layout;
    const tooltipScale = this.root.scaleX || 1;
    const halfWidth = BAKED_CELESTIAL_LAYOUT.tooltipWidth * tooltipScale / 2;
    const halfHeight = BAKED_CELESTIAL_LAYOUT.tooltipHeight * tooltipScale / 2;
    const halfReferenceWidth = layout.referenceWidthPx / 2;
    const halfReferenceHeight = layout.referenceHeightPx / 2;
    const branchDirection = nodeView.branchIndex === 0
      ? 1
      : nodeView.branchIndex === 2
        ? -1
        : nodeView.lane > 0 ? -1 : 1;
    const isTopChoice = nodeView.node.kind === "capstone"
      || nodeView.node.kind === "apex";
    // Every branch opens toward the tree interior. Top-row cards also drop
    // below their node, avoiding the title and currency rail.
    const requestedX = nodeView.root.x + branchDirection * (
      layout.nodeHitWidthPx / 2 + layout.tooltipGapPx + halfWidth
    );
    const x = Math.max(
      -halfReferenceWidth + layout.tooltipViewportMarginPx + halfWidth,
      Math.min(
        halfReferenceWidth - layout.tooltipViewportMarginPx - halfWidth,
        requestedX,
      ),
    );
    const requestedY = isTopChoice
      ? nodeView.root.y + layout.nodeHitHeightPx / 2
        + layout.tooltipGapPx + halfHeight
      : nodeView.root.y;
    const y = Math.max(
      -halfReferenceHeight + layout.tooltipViewportMarginPx + halfHeight,
      Math.min(
        BAKED_CELESTIAL_LAYOUT.tooltipBottomYFraction * layout.referenceHeightPx
          - halfReferenceHeight - halfHeight,
        requestedY,
      ),
    );
    this.root.setPosition(x, y);
  }



  refresh(snapshot) {
    if (!this.visible || !this.nodeView || snapshot?.id !== this.nodeId) return false;
    return this.show(this.nodeView, snapshot);
  }

  setViewportScale(parentScale) {
    const minimum = this.config.layout.tooltipMinimumScreenScale;
    this.root.setScale(parentScale < minimum ? minimum / parentScale : 1);
    if (this.visible && this.nodeView) this._position(this.nodeView);
  }

  hide() {
    this.nodeId = null;
    this.nodeView = null;
    this.visible = false;
    this.root.setVisible(false);
  }

  destroy() {
    this.hide();
    this.root.destroy(true);
    this.scene = null;
  }
}
