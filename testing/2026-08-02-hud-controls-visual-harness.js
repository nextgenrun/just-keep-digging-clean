import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { hasUiInputPriority } from "../systems/UiInputPriorityRegistry.js";
import { UIInventoryPopup } from "../ui/overlays/UIInventoryPopup.js";
import { UIMuteToggle } from "../ui/hud/UIMuteToggle.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";

class HudControlsVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("HudControlsVisualHarnessScene");
  }

  preload() {
    for (const [id, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      this.load.image(ASSET_KEYS.ui.approvedHud[id], `../${path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05090d);
    this.dayNightCycle = {
      getCurrentPhaseLabel: () => "Night",
      getDay: () => 7,
      getSeason: () => "winter",
      getTimeString12: () => "11:42 PM",
      getCurrentTemperature: () => -6,
    };
    this.weatherSystem = {
      getSnapshot: () => ({
        kind: "storm",
        forecastKind: "clear",
        intensity: 0.72,
        isStorming: true,
      }),
    };
    this.upgradeSystem = { ownedPickaxe: null };

    this.harnessState = {
      controlsEnabled: true,
      shopOpen: false,
      scenePointerDowns: 0,
      lastCurrentlyOverCount: 0,
      uiSelectCount: 0,
    };
    this.playerController = {
      setControlsEnabled: enabled => {
        this.harnessState.controlsEnabled = enabled;
      },
    };
    this.setShopOpen = open => {
      this.harnessState.shopOpen = open;
    };
    this.soundSystem = {
      musicEnabled: true,
      sfxEnabled: true,
      applySettings: settings => {
        if (Object.prototype.hasOwnProperty.call(settings, "musicEnabled")) {
          this.soundSystem.musicEnabled = Boolean(settings.musicEnabled);
        }
        if (Object.prototype.hasOwnProperty.call(settings, "sfxEnabled")) {
          this.soundSystem.sfxEnabled = Boolean(settings.sfxEnabled);
        }
      },
      playUiSelect: () => {
        this.harnessState.uiSelectCount += 1;
      },
    };

    this.hudSystem = new HUDSystem(this, 279);
    this.hudSystem.setSystemVisibility({
      clock: true,
      weather: true,
      torch: false,
      combo: false,
      buff: false,
    });
    this.hudSystem.updateClockWeather();

    this.uiMuteToggle = new UIMuteToggle(this, this.soundSystem);
    this.uiInventoryPopup = new UIInventoryPopup(this);
    this.uiInventoryPopup.setMoney(420);
    this.uiInventoryPopup.setResources({ dirt: 18, stone: 7, copper: 3 });

    this.input.on("pointerdown", (_pointer, currentlyOver = []) => {
      this.harnessState.scenePointerDowns += 1;
      this.harnessState.lastCurrentlyOverCount = currentlyOver.length;
    });

    const snapshot = () => {
      const musicHit = this.uiMuteToggle._musicHit;
      const sfxHit = this.uiMuteToggle._sfxHit;
      const lootHit = this.hudSystem.lootBagHit;
      const hitSize = hit => [hit?.input?.hitArea?.width || 0, hit?.input?.hitArea?.height || 0];
      return {
        ready: true,
        approvedSkinActive: this.hudSystem.approvedSkin?.active === true,
        musicEnabled: this.soundSystem.musicEnabled,
        sfxEnabled: this.soundSystem.sfxEnabled,
        musicAlpha: this.uiMuteToggle._musicImg?.alpha,
        sfxAlpha: this.uiMuteToggle._sfxImg?.alpha,
        inventoryOpen: this.uiInventoryPopup.isOpen,
        inventoryShellVisible: this.uiInventoryPopup.shell?.root?.visible === true,
        controlsEnabled: this.harnessState.controlsEnabled,
        shopOpen: this.harnessState.shopOpen,
        uiInputPriority: hasUiInputPriority(this),
        uiSelectCount: this.harnessState.uiSelectCount,
        scenePointerDowns: this.harnessState.scenePointerDowns,
        lastCurrentlyOverCount: this.harnessState.lastCurrentlyOverCount,
        hitSizes: {
          music: hitSize(musicHit),
          sfx: hitSize(sfxHit),
          inventory: hitSize(lootHit),
        },
        visualSizes: {
          inventory: [this.hudSystem.lootBagIcon?.displayWidth || 0, this.hudSystem.lootBagIcon?.displayHeight || 0],
        },
        positions: {
          music: {
            x: this.uiMuteToggle.container.x + musicHit.x,
            y: this.uiMuteToggle.container.y + musicHit.y,
          },
          sfx: {
            x: this.uiMuteToggle.container.x + sfxHit.x,
            y: this.uiMuteToggle.container.y + sfxHit.y,
          },
          inventory: {
            x: this.hudSystem.lootBagContainer.x + lootHit.x,
            y: this.hudSystem.lootBagContainer.y + lootHit.y,
          },
        },
      };
    };

    globalThis.__HUD_CONTROLS_HARNESS__ = Object.freeze({ snapshot });
    document.body.dataset.hudControlsReady = "true";
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: APPROVED_HUD_SKIN.referenceViewport.width,
  height: APPROVED_HUD_SKIN.referenceViewport.height,
  backgroundColor: 0x05090d,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [HudControlsVisualHarnessScene],
});
