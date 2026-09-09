// One fixed dossier contains authored talent copy, state and purchase controls.
import { CELESTIAL_FOCUS_CONTROLS as ART, CELESTIAL_FOCUS_LAYOUT as G, celestialFocusPoint } from "../../values/celestialTalentFocusUi.js";
import { BAKED_TALENT_NODES } from "../../values/bakedCelestialUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { prepareArt, fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { setCelestialArt } from "./bakedCelestialUi.js";
import { CelestialTalentStateView } from "./CelestialTalentStateView.js";

export class CelestialTalentDetailView {
  constructor(scene, parent) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    parent.add(this.root);
    const first = Object.values(BAKED_TALENT_NODES)[0];
    const image = (art, y) => {
      const source = prepareArt(scene, art), point = celestialFocusPoint(G.detailX, y);
      const view = scene.add.image(point.x, point.y, source.key, source.frame);
      this.root.add(view);
      return view;
    };
    this.portrait = image(first.face, G.portraitY);
    this.card = image(first.card, G.cardY);
    this.rank = image(ART.ranks[0], G.rankY);
    this.action = image(ART.unlock, G.actionY).setInteractive({ useHandCursor: true });
    const point = celestialFocusPoint(G.detailX, G.statusY);
    this.status = new CelestialTalentStateView(scene, this.root, point.x, point.y, G.statusWidth, G.statusHeight);
    const actionPoint = celestialFocusPoint(G.detailX, G.actionY);
    this.cost = scene.add.text(actionPoint.x + G.priceXOffset, actionPoint.y + G.priceYOffset, "", {
      fontFamily: UI_FONTS.mono, fontSize: G.priceFontSize, color: G.valueColor, align: "center",
    }).setOrigin(0.5);
    this.root.add(this.cost);
  }

  show(view, snapshot) {
    if (!view || !snapshot) return false;
    this.nodeId = snapshot.id;
    this.nodeView = view;
    this.snapshot = snapshot;
    const art = BAKED_TALENT_NODES[snapshot.id];
    setCelestialArt(this.scene, this.portrait, art.face, G.portraitSize, G.portraitSize);
    setCelestialArt(this.scene, this.card, art.card, G.cardWidth, G.cardHeight);
    this.card.setData("bakedTalentDescription", snapshot.id);
    setCelestialArt(this.scene, this.rank, ART.ranks[snapshot.rank], G.rankWidth, G.rankHeight);
    const max = snapshot.rank >= snapshot.maxRank;
    const upgrading = snapshot.purchased && !max;
    const button = max ? ART.mastered : upgrading ? ART.upgrade
      : snapshot.available ? snapshot.godMode ? ART.free : ART.unlock : ART.locked;
    setCelestialArt(this.scene, this.action, button, G.actionWidth, G.actionHeight);
    this.action.setAlpha(snapshot.available || max ? G.selectedAlpha : G.idleAlpha);
    this.action.setData("talentAction", snapshot.action);
    this.cost.setText(upgrading ? String(snapshot.starsCost) : "");
    if (upgrading) {
      const [x, y, width, height] = G.priceWellSource;
      const [frameX, frameY, frameWidth, frameHeight] = ART.upgrade.rect;
      const scale = this.action.scaleX;
      this.cost.setPosition(this.action.x + (x + width / 2 - frameX - frameWidth / 2) * scale,
        this.action.y + (y + height / 2 - frameY - frameHeight / 2) * scale);
      fitLiveUiText(this.cost, width * scale * G.priceWellInset, height * scale * G.priceWellInset);
    }
    const showState = !snapshot.available && !max;
    this.status.root.setVisible(showState);
    if (showState) this.status.setState(snapshot);
    this.visible = true;
    return true;
  }

  hitTest(point) {
    const p = celestialFocusPoint(G.detailX, G.actionY);
    return Math.abs(point.x - p.x) <= G.actionWidth / 2
      && Math.abs(point.y - p.y) <= G.actionHeight / 2;
  }

  refresh(snapshot) { return this.show(this.nodeView, snapshot); }
  setViewportScale() { if (this.snapshot) this.refresh(this.snapshot); }
  destroy() { this.root.destroy(true); this.scene = null; }
}
