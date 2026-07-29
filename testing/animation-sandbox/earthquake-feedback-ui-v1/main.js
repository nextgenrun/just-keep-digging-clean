import { EarthquakeFeedbackUI } from "../../../systems/visual/EarthquakeFeedbackUI.js";
import { EarthquakeHazardOverlay } from "../../../systems/visual/EarthquakeHazardOverlay.js";
import { EarthquakeTileFeedbackSystem } from "../../../systems/visual/EarthquakeTileFeedbackSystem.js";
import { getEarthquakeFeedbackPreloadAssets } from "../../../values/earthquakeFeedback.js";
import { GAME_CONFIG } from "../../../values/gameConfig.js";

const VIEWPORT_WIDTH = GAME_CONFIG.viewportWidth;
const VIEWPORT_HEIGHT = GAME_CONFIG.viewportHeight;
const TILE_SIZE = GAME_CONFIG.tileSize;
const PHASE = new URLSearchParams(window.location.search).get("phase") || "warning";

class EarthquakeFeedbackReviewScene extends Phaser.Scene {
  constructor() { super("EarthquakeFeedbackReviewScene"); }

  preload() {
    for (const asset of getEarthquakeFeedbackPreloadAssets()) {
      this.load.image(asset.key, `../../../${asset.path}`);
    }
  }

  create() {
    this.config = {
      tileSize: TILE_SIZE,
      viewportWidth: VIEWPORT_WIDTH,
      viewportHeight: VIEWPORT_HEIGHT,
    };
    this.cameras.main
      .setBounds(0, 0, 40 * TILE_SIZE, 22 * TILE_SIZE)
      .setScroll(12 * TILE_SIZE, 6.085 * TILE_SIZE);
    this.uiNotifications = { baseY: 58, setBaseY(value) { this.baseY = value; } };
    this.playerController = { getPlayerTile: () => ({ tx: 15, ty: 12 }) };
    this._drawCave();
    this._drawPlayer();

    this.earthquakeSource = {
      state: PHASE === "escape" ? "idle" : PHASE,
      intensity: "major",
      stateRemaining: PHASE === "warning" ? 3200 : 8000,
      stateTotalMs: PHASE === "warning" ? 5000 : 12000,
      chainPending: false,
      config: { caveInWarningMs: 1800 },
      caveIns: PHASE === "escape" ? [] : [
        {
          id: 1,
          tx: 18,
          ty: 7,
          landingTy: 13,
          remaining: PHASE === "warning" ? 1440 : 520,
          chain: false,
        },
        {
          id: 2,
          tx: 30,
          ty: 7,
          landingTy: 13,
          remaining: 920,
          chain: true,
        },
      ],
      fallingRocks: PHASE === "earthquake"
        ? [{
          id: 3,
          tx: 21,
          ty: 7,
          landingTy: 13,
          x: 21.5 * TILE_SIZE,
          y: 10 * TILE_SIZE,
          endY: 13 * TILE_SIZE,
          angle: 0.12,
        }]
        : [],
    };

    this.earthquakeFeedbackUI = new EarthquakeFeedbackUI(this, this.earthquakeSource);
    this.earthquakeHazardOverlay = new EarthquakeHazardOverlay(this, this.earthquakeSource);
    this.earthquakeTileFeedbackSystem = new EarthquakeTileFeedbackSystem(this);
    if (PHASE === "escape") {
      this.earthquakeFeedbackUI.activateEscapeObjective();
      for (const tile of [{ tx: 15, ty: 7 }, { tx: 16, ty: 7 }, { tx: 17, ty: 8 }]) {
        this.earthquakeHazardOverlay.markRestoredRubble(tile.tx, tile.ty);
      }
    }
    this.earthquakeFeedbackUI.update();
    this.earthquakeHazardOverlay.update();
    if (PHASE === "earthquake") {
      this.time.delayedCall(750, () => {
        const [rock] = this.earthquakeSource.fallingRocks;
        if (!rock) return;
        this.earthquakeSource.fallingRocks = [];
        this.earthquakeHazardOverlay.playRockImpact(rock);
      });
    }
    this._tileFxIndex = 0;
    this._tileFxRemaining = 1250;
    this.time.delayedCall(80, () => this._playNextTileFx());
    this.events.once("shutdown", () => {
      this.earthquakeFeedbackUI?.destroy();
      this.earthquakeHazardOverlay?.destroy();
      this.earthquakeTileFeedbackSystem?.destroy();
    });
  }

  _drawCave() {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x080d11, 1).fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    for (let ty = 3; ty < 22; ty += 1) {
      for (let tx = 0; tx < 40; tx += 1) {
        const openPocket = tx >= 8 && tx <= 25 && ty >= 8 && ty <= 12;
        if (openPocket) continue;
        const stone = (tx + ty) % 5 === 0;
        const color = stone ? 0x303840 : ((tx + ty) % 2 ? 0x3f2b22 : 0x513526);
        graphics.fillStyle(color, 1);
        graphics.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
        graphics.lineStyle(1, stone ? 0x49545c : 0x6a4430, 0.65);
        graphics.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
    if (PHASE === "escape") {
      graphics.fillStyle(0xaa66ff, 0.16).fillCircle(16 * TILE_SIZE, 21 * TILE_SIZE, 72);
      graphics.lineStyle(4, 0xaa66ff, 0.9).strokeCircle(16 * TILE_SIZE, 21 * TILE_SIZE, 34);
    }
  }

  _drawPlayer() {
    const x = 15 * TILE_SIZE + TILE_SIZE / 2;
    const y = 13 * TILE_SIZE - 18;
    const robot = this.add.graphics().setDepth(20);
    robot.fillStyle(0xd8dde0, 1).fillRoundedRect(x - 30, y - 36, 50, 36, 8);
    robot.lineStyle(3, 0x202a31, 1).strokeRoundedRect(x - 30, y - 36, 50, 36, 8);
    robot.fillStyle(0x70b9c4, 1).fillCircle(x + 4, y - 20, 7);
    robot.fillStyle(0x70777c, 1).fillRoundedRect(x - 34, y, 70, 18, 7);
    robot.fillStyle(0xb9c0c4, 1).fillTriangle(x + 20, y - 25, x + 58, y - 12, x + 20, y - 2);
  }

  _playNextTileFx() {
    const examples = [
      { variant: "caveFracture", tx: 16, ty: 7 },
      { variant: "damage", tx: 14, ty: 7, destroyed: false },
      { variant: "damage", tx: 20, ty: 7, destroyed: true },
      { variant: "restore", tx: 24, ty: 13 },
    ];
    const example = examples[this._tileFxIndex % examples.length];
    this._tileFxIndex += 1;
    if (example.variant === "caveFracture") {
      this.earthquakeTileFeedbackSystem.showCaveInFracture(example);
    } else if (example.variant === "restore") {
      this.earthquakeTileFeedbackSystem.showRestore(example);
    } else {
      this.earthquakeTileFeedbackSystem.showDamage(example);
    }
  }

  update(_time, delta) {
    this.earthquakeFeedbackUI?.update();
    this.earthquakeHazardOverlay?.update();
    this._tileFxRemaining -= delta;
    if (this._tileFxRemaining <= 0) {
      this._tileFxRemaining = 1250;
      this._playNextTileFx();
    }
  }

}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  backgroundColor: "#05080b",
  scene: [EarthquakeFeedbackReviewScene],
  render: { antialias: true, pixelArt: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
