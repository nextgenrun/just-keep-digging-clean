import { CelestialTalentProgressionSystem } from
  "../systems/progression/CelestialTalentProgressionSystem.js";
import { CelestialTalentTreeView } from
  "../ui/overlays/CelestialTalentTreeView.js";
import { CELESTIAL_TALENT_TREE_PRELOAD_ASSETS } from
  "../values/celestialTalentTreeUi.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";

const params = new URLSearchParams(globalThis.location.search);
const width = Math.max(960, Math.min(1600, Number(params.get("width")) || 1280));
const height = Math.max(640, Math.min(1000, Number(params.get("height")) || 720));
let playerLevel = Math.max(1, Math.min(99, Number(params.get("level")) || 5));

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
      getPlayerLevel: () => playerLevel,
    });
    this.progression.grantStars(params.has("stars") ? Number(params.get("stars")) : 500);
    if (params.get("all") === "1") {
      const rank = Math.max(1, Math.min(3, Number(params.get("rank")) || 1));
      const nodes = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches
        .flatMap(branch => branch.nodes);
      nodes.forEach(node => this.progression.purchaseNode(node.id));
      for (let nextRank = 2; nextRank <= rank; nextRank += 1) {
        nodes.forEach(node => this.progression.upgradeNode(node.id));
      }
    } else if (params.get("fresh") !== "1") {
      this.progression.purchaseNode("wayward-star-root");
      this.progression.purchaseNode("wayward-stellar-bearings");
    }
    if (params.get("legacy") === "1") this.progression.loadSaveData({
      version: 2, stars: 450, spentStars: 50,
      purchasedNodeIds: ["wayward-star-root", "wayward-stellar-bearings"],
    });
    this.view = new CelestialTalentTreeView(this, {
      progression: this.progression,
      getMoney: () => 125000,
    });
    this.view.open();
    const inspectNodeId = params.get("node");
    if (inspectNodeId) this.view.selectNode(inspectNodeId, true);

    const snapshot = () => {
      const talents = this.progression.getSnapshot();
      return {
        ready: true,
        viewport: { width: this.scale.width, height: this.scale.height },
        health: this.view.getHealthSnapshot(),
        root: {
          x: this.view.root.x,
          y: this.view.root.y,
          scale: this.view.root.scaleX,
        },
        selectedNodeId: this.view.nodes[this.view.selectedIndex]?.node?.id || null,
        visibleLockCount: this.view.nodes.filter(node => node.lock.visible).length,
        productionView: this.view.constructor.name,
        talents: {
          playerLevel,
          talentPoints: talents.talentPoints,
          spentTalentPoints: talents.spentTalentPoints,
          nodeRanks: talents.nodeRanks,
          stars: talents.stars,
          spentStars: talents.spentStars,
          purchasedNodeIds: [...talents.purchasedNodeIds],
        },
        labels: {
          talentPoints: this.view.talentPointsText.text,
          starPoints: this.view.starsText.text,
          detail: this.view.detailStatus.text,
          tooltip: this.view.tooltip.body.text,
        },
        nodes: this.view.nodes.map(view => ({
          id: view.node.id, label: view.status.text, center: nodeCenter(view.node.id),
          available: view.snapshot.available, purchased: view.snapshot.purchased,
          rank: view.snapshot.rank, reason: view.snapshot.reason,
        })),
      };
    };
    const nodeCenter = nodeId => {
      const node = this.view.nodesById.get(nodeId);
      if (!node) return null;
      const matrix = node.root.getWorldTransformMatrix();
      return {
        x: matrix.tx,
        y: matrix.ty,
        hitWidth: this.view.config.layout.nodeHitWidthPx * matrix.scaleX,
        hitHeight: this.view.config.layout.nodeHitHeightPx * matrix.scaleY,
      };
    };
    const publishSnapshot = () => {
      document.body.dataset.celestialTalentTreeSnapshot = JSON.stringify(snapshot());
    };
    // Real test-only input, never browser-side mutation of production game state.
    this.input.keyboard.on("keydown-L", () => {
      playerLevel = Math.min(99, playerLevel + 1);
      this.view.refresh();
      publishSnapshot();
    });
    this.input.keyboard.on("keydown-R", () => {
      this.progression.loadSaveData(JSON.parse(JSON.stringify(this.progression.getSaveData())));
      publishSnapshot();
    });
    this.input.keyboard.on("keydown-ENTER", () => this.view.activateSelected());
    this.reviewUnsubscribe = this.progression.subscribe(publishSnapshot);
    this.events.once("shutdown", () => this.reviewUnsubscribe?.());
    globalThis.__celestialTalentTreeReview = Object.freeze({
      snapshot,
      nodeCenter,
      selectNode: nodeId => {
        this.view.selectNode(nodeId, true);
        publishSnapshot();
        return snapshot();
      },
    });
    document.body.dataset.celestialTalentTreeReady = "true";
    publishSnapshot();
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
