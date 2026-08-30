import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { ContextualMechanicTutorialSystem } from
  "../systems/onboarding/ContextualMechanicTutorialSystem.js";
import { CelestialActionBarSystem } from "../systems/visual/CelestialActionBarSystem.js";
import { NextPromiseHudSystem } from "../systems/visual/NextPromiseHudSystem.js";
import { ApprovedHudSkin } from "../systems/visual/ApprovedHudSkin.js";
import { EmberDiscoveryEventSystem } from
  "../systems/visual/EmberDiscoveryEventSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CAMPFIRE_CONFIG } from "../values/campfireConfig.js";
import { EMBER_DISCOVERY_EVENT_CONFIG } from "../values/emberDiscoveryEvent.js";
import {
  CELESTIAL_ACTION_BAR_EAGER_ASSETS,
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../values/celestialActionBar.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../values/celestialTalentTreeUi.js";
import { TOWN_TUTORIAL_STAGES } from "../values/retentionConfig.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";

const ENGINE_ASSETS = Object.freeze([
  [ASSET_KEYS.celestialEngines.waywardStar, "wayward-star-ui-v2.png"],
  [ASSET_KEYS.celestialEngines.hollowSun, "hollow-sun-ui-v2.png"],
  [ASSET_KEYS.celestialEngines.cometEngine, "comet-engine-ui-v2.png"],
]);
const BACKGROUND_KEY = "ember-discovery-harness-background";
const HARNESS_EVENT_CONFIG = Object.freeze({
  ...EMBER_DISCOVERY_EVENT_CONFIG,
  timing: Object.freeze({
    ...EMBER_DISCOVERY_EVENT_CONFIG.timing,
    holdMs: 9000,
  }),
});

class EmberDiscoveryGuidanceScene extends Phaser.Scene {
  constructor() {
    super("EmberDiscoveryGuidanceScene");
  }

  preload() {
    this.load.image(
      BACKGROUND_KEY,
      "../sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp",
    );
    for (const [assetName, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      const key = ASSET_KEYS.ui.approvedHud[assetName];
      if (key) this.load.image(key, `../${path}`);
    }
    for (const asset of CELESTIAL_ACTION_BAR_EAGER_ASSETS) {
      this.load.image(asset.key, `../${asset.path}`);
    }
    this.load.image(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key,
      `../${CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.path}`,
    );
    this.load.image(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.key,
      `../${CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.path}`,
    );
    this.load.image(
      CAMPFIRE_CONFIG.spriteKeys[0],
      "../sprites/npc/campfire/generated/campfire-tier-01.png",
    );
    this.load.image(
      ASSET_KEYS.ui.lootPickups.emberOre,
      "../sprites/UI/second-world/ember-ore-icon.webp",
    );
    this.load.spritesheet(UI_ICON_ATLAS.key, `../${UI_ICON_ATLAS.path}`, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
    for (const [key, filename] of ENGINE_ASSETS) {
      this.load.image(key, `../sprites/UI/starlight-talent-tree-v4/${filename}`);
    }
  }

  create() {
    const background = this.add.image(640, 360, BACKGROUND_KEY);
    const scale = Math.max(1280 / background.width, 720 / background.height);
    background.setScale(scale).setAlpha(0.58);

    const seen = new Set();
    this.gameState = "playing";
    this.config = { tileSize: 94, topAirRows: 65 };
    this.shopOverlay = { isVisible: false };
    this.retentionProgressSystem = {
      getTutorialState: () => ({ stage: TOWN_TUTORIAL_STAGES.COMPLETE }),
      hasSeenMechanicTutorial: id => seen.has(id),
      recordMechanicTutorialSeen: id => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      },
      getSeenMechanicTutorials: () => [...seen],
      getChestCritBuffRemaining: () => 0,
      getObjective: () => ({ complete: true, label: "", progress: 0, target: 0 }),
      getBestDepth: () => 0,
    };
    this.queueDugTilesSave = () => {};
    this.hudSystem = {
      flashStatus: message => {
        this.lastStatus = message;
        this.discoveryStatus ||= message;
      },
    };
    this.setShopOpen = open => { this.eventInputLocked = Boolean(open); };
    this.uiNotifications = {
      setPaused: paused => { this.notificationsPaused = Boolean(paused); },
    };
    this.townSquareTutorialSystem = { getNextPromiseOverride: () => null };
    this.randomEventBridge = {
      getNextPromiseOverride: () => null,
      quoteCargoValue: () => 0,
    };
    this.systemIntroductionSystem = { getNextPromiseOverride: () => null };
    this.digSystem = { getResourceTotals: () => ({ emberOre: 1 }) };
    this.playerLevelSystem = { level: 1 };
    this.milestoneBoardSystem = { getNextMilestone: () => null };
    this.specialTileSystem = { getDeepestPortal: () => null };
    this.playerController = { getPlayerTile: () => ({ tx: 10, ty: 90 }) };

    this.contextualMechanicTutorialSystem = new ContextualMechanicTutorialSystem(
      this,
      this.retentionProgressSystem,
    );
    this.emberDiscoveryEventSystem = new EmberDiscoveryEventSystem(
      this,
      HARNESS_EVENT_CONFIG,
    );
    this.campfireSystem = new CampfireSystem(
      this,
      this.config,
      {},
      {},
      1,
      { level: 1, charges: 1, refillCapacity: 1, selectedBuffType: "warmth" },
    );
    this.celestialActionBarSystem = new CelestialActionBarSystem(this, {
      getAbilityState: entryId => entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE
        ? this.campfireSystem.getActionBarState()
        : { unlocked: false },
      getMetrics: () => ({ gpCurrent: 52, gpMax: 100, miningDamage: 6 }),
      onActivate: () => false,
      onLoadoutChange: () => false,
    });
    this.nextPromiseHudSystem = new NextPromiseHudSystem(this);

    this.discoveryResult = this.campfireSystem.collectEmberCharge(
      1,
      { tile: { tx: 171, ty: 692 } },
    );
    this.campfireSystem._applyBuff(this.campfireSystem.getSelectedBuff());
    const activeBuff = this.campfireSystem.getActiveBuff();
    this.approvedHudProof = new ApprovedHudSkin(this, {
      torchActive: false,
      torchIntensity: 0,
    });
    this.approvedHudProof.setBuffEntries([{
      text: `${activeBuff.name.toUpperCase()} ${Math.ceil(activeBuff.remainingMs / 1000)}s`,
      icon: activeBuff.icon,
      tooltip: {
        title: `CAMPFIRE — ${activeBuff.name.toUpperCase()}`,
        color: activeBuff.color,
        body: `${activeBuff.effectText}. ${Math.ceil(activeBuff.remainingMs / 1000)}s remaining.`,
      },
    }]);
    this.contextualMechanicTutorialSystem.update(0);
    this.nextPromiseHudSystem.update(0);
    this.events.on("update", (time, delta) => {
      this.nextPromiseHudSystem.update(time);
      this.contextualMechanicTutorialSystem.update(delta);
    });
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => this.celestialActionBarSystem.sync(
        CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
      ),
    });

    const publish = () => {
      const campfireSlot = this.celestialActionBarSystem.slotsById.get(
        CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
      );
      document.body.dataset.emberDiscoverySnapshot = JSON.stringify({
        discovery: this.discoveryResult,
        status: this.discoveryStatus,
        event: this.emberDiscoveryEventSystem.getSnapshot(),
        eventInputLocked: this.eventInputLocked === true,
        notificationsPaused: this.notificationsPaused === true,
        buff: this.approvedHudProof.getBuffSnapshot(),
        tutorial: this.contextualMechanicTutorialSystem.getHealthSnapshot(),
        guide: this.nextPromiseHudSystem.getHealthSnapshot(),
        campfireSlot: {
          quantity: campfireSlot?.quantityText?.text || "",
          visible: campfireSlot?.root?.visible === true,
          x: campfireSlot?.root?.x || 0,
          y: campfireSlot?.root?.y || 0,
        },
        actionbarBounds: this.celestialActionBarSystem.placement?.bounds || null,
      });
    };
    this.events.on("postupdate", publish);
    publish();
    document.body.dataset.emberDiscoveryReady = "true";
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: 0x071018,
  parent: document.body,
  scene: [EmberDiscoveryGuidanceScene],
});
