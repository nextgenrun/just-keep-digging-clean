const REVIEW_SURFACES = Object.freeze([
  ["pause", "ESC Menu"],
  ["inventory", "Inventory"],
  ["map", "Map"],
  ["shop", "Shop"],
  ["campfire", "Campfire"],
  ["milestones", "Milestones"],
  ["star", "Star Pillar"],
  ["level", "Level Up"],
  ["dialog", "Dialog"],
  ["notification", "Notification"],
]);

const NOTIFICATION_REVIEW_CASES = Object.freeze([
  Object.freeze({
    method: "success",
    message: "UI review update: one readable card at a time.",
  }),
  Object.freeze({
    method: "info",
    message: "UI review notice: arrows browse the queued cards.",
  }),
  Object.freeze({
    method: "warning",
    message: "UI review warning: X removes only this card.",
  }),
]);
let notificationReviewIndex = 0;

function showReviewNotification(scene) {
  const sample = NOTIFICATION_REVIEW_CASES[
    notificationReviewIndex % NOTIFICATION_REVIEW_CASES.length
  ];
  notificationReviewIndex += 1;
  scene.uiNotifications?.[sample.method]?.(sample.message, { noDedupe: true });
}

function closeReviewSurface(scene) {
  if (scene._pausePanel || scene.gameState === "paused") scene.resumeGame?.();
  scene.shopOverlay?.hide?.();
  scene.uiInventoryPopup?.close?.();
  scene.hideWorldMap?.();
  scene.campfireSystem?._closeBuffSelection?.();
  scene.milestoneBoardSystem?._closeBoardView?.();
  scene.starPillarSystem?.closeConstellationView?.();
  if (scene.gameState === "dialog") {
    scene.hideOverlay?.();
    scene.closeGameDialog?.();
  }
}

function openReviewSurface(scene, surface) {
  switch (surface) {
    case "pause":
      scene.showPauseMenu?.();
      break;
    case "inventory":
      scene.uiInventoryPopup?.open?.();
      break;
    case "map":
      console.info("[UiReviewHarness] Map open " + JSON.stringify({
        accepted: scene.showWorldMap?.(),
        gameState: scene.gameState,
        loading: scene._worldMapFeatureLoading === true,
        open: scene.worldMapOverlay?.isOpen === true,
        assets: scene.runtimeFeatureAssetManager?.getSnapshot?.(),
      }));
      break;
    case "shop":
      scene.shopOverlay?.show?.("moneyMonster");
      break;
    case "campfire":
      scene.campfireSystem?._openBuffSelection?.();
      break;
    case "milestones":
      scene.milestoneBoardSystem?._openBoardView?.();
      break;
    case "star":
      scene.starPillarSystem?.openConstellationView?.();
      break;
    case "level":
      scene.levelUpRewardPresentation?.show?.({
        level: 2,
        levelsGained: 1,
        darknessResistanceGainMeters: 20,
        darknessResistanceMeters: 20,
        miningPowerGainPercent: 56,
        maxHpGain: 50,
        gemPowerMaxGain: 100,
      });
      scene.soundSystem?.playLevelUpReward?.();
      break;
    case "dialog":
      scene.showGameDialog?.(
        "UI REVIEW DIALOG",
        "This is a production dialog layout check.\n\nText should remain readable, centered, and clear at every supported viewport."
      );
      break;
    case "notification":
      showReviewNotification(scene);
      break;
  }
}

export function installUiReviewHarness(scene) {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("ui-review") !== "1") return null;

  document.querySelector("[data-ui-review-root]")?.remove();
  document.querySelector("[data-ui-review-toggle]")?.remove();

  const root = document.createElement("div");
  root.dataset.uiReviewRoot = "true";
  Object.assign(root.style, {
    position: "fixed",
    left: "50%",
    bottom: "8px",
    zIndex: "2147483646",
    display: "flex",
    gap: "6px",
    padding: "7px",
    transform: "translateX(-50%)",
    background: "rgba(11,16,21,.96)",
    border: "1px solid #d6a84a",
    borderRadius: "7px",
    boxShadow: "0 8px 28px rgba(0,0,0,.65)",
    fontFamily: "Bahnschrift, Trebuchet MS, sans-serif",
  });

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.uiReviewToggle = "true";
  toggle.setAttribute("aria-label", "Show UI review controls");
  Object.assign(toggle.style, {
    position: "fixed",
    left: "2px",
    top: "2px",
    zIndex: "2147483647",
    width: "10px",
    height: "10px",
    padding: "0",
    opacity: ".03",
    border: "0",
    cursor: "pointer",
  });
  toggle.hidden = true;
  toggle.addEventListener("click", () => {
    root.hidden = false;
    toggle.hidden = true;
  });

  REVIEW_SURFACES.forEach(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.testid = "ui-review-" + id;
    button.textContent = label;
    Object.assign(button.style, {
      minHeight: "32px",
      padding: "5px 9px",
      color: "#f0dfc2",
      background: "#111a21",
      border: "1px solid #4a4033",
      borderRadius: "5px",
      font: "700 11px Bahnschrift, Trebuchet MS, sans-serif",
      cursor: "pointer",
    });
    button.addEventListener("pointerenter", () => {
      button.style.borderColor = "#d6a84a";
      button.style.background = "#22313a";
    });
    button.addEventListener("pointerleave", () => {
      button.style.borderColor = "#4a4033";
      button.style.background = "#111a21";
    });
    button.addEventListener("click", () => {
      closeReviewSurface(scene);
      root.hidden = true;
      toggle.hidden = false;
      scene.time.delayedCall(180, () => openReviewSurface(scene, id));
    });
    root.appendChild(button);
  });

  document.body.append(root, toggle);
  const destroy = () => {
    root.remove();
    toggle.remove();
  };
  scene.events.once("shutdown", destroy);
  scene.events.once("destroy", destroy);
  return { root, toggle, destroy };
}
