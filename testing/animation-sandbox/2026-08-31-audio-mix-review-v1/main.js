import { HardcoreModeSystem } from "../../../systems/hardcore/HardcoreModeSystem.js";
import { HardcoreStatusHud } from "../../../systems/visual/HardcoreStatusHud.js";
import { LevelUpRewardPresentation } from "../../../systems/visual/LevelUpRewardPresentation.js";
import { ScreenFlashSystem } from "../../../systems/visual/ScreenFlashSystem.js";
import { APPROVED_HUD_SKIN } from "../../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { AUDIO_LIBRARY_REVIEW_EXPANSION } from "../../../values/audioLibraryReviewExpansion.js";
import { AUDIO_MIX_REVIEW as BASE_AUDIO_MIX_REVIEW } from "../../../values/audioMixReview.js";
import { AUDIO_MIX_REVIEW_FLOW as BASE_AUDIO_MIX_REVIEW_FLOW } from "../../../values/audioMixReviewFlow.js";
import { GAMEFEEL_CONFIG } from "../../../values/gamefeel.js";
import { HARDCORE_MODE_CONFIG } from "../../../values/hardcoreMode.js";
import { STAR_CONSTELLATION_CONFIG } from "../../../values/starConstellations.js";
import { XP_GATHERING_CONFIG } from "../../../values/xpGathering.js";
import { AudioReviewPanel } from "./AudioReviewPanel.js?v=20260901-audio13";
import { AudioReviewDecisionStore } from "./AudioReviewDecisionStore.js?v=20260831-audio10";
import { AudioReviewWorldView } from "./AudioReviewWorldView.js?v=20260831-audio10";
import { ReviewAudioBus } from "./ReviewAudioBus.js?v=20260831-audio10";
import { createAudioLibraryReviewConfig } from "./audioLibraryReviewConfig.js?v=20260901-audio13";
import { getAudioMixReviewPreloadAssets } from "./audioMixReviewMath.js?v=20260831-audio10";
import {
  createAudioReviewFlowSnapshot,
  findAudioReviewCategory,
} from "./audioReviewFlowState.js?v=20260831-audio10";

const BACKGROUND_KEY = "audio-review-production-background";
const BACKGROUND_PATH =
  "../../../sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v1.webp";
const STAR_ASSET = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.coreAssets[5];
const { config: REVIEW_CONFIG, flow: REVIEW_FLOW } = createAudioLibraryReviewConfig(
  BASE_AUDIO_MIX_REVIEW,
  BASE_AUDIO_MIX_REVIEW_FLOW,
  AUDIO_LIBRARY_REVIEW_EXPANSION,
);

function createHardcoreSnapshot(stress) {
  return new HardcoreModeSystem({
    ...HARDCORE_MODE_CONFIG.defaultData,
    mode: HARDCORE_MODE_CONFIG.modes.hardcore,
    armed: true,
    livesRemaining: 2,
    freeReviveAvailable: false,
    stress,
    peakStress: stress,
  }, HARDCORE_MODE_CONFIG).getSnapshot();
}

class AudioMixReviewScene extends Phaser.Scene {
  constructor() {
    super("AudioMixReviewScene");
    this.scenarioId = REVIEW_CONFIG.defaultScenario;
    this.reviewCategoryId = REVIEW_FLOW.defaultCategoryId;
    this.loadErrors = [];
  }

  preload() {
    this.load.on("loaderror", file => this.loadErrors.push(file?.key || "unknown"));
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.image(STAR_ASSET.key, `../../../${STAR_ASSET.path}`);
    this.load.image(
      ASSET_KEYS.ui.approvedHud.notification,
      `../../../${APPROVED_HUD_SKIN.paths.notification}`,
    );
    this.load.image(
      ASSET_KEYS.ui.approvedHud.levelUpShell,
      `../../../${APPROVED_HUD_SKIN.paths.levelUpShell}`,
    );
    this.load.image(
      ASSET_KEYS.ui.xpGathering.levelUp,
      `../../../${XP_GATHERING_CONFIG.assetPaths.levelUp}`,
    );
    for (const id of ["crest", "panicWarning", "panicCritical", "panicEdgeFrame"]) {
      const asset = HARDCORE_MODE_CONFIG.assets[id];
      this.load.image(asset.key, `../../../${asset.path}`);
    }
    for (const asset of getAudioMixReviewPreloadAssets(REVIEW_CONFIG)) {
      this.load.audio(asset.key, `../../../${asset.path}`);
    }
  }

  create() {
    const { width, height } = REVIEW_CONFIG.viewport;
    this.add.image(width / 2, height / 2, BACKGROUND_KEY)
      .setDisplaySize(width, height)
      .setDepth(0);

    this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
    this.hud = new HardcoreStatusHud(this);
    this.levelUpPresentation = new LevelUpRewardPresentation(this);
    this.worldView = new AudioReviewWorldView(this, {
      config: REVIEW_CONFIG,
      starAssetKey: STAR_ASSET.key,
      levelUpPresentation: this.levelUpPresentation,
    });
    this.decisionStore = new AudioReviewDecisionStore(REVIEW_FLOW);
    this.audioBus = new ReviewAudioBus(this, REVIEW_CONFIG);
    this.audioBus.applyScenario(this.scenarioId, { playTransients: false });
    this.snapshot = createHardcoreSnapshot(
      REVIEW_CONFIG.scenarios[this.scenarioId].stress,
    );
    this.panel = new AudioReviewPanel(this, {
      onScenario: id => this.setScenario(id),
      onCategory: id => this.setReviewCategory(id),
      onPrevious: () => this.stepScenario(-1),
      onNext: () => this.stepScenario(1),
      onReplay: () => this.replayScenario(),
      onDecision: decision => this.setCurrentDecision(decision),
      onClear: () => this.clearCurrentDecision(),
      onExport: () => this.decisionStore.download(),
    }, REVIEW_CONFIG, REVIEW_FLOW);
    this._bindKeys();
    this._focusCanvas();
    this._publishReviewApi();
    this.setScenario(this.scenarioId, false);
    this.events.once("shutdown", () => {
      this.audioBus?.destroy();
      this.hud?.destroy();
      this.screenFlashSystem?.destroy();
      this.worldView?.destroy();
      this.levelUpPresentation?.destroy();
      this.panel?.destroy();
    });
  }

  update(time, delta) {
    this.audioBus.update(delta);
    this.hud.update(this.snapshot, time, 42, { gameplayActive: true });
    const review = this.getReviewSnapshot();
    this.panel.update(review);
    this.worldView.update(time, review, this.scenarioId);
    this._publishCanvasState(review);
  }

  setScenario(id, playTransients = true) {
    const scenario = REVIEW_CONFIG.scenarios[id];
    if (!scenario) return false;
    const previousScenarioId = this.scenarioId;
    const previousHadLoops = REVIEW_CONFIG.scenarios[previousScenarioId]
      ?.loops.length > 0;
    const category = findAudioReviewCategory(REVIEW_FLOW, id);
    if (category) this.reviewCategoryId = category.id;
    this.scenarioId = id;
    this.snapshot = createHardcoreSnapshot(scenario.stress);
    this.audioBus.applyScenario(id, { playTransients });
    if (id === REVIEW_CONFIG.defaultScenario) this.audioBus.stopAll();
    this.worldView.setScenario(scenario);
    if (scenario.worldMode === "panic" && scenario.stress >= 80) {
      this.screenFlashSystem.flashPanic();
    }
    if (playTransients) {
      const visualDelay = previousScenarioId !== id && previousHadLoops
        ? REVIEW_CONFIG.output.transitionTransientDelayMs
        : 0;
      this.worldView.playScenario(id, visualDelay);
    }
    return true;
  }

  setReviewCategory(id) {
    const category = REVIEW_FLOW.categories.find(item => item.id === id);
    if (!category) return false;
    this.reviewCategoryId = category.id;
    if (!category.itemIds.includes(this.scenarioId)) {
      this.setScenario(REVIEW_CONFIG.defaultScenario);
    }
    return true;
  }

  replayScenario() {
    if (!REVIEW_FLOW.reviewItemIds.includes(this.scenarioId)) {
      return this.stepScenario(1);
    }
    const played = this.audioBus.replay();
    this.worldView.playScenario(this.scenarioId);
    return played;
  }

  stepScenario(offset) {
    const category = REVIEW_FLOW.categories.find(
      item => item.id === this.reviewCategoryId,
    );
    const order = category?.itemIds || [];
    if (!order.length) return false;
    const currentIndex = order.indexOf(this.scenarioId);
    if (currentIndex < 0) {
      return this.setScenario(offset < 0 ? order.at(-1) : order[0]);
    }
    const nextIndex = (currentIndex + offset + order.length) % order.length;
    return this.setScenario(order[nextIndex]);
  }

  setCurrentDecision(decision) {
    if (!REVIEW_FLOW.reviewItemIds.includes(this.scenarioId)) return false;
    return this.decisionStore.set(this.scenarioId, decision);
  }

  clearCurrentDecision() {
    if (!REVIEW_FLOW.reviewItemIds.includes(this.scenarioId)) return false;
    return this.decisionStore.clear(this.scenarioId);
  }

  _focusCanvas() {
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Audio decision review. Choose an item, play it, then approve or reject it.",
    );
    const focus = () => canvas.focus({ preventScroll: true });
    canvas.addEventListener("pointerdown", focus);
    focus();
    this.events.once("shutdown", () => canvas.removeEventListener("pointerdown", focus));
  }

  getReviewSnapshot() {
    const scenario = REVIEW_CONFIG.scenarios[this.scenarioId];
    const review = createAudioReviewFlowSnapshot({
      config: REVIEW_CONFIG,
      flow: REVIEW_FLOW,
      scenarioId: this.scenarioId,
      categoryId: this.reviewCategoryId,
      decisionStore: this.decisionStore,
    });
    return {
      ready: true,
      reviewOnly: REVIEW_CONFIG.reviewOnly,
      runtimeEligible: REVIEW_CONFIG.runtimeEligible,
      scenarioId: this.scenarioId,
      worldMode: scenario.worldMode,
      stress: scenario.stress,
      stressBand: this.snapshot.stressBand,
      musicDuck: scenario.musicDuck,
      sourceCount: Object.keys(REVIEW_CONFIG.sources).length,
      loadedSourceCount: Object.values(REVIEW_CONFIG.sources)
        .filter(source => this.cache.audio.exists(source.key)).length,
      loadErrors: [...this.loadErrors],
      hud: this.hud.getDebugSnapshot(),
      audio: this.audioBus.snapshot(),
      review,
      productionWired: true,
      productionWiredSourceIds: REVIEW_CONFIG.approvedRuntimeSourceIds,
      automaticVoice: REVIEW_CONFIG.policy.automaticVoice,
      diagnostics: REVIEW_CONFIG.diagnostics,
      libraryExpansion: REVIEW_CONFIG.libraryExpansion,
    };
  }

  _bindKeys() {
    const keys = this.input.keyboard.addKeys(
      "ZERO,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,C,D,J,K,M,N,R,SPACE,Y",
    );
    const mapping = {
      ZERO: "silence", ONE: "panicWarning", TWO: "panicCritical",
      THREE: "starProximity", FOUR: "starRelease",
      FIVE: "deepCave", SIX: "rainReference",
      SEVEN: "starDestruction", EIGHT: "levelUpShort", NINE: "levelUpEpic",
      D: "digSequence",
    };
    for (const [key, scenario] of Object.entries(mapping)) {
      keys[key].on("down", () => this.setScenario(scenario));
    }
    keys.J.on("down", () => this.stepScenario(-1));
    keys.K.on("down", () => this.stepScenario(1));
    keys.M.on("down", () => this.audioBus.setMuted(!this.audioBus.muted));
    keys.Y.on("down", () => this.setCurrentDecision(REVIEW_FLOW.decisions.approved));
    keys.N.on("down", () => this.setCurrentDecision(REVIEW_FLOW.decisions.rejected));
    keys.C.on("down", () => this.clearCurrentDecision());
    keys.R.on("down", () => this.replayScenario());
    keys.SPACE.on("down", () => this.replayScenario());
  }

  _publishReviewApi() {
    window.__audioMixReview = {
      setScenario: id => this.setScenario(id),
      setCategory: id => this.setReviewCategory(id),
      setMasterTrim: value => this.audioBus.setMasterTrim(value),
      setMuted: muted => this.audioBus.setMuted(muted),
      decide: decision => this.setCurrentDecision(decision),
      clearDecision: () => this.clearCurrentDecision(),
      exportDecisions: () => this.decisionStore.exportPayload(),
      replay: () => this.replayScenario(),
      previousScenario: () => this.stepScenario(-1),
      nextScenario: () => this.stepScenario(1),
      snapshot: () => this.getReviewSnapshot(),
    };
  }

  _publishCanvasState(review) {
    Object.assign(this.game.canvas.dataset, {
      audioReviewReady: String(review.ready),
      audioReviewScenario: review.scenarioId,
      audioReviewCategory: review.review.categoryId,
      audioReviewDecision: review.review.currentDecision || "open",
      audioReviewLocked: String(review.audio.audioLocked),
      audioReviewWithinBudget: String(review.audio.withinBudget),
      audioReviewLoadErrors: String(review.loadErrors.length),
      audioReviewActiveLoops: String(review.audio.activeLoops.length),
    });
    document.body.dataset.audioMixReviewSnapshot = JSON.stringify(review);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: REVIEW_CONFIG.viewport.width,
  height: REVIEW_CONFIG.viewport.height,
  backgroundColor: "#05080b",
  scene: [AudioMixReviewScene],
  render: { antialias: true, pixelArt: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
