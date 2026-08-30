import { SleepingJackpotModalOverlay } from "../ui/overlays/SleepingJackpotModalOverlay.js";
import {
  RANDOM_EVENT_PRELOAD_ASSETS,
  RANDOM_WORLD_EVENT_CONFIG,
} from "../values/randomWorldEvents.js";
import { RESOURCE_KEYS, getResourceDisplayName } from "../values/resourceTypes.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";

const VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const BACKGROUND_KEY = "sleeping-jackpot-harness-background";
const BACKGROUND_PATH =
  "../sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v1.webp";

function buildEscrow() {
  return Object.fromEntries(RESOURCE_KEYS.map((key, index) => [key, 8 + index * 3]));
}

function selectedChoice() {
  return new URLSearchParams(location.search).get("choice") === "immediate"
    ? "immediate"
    : "maturity";
}

function resultBody() {
  if (new URLSearchParams(location.search).get("result") === "resources") {
    return RESOURCE_KEYS.map((key, index) => (
      `${getResourceDisplayName(key).toUpperCase()}  +${72 + index * 27}`
    )).join("\n");
  }
  return [
    "ALL LISTED RESOURCES ARE SEALED UNTIL 100M.",
    "WIN RETURNS ×9 EACH STAKED STACK.",
    "LOSS DESTROYS THE SEALED STACKS.",
    "THE OUTCOME IS ALREADY COMMITTED.",
  ].join("\n\n");
}

function boundsOf(object) {
  if (!object?.getBounds) return null;
  const bounds = object.getBounds();
  return {
    x: Number(bounds.x.toFixed(2)),
    y: Number(bounds.y.toFixed(2)),
    width: Number(bounds.width.toFixed(2)),
    height: Number(bounds.height.toFixed(2)),
    right: Number(bounds.right.toFixed(2)),
    bottom: Number(bounds.bottom.toFixed(2)),
  };
}

class SleepingJackpotAlignmentHarnessScene extends Phaser.Scene {
  constructor() {
    super("SleepingJackpotAlignmentHarnessScene");
  }

  preload() {
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    const panel = RANDOM_EVENT_PRELOAD_ASSETS[0];
    this.load.image(panel.key, `../${panel.path}`);
    this.load.spritesheet(UI_ICON_ATLAS.key, `../${UI_ICON_ATLAS.path}`, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
  }

  create() {
    this.add.image(VIEWPORT.width / 2, VIEWPORT.height / 2, BACKGROUND_KEY)
      .setDisplaySize(VIEWPORT.width, VIEWPORT.height);
    this.soundSystem = { playUiSelect() {} };
    this.uiNotifications = { setPaused() {} };
    this.modal = new SleepingJackpotModalOverlay(this);
    this.modal.showChoice({
      quote: {
        immediate: {
          enabled: true,
          wager: 500,
          possibleGain: 1500,
          oddsBps: 5000,
          reason: "",
        },
        maturity: {
          enabled: true,
          targetDepth: 100,
          multiplier: 9,
          oddsBps: 5000,
          escrow: buildEscrow(),
          reason: "",
        },
      },
      onConfirm: async () => ({
        title: "THE JACKPOT SLEEPS",
        body: resultBody(),
      }),
      onCancel: () => undefined,
    });
    const choice = selectedChoice();
    this.modal._select(choice);
    const phrase = RANDOM_WORLD_EVENT_CONFIG.sleepingJackpot.phrases[choice];
    for (const key of phrase) {
      this.modal._handleKey({ key, preventDefault() {}, stopPropagation() {} });
    }
    this.time.delayedCall(250, () => this._publishSnapshot());
  }

  _publishSnapshot() {
    const modal = this.modal;
    const snapshot = {
      selected: modal.selected,
      panel: boundsOf(modal.panel),
      title: boundsOf(modal.title),
      subtitle: boundsOf(modal.subtitle),
      leftTitle: boundsOf(modal.leftTitle),
      rightTitle: boundsOf(modal.rightTitle),
      leftBody: boundsOf(modal.leftBody),
      rightBody: boundsOf(modal.rightBody),
      leftFocus: boundsOf(modal.leftFocus),
      rightFocus: boundsOf(modal.rightFocus),
      leftFocusIcon: boundsOf(modal.leftFocusIcon),
      rightFocusIcon: boundsOf(modal.rightFocusIcon),
      instruction: boundsOf(modal.instruction),
      typed: boundsOf(modal.typed),
      footer: boundsOf(modal.footer),
      leftHit: boundsOf(modal.leftHit),
      rightHit: boundsOf(modal.rightHit),
    };
    Object.assign(this.game.canvas.dataset, {
      harnessReady: "true",
      jackpotSnapshot: JSON.stringify(snapshot),
    });
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  backgroundColor: "#03070d",
  parent: document.body,
  scene: SleepingJackpotAlignmentHarnessScene,
  render: { antialias: true, pixelArt: false, preserveDrawingBuffer: true },
});
