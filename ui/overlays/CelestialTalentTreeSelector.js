// Three complete illustrated cards choose which talent tree is visible.
import { CELESTIAL_FOCUS_ASSETS, CELESTIAL_FOCUS_LAYOUT as G } from "../../values/celestialTalentFocusUi.js";
import { prepareArt, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";

export class CelestialTalentTreeSelector {
  constructor(scene, parent, branches, onFocus) {
    this.root = scene.add.container(0, 0);
    this.foundation = fitBakedUiImage(scene.add.image(0, 0, CELESTIAL_FOCUS_ASSETS.selector.key), G.width, G.height);
    this.root.add(this.foundation);
    this.cards = G.selectorRects.map((rect, index) => {
      const art = prepareArt(scene, { ...CELESTIAL_FOCUS_ASSETS.selector, frame: `tree-choice-${index}`, rect });
      const image = scene.add.image(rect[0] + rect[2] / 2 - G.width / 2,
        rect[1] + rect[3] / 2 - G.height / 2, art.key, art.frame)
        .setInteractive({ useHandCursor: true });
      image.on("pointerover", () => onFocus(index));
      this.root.add(image);
      return { image, branchId: branches[index]?.id, rect };
    });
    parent.add(this.root);
    this.setFocused(0);
  }

  setFocused(index) {
    this.cards.forEach((card, i) => card.image.setTint(i === index ? G.cardSelectedTint : G.cardIdleTint));
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    this.cards.forEach(card => { card.image.input.enabled = visible; });
  }

  hitTest(point) {
    return this.cards.findIndex(({ rect }) => point.x + G.width / 2 >= rect[0]
      && point.x + G.width / 2 <= rect[0] + rect[2]
      && point.y + G.height / 2 >= rect[1]
      && point.y + G.height / 2 <= rect[1] + rect[3]);
  }

  destroy() { this.root.destroy(true); }
}
