import { CelestialTalentProgressionSystem } from
  "../systems/progression/CelestialTalentProgressionSystem.js";
import { CelestialTalentTreeView } from
  "../ui/overlays/CelestialTalentTreeView.js";
import { CELESTIAL_TALENT_TREE_PRELOAD_ASSETS } from
  "../values/celestialTalentTreeUi.js";

const params = new URLSearchParams(globalThis.location.search);
const width = Math.max(960, Math.min(1600, Number(params.get("width")) || 1280));
const height = Math.max(640, Math.min(1000, Number(params.get("height")) || 720));

class CelestialTalentTreeHarnessScene extends Phaser.Scene {
  constructor() {
    super("CelestialTalentTreeHarnessScene");
  }

  preload() {
    for (const asset of CELESTIAL_TALENT_TREE_PRELOAD_ASSETS) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    this.progression = new CelestialTalentProgressionSystem({
      getPlayerLevel: () => 50,
    });
    this.progression.grantStars(500);
    this.progression.purchaseNode("wayward-star-root");
    this.progression.purchaseNode("wayward-stellar-bearings");
    this.view = new CelestialTalentTreeView(this, {
      progression: this.progression,
      getMoney: () => 125000,
    });
    this.view.open();
    const inspectNodeId = params.get("node");
    if (inspectNodeId) this.view.selectNode(inspectNodeId, true);

    const snapshot = () => ({
      ready: true,
      viewport: { width: this.scale.width, height: this.scale.height },
      health: this.view.getHealthSnapshot(),
      root: {
        x: this.view.root.x,
        y: this.view.root.y,
        scale: this.view.root.scaleX,
      },
      selectedNodeId: this.view.nodes[this.view.selectedIndex]?.node?.id || null,
      productionView: this.view.constructor.name,
    });
    globalThis.__celestialTalentTreeReview = Object.freeze({ snapshot });
    document.body.dataset.celestialTalentTreeReady = "true";
    document.body.dataset.celestialTalentTreeSnapshot = JSON.stringify(snapshot());
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width,
  height,
  backgroundColor: 0x02060a,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [CelestialTalentTreeHarnessScene],
});
