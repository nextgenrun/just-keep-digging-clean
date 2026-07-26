import { EarthquakeFeedbackUI } from "../../../systems/visual/EarthquakeFeedbackUI.js";
import { EarthquakeHazardOverlay } from "../../../systems/visual/EarthquakeHazardOverlay.js";
import { getEarthquakeFeedbackPreloadAssets } from "../../../values/earthquakeFeedback.js";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const TILE_SIZE = 32;
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
      config: { caveInWarningMs: 3000 },
      caveIns: PHASE === "escape" ? [] : [
        { tx: 18, ty: 6, remaining: PHASE === "warning" ? 2800 : 1400, chain: false },
        { tx: 41, ty: 11, remaining: 2200, chain: true },
      ],
      fallingRocks: PHASE === "earthquake"
        ? [{ x: 26 * TILE_SIZE, y: 7 * TILE_SIZE, endY: 18 * TILE_SIZE }]
        : [],
    };

    this.earthquakeFeedbackUI = new EarthquakeFeedbackUI(this, this.earthquakeSource);
    this.earthquakeHazardOverlay = new EarthquakeHazardOverlay(this, this.earthquakeSource);
    if (PHASE === "escape") {
      this.earthquakeFeedbackUI.activateEscapeObjective();
      for (const tile of [{ tx: 15, ty: 7 }, { tx: 16, ty: 7 }, { tx: 17, ty: 8 }]) {
        this.earthquakeHazardOverlay.markRestoredRubble(tile.tx, tile.ty);
      }
    }
    this.earthquakeFeedbackUI.update();
    this.earthquakeHazardOverlay.update();
    this.reviewFramesRemaining = 3;
  }

  _drawCave() {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x080d11, 1).fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    for (let ty = 3; ty < 22; ty += 1) {
      for (let tx = 0; tx < 40; tx += 1) {
        const openPocket = tx >= 8 && tx <= 29 && ty >= 8 && ty <= 17;
        const lowerTunnel = tx >= 14 && tx <= 17 && ty >= 17;
        if (openPocket || lowerTunnel) continue;
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
    const y = 16 * TILE_SIZE;
    const robot = this.add.graphics().setDepth(20);
    robot.fillStyle(0xd8dde0, 1).fillRoundedRect(x - 30, y - 36, 50, 36, 8);
    robot.lineStyle(3, 0x202a31, 1).strokeRoundedRect(x - 30, y - 36, 50, 36, 8);
    robot.fillStyle(0x70b9c4, 1).fillCircle(x + 4, y - 20, 7);
    robot.fillStyle(0x70777c, 1).fillRoundedRect(x - 34, y, 70, 18, 7);
    robot.fillStyle(0xb9c0c4, 1).fillTriangle(x + 20, y - 25, x + 58, y - 12, x + 20, y - 2);
  }

  update() {
    if (this.reviewFramesRemaining <= 0) return;
    this.reviewFramesRemaining -= 1;
    this.earthquakeFeedbackUI?.update();
    this.earthquakeHazardOverlay?.update();
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
