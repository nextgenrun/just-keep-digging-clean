// One complete talent face; its rank and explanation live in the fixed dossier.
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { CELESTIAL_FOCUS_LAYOUT as G } from "../../values/celestialTalentFocusUi.js";
import { BAKED_TALENT_NODES } from "../../values/bakedCelestialUi.js";
import { prepareArt, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";

export class CelestialTalentTreeNodeView {
  constructor(scene, node, iconKey, accent) {
    this.scene = scene;
    this.node = node;
    const { assets, layout } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const size = layout.nodeSizeByKindPx[node.kind] || layout.nodeSizeByKindPx.upgrade;
    this.root = scene.add.container(0, 0);
    this.halo = scene.add.image(0, 0, assets.nodeHalo.key)
      .setDisplaySize(size * layout.haloWidthScale, size * layout.haloHeightScale)
      .setTint(accent).setAlpha(0);
    const art = prepareArt(scene, BAKED_TALENT_NODES[node.id].face);
    this.icon = fitBakedUiImage(scene.add.image(0, 0, art?.key || iconKey, art?.frame), size, size);
    this.icon.setData("bakedTalentNode", node.id);
    this.hit = scene.add.image(0, 0, assets.nodeHalo.key)
      .setDisplaySize(G.nodeHitWidth, G.nodeHitHeight).setAlpha(G.invisibleHitAlpha)
      .setInteractive({ useHandCursor: true });
    this.root.add([this.halo, this.icon, this.hit]);
    this.hit.on("pointerover", () => {
      this.hovered = true;
      if (this.snapshot) this.setState(this.snapshot, this.selected);
    });
    this.hit.on("pointerout", () => {
      this.hovered = false;
      if (this.snapshot) this.setState(this.snapshot, this.selected);
    });
  }

  setState(snapshot, selected = false) {
    this.snapshot = snapshot;
    this.selected = selected;
    const { presentation: p } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const owned = snapshot?.purchased === true;
    const available = snapshot?.available === true;
    const waiting = snapshot?.reason === "insufficient-talent-points";
    this.icon.clearTint();
    if (owned || available) this.icon.setAlpha(p.purchasedAlpha);
    else if (waiting) this.icon.setAlpha(p.waitingAlpha);
    else this.icon.setTint(p.lockedTint).setAlpha(p.lockedAlpha);
    this.halo.setAlpha(selected || this.hovered ? p.haloAlpha : owned ? p.purchasedHaloAlpha
      : available ? p.availableHaloAlpha : waiting ? p.waitingHaloAlpha : 0);
  }

  setBranchVisible(visible) {
    this.root.setVisible(visible);
    this.hit.input.enabled = visible;
    if (!visible) this.hovered = false;
  }

  setViewportScale() {}
  setPosition(x, y) { this.root.setPosition(x, y); }
  destroy() { this.hit.removeAllListeners(); this.root.destroy(true); }
}
