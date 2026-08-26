import { HardcoreStatusHud } from "../systems/visual/HardcoreStatusHud.js";
import { ScreenFlashSystem } from "../systems/visual/ScreenFlashSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAMEFEEL_CONFIG } from "../values/gamefeel.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";

const BACKGROUND_KEY = "hardcore-panic-harness-background";
const BACKGROUND_PATH =
  "../sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v1.webp";
const VALID_BANDS = Object.freeze(["calm", "warning", "critical"]);
const STRESS_BY_BAND = Object.freeze({ calm: 28, warning: 63, critical: 88 });

function resolveHarnessViewport() {
  const params = new URLSearchParams(location.search);
  const width = Number(params.get("width"));
  const height = Number(params.get("height"));
  return {
    width: Number.isFinite(width) && width > 0
      ? width
      : APPROVED_HUD_SKIN.referenceViewport.width,
    height: Number.isFinite(height) && height > 0
      ? height
      : APPROVED_HUD_SKIN.referenceViewport.height,
  };
}

const HARNESS_VIEWPORT = resolveHarnessViewport();

function resolveInitialBand() {
  const requested = new URLSearchParams(location.search).get("band");
  return VALID_BANDS.includes(requested) ? requested : "critical";
}

function resolveInitialStress() {
  const requested = Number(new URLSearchParams(location.search).get("stress"));
  if (Number.isFinite(requested)) {
    return Math.max(0, Math.min(HARDCORE_MODE_CONFIG.stress.maximum, requested));
  }
  return STRESS_BY_BAND[resolveInitialBand()];
}

function resolveInitialGp() {
  const requested = Number(new URLSearchParams(location.search).get("gp"));
  return Number.isFinite(requested) ? Math.max(0, requested) : 42;
}

function createSnapshot(stress) {
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

class HardcorePanicVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("HardcorePanicVisualHarnessScene");
    this.stress = resolveInitialStress();
    this.gp = resolveInitialGp();
    this.snapshot = createSnapshot(this.stress);
    this.gameplayActive = true;
  }

  preload() {
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.image(
      ASSET_KEYS.ui.approvedHud.notification,
      `../${APPROVED_HUD_SKIN.paths.notification}`,
    );
    for (const id of [
      "crest",
      "panicWarning",
      "panicCritical",
      "panicEdgeFrame",
    ]) {
      const asset = HARDCORE_MODE_CONFIG.assets[id];
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    this.add.image(this.scale.width / 2, this.scale.height / 2, BACKGROUND_KEY)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(0);
    this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
    this.hud = new HardcoreStatusHud(this);
    window.__hardcorePanicHarness = {
      setBand: band => {
        if (!VALID_BANDS.includes(band)) return false;
        this.stress = STRESS_BY_BAND[band];
        this.snapshot = createSnapshot(this.stress);
        return true;
      },
      setStress: stress => {
        const requested = Number(stress);
        if (!Number.isFinite(requested)) return false;
        this.stress = Math.max(
          0,
          Math.min(HARDCORE_MODE_CONFIG.stress.maximum, requested),
        );
        this.snapshot = createSnapshot(this.stress);
        return true;
      },
      setGp: gp => {
        const requested = Number(gp);
        if (!Number.isFinite(requested)) return false;
        this.gp = Math.max(0, requested);
        return true;
      },
      setGameplayActive: active => {
        this.gameplayActive = active === true;
      },
      snapshot: () => ({
        stress: this.stress,
        sanity: this.snapshot.sanity,
        selectedBand: this.snapshot.stressBand,
        gp: this.gp,
        gameplayActive: this.gameplayActive,
        flashAlpha: Number(this.screenFlashSystem?._rect?.alpha) || 0,
        ...this.hud.getDebugSnapshot(),
      }),
    };
  }

  update(time) {
    this.hud.update(
      this.snapshot,
      time,
      this.gp,
      { gameplayActive: this.gameplayActive },
    );
    const review = this.hud.getDebugSnapshot();
    Object.assign(this.game.canvas.dataset, {
      panicBand: this.snapshot.stressBand,
      panicSanity: String(this.snapshot.sanity),
      panicReady: String(review.ready),
      highPanicVisible: String(review.highPanicVisible),
      panicFlashAlpha: String(Number(this.screenFlashSystem?._rect?.alpha) || 0),
      statusIconKey: review.statusIconKey || "",
    });
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: HARNESS_VIEWPORT.width,
  height: HARNESS_VIEWPORT.height,
  backgroundColor: "#05090d",
  parent: document.body,
  scene: HardcorePanicVisualHarnessScene,
  render: { antialias: true, pixelArt: false },
});
