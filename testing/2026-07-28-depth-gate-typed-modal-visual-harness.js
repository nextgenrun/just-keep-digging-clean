import {
  HARDCORE_MODE_CONFIG,
  getHardcoreModePreloadAssets,
} from "../values/hardcoreMode.js";
import { getHardcoreMemorialPreloadAssets } from "../values/hardcoreMemorials.js";
import { DEPTH_GATE_CONFIG } from "../values/depthGateConfig.js";
import { HardcoreModalOverlay } from "../ui/overlays/HardcoreModalOverlay.js";

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
        title: this.modal?.title?.text || "",
        subtitle: this.modal?.subtitle?.text || "",
        instruction: this.modal?.instruction?.text || "",
        typed: this.modal?.typed?.text || "",
        footer: this.modal?.footer?.text || "",
      }),
    };
    document.body.dataset.reviewReady = "true";
  }

  showMode(requestedMode) {
    const mode = MODES[requestedMode] ? requestedMode : "depth";
    this.modal.close();
    this.mode = mode;
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
