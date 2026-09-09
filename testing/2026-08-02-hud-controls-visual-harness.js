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
    const search = new URLSearchParams(location.search);
    this.cameras.main.setScroll(
      Number(search.get("scrollX")) || 0,
      Number(search.get("scrollY")) || 0,
    );
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
      pauseOpen: false,
      shopOpen: false,
      scenePointerDowns: 0,
      lastCurrentlyOverCount: 0,
      lastPointerX: null,
      lastPointerY: null,
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


    this.uiMuteToggle = new UIMuteToggle(this, this.soundSystem);
    this.uiInventoryPopup = new UIInventoryPopup(this);
    this.uiInventoryPopup.setMoney(420);
    this.uiInventoryPopup.setResources({ dirt: 18, stone: 7, copper: 3 });
    this.toggleInventoryFromHud = () => {
      if (this.harnessState.pauseOpen) return false;
      this.uiInventoryPopup.toggle();
      return true;
    };
    this.togglePauseMenuFromHud = () => {
      if (this.uiInventoryPopup.isOpen) {
        this.uiInventoryPopup.close();
        return true;
      }
      this.harnessState.pauseOpen = !this.harnessState.pauseOpen;
      this.harnessState.controlsEnabled = !this.harnessState.pauseOpen;
      return true;
    };

    this.input.on("pointerdown", (pointer, currentlyOver = []) => {
      this.harnessState.scenePointerDowns += 1;
      this.harnessState.lastCurrentlyOverCount = currentlyOver.length;
      this.harnessState.lastPointerX = pointer?.x ?? null;
      this.harnessState.lastPointerY = pointer?.y ?? null;
    });

    const snapshot = () => {
      const musicHit = this.uiMuteToggle._musicHit;
      const sfxHit = this.uiMuteToggle._sfxHit;
      const lootHit = this.hudSystem.lootBagHit;
      const pauseHit = this.hudSystem.pauseMenuHit;
      const hitSize = hit => [hit?.input?.hitArea?.width || 0, hit?.input?.hitArea?.height || 0];
      const controls = this.hudSystem.quickControls;
      const camera = this.cameras.main;
      const screenHitTests = Object.fromEntries([
        ["inventory", controls?.inventoryContainer, controls?.inventoryHit],
        ["pause", controls?.pauseContainer, controls?.pauseHit],
        ["map", controls?.mapContainer, controls?.mapHit],
        ["wiki", controls?.wikiShortcut?.container, controls?.wikiShortcut?.hit],
      ].map(([name, container, hit]) => [name, Boolean(hit && container
        && this.input.manager.hitTest(
          { x: container.x + hit.x, y: container.y + hit.y }, [hit], camera,
        ).includes(hit))]));
      return {
        ready: true,
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        screenHitTests,
        approvedSkinActive: this.hudSystem.approvedSkin?.active === true,
        musicEnabled: this.soundSystem.musicEnabled,
        sfxEnabled: this.soundSystem.sfxEnabled,
        musicAlpha: this.uiMuteToggle._musicImg?.alpha,
        sfxAlpha: this.uiMuteToggle._sfxImg?.alpha,
        inventoryOpen: this.uiInventoryPopup.isOpen,
        pauseOpen: this.harnessState.pauseOpen,
        inventoryShellVisible: this.uiInventoryPopup.shell?.root?.visible === true,
        controlsEnabled: this.harnessState.controlsEnabled,
        shopOpen: this.harnessState.shopOpen,
        uiInputPriority: hasUiInputPriority(this),
        uiSelectCount: this.harnessState.uiSelectCount,
        scenePointerDowns: this.harnessState.scenePointerDowns,
        lastCurrentlyOverCount: this.harnessState.lastCurrentlyOverCount,
        lastPointer: {
          x: this.harnessState.lastPointerX,
          y: this.harnessState.lastPointerY,
        },
        hitSizes: {
          music: hitSize(musicHit),
          sfx: hitSize(sfxHit),
          inventory: hitSize(lootHit),
          pause: hitSize(pauseHit),
        },
        visualSizes: {
          inventory: [this.hudSystem.lootBagIcon?.displayWidth || 0, this.hudSystem.lootBagIcon?.displayHeight || 0],
          pause: [
            this.hudSystem.quickControls?.pauseFrame?.displayWidth || 0,
            this.hudSystem.quickControls?.pauseFrame?.displayHeight || 0,
          ],
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
          pause: {
            x: this.hudSystem.pauseMenuContainer.x + pauseHit.x,
            y: this.hudSystem.pauseMenuContainer.y + pauseHit.y,
          },
        },
        quickControls: this.hudSystem.quickControls?.getHealthSnapshot?.(),
      };
    };

    globalThis.__HUD_CONTROLS_HARNESS__ = Object.freeze({ snapshot });
    this.publishHarnessSnapshot = () => {
      document.body.dataset.hudControlsSnapshot = JSON.stringify(snapshot());
    };
    this.publishHarnessSnapshot();
    this.harnessSnapshotInterval = globalThis.setInterval(
      this.publishHarnessSnapshot,
      50,
    );
    this.events.once("shutdown", () => {
      globalThis.clearInterval(this.harnessSnapshotInterval);
      this.harnessSnapshotInterval = null;
    });
    document.body.dataset.hudControlsReady = "true";
  }

  update() {
    this.publishHarnessSnapshot?.();
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
