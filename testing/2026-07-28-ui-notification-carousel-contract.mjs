import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveFloatingTextPreference,
  sanitizeNotificationPosition,
} from "../systems/UserSettings.js";
import { NotificationCarouselState } from "../ui/NotificationCarouselState.js";
import {
  createNotificationDragBounds,
  normalizeNotificationDragPosition,
  resolveNotificationDragPosition,
} from "../ui/UINotificationDragController.js";
import {
  UINotificationCarouselPresenter,
} from "../ui/UINotificationCarouselPresenter.js";
import { RETENTION_CONFIG } from "../values/retentionConfig.js";
import {
  UI_NOTIFICATION_CAROUSEL_CONFIG,
} from "../values/uiNotificationCarousel.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = relativePath => readFile(path.join(root, relativePath), "utf8");
const makeEntry = (id, priority, createdAt) => ({ id, priority, createdAt });

assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.visibleDurationMs, 7000);
assert.equal(
  APPROVED_HUD_SKIN.layout.notification.y,
  APPROVED_HUD_SKIN.referenceViewport.height / 2,
  "remaining carousel cards default to the middle of the viewport",
);
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.input.previous, "LEFT");
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.input.next, "RIGHT");
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.input.dismiss, "X");
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.maxQueued, 6);
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.drag.idleCursor, "grab");
assert.equal(UI_NOTIFICATION_CAROUSEL_CONFIG.drag.activeCursor, "grabbing");

const dragBounds = createNotificationDragBounds({
  viewportWidth: 1280,
  viewportHeight: 720,
  cardWidth: 430,
  cardHeight: 76,
  scale: 1,
});
assert.deepEqual(dragBounds, {
  minX: 227,
  maxX: 1053,
  minY: 122,
  maxY: 550,
});
const draggedPosition = resolveNotificationDragPosition(
  { x: 0.25, y: 0.75 },
  dragBounds,
);
assert.deepEqual(
  normalizeNotificationDragPosition(draggedPosition, dragBounds),
  { x: 0.25, y: 0.75 },
  "saved positions must survive responsive normalization",
);
assert.deepEqual(
  sanitizeNotificationPosition({ x: -4, y: 8 }),
  { x: 0, y: 1 },
  "stored popup positions stay inside the normalized viewport",
);

const state = new NotificationCarouselState(3);
state.enqueue(makeEntry("first", 0, 1));
state.enqueue(makeEntry("second", 0, 2));
state.enqueue(makeEntry("danger", 3, 3), { focus: true });
assert.equal(state.current.id, "danger", "higher-priority cards may preempt");
assert.equal(state.position, 3);
assert.equal(
  state.consumeCurrent(1).id,
  "danger",
  "right-arrow navigation consumes the visible card",
);
assert.equal(state.current.id, "first");
assert.equal(state.size, 2);
assert.equal(
  state.consumeCurrent(-1).id,
  "first",
  "left-arrow navigation also consumes the visible card",
);
assert.equal(state.current.id, "second");
assert.deepEqual(
  state.clear().map(entry => entry.id),
  ["second"],
  "clear removes the complete unread queue",
);
assert.equal(state.size, 0);

const boundedState = new NotificationCarouselState(2);
boundedState.enqueue(makeEntry("current-danger", 3, 1));
boundedState.enqueue(makeEntry("queued-warning", 2, 2));
const rejected = boundedState.enqueue(makeEntry("new-routine", 0, 3));
assert.equal(rejected.accepted, false, "overflow drops the least important hidden card");
assert.equal(boundedState.current.id, "current-danger");
assert.deepEqual(
  boundedState.entries.map(entry => entry.id),
  ["current-danger", "queued-warning"],
);

class FakeRoot {
  constructor() {
    this.alpha = 1;
    this.x = 0;
    this.y = 0;
  }

  setAlpha(alpha) {
    this.alpha = alpha;
    return this;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}

const timers = [];
const fakeScene = {
  time: {
    delayedCall(duration, callback) {
      const timer = {
        duration,
        callback,
        paused: false,
        removed: false,
        remove() {
          this.removed = true;
        },
      };
      timers.push(timer);
      return timer;
    },
  },
  tweens: {
    killTweensOf() {},
    add(config) {
      config.onYoyo?.();
      config.onComplete?.();
      return config;
    },
  },
};
const renders = [];
const fakeView = {
  root: new FakeRoot(),
  suspended: false,
  render(entry, position, total) {
    renders.push({ id: entry?.id || null, position, total });
  },
  setSuspended(value) {
    this.suspended = Boolean(value);
  },
  destroy() {},
};
const presenterState = new NotificationCarouselState(4);
presenterState.enqueue(makeEntry("a", 0, 1));
presenterState.enqueue(makeEntry("b", 0, 2));
let expirations = 0;
const presenter = new UINotificationCarouselPresenter(fakeScene, fakeView, {
  getSnapshot: () => ({
    entry: presenterState.current,
    position: presenterState.position,
    total: presenterState.size,
  }),
  getBaseY: () => 126,
  getCenterX: () => 640,
  onExpire: () => {
    expirations += 1;
  },
});

presenter.present({ animate: false });
const firstTimer = presenter.timer;
assert.equal(firstTimer.duration, 7000);
assert.equal(presenterState.consumeCurrent(1).id, "a");
assert.equal(presenter.switch(), true);
assert.equal(firstTimer.removed, true, "changing cards cancels the old timer");
assert.equal(presenter.timer.duration, 7000, "each selected card gets a fresh timer");
assert.equal(renders.at(-1).id, "b");

const selectedTimer = presenter.timer;
presenter.setPaused(true);
assert.equal(fakeView.suspended, true);
assert.equal(selectedTimer.paused, true, "modal time does not consume viewing time");
presenter.setPaused(false);
assert.equal(selectedTimer.paused, false);
assert.equal(presenter.timer, selectedTimer, "resuming preserves remaining visible time");

selectedTimer.callback();
assert.equal(expirations, 1, "the selected card expires after its timer");
presenter.cancelTimer();
presenter.setPaused(true);
fakeView.root.setAlpha(0);
presenter.setPaused(false);
assert.equal(fakeView.root.alpha, 1, "a card interrupted by a modal returns visibly");
assert.equal(presenter.timer.duration, 7000);

// Selection and visible content must stay synchronized even when messages,
// arrow presses, and X arrive before an earlier tween completes.
const deferredTweens = [];
const deferredTimers = [];
const deferredScene = {
  time: {
    delayedCall(duration, callback) {
      const timer = {
        duration,
        callback,
        paused: false,
        removed: false,
        remove() {
          this.removed = true;
        },
      };
      deferredTimers.push(timer);
      return timer;
    },
  },
  tweens: {
    killTweensOf() {},
    add(config) {
      deferredTweens.push(config);
      return config;
    },
  },
};
const deferredRenders = [];
const deferredView = {
  root: new FakeRoot(),
  render(entry, position, total) {
    deferredRenders.push({ id: entry?.id || null, position, total });
  },
  setSuspended() {},
  destroy() {},
};
const deferredState = new NotificationCarouselState(4);
deferredState.enqueue(makeEntry("routine", 0, 1));
let deferredExpirations = 0;
const deferredPresenter = new UINotificationCarouselPresenter(
  deferredScene,
  deferredView,
  {
    getSnapshot: () => ({
      entry: deferredState.current,
      position: deferredState.position,
      total: deferredState.size,
    }),
    getBaseY: () => 126,
    getCenterX: () => 640,
    onExpire: entryId => {
      deferredState.removeById(entryId);
      deferredExpirations += 1;
    },
  },
);

deferredPresenter.present({ animate: false });
const routineTimer = deferredPresenter.timer;
deferredState.enqueue(makeEntry("urgent", 3, 2), { focus: true });
deferredPresenter.present();
assert.equal(
  deferredRenders.at(-1).id,
  "urgent",
  "a preempting card must become the drawn card before its enter tween",
);
assert.equal(routineTimer.removed, true);
const staleEnterTween = deferredTweens.at(-1);

assert.equal(deferredState.consumeCurrent(1).id, "urgent");
deferredPresenter.switch();
assert.equal(
  deferredRenders.at(-1).id,
  "routine",
  "arrow navigation must remove the old card and draw the next unread card",
);
const staleSwitchTween = deferredTweens.at(-1);

// Mirrors closeAll(): interrupt first, clear every unread entry, then hide.
deferredPresenter.interrupt();
assert.deepEqual(
  deferredState.clear().map(entry => entry.id),
  ["routine"],
);
deferredPresenter.present({ animate: false });
assert.equal(deferredRenders.at(-1).id, null);
staleEnterTween.onComplete?.();
staleSwitchTween.onComplete?.();
assert.equal(
  deferredRenders.at(-1).id,
  null,
  "stale tween callbacks must not restore a cleared queue",
);

deferredState.enqueue(makeEntry("expiring", 2, 3));
deferredPresenter.present({ animate: false });
const expiringTimer = deferredPresenter.timer;
expiringTimer.callback();
assert.equal(deferredPresenter.transitionKind, "expire");
assert.equal(
  deferredState.current.id,
  "expiring",
  "the expiring card stays current until its fade completes",
);
const expireTween = deferredTweens.at(-1);
expireTween.onComplete();
assert.equal(deferredExpirations, 1);
assert.equal(deferredState.size, 0);
assert.equal(deferredRenders.at(-1).id, null);

assert.equal(RETENTION_CONFIG.floatingText.defaultMode, "reduced");
assert.deepEqual(
  RETENTION_CONFIG.floatingText.modes.reduced.hiddenCategories,
  ["damage", "resource"],
);
assert.equal(
  resolveFloatingTextPreference({
    floatingTextMode: "full",
    floatingTextPreferenceVersion: RETENTION_CONFIG.floatingText.preferenceVersion,
  }).mode,
  "full",
  "players may still deliberately choose FULL floating text",
);

const [
  systemSource,
  viewSource,
  dragSource,
  presenterSource,
  settingsSource,
  hudSource,
  setupSource,
  uiSource,
  updateSource,
  escapeUiSource,
  caveSource,
  reviewHarnessSource,
  muteSource,
  effectSource,
  digSource,
  specialTileSource,
  tutorialViewSource,
  openingFlightViewSource,
  openingFlightRewardSource,
  screenRecordSource,
  caveHazardSource,
  gameplaySource,
  caveGameplaySource,
  hardcoreSource,
  wurmEventSource,
  assetKeysSource,
  bootSource,
  lightSource,
  campfireSource,
  depthGateSource,
  starReleaseSource,
  caveDiscoverySource,
  titanDiscoverySource,
  tutorialSystemSource,
  nextPromiseSource,
  comboConfigSource,
  specialBlocksConfigSource,
  miningConfigSource,
  settingsPanelSource,
  depthCinematicSource,
  earthquakeSystemSource,
  earthquakeFeedbackUiSource,
  earthquakeFeedbackConfigSource,
] = await Promise.all([
  readSource("ui/UINotificationSystem.js"),
  readSource("ui/UINotificationCarouselView.js"),
  readSource("ui/UINotificationDragController.js"),
  readSource("ui/UINotificationCarouselPresenter.js"),
  readSource("systems/UserSettings.js"),
  readSource("systems/visual/HUDSystem.js"),
  readSource("world/playScene/PlaySceneSetup.js"),
  readSource("world/playScene/PlaySceneUI.js"),
  readSource("world/playScene/PlaySceneUpdate.js"),
  readSource("world/playScene/hasEscapeClosableUi.js"),
  readSource("ui/scenes/CaveScene.js"),
  readSource("testing/UiReviewHarness.js"),
  readSource("ui/hud/UIMuteToggle.js"),
  readSource("systems/mining/SpecialBlockEffectsManager.js"),
  readSource("systems/mining/DigSystem.js"),
  readSource("systems/mining/SpecialTileSystem.js"),
  readSource("systems/onboarding/TownSquareTutorialView.js"),
  readSource("systems/onboarding/OpeningFlightArtifactView.js"),
  readSource("systems/onboarding/OpeningFlightGoldenFiveRewardController.js"),
  readSource("systems/visual/ScreenRecordSystem.js"),
  readSource("systems/environment/CaveHazardSystem.js"),
  readSource("world/playScene/PlaySceneGameplay.js"),
  readSource("world/playScene/CaveGameplayController.js"),
  readSource("world/playScene/HardcoreModeBridge.js"),
  readSource("world/playScene/GraveborerWurmEventBridge.js"),
  readSource("values/assetKeys.js"),
  readSource("ui/scenes/BootScene.js"),
  readSource("systems/lighting/LightSystem.js"),
  readSource("systems/environment/CampfireSystem.js"),
  readSource("systems/progression/DepthGateSystem.js"),
  readSource("systems/visual/FloatingTextSystem.js"),
  readSource("systems/visual/CaveInteriorOcclusionSystem.js"),
  readSource("systems/visual/TitanDiscoveryGuidance.js"),
  readSource("systems/onboarding/TownSquareTutorialSystem.js"),
  readSource("systems/visual/NextPromiseHudSystem.js"),
  readSource("values/comboConfig.js"),
  readSource("values/specialBlocks.js"),
  readSource("values/miningConfig.js"),
  readSource("ui/overlays/SettingsPanelContent.js"),
  readSource("systems/visual/DepthMilestoneCinematic.js"),
  readSource("systems/environment/EarthquakeSystem.js"),
  readSource("systems/visual/EarthquakeFeedbackUI.js"),
  readSource("values/earthquakeFeedback.js"),
]);

assert.match(
  systemSource,
  /durationMs:\s*UI_NOTIFICATION_CAROUSEL_CONFIG\.visibleDurationMs/,
  "caller-specific fade durations must resolve to the shared seven-second rule",
);
assert.ok(systemSource.includes("cyclePrevious()"));
assert.ok(systemSource.includes("cycleNext()"));
assert.ok(systemSource.includes("closeCurrent()"));
assert.ok(systemSource.includes("closeAll()"));
assert.ok(systemSource.includes("closeByKey(key)"));
assert.ok(systemSource.includes("this.state.consumeCurrent(step)"));
assert.ok(!systemSource.includes("this.state.cycle(step)"));
assert.ok(systemSource.includes("getSnapshot()"));
assert.ok(systemSource.includes("onExpire: entryId"));
assert.ok(systemSource.includes('addEventListener?.("keydown"'));
assert.ok(systemSource.includes('removeEventListener?.('));
assert.ok(systemSource.includes("stopImmediatePropagation"));
assert.ok(systemSource.includes("event?.repeat"));
const closeAllSource = systemSource.slice(
  systemSource.indexOf("closeAll()"),
  systemSource.indexOf("closeByKey(key)"),
);
assert.ok(
  !closeAllSource.includes("transitioning"),
  "X must not be ignored merely because a card is animating",
);
assert.ok(closeAllSource.includes("this.state.clear()"));
assert.ok(viewSource.includes("onPrevious"));
assert.ok(viewSource.includes("onNext"));
assert.ok(viewSource.includes("onDismiss"));
assert.ok(viewSource.includes("disabledAlpha"));
assert.ok(viewSource.includes("control.enabled"));
assert.ok(viewSource.includes("control.image.setInteractive"));
assert.ok(viewSource.includes("control.image.disableInteractive"));
assert.ok(
  !viewSource.includes("previousGlyph"),
  "runtime controls must use approved raster art instead of font glyphs",
);
assert.ok(
  viewSource.includes("ASSET_KEYS.ui.notificationControls.previous")
    && viewSource.includes("ASSET_KEYS.ui.notificationControls.next")
    && viewSource.includes("ASSET_KEYS.ui.notificationControls.clear"),
  "all carousel actions must use the approved raster control set",
);
assert.ok(
  !viewSource.includes("control.image.setVisible(enabled)"),
  "arrow art remains present on single-card notifications",
);
assert.ok(viewSource.includes("setScrollFactor(0)"));
assert.ok(!viewSource.includes("BROWSE"));
assert.ok(!viewSource.includes("DELETE"));
assert.ok(dragSource.includes('setDraggable(this.zone, true)'));
assert.ok(dragSource.includes('"pointerupoutside"'));
assert.ok(dragSource.includes('"dragstart"'));
assert.ok(dragSource.includes('"dragend"'));
assert.ok(dragSource.includes("notificationPosition"));
assert.ok(dragSource.includes("onInteractionStart"));
assert.ok(dragSource.includes("onInteractionEnd"));
assert.ok(presenterSource.includes("resolvePosition?.(centerX, baseY)"));
assert.ok(settingsSource.includes("sanitizeNotificationPosition"));
assert.ok(systemSource.includes("new UINotificationDragController"));
assert.ok(systemSource.includes("this.presenter.schedule()"));
assert.ok(
  !hudSource.includes('key: "hud-status"'),
  "distinct HUD statuses must queue instead of overwriting each other",
);
assert.ok(setupSource.includes("this.uiNotifications = new UINotificationSystem(this)"));
assert.ok(uiSource.includes("this.uiNotifications ||= new UINotificationSystem(this)"));
assert.ok(updateSource.includes("hasEscapeClosableUi(this)"));
assert.ok(updateSource.includes("depthMilestoneCinematic?.isActive?.()"));
assert.ok(depthCinematicSource.includes("uiNotifications?.setPaused?.(true)"));
assert.ok(escapeUiSource.includes("scene?.worldMapOverlay?.isOpen"));
assert.ok(escapeUiSource.includes("scene?.starHeartOverlay?.isOpen?.()"));
assert.ok(escapeUiSource.includes("scene?.overlayManager?.shell?.root?.visible"));
assert.ok(updateSource.includes("this.uiNotifications?.setPaused?.(true)"));
assert.ok(updateSource.includes("this.uiNotifications?.handleInput?.()"));
assert.ok(
  updateSource.indexOf("this.uiNotifications?.handleInput?.()")
    < updateSource.indexOf("switch (this.gameState)"),
  "carousel keys must be consumed before gameplay actions",
);
assert.ok(caveSource.includes("this.uiNotifications = new UINotificationSystem(this)"));
assert.ok(caveSource.includes("this.uiNotifications?.show?.(message"));
assert.ok(reviewHarnessSource.includes("NOTIFICATION_REVIEW_CASES"));
assert.ok(reviewHarnessSource.includes("noDedupe: true"));
assert.ok(
  !muteSource.includes("this.scene.add.text"),
  "audio feedback must not create a second raw toast",
);
assert.ok(!muteSource.includes("showToast"));
assert.ok(!muteSource.includes("uiNotifications"));
assert.ok(!effectSource.includes("uiNotifications"));
assert.ok(!effectSource.includes("showFloatingText"));
assert.ok(!digSource.includes("⚡ SPEED BOOST! +50%"));
assert.ok(!digSource.includes("💥 CRITICAL HITS! 20s"));
assert.ok(!digSource.includes("👑 KING TILE!"));
assert.ok(!specialTileSource.includes("No resources to gamble!"));
assert.ok(!specialTileSource.includes("Teleported to Sky Island!"));
assert.ok(!specialTileSource.includes("feedback.skyArrival"));
assert.ok(!specialTileSource.includes("feedback.groundArrivalPrefix"));
assert.ok(!specialTileSource.includes("feedback.returnPrefix"));
assert.ok(specialTileSource.includes('key: "portal-activation"'));
assert.ok(tutorialViewSource.includes("uiNotifications?.info"));
assert.ok(tutorialViewSource.includes("uiNotifications?.success"));
assert.ok(!tutorialViewSource.includes("add.container"));
assert.ok(openingFlightViewSource.includes("objectiveNotificationKey"));
assert.ok(openingFlightViewSource.includes("closeByKey"));
assert.ok(!openingFlightRewardSource.includes("showRewardReveal({"));
assert.ok(!openingFlightRewardSource.includes("showFloatingText"));
assert.ok(!openingFlightRewardSource.includes("flashStatus"));
assert.ok(screenRecordSource.includes("uiNotifications?.[kind]"));
assert.ok(!screenRecordSource.includes("notificationSystem?.[kind]"));
assert.ok(!screenRecordSource.includes("this.config.notices.started"));
assert.ok(!screenRecordSource.includes("this.config.notices.stopping"));
assert.ok(!caveHazardSource.includes("showFloatingText"));
assert.ok(!caveHazardSource.includes("flashStatus"));
assert.ok(!caveHazardSource.includes("warningKeyPrefix"));
assert.ok(caveHazardSource.includes("failureNotificationKey"));
assert.ok(!gameplaySource.includes("zeroDamageText"));
assert.ok(!caveGameplaySource.includes("zeroDamageText"));
assert.ok(!setupSource.includes("setComboBreakCallback"));
assert.ok(!setupSource.includes("Combo broken at"));
assert.ok(setupSource.includes("setMilestoneReachedCallback"));
assert.ok(setupSource.includes("reward?.gpRestore"));
assert.ok(setupSource.includes("pulseGemPower"));
assert.ok(setupSource.includes("comboShakeSignatureFor"));
assert.ok(!setupSource.includes("reward?.message"));
assert.ok(!comboConfigSource.includes("message:"));
assert.ok(!updateSource.includes("routine-level-up"));
assert.ok(!updateSource.includes("permanent bonus saved"));
assert.ok(!uiSource.includes("Game saved!"));
assert.ok(!uiSource.includes("Run started"));
assert.ok(!uiSource.includes("Loaded save:"));
assert.ok(uiSource.includes("Save failed!"));
assert.ok(!hardcoreSource.includes("stressWarningText"));
assert.ok(!hardcoreSource.includes("Hardcore teleport paid"));
assert.ok(!hardcoreSource.includes("Hardcore teleport needs"));
assert.ok(!hardcoreSource.includes("Last resort available"));
assert.ok(!hardcoreSource.includes("Returned to safety"));
assert.ok(!hardcoreSource.includes("Crush boundary rescue"));
assert.ok(hardcoreSource.includes("stressCriticalText"));
assert.ok(hardcoreSource.includes("armedText"));
assert.ok(hardcoreSource.includes("save failed"));
assert.ok(!wurmEventSource.includes("graveborer-wurm-warning"));
assert.ok(!wurmEventSource.includes("graveborer-wurm-breach"));
assert.ok(!wurmEventSource.includes("PASSES DODGED"));
assert.ok(wurmEventSource.includes("graveborer-wurm-hit"));
assert.ok(!lightSource.includes("Torch turned off"));
assert.ok(!lightSource.includes("Torch relit"));
assert.ok(!lightSource.includes("Torch extinguished - no GP"));
assert.ok(!lightSource.includes("No GP for torch"));
assert.ok(!campfireSource.includes("Active! ("));
assert.ok(!campfireSource.includes("feedback.warningText"));
assert.ok(!campfireSource.includes("feedback.expiredText"));
assert.ok(!depthGateSource.includes("feedback.returnedText"));
assert.ok(assetKeysSource.includes("notificationControls"));
assert.ok(bootSource.includes("ASSET_KEYS.ui.notificationControls"));

const purgedPopupSources = [
  updateSource,
  setupSource,
  gameplaySource,
  caveGameplaySource,
  digSource,
  specialTileSource,
  lightSource,
  starReleaseSource,
  caveDiscoverySource,
  titanDiscoverySource,
  tutorialSystemSource,
  nextPromiseSource,
  comboConfigSource,
  specialBlocksConfigSource,
  miningConfigSource,
  earthquakeSystemSource,
  earthquakeFeedbackUiSource,
  earthquakeFeedbackConfigSource,
].join("\n");
for (const removedCopy of [
  "NEW DEPTH RECORD",
  "DEPTH RECORD MATCHED",
  "SESSION GOAL COMPLETE",
  "EARTHQUAKE CLEARED",
  "NEW MATERIAL",
  "Gem Power low",
  "Torch extinguished",
  "No GP for torch",
  "You cannot break this",
  "HEAVY PUNCH  •  AIM THROUGH THE GEODE WALL",
  "HEAVY PUNCH REQUIRED",
  "LEVEL UP  •  +1 LEVEL",
  "COMBO SURGE  •  +50 COMBO",
  "KING TILE  •  +5 LEVELS",
  "CAVE DISCOVERED",
  "TITAN DISCOVERED",
  "STARTER CARGO",
]) {
  assert.ok(
    !purgedPopupSources.includes(removedCopy),
    `removed popup copy must stay absent: ${removedCopy}`,
  );
}
assert.ok(!caveGameplaySource.includes("CaveScene Level"));
assert.ok(!starReleaseSource.includes("uiNotifications"));
assert.ok(starReleaseSource.includes("_recordCollectedStar"));
assert.ok(starReleaseSource.includes("SkyStarReleaseView"));
assert.ok(!caveDiscoverySource.includes("uiNotifications"));
assert.ok(caveDiscoverySource.includes("discoverJournal"));
assert.ok(caveDiscoverySource.includes("celebrateDiscovery"));
assert.ok(!titanDiscoverySource.includes("uiNotifications"));
assert.ok(titanDiscoverySource.includes("this._clearTarget()"));
assert.ok(!tutorialSystemSource.includes("uiNotifications"));
assert.ok(tutorialSystemSource.includes("claimTutorialStarterReward"));
assert.ok(tutorialSystemSource.includes("setResources"));
assert.ok(!nextPromiseSource.includes("getDepthChase"));
assert.ok(!specialBlocksConfigSource.includes("timedEffectNotifications"));
assert.ok(!specialBlocksConfigSource.includes("instantEffectNotifications"));
assert.ok(!miningConfigSource.includes("blockedUi"));
assert.ok(!settingsPanelSource.includes("showExpeditionSummaries"));
assert.ok(!settingsPanelSource.includes("showMaterialDiscoveryCards"));
assert.ok(settingsPanelSource.includes("showSessionObjective"));
assert.ok(!earthquakeSystemSource.includes("earthquakeFeedbackUI?.completeEvent"));
assert.ok(earthquakeSystemSource.includes("recordEarthquake"));
assert.ok(!earthquakeFeedbackUiSource.includes("recap"));
assert.ok(!earthquakeFeedbackConfigSource.includes("recap"));
assert.ok(specialTileSource.includes("activateChestCritBuff"));
assert.ok(specialTileSource.includes("recordChest"));
assert.ok(!specialTileSource.includes('key: "treasure-fury"'));

for (const asset of Object.values(ASSET_KEYS.ui.notificationControls)) {
  const assetStat = await stat(path.join(root, asset.path));
  assert.ok(assetStat.size > 10000, `Notification control art is too small: ${asset.path}`);
}

console.log("UI notification carousel contract passed.");
