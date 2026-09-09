import { LevelUpRewardPresentation } from "../systems/visual/LevelUpRewardPresentation.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { XP_GATHERING_CONFIG } from "../values/xpGathering.js";

const BACKGROUND_KEY = "level-up-v2-harness-background";
const BACKGROUND_PATH =
  "../sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v1.webp";

class LevelUpV2VisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("LevelUpV2VisualHarnessScene");
  }

  preload() {
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.image(
      ASSET_KEYS.ui.approvedHud.levelUpShell,
      `../${APPROVED_HUD_SKIN.paths.levelUpShell}`,
    );
    this.load.image(
      ASSET_KEYS.ui.xpGathering.levelUp,
      `../${XP_GATHERING_CONFIG.assetPaths.levelUp}`,
    );
  }

  create() {
    this.add.image(this.scale.width / 2, this.scale.height / 2, BACKGROUND_KEY)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setTint(0x505963);
    this.presentation = new LevelUpRewardPresentation(this);
    this.presentation.config = Object.freeze({
      ...this.presentation.config,
      holdMs: 600000,
    });
    const show = () => this.presentation.show({
      level: 12,
      levelsGained: 1,
      panicResistanceGainMeters: 20,
      panicResistanceMeters: 220,
      miningPowerGainPercent: 14,
      gemPowerMaxGain: 25,
    });
    show();
    const snapshot = () => this.presentation.getHealthSnapshot();
    globalThis.__LEVEL_UP_V2_HARNESS__ = Object.freeze({
      show,
      snapshot,
    });
    document.body.dataset.levelUpV2Snapshot = JSON.stringify(snapshot());
    document.body.dataset.levelUpV2Ready = "true";
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
  scene: [LevelUpV2VisualHarnessScene],
});
