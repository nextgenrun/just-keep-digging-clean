import {
  HARDCORE_MODE_CONFIG,
  getHardcoreModePreloadAssets,
} from "../values/hardcoreMode.js";
import { getHardcoreMemorialPreloadAssets } from "../values/hardcoreMemorials.js";
import { DEPTH_GATE_CONFIG } from "../values/depthGateConfig.js";
import { HardcoreModalOverlay } from "../ui/overlays/HardcoreModalOverlay.js";
import {
  buildHardcoreDeathRecapPages,
} from "../systems/hardcore/hardcoreMemorialRecord.js";

const params = new URLSearchParams(window.location.search);
const requestedDepthThreshold = Number(params.get("threshold")) || 300;
const depthReviewGate = DEPTH_GATE_CONFIG.gates.find(
  gate => gate.threshold === requestedDepthThreshold,
) || DEPTH_GATE_CONFIG.gates.find(gate => gate.threshold === 300);

const MODES = Object.freeze({
  depth: Object.freeze({
    title: depthReviewGate.title,
    subtitle: DEPTH_GATE_CONFIG.confirmation.subtitle,
    body: depthReviewGate.message,
    footer: DEPTH_GATE_CONFIG.confirmation.footer,
    confirmationWord: depthReviewGate.confirmationWord,
    typedInstruction: depthReviewGate.typedInstruction,
  }),
  unstuck: Object.freeze({
    title: HARDCORE_MODE_CONFIG.copy.unstuckTitle,
    subtitle: "50% OF EVERY CARRIED RESOURCE WILL BE LOST",
    body: HARDCORE_MODE_CONFIG.copy.unstuckBody,
    footer: "ESC  CANCEL",
  }),
});

const MEMORIAL_RECORD = Object.freeze({
  slotId: 1,
  reason: "The Graveborer Wurm shattered your final Gem Power",
  depth: 777,
  player: Object.freeze({
    level: 18,
    gemPowerMax: 721,
    carriedResourceUnits: 329,
  }),
  hardcore: Object.freeze({
    activePlayMs: 7345000,
    peakStress: 96,
    unstuckUses: 2,
    paidTeleports: 9,
    teleportMoneySpent: 23000,
    wurmEncounters: 6,
  }),
  stats: Object.freeze({
    bestDepth: 777,
    currentDepth: 777,
    totalTilesBroken: 18420,
    totalResources: 6188,
    moneyEarned: 456789,
    resourcesSold: 3290,
    upgradesPurchased: 14,
    portalsActivated: 8,
    chestsOpened: 22,
    starsCollected: 17,
    relicsFound: 5,
    criticalHits: 842,
    highestCombo: 39,
    luckyDrops: 76,
    overkills: 412,
    earthquakesSurvived: 11,
    passagesOpened: 9,
    expeditionsCompleted: 31,
  }),
  achievements: Object.freeze([
    Object.freeze({
      id: "depth-500",
      title: "Beneath the Old Stone",
      detail: "Reached 500m in a single Hardcore oath.",
    }),
    Object.freeze({
      id: "wurm-survivor",
      title: "Teeth in the Dark",
      detail: "Outplayed five Graveborer Wurm hunts.",
    }),
  ]),
});

class DepthGateTypedModalReviewScene extends Phaser.Scene {
  constructor() {
    super("DepthGateTypedModalReviewScene");
  }

  preload() {
    const assets = [
      ...getHardcoreModePreloadAssets(),
      ...getHardcoreMemorialPreloadAssets(),
    ];
    assets.forEach(asset => this.load.image(asset.key, `../${asset.path}`));
  }

  create() {
    this.soundSystem = {
      playUiSelect() {},
      playUiConfirm() {},
    };
    this.modal = new HardcoreModalOverlay(this, HARDCORE_MODE_CONFIG);
    this.showMode(params.get("mode") || "depth");
    globalThis.__depthGateTypedModalReview = {
      ready: true,
      scene: this,
      show: mode => this.showMode(mode),
      snapshot: () => ({
        mode: this.mode,
        visible: this.modal?.isVisible === true,
        title: this.mode === "memorial"
          ? this.modal?.deathView?.title?.text || ""
          : this.modal?.title?.text || "",
        subtitle: this.mode === "memorial"
          ? this.modal?.deathView?.subtitle?.text || ""
          : this.modal?.subtitle?.text || "",
        instruction: this.modal?.instruction?.text || "",
        typed: this.modal?.typed?.text || "",
        footer: this.mode === "memorial"
          ? this.modal?.deathView?.footer?.text || ""
          : this.modal?.footer?.text || "",
        pageTitle: this.modal?.deathView?.pageTitle?.text || "",
      }),
    };
    document.body.dataset.reviewReady = "true";
  }

  showMode(requestedMode) {
    const mode = requestedMode === "memorial" || MODES[requestedMode]
      ? requestedMode
      : "depth";
    this.modal.close();
    this.mode = mode;
    if (mode === "memorial") {
      this.modal.showMemorial({
        reason: MEMORIAL_RECORD.reason,
        depth: MEMORIAL_RECORD.depth,
        slotId: MEMORIAL_RECORD.slotId,
        pages: buildHardcoreDeathRecapPages(MEMORIAL_RECORD),
        onClose: () => {},
      });
      return;
    }
    this.modal.showConfirmation({
      ...MODES[mode],
      onCancel: () => this.showMode(mode),
      onConfirm: () => {
        this.time.delayedCall(250, () => this.showMode(mode));
        return true;
      },
    });
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "review-root",
  width: 1280,
  height: 720,
  backgroundColor: "#030207",
  scene: [DepthGateTypedModalReviewScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
});
