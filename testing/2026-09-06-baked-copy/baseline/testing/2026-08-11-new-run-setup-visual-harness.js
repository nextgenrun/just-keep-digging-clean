import { NewRunSetupOverlay } from "../ui/scenes/NewRunSetupOverlay.js";
import { getSaveMenuAssetEntries } from "../values/saveMenuPresentation.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { NEW_RUN_SETUP_CONFIG } from "../values/newRunSetup.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";

class NewRunSetupVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("NewRunSetupVisualHarnessScene");
  }

  preload() {
    for (const [key, path] of getSaveMenuAssetEntries()) {
      this.load.image(key, `../${path}`);
    }
    for (const [assetId, path] of Object.entries(NEW_RUN_SETUP_CONFIG.assets)) {
      this.load.image(ASSET_KEYS.ui.newRunSetup[assetId], `../${path}`);
    }
    this.load.spritesheet(UI_ICON_ATLAS.key, `../${UI_ICON_ATLAS.path}`, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
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
          iconTexture: card.icon.texture?.key || "",
          iconFrame: card.icon.frame?.name ?? null,
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
