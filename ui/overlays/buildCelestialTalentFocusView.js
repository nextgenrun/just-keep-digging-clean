// Assemble the authored selector, focused graph and permanent detail dock.
import { CELESTIAL_FOCUS_ASSETS, CELESTIAL_FOCUS_LAYOUT as G, celestialFocusPoint } from "../../values/celestialTalentFocusUi.js";
import { getCelestialTalentNodeIconKey, getCelestialTalentNodePosition } from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";
import { CelestialTalentTreeNodeView } from "./CelestialTalentTreeNodeView.js";
import { CelestialTalentTreeConnectorLayer } from "./CelestialTalentTreeConnectorLayer.js";
import { CelestialTalentTreeSelector } from "./CelestialTalentTreeSelector.js";
import { CelestialTalentDetailView } from "./CelestialTalentDetailView.js";
import { CelestialTalentUpgradeFeedback } from "./CelestialTalentUpgradeFeedback.js";

export function buildCelestialTalentFocusView(view) {
  const { scene, config } = view;
  view.root = scene.add.container(0, 0).setScrollFactor(0)
    .setDepth(config.presentation.depth).setVisible(false);
  view.selector = new CelestialTalentTreeSelector(scene, view.root, view.branches, index => view.focusBranch(index));
  view.focusRoot = scene.add.container(0, 0).setVisible(false);
  view.root.add(view.focusRoot);
  view.foundation = fitBakedUiImage(scene.add.image(0, 0, CELESTIAL_FOCUS_ASSETS.wayward.key), G.width, G.height);
  view.focusRoot.add(view.foundation);
  const headers = G.headerXs.map(x => {
    const point = celestialFocusPoint(x, G.headerY);
    const text = scene.add.text(point.x, point.y, "", {
      fontFamily: UI_FONTS.mono, fontSize: G.headerFontSize, color: G.valueColor, align: "center",
    }).setOrigin(0.5);
    view.focusRoot.add(text);
    return text;
  });
  [view.levelText, view.talentPointsText, view.starsText] = headers;
  view.connectorLayer = new CelestialTalentTreeConnectorLayer(scene, view.focusRoot, view.branches);
  view.branches.forEach((branch, branchIndex) => {
    branch.nodes.forEach(node => {
      const nodeView = new CelestialTalentTreeNodeView(scene, node, getCelestialTalentNodeIconKey(node.id),
        config.presentation.branchAccents[branchIndex]);
      const position = getCelestialTalentNodePosition(branchIndex, node);
      const point = celestialFocusPoint(position.xFraction, position.yFraction);
      nodeView.branchIndex = branchIndex;
      nodeView.setPosition(point.x, point.y);
      nodeView.setBranchVisible(false);
      view.nodes.push(nodeView);
      view.nodesById.set(node.id, nodeView);
      view.focusRoot.add(nodeView.root);
    });
  });
  view.detail = new CelestialTalentDetailView(scene, view.focusRoot);
  view.feedback = new CelestialTalentUpgradeFeedback(scene, view.focusRoot, view.detail);
  const hit = (x, y, width, height) => {
    const p = celestialFocusPoint(x, y);
    return scene.add.image(p.x, p.y, config.assets.nodeHalo.key)
      .setDisplaySize(width, height).setAlpha(G.invisibleHitAlpha)
      .setInteractive({ useHandCursor: true });
  };
  view.backHit = hit(G.backX, G.backY, G.backWidth, G.backHeight);
  view.closeHit = hit(G.closeX, G.closeY, G.closeWidth, G.closeHeight);
  view.selectorCloseHit = hit(G.closeX, G.selectorCloseY, G.closeWidth, G.closeHeight);
  view.focusRoot.add([view.backHit, view.closeHit]);
  view.selector.root.add(view.selectorCloseHit);
}
