import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import {
  getStarIdentitiesForRarity,
} from "../values/starIdentityLibraryMath.js";
import { getStarRarityTier } from "../values/starRarityProgressionMath.js";
import {
  resolveWorldVisualSemanticStarIdleEnabled,
  WORLD_VISUAL_SEMANTIC_ASSETS,
} from "../values/worldVisualSemanticAssets.js";
import {
  installStarIdentityTextureFrames,
} from "../systems/visual/installStarIdentityTextureFrames.js";
import {
  WorldVisualSemanticAssetLayer,
} from "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";
import { renderInventoryStarAtlas } from
  "../ui/overlays/UIInventoryStarAtlas.js?rev=20260826-star-idle-ui-v2";


const WIDTH = 1280;
const HEIGHT = 720;
const TILE_SIZE = 94;
const MOTION = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion;
const assetPath = path => `../${path}`;

function selectReviewIdentities() {
  return Array.from({ length: 6 }, (_, rarity) => {
    const identities = getStarIdentitiesForRarity(rarity);
    return [identities[rarity % identities.length], identities[Math.floor(identities.length * 0.58)]];
  }).flat();
}

class StarBlockIdleVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("StarBlockIdleVisualHarnessScene");
    this.semanticLayer = null;
    this.maskGraphics = null;
    this.reviewIdentities = selectReviewIdentities();
    this.worldEntries = new Map();
    const query = new URLSearchParams(globalThis.location?.search || "");
    this.uiReview = query.get("view") === "ui";
    this.uiCollectionMode = query.get("collection") === "empty"
      ? "empty"
      : "partial";
  }

  preload() {
    const assets = [
      ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
      ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
      STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation,
    ];
    if (resolveWorldVisualSemanticStarIdleEnabled()) assets.push(MOTION.atlas);
    for (const asset of assets) {
      this.load.image(asset.key, assetPath(asset.path));
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x02050b);
    this._drawBackdrop();
    if (this.uiReview) {
      this._createStarCodexReview();
      document.body.dataset.starIdleHarnessReady = "true";
      document.body.dataset.starIdleMode = "anchored-energy-ui-v2";
      document.body.dataset.starCollectionMode = this.uiCollectionMode;
      document.body.dataset.visibleStars = `${this.uiMotionSprites.length}`;
      return;
    }
    this._prepareWorldEntries();
    this._createSemanticLayer();
    this._drawLabels();

    document.body.dataset.starIdleHarnessReady = "true";
    document.body.dataset.starIdleMode = this.semanticLayer.starIdleEnabled
      ? "anchored-energy-v2"
      : "legacy";
    document.body.dataset.visibleStars = `${this.semanticLayer.activeStars.length}`;
    document.body.dataset.motionFrames = `${MOTION.atlas.frameCount}`;
    document.body.dataset.motionVariants = `${MOTION.atlas.variantCount}`;
    document.body.dataset.decodedMotionBytes = `${MOTION.atlas.frameSizePx
      * MOTION.atlas.frameSizePx * MOTION.atlas.frameCount * 4}`;
    const sample = this.semanticLayer.activeStars[0];
    this.sampleBaseline = sample ? {
      x: sample.beauty.x,
      y: sample.beauty.y,
      size: sample.beauty.displayWidth,
      rotation: sample.beauty.rotation,
      alpha: sample.beauty.alpha,
    } : null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._destroy());
  }

  _createStarCodexReview() {
    installStarIdentityTextureFrames(this);
    const content = this.add.container(WIDTH / 2, HEIGHT / 2 + 22).setDepth(100);
    const identityCounts = new Array(
      STAR_IDENTITY_LIBRARY_CONFIG.identities.length,
    ).fill(0);
    if (this.uiCollectionMode !== "empty") {
      getStarIdentitiesForRarity(0).slice(0, 5).forEach((identity, index) => {
        identityCounts[identity.index] = index % 2 === 0 ? 1 : index + 1;
      });
    }
    renderInventoryStarAtlas(
      this,
      { content },
      { left: -570, top: -260, width: 1140, height: 520 },
      0,
      0,
      identityCounts,
      () => {},
      () => {},
    );
    this.uiMotionSprites = content.list.filter(
      child => child.texture?.key === MOTION.atlas.key,
    );
    this.uiMotionBaseline = this.uiMotionSprites.map(sprite => ({
      x: sprite.x,
      y: sprite.y,
      size: sprite.displayWidth,
      rotation: sprite.rotation,
      alpha: sprite.alpha,
    }));
    const reviewLabel = this.uiCollectionMode === "empty"
      ? "EMPTY COLLECTION • NO UNKNOWN ART OR LORE REVEALED"
      : "COLLECTED IDENTITIES ONLY • UNKNOWN SOCKETS EMPTY • FIXED-ANCHOR MOTION";
    this.add.text(WIDTH / 2, 694, reviewLabel, {
      color: "#79bad8",
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
    }).setOrigin(0.5).setDepth(920);
  }

  _drawBackdrop() {
    const graphics = this.add.graphics().setDepth(-20);
    graphics.fillGradientStyle(0x071220, 0x071220, 0x02050b, 0x02050b, 1);
    graphics.fillRect(0, 0, WIDTH, HEIGHT);
    graphics.fillStyle(0x0a1723, 0.95).fillRoundedRect(38, 104, WIDTH - 76, 566, 18);
    graphics.lineStyle(1, 0x23445d, 0.34);
    for (let x = 74; x <= WIDTH - 74; x += TILE_SIZE) {
      graphics.lineBetween(x, 112, x, HEIGHT - 58);
    }
    for (let y = 112; y <= HEIGHT - 58; y += TILE_SIZE) {
      graphics.lineBetween(38, y, WIDTH - 38, y);
    }
    const mode = resolveWorldVisualSemanticStarIdleEnabled()
      ? "OPENROUTER MOTION ON"
      : "LEGACY ROLLBACK";
    const title = this.uiReview ? "STAR CODEX UI V3" : "STAR BLOCK IDLE V2";
    this.add.text(42, 26, `${title}  •  ${mode}`, {
      color: "#eaf8ff",
      fontFamily: "Consolas, monospace",
      fontSize: "24px",
      fontStyle: "bold",
    }).setDepth(920);
    this.add.text(42, 64, "250 fixed identity cores • fixed size and position • localized inner fire + elemental corona", {
      color: "#79bad8",
      fontFamily: "Consolas, monospace",
      fontSize: "15px",
    }).setDepth(920);
    this.add.text(WIDTH - 42, 64, "?starIdle=0 compares the exact rollback", {
      color: "#778fa1",
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
    }).setOrigin(1, 0).setDepth(920);
  }

  _prepareWorldEntries() {
    this.reviewIdentities.forEach((identity, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const tx = 1 + column * 2;
      const ty = 2 + row * 3;
      this.worldEntries.set(`${tx}:${ty}`, { identity, tx, ty });
    });
  }

  _createSemanticLayer() {
    this.maskGraphics = this.make.graphics({ add: false });
    this.maskGraphics.fillStyle(0xffffff, 1).fillRect(0, 0, WIDTH, HEIGHT);
    const geometryMask = this.maskGraphics.createGeometryMask();
    const worldModel = {
      getSkyTileIdentity: (tx, ty) => this.worldEntries.get(`${tx}:${ty}`)?.identity.index || 0,
      getSkyTileRarity: (tx, ty) => this.worldEntries.get(`${tx}:${ty}`)?.identity.rarityIndex || 0,
    };
    const semanticScene = {
      add: this.add,
      textures: this.textures,
      config: { tileSize: TILE_SIZE, topAirRows: 0 },
    };
    this.semanticLayer = new WorldVisualSemanticAssetLayer(
      semanticScene,
      worldModel,
      geometryMask,
      WORLD_VISUAL_SEMANTIC_ASSETS,
    );
    this.semanticLayer.starIdleEnabled = resolveWorldVisualSemanticStarIdleEnabled();
    this.semanticLayer.identityFramesReady = installStarIdentityTextureFrames(this);
    this.semanticLayer.townFloorOcclusion = null;
    if (this.semanticLayer.starIdleEnabled) this.semanticLayer._installFrames(MOTION.atlas);
    [...this.worldEntries.values()].forEach((entry, index) => {
      this.semanticLayer._showStar(
        index,
        entry.tx,
        entry.ty,
        TILE_SIZE,
        { terrainTint: 0xffffff },
      );
    });
  }

  _drawLabels() {
    [...this.worldEntries.values()].forEach(entry => {
      const tier = getStarRarityTier(entry.identity.rarityIndex);
      const x = (entry.tx + 0.5) * TILE_SIZE;
      const y = (entry.ty + 0.5) * TILE_SIZE + 60;
      this.add.text(x, y, `${entry.identity.name}\n${tier.name.toUpperCase()}  •  LOOP ${entry.identity.index % 3 + 1}`, {
        align: "center",
        color: tier.palette.highlight,
        fontFamily: "Consolas, monospace",
        fontSize: "11px",
        stroke: "#02050b",
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(920);
    });
  }

  update(time) {
    if (this.uiReview) {
      const drift = this.uiMotionSprites.map((sprite, index) => ({
        position: Math.hypot(
          sprite.x - this.uiMotionBaseline[index].x,
          sprite.y - this.uiMotionBaseline[index].y,
        ),
        size: Math.abs(sprite.displayWidth - this.uiMotionBaseline[index].size),
        rotation: Math.abs(sprite.rotation - this.uiMotionBaseline[index].rotation),
        alpha: Math.abs(sprite.alpha - this.uiMotionBaseline[index].alpha),
      }));
      document.body.dataset.sampleFrame = this.uiMotionSprites[0]?.frame?.name || "none";
      document.body.dataset.samplePositionDrift = Math.max(...drift.map(item => item.position)).toFixed(3);
      document.body.dataset.sampleSizeDrift = Math.max(...drift.map(item => item.size)).toFixed(3);
      document.body.dataset.sampleRotationDrift = Math.max(...drift.map(item => item.rotation)).toFixed(5);
      document.body.dataset.sampleAlphaDrift = Math.max(...drift.map(item => item.alpha)).toFixed(5);
      return;
    }
    this.semanticLayer?.update(time);
    const sample = this.semanticLayer?.activeStars[0];
    if (!sample) return;
    document.body.dataset.sampleFrame = sample.idle?.frame?.name || sample.idleFrame || "legacy";
    const baseline = this.sampleBaseline;
    document.body.dataset.samplePositionDrift = baseline
      ? Math.hypot(sample.beauty.x - baseline.x, sample.beauty.y - baseline.y).toFixed(3)
      : "0.000";
    document.body.dataset.sampleSizeDrift = baseline
      ? Math.abs(sample.beauty.displayWidth - baseline.size).toFixed(3)
      : "0.000";
    document.body.dataset.sampleRotationDrift = baseline
      ? Math.abs(sample.beauty.rotation - baseline.rotation).toFixed(5)
      : "0.00000";
    document.body.dataset.sampleAlphaDrift = baseline
      ? Math.abs(sample.beauty.alpha - baseline.alpha).toFixed(5)
      : "0.00000";
  }

  _destroy() {
    this.semanticLayer?.destroy();
    this.maskGraphics?.destroy();
    this.semanticLayer = null;
    this.maskGraphics = null;
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: 0x02050b,
  parent: document.body,
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  scene: [StarBlockIdleVisualHarnessScene],
});
