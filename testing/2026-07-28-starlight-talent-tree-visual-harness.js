import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_IDS,
  CELESTIAL_ENGINE_ORDER,
} from "../values/celestialEngines.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../values/starlightTalentTree.js";
import { createModalShell } from "../ui/UiModalShell.js";
import { StarlightTalentTreeView } from "../ui/overlays/StarlightTalentTreeView.js";

const params = new URLSearchParams(window.location.search);
const reviewWidth = Phaser.Math.Clamp(Number(params.get("width")) || 1280, 960, 1600);
const reviewHeight = Phaser.Math.Clamp(Number(params.get("height")) || 720, 640, 1000);
const godMode = params.get("god") === "1";
const SIGN_PATHS = Object.freeze({
  dirt: "dirt-shovel.png",
  stone: "stone-mountain.png",
  copper: "copper-anvil.png",
  darkDirtNormal: "darkDirtNormal-cave.png",
  darkDirtStrong: "darkDirtStrong-fortress.png",
  bronze: "bronze-shield.png",
  steel: "steel-sword.png",
  iron: "iron-hammer.png",
  silver: "silver-crescent.png",
  gold: "gold-crown.png",
});
const PROFILES = Object.freeze({
  first: Object.freeze({
    counts: Object.freeze({ dirt: 1, copper: 2, steel: 5, stone: 4, iron: 5 }),
    unlocked: Object.freeze(["steel", "iron"]),
    unlockedEngines: Object.freeze([]),
    selectedEngine: null,
    availableHearts: 0,
    activationsUsed: 0,
    quickslashUnlocked: false,
    thunderstrikeUnlocked: false,
    focusResource: "dirt",
    firstRevealResource: "dirt",
  }),
  mid: Object.freeze({
    counts: Object.freeze({
      dirt: 5,
      copper: 5,
      steel: 5,
      bronze: 3,
      silver: 1,
      stone: 5,
      darkDirtNormal: 5,
      iron: 5,
      darkDirtStrong: 4,
      gold: 2,
    }),
    unlocked: Object.freeze([
      "dirt",
      "copper",
      "steel",
      "stone",
      "darkDirtNormal",
      "iron",
    ]),
    unlockedEngines: Object.freeze([CELESTIAL_ENGINE_IDS.WAYWARD_STAR]),
    selectedEngine: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
    availableHearts: 1,
    activationsUsed: 20,
    quickslashUnlocked: true,
    thunderstrikeUnlocked: false,
    focusResource: "darkDirtStrong",
    firstRevealResource: null,
  }),
  mastered: Object.freeze({
    counts: Object.freeze(
      Object.fromEntries(STARLIGHT_TALENT_RESOURCE_ORDER.map(resourceType => [resourceType, 5])),
    ),
    unlocked: STARLIGHT_TALENT_RESOURCE_ORDER,
    unlockedEngines: CELESTIAL_ENGINE_ORDER,
    selectedEngine: CELESTIAL_ENGINE_IDS.COMET_ENGINE,
    availableHearts: 0,
    activationsUsed: 50,
    quickslashUnlocked: true,
    thunderstrikeUnlocked: true,
    focusResource: "gold",
    firstRevealResource: null,
  }),
});

class StarlightTalentTreeReviewScene extends Phaser.Scene {
  constructor() {
    super("StarlightTalentTreeReviewScene");
  }

  preload() {
    const signBase = "../sprites/constellations/star-signs-v2/";
    for (const [resourceType, filename] of Object.entries(SIGN_PATHS)) {
      this.load.image(ASSET_KEYS.constellations.signs[resourceType], signBase + filename);
    }
    const starlightKeys = ASSET_KEYS.ui.starlightTalentTree;
    const starlightAssets = STARLIGHT_TALENT_TREE_CONFIG.assets;
    Object.entries(starlightKeys).forEach(([name, key]) => {
      this.load.image(key, `../${starlightAssets.basePath}${starlightAssets.files[name]}`);
    });
  }

  create() {
    this.soundSystem = { playUiSelect() {}, playUiConfirm() {} };
    this.shell = createModalShell(this, {
      title: "STAR PILLAR",
      subtitle: STARLIGHT_TALENT_TREE_CONFIG.copy.pillarHint,
      icon: "constellation",
      skinTexture: ASSET_KEYS.ui.starlightTalentTree.modalShell,
      iconTexture: ASSET_KEYS.ui.starlightTalentTree.modalCrest,
      iconSize: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderIconSizePx,
      closeTexture: ASSET_KEYS.ui.starlightTalentTree.modalClose,
      closeSize: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderCloseSizePx,
      headerHeight: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderHeightPx,
      headerLayout: {
        iconOffsetX: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderIconOffsetXPx,
        iconOffsetY: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderIconOffsetYPx,
        titleOffsetX: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderTitleOffsetXPx,
        titleOffsetY: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderTitleOffsetYPx,
        subtitleOffsetY: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderSubtitleOffsetYPx,
        closeOffsetX: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderCloseOffsetXPx,
        closeOffsetY: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarHeaderCloseOffsetYPx,
      },
      maxWidth: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarMaxWidthPx,
      maxHeight: STARLIGHT_TALENT_TREE_CONFIG.layout.pillarMaxHeightPx,
      depth: 3180,
      onClose() {},
    });
    this.shell.show();
    this.showProfile(params.get("profile") || "mid");
    globalThis.__starlightTalentReview = {
      ready: true,
      scene: this,
      showProfile: profile => this.showProfile(profile),
      select: index => {
        const selected = this.view?.selectControl(index);
        this.publishReviewState();
        return selected;
      },
      page: index => {
        const selected = this.view?.setPage(index);
        this.publishReviewState();
        return selected;
      },
      move: (dx, dy) => {
        const selected = this.view?.moveSelection(dx, dy);
        this.publishReviewState();
        return selected;
      },
      activate: () => this.view?.activateSelected(),
      health: () => this.view?.getHealthSnapshot(),
      snapshot: () => ({
        profile: this.profile,
        selectedControlIndex: this.view?.selectedControlIndex,
        selectedResource: this.view?.selectedResource,
        pageIndex: this.view?.pageIndex,
        activePageId: STARLIGHT_TALENT_TREE_CONFIG.pages[this.view?.pageIndex]?.id,
        lastEngine: document.body.dataset.lastEngine || null,
      }),
    };
    document.body.dataset.reviewReady = "true";
  }

  showProfile(profileName) {
    const profile = PROFILES[profileName] || PROFILES.mid;
    this.profile = PROFILES[profileName] ? profileName : "mid";
    this.view?.destroy();
    const rect = this.shell.getContentRect();
    const thresholds = Object.fromEntries(
      STARLIGHT_TALENT_RESOURCE_ORDER.map(resourceType => [resourceType, 5]),
    );
    const lineColors = Object.fromEntries(
      STARLIGHT_TALENT_RESOURCE_ORDER.map((resourceType, index) => [
        resourceType,
        index < 5 ? 0xb985ff : 0x63cfff,
      ]),
    );
    const defs = Object.fromEntries(
      STARLIGHT_TALENT_RESOURCE_ORDER.map(resourceType => [
        resourceType,
        { name: `${STARLIGHT_TALENT_TREE_CONFIG.resources[resourceType].material} SIGN` },
      ]),
    );
    const fts = {
      getConstellationData: () => ({ thresholds, lineColors, defs }),
      getConstellationCounts: () => ({ ...profile.counts }),
      getUnlockedConstellations: () => [...profile.unlocked],
      getAncientRelicCount: () => 30,
    };
    const unlockedEngines = godMode
      ? [...CELESTIAL_ENGINE_ORDER]
      : [...profile.unlockedEngines];
    const selectedEngine = godMode
      ? (profile.selectedEngine || CELESTIAL_ENGINE_IDS.WAYWARD_STAR)
      : profile.selectedEngine;
    const engineCount = unlockedEngines.length;
    const engineProgressUnlocked = profile.unlocked.length >= 10;
    const progression = {
      getSnapshot: () => ({
        unlockedEngines,
        selectedEngine,
        availableHearts: godMode ? 3 : profile.availableHearts,
        constellationCount: profile.unlocked.length,
        requiredConstellations: 10,
        activationsUsed: profile.activationsUsed,
        engineCount,
        allEnginesUnlocked: godMode || engineCount === 3,
        nextHeartActivationMilestone: !godMode && engineProgressUnlocked && engineCount < 3
          ? 50
          : null,
        activationsToNextHeart: !godMode && engineProgressUnlocked && engineCount < 3
          ? Math.max(0, 50 - profile.activationsUsed)
          : 0,
        godMode,
      }),
    };
    const abilities = {
      isGodModeActive: () => godMode,
      isQuickslashUnlocked: () => profile.quickslashUnlocked,
      isThunderStrikeUnlocked: () => profile.thunderstrikeUnlocked,
    };
    this.view = new StarlightTalentTreeView(this, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      parent: this.shell.content,
      floatingTextSystem: fts,
      progression,
      abilities,
      mode: "pillar",
      focusResource: profile.focusResource,
      firstRevealResource: profile.firstRevealResource,
      onFocus: () => this.publishReviewState(),
      onEngineAction: engineId => {
        document.body.dataset.lastEngine = engineId;
        this.publishReviewState();
      },
    });
    document.body.dataset.profile = this.profile;
    document.body.dataset.godMode = String(godMode);
    this.publishReviewState();
    return this.profile;
  }

  publishReviewState() {
    if (!this.view) return;
    const health = this.view.getHealthSnapshot();
    document.body.dataset.healthReady = String(health.ready);
    document.body.dataset.healthSnapshot = JSON.stringify(health);
    document.body.dataset.activePage = health.activePageId || "";
    document.body.dataset.selectedControl = String(this.view.selectedControlIndex);
    document.body.dataset.nodeLayout = JSON.stringify(
      this.view.nodeControls.map((control, index) => ({
        index,
        visible: control?.root?.visible === true,
        alpha: control?.root?.alpha ?? null,
        x: control?.root?.x ?? null,
        y: control?.root?.y ?? null,
      })),
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "review-root",
  width: reviewWidth,
  height: reviewHeight,
  backgroundColor: "#02060a",
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StarlightTalentTreeReviewScene],
});
