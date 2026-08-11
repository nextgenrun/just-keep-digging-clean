import { NewRunSetupOverlay } from "../ui/scenes/NewRunSetupOverlay.js";
import { getSaveMenuAssetEntries } from "../values/saveMenuPresentation.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";

class NewRunSetupVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("NewRunSetupVisualHarnessScene");
  }

  preload() {
    for (const [key, path] of getSaveMenuAssetEntries()) {
      this.load.image(key, `../${path}`);
    }
    this.load.image(
      ASSET_KEYS.ui.hardcore.oathPanel,
      `../${HARDCORE_MODE_CONFIG.assets.panel.path}`,
    );
    this.load.image(
      ASSET_KEYS.ui.hardcore.oathCrest,
      `../${HARDCORE_MODE_CONFIG.assets.crest.path}`,
    );
    for (const id of ["playerCore", "inventory"]) {
      this.load.image(ASSET_KEYS.ui.approvedHud[id], `../${APPROVED_HUD_SKIN.paths[id]}`);
    }
    this.load.image(
      ASSET_KEYS.onboarding.openingFlightV2.shaftMarker,
      `../${ASSET_KEYS.onboarding.openingFlightV2.paths.shaftMarker}`,
    );
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05090d);
    this._useAuthoredSaveMenuArt = true;
    this.soundSystem = {
      playUiSelect: () => {},
      playUiConfirm: () => {},
    };
    this.lastSelection = null;
    this.overlay = new NewRunSetupOverlay(this);
    this.showOverlay = () => this.overlay.show({
      onChoose: selection => {
        this.lastSelection = selection;
      },
    });
    this.showOverlay();

    const snapshot = () => ({
      ready: true,
      visible: this.overlay.isVisible,
      mode: this.overlay.mode,
      tutorialChoice: this.overlay.tutorialChoice,
      skipConfirmation: this.overlay.skipConfirmation,
      status: this.overlay.status?.text || "",
      lastSelection: this.lastSelection,
      cards: Object.fromEntries(
        [...this.overlay.cards].map(([id, card]) => [id, {
          x: this.overlay.root.x + card.root.x,
          y: this.overlay.root.y + card.root.y,
          selected: card.selected.visible === true,
          alpha: card.root.alpha,
          title: card.title.text,
        }]),
      ),
      start: {
        x: this.overlay.root.x + (this.overlay.startButton?.root?.x || 0),
        y: this.overlay.root.y + (this.overlay.startButton?.root?.y || 0),
      },
    });

    globalThis.__NEW_RUN_SETUP_HARNESS__ = Object.freeze({
      snapshot,
      show: () => this.showOverlay(),
    });
    this.publishHarnessSnapshot = () => {
      document.body.dataset.newRunSetupSnapshot = JSON.stringify(snapshot());
    };
    this.publishHarnessSnapshot();
    document.body.dataset.newRunSetupReady = "true";
  }

  update() {
    this.publishHarnessSnapshot?.();
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: 0x05090d,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [NewRunSetupVisualHarnessScene],
});
