import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { getStarlessScarBiomePalette } from
  "../values/starlessScarBiomePalettes.js";
import { resolveStarSanctuaryProfile } from
  "../systems/environment/starSanctuaryProfile.js";
import { WorldMapStarTerritorySystem } from
  "../systems/map/WorldMapStarTerritorySystem.js";
import { installStarIdentityTextureFrames } from
  "../systems/visual/installStarIdentityTextureFrames.js";
import { StarlessScarView } from "../systems/visual/StarlessScarView.js";

const WIDTH = 1280;
const HEIGHT = 720;
const TILE_SIZE = 64;
const INTACT = Object.freeze({ tx: 5, ty: 5 });
const CONSUMED = Object.freeze({ tx: 15, ty: 5 });
const IDENTITY_INDEX = 37;
const RARITY_INDEX = 3;
const SCAR_BIOME_ID = new URLSearchParams(location.search).get("scarBiome")
  || "cobalt-aquifer";
const assetPath = path => `../${path}`;

class HarnessWorld {
  constructor() {
    this.widthTiles = WIDTH / TILE_SIZE;
    this.depthTiles = HEIGHT / TILE_SIZE;
    this.tileSize = TILE_SIZE;
    this.topAirRows = 0;
    this.dugTileSource = new Map([[`${CONSUMED.tx},${CONSUMED.ty}`, {
      ...CONSUMED,
      type: TILE_TYPES.SKY_TILE,
    }]]);
  }

  getTileType(tx, ty) {
    if (tx === INTACT.tx && ty === INTACT.ty) return TILE_TYPES.SKY_TILE;
    if (tx === CONSUMED.tx && ty === CONSUMED.ty) return TILE_TYPES.AIR;
    return TILE_TYPES.DIRT;
  }

  getDugTileSource(tx, ty) {
    return this.dugTileSource.get(`${tx},${ty}`) || null;
  }

  getSkyTileIdentity(tx, ty) {
    return tx === INTACT.tx || tx === CONSUMED.tx ? IDENTITY_INDEX : 0;
  }

  getSkyTileRarity(tx, ty) {
    return tx === INTACT.tx || tx === CONSUMED.tx ? RARITY_INDEX : 0;
  }
}

class StarSanctuaryConsequenceHarness extends Phaser.Scene {
  constructor() {
    super("StarSanctuaryConsequenceHarness");
    this.worldModel = new HarnessWorld();
    this.identity = getStarIdentity(IDENTITY_INDEX);
    this.profile = resolveStarSanctuaryProfile({
      ...INTACT,
      identityIndex: IDENTITY_INDEX,
      rarityIndex: RARITY_INDEX,
    });
    this.scarView = null;
    this.gp = 32;
  }

  preload() {
    this.scarPalette = getStarlessScarBiomePalette(SCAR_BIOME_ID)
      || getStarlessScarBiomePalette("cobalt-aquifer");
    const assets = [
      WORLD_VISUAL_MATERIALS.shallowBlue,
      ...Object.values(STAR_SANCTUARY_CONFIG.scar.visual.assets),
      ...Object.values(this.scarPalette.assets),
      ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
      ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
    ];
    assets.forEach(asset => this.load.image(asset.key, assetPath(asset.path)));
  }

  create() {
    installStarIdentityTextureFrames(this);
    this.cameras.main.setBackgroundColor(0x02040a);
    this._drawGround();
    this._drawComparisonFrames();
    this._drawIntactStar();
    this._createScar();
    this._drawHeaders();
    this._drawContracts();
    this._createGpMeter();
    document.body.dataset.starSanctuaryHarnessReady = "true";
    document.body.dataset.intactIdentity = this.identity.id;
    document.body.dataset.temperament = this.profile.temperamentId;
    document.body.dataset.gpRate = this.profile.gpPerSecond.toFixed(2);
    document.body.dataset.gpCap = this.profile.gpCapRatio.toFixed(3);
    document.body.dataset.scarRadius = `${STAR_SANCTUARY_CONFIG.scar.radiusTiles}`;
    document.body.dataset.scarTerritoryBound = `${STAR_SANCTUARY_CONFIG.scar.territoryBound}`;
    document.body.dataset.scarCoversEntireTerritory = `${STAR_SANCTUARY_CONFIG.scar.coversEntireTerritory}`;
    document.body.dataset.scarStressMultiplier = `${STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier}`;
    const scarSnapshot = this.scarView.getSnapshot();
    document.body.dataset.scarCellCount = `${scarSnapshot.visibleScarCellCount}`;
    document.body.dataset.scarMaterialReady = `${scarSnapshot.materialReady}`;
    document.body.dataset.scarGroundReady = `${scarSnapshot.groundReady}`;
    document.body.dataset.scarCenterReady = `${scarSnapshot.centerReady}`;
    document.body.dataset.scarFrontierReady = `${scarSnapshot.frontierReady}`;
    document.body.dataset.scarCenterCount = `${scarSnapshot.visibleCenterCount}`;
    document.body.dataset.scarFrontierCount = `${scarSnapshot.visibleFrontierCount}`;
    document.body.dataset.scarViewTerritoryBound = `${scarSnapshot.territoryBound}`;
    document.body.dataset.scarBiomeId = SCAR_BIOME_ID;
    document.body.dataset.scarPaletteId = scarSnapshot.visiblePaletteIds?.[0] || "";
    document.body.dataset.scarPaletteReady = `${scarSnapshot.readyPaletteCount > 0}`;
    document.body.dataset.scarOverlayPropsReady = `${(
      scarSnapshot.palettes?.[0]?.readyRoleCount || 0
    ) === 4}`;
    document.body.dataset.scarOverlayPropCount = `${scarSnapshot.visiblePalettePropCount}`;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scarView?.destroy();
      this.worldMapStarTerritorySystem?.destroy();
    });
  }

  _drawGround() {
    this.add.tileSprite(
      WIDTH / 2,
      HEIGHT / 2,
      WIDTH,
      HEIGHT,
      WORLD_VISUAL_MATERIALS.shallowBlue.key,
    ).setDepth(0.1).setTint(0x8396b2);
    const shade = this.add.graphics().setDepth(0.2);
    shade.fillGradientStyle(0x07101c, 0x07101c, 0x02050a, 0x02050a, 0.42);
    shade.fillRect(0, 0, WIDTH, HEIGHT);
    shade.lineStyle(1, 0x8cb7d4, 0.08);
    for (let x = 0; x <= WIDTH; x += TILE_SIZE) shade.lineBetween(x, 92, x, HEIGHT);
    for (let y = 92; y <= HEIGHT; y += TILE_SIZE) shade.lineBetween(0, y, WIDTH, y);
  }

  _drawComparisonFrames() {
    const frame = this.add.graphics().setDepth(700);
    frame.fillStyle(0x02050a, 0.44).fillRect(0, 0, WIDTH, 92);
    frame.lineStyle(2, 0x6fd7f0, 0.34).strokeRoundedRect(22, 112, 586, 574, 16);
    frame.lineStyle(2, 0xc65f88, 0.42).strokeRoundedRect(672, 112, 586, 574, 16);
    frame.lineStyle(1, 0xffffff, 0.12).lineBetween(640, 112, 640, 686);
  }

  _drawIntactStar() {
    const x = (INTACT.tx + 0.5) * TILE_SIZE;
    const y = (INTACT.ty + 0.5) * TILE_SIZE;
    const lightDiameter = this.profile.radiusTiles * TILE_SIZE * 2;
    this.add.image(
      x,
      y,
      this.identity.lightAtlasKey,
      this.identity.lightFrameName,
    )
      .setDisplaySize(lightDiameter * 1.18, lightDiameter * 1.18)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2.35);
    this.add.image(
      x,
      y,
      this.identity.atlasKey,
      this.identity.frameName,
    )
      .setDisplaySize(TILE_SIZE * 1.36, TILE_SIZE * 1.36)
      .setDepth(2.43);
    const ring = this.add.graphics().setDepth(2.36);
    ring.lineStyle(2, 0x86efff, 0.56);
    ring.strokeCircle(x, y, this.profile.radiusTiles * TILE_SIZE);
  }

  _createScar() {
    this.worldMapStarTerritorySystem = new WorldMapStarTerritorySystem(
      this.worldModel,
    );
    const consumedSite = this.worldMapStarTerritorySystem.getNearestSite(
      CONSUMED.tx,
      CONSUMED.ty,
    );
    if (consumedSite) {
      consumedSite.biomeId = this.scarPalette.id;
      consumedSite.sourceRegionId = this.scarPalette.parentRegionId;
    }
    this._starSanctuaryRuntime = {
      system: {
        enabled: true,
        getProfileAt: () => resolveStarSanctuaryProfile({
          ...CONSUMED,
          identityIndex: IDENTITY_INDEX,
          rarityIndex: RARITY_INDEX,
        }),
      },
    };
    this.scarView = new StarlessScarView(
      this,
      this.worldModel,
      STAR_SANCTUARY_CONFIG,
    );
    this.scarView.update();
  }

  _drawHeaders() {
    this.add.text(28, 18, "STAR SANCTUARY V3  •  THE SAME STAR, BEFORE AND AFTER", {
      color: "#f2f7fb",
      fontFamily: "Consolas, monospace",
      fontSize: "24px",
      fontStyle: "bold",
    }).setDepth(920);
    this.add.text(28, 54, "Keep a reusable mini-base, or take the normal Star reward and permanently kill that exact refuge.", {
      color: "#9fb7c8",
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
    }).setDepth(920);
    this.add.text(315, 126, "KEEP THE STAR", {
      color: "#82eaff",
      fontFamily: "Consolas, monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(920);
    this.add.text(965, 126, "CONSUME THE STAR", {
      color: "#ef86a9",
      fontFamily: "Consolas, monospace",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(920);
  }

  _drawContracts() {
    const left = [
      `${this.identity.name.toUpperCase()} • ${this.profile.temperamentLabel}`,
      `+${this.profile.gpPerSecond.toFixed(1)} GP/s while resting`,
      `Charges to ${Math.round(this.profile.gpCapRatio * 100)}% GP`,
      `Panic recovery ×${this.profile.stressRecoveryScale.toFixed(2)}`,
      `Permanent light • reusable landmark`,
    ];
    const right = [
      "NORMAL STAR REWARD RECEIVED",
      `${this.identity.name.toUpperCase()} refuge is gone`,
      "No material yield • no GP • no Panic relief",
      "Deadzone Panic builds at 4x rate",
      "The Star's complete owned territory is scarred",
    ];
    this._drawContractList(54, 478, left, "#bcefff");
    this._drawContractList(704, 478, right, "#ffc0d4");
    this.add.text(640, 344, "HOLD MINE\nTO SACRIFICE", {
      align: "center",
      color: "#ffd07c",
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      fontStyle: "bold",
      stroke: "#02040a",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(920);
  }

  _drawContractList(x, y, lines, color) {
    this.add.rectangle(x, y - 12, 540, 164, 0x02050a, 0.78)
      .setOrigin(0, 0).setDepth(910).setStrokeStyle(1, colorNumber(color), 0.28);
    this.add.text(x + 20, y, lines.map((line, index) => (
      `${index === 0 ? "◆" : "•"} ${line}`
    )).join("\n"), {
      color,
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
      lineSpacing: 8,
      stroke: "#02040a",
      strokeThickness: 3,
    }).setDepth(920);
  }

  _createGpMeter() {
    this.gpMeter = this.add.graphics().setDepth(920);
    this.gpLabel = this.add.text(315, 454, "", {
      color: "#71f5c8",
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
    }).setOrigin(0.5).setDepth(921);
  }

  update(_time, delta) {
    const cap = this.profile.gpCapRatio * 100;
    this.gp = Math.min(cap, this.gp + this.profile.gpPerSecond * delta / 1000);
    this.gpMeter.clear();
    this.gpMeter.fillStyle(0x02050a, 0.9).fillRoundedRect(184, 420, 262, 16, 8);
    this.gpMeter.fillStyle(0x71f5c8, 0.94).fillRoundedRect(
      187,
      423,
      256 * this.gp / 100,
      10,
      5,
    );
    this.gpMeter.lineStyle(1, 0xb8fff0, 0.56).strokeRoundedRect(184, 420, 262, 16, 8);
    this.gpLabel.setText(`RESTING • GP ${this.gp.toFixed(0)} / ${Math.round(cap)} REFUGE CAP`);
    document.body.dataset.liveGp = this.gp.toFixed(2);
  }
}

function colorNumber(hex) {
  return Number.parseInt(String(hex).replace("#", ""), 16);
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: 0x02040a,
  parent: document.body,
  render: { antialias: true, antialiasGL: true, roundPixels: false },
  scene: [StarSanctuaryConsequenceHarness],
});
