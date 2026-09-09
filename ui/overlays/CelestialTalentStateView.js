// Fixed availability copy is authored art; only prices and level gates are live.
import { BAKED_TALENT_NODES, BAKED_CELESTIAL_LAYOUT } from "../../values/bakedCelestialUi.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { addCelestialArt, addCelestialLabel, addCelestialMessage } from "./bakedCelestialUi.js";
import { fitLiveUiText } from "../../systems/visual/bakedUiArt.js";

export class CelestialTalentStateView {
  constructor(scene, parent, x, y, width, height) {
    this.scene = scene;
    this.root = scene.add.container(x, y);
    this.width = width;
    this.height = height;
    parent.add(this.root);
  }

  setState(snapshot) {
    const signature = JSON.stringify(snapshot);
    if (signature === this.signature) return;
    this.signature = signature;
    this.root.removeAll(true);
    const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
    const geometry = BAKED_CELESTIAL_LAYOUT;
    const label = (value, y = 0) => addCelestialLabel(this.scene, this.root,
      value, 0, y, this.width, geometry.statusLabelHeight);
    const message = value => addCelestialMessage(this.scene, this.root,
      value, 0, 0, this.width, this.height);
    if (!snapshot) { message(copy.inspect); return; }
    if (snapshot.reason === "max-rank") { message(copy.maxRank); return; }
    if (snapshot.reason === "talents-locked") { message(copy.talentsLocked); return; }
    if (snapshot.reason === "root-choice-locked") { message(copy.rootChoiceLocked); return; }
    if (snapshot.reason === "insufficient-talent-points") {
      message("Need 1 Talent Point. Earn one each level, starting at Level 3."); return;
    }
    if (snapshot.reason === "prerequisite-locked") {
      if (snapshot.prerequisiteMode === "any") { message(copy.prerequisiteLocked); return; }
      const required = (snapshot.missingPrerequisiteIds || [])
        .map(id => BAKED_TALENT_NODES[id]?.name).filter(Boolean);
      if (!required.length) { message(copy.prerequisiteLocked); return; }
      label("UNLOCK", -this.height / 2 + geometry.statusLabelHeight / 2);
      required.forEach((art, index) => addCelestialArt(this.scene, this.root, art, 0,
        -this.height / 2 + geometry.statusLineGap + index * geometry.prerequisiteGap,
        this.width, geometry.prerequisiteNameHeight));
      return;
    }
    if (snapshot.reason === "level-locked") {
      label("LV", -geometry.statusLineGap / 2);
      this._number(snapshot.requiredLevel, geometry.statusLineGap / 2); return;
    }
    if (snapshot.available && snapshot.action !== "upgrade") { message(copy.available); return; }
    if (snapshot.available && snapshot.godMode) { label("FREE"); return; }
    if (snapshot.action === "upgrade" || snapshot.reason === "insufficient-stars") {
      label("UPGRADE", -geometry.statusLineGap / 2);
      this._number(snapshot.starsCost, geometry.statusLineGap / 2, snapshot.available);
      addCelestialLabel(this.scene, this.root, "SP", this.width / 3,
        geometry.statusLineGap / 2, this.width / 4, geometry.statusLabelHeight);
      return;
    }
    message(copy.unknownLocked);
  }

  _number(value, y, available = true) {
    const p = CELESTIAL_TALENT_TREE_UI_CONFIG.presentation;
    const text = this.scene.add.text(0, y, String(value), {
      fontFamily:UI_FONTS.mono, fontSize:BAKED_CELESTIAL_LAYOUT.statusNumberSize,
      color:available ? p.readyColor : p.lockedColor, align:"center",
    }).setOrigin(0.5);
    fitLiveUiText(text, this.width / 2, BAKED_CELESTIAL_LAYOUT.statusLineGap);
    this.root.add(text);
  }
}
