import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { GAME_CONFIG } from "../../../values/gameConfig.js";
import { V7_VISUAL_APPROVAL } from "../../../values/v7VisualApproval.js";
import { WorldModel } from "../../../world/model/WorldModel.js";
import { WorldRenderer } from "../../../world/rendering/WorldRenderer.js";
import { BootScene } from "../../../ui/scenes/BootScene.js";
import { applyApprovalCompositor } from "./ApprovalCompositor.js";

const params = new URLSearchParams(window.location.search);
const fixtureName = V7_VISUAL_APPROVAL.fixtures[params.get("fixture")] ? params.get("fixture") : "deep";
const requestedMode = params.get("mode");
const mode = V7_VISUAL_APPROVAL.modes.includes(requestedMode) ? requestedMode : "combined";
const fixture = V7_VISUAL_APPROVAL.fixtures[fixtureName];

class V7ApprovalScene extends Phaser.Scene {
  constructor() {
    super("V7ApprovalScene");
  }

  preload() {
    this.load.setBaseURL("../../../");
    BootScene.prototype.preloadTileSprites.call(this);
    this.load.image(ASSET_KEYS.tiles.geodeInterior, "sprites/tiles/approved-world/cave-wall.webp");
    this.load.spritesheet(V7_VISUAL_APPROVAL.legacy.key, V7_VISUAL_APPROVAL.legacy.path, {
      frameWidth: V7_VISUAL_APPROVAL.legacy.frameWidth,
      frameHeight: V7_VISUAL_APPROVAL.legacy.frameHeight,
      endFrame: V7_VISUAL_APPROVAL.legacy.endFrame,
    });
  }

  create() {
    const model = new WorldModel(GAME_CONFIG);
    const renderer = new WorldRenderer(this, model, GAME_CONFIG);
    renderer.create();

    const sampling = mode === "sampling" || mode === "combined";
    const filter = sampling ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
    this.textures.get(ASSET_KEYS.runtime.tilesheet).setFilter(filter);
    this.textures.get(V7_VISUAL_APPROVAL.legacy.key).setFilter(filter);

    const tileSize = GAME_CONFIG.tileSize;
    const playerX = (fixture.playerTile.x + 0.5) * tileSize;
    const playerY = (fixture.playerTile.y + 1) * tileSize;
    const player = this.add.sprite(playerX, playerY, V7_VISUAL_APPROVAL.legacy.key, V7_VISUAL_APPROVAL.legacy.frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(V7_VISUAL_APPROVAL.legacy.displaySize, V7_VISUAL_APPROVAL.legacy.displaySize)
      .setDepth(20);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, GAME_CONFIG.worldWidthPx, GAME_CONFIG.worldDepthPx);
    camera.setRoundPixels(!sampling);
    camera.setZoom(1);
    camera.centerOn(playerX, playerY + fixture.cameraOffsetY);

    window.__v7ApprovalState = {
      ready: true,
      label: V7_VISUAL_APPROVAL.source.label,
      fixture: fixture.id,
      mode,
      viewport: V7_VISUAL_APPROVAL.viewport,
      sourceTmx: V7_VISUAL_APPROVAL.source.tmx,
      camera: Object.freeze({ scrollX: camera.scrollX, scrollY: camera.scrollY, zoom: camera.zoom }),
      legacy: Object.freeze({ key: V7_VISUAL_APPROVAL.legacy.key, frame: V7_VISUAL_APPROVAL.legacy.frame, runAnimation: false }),
      geodeAtlasFallback: "sprites/tiles/approved-world/cave-wall.webp",
      forbiddenLoads: [],
    };
    window.__v7ApprovalReady = true;
    try {
      applyApprovalCompositor(this, model, fixture, player, mode);
      window.__v7ApprovalState.forbiddenLoads = performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /pallet-v10|pallet-v14|robot|living-drill/i.test(name));
    } catch (error) {
      window.__v7ApprovalState.compositorError = String(error?.stack || error);
      console.error("[V7Approval] compositor failed", error);
    }
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: V7_VISUAL_APPROVAL.viewport.width,
  height: V7_VISUAL_APPROVAL.viewport.height,
  backgroundColor: "#080d18",
  pixelArt: true,
  roundPixels: true,
  render: { antialias: false, antialiasGL: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [V7ApprovalScene],
});
