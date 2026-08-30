import {
  WORLD_VISUAL_ABOVE_GROUND_REDESIGN_CHAPTER_BY_ID as CHAPTER_BY_ID,
  WORLD_VISUAL_ABOVE_GROUND_REDESIGN_REVIEW as REVIEW,
} from "../values/worldVisualAboveGroundRedesignReview.js";
import { WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS as HERO_ASSETS } from
  "../values/worldVisualSurfaceHeroLandmarks.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3 as PROP_ASSET_BY_ID,
  WORLD_VISUAL_PROP_ATLASES_V3 as PROP_ATLASES,
  WORLD_VISUAL_PROP_RUNTIME_ASSETS_V3 as PROP_RUNTIME_ASSETS,
} from "../values/generated/worldVisualPropLibraryV3/index.js";

const query = new URLSearchParams(globalThis.location.search);
const requestedChapter = query.get("chapter");
const clean = query.get("clean") === "1";

class AboveGroundRedesignReviewScene extends Phaser.Scene {
  constructor() {
    super("AboveGroundRedesignReviewScene");
    this.chapterIndex = Math.max(
      0,
      REVIEW.chapters.findIndex(chapter => chapter.id === requestedChapter),
    );
    this.mode = query.get("mode") === "current" ? "current" : REVIEW.defaultMode;
    this.renderedObjects = [];
  }

  preload() {
    for (const chapter of REVIEW.chapters) {
      this.load.image(chapter.baseKey, `../${chapter.basePath}`);
    }

    const usedHeroes = new Set();
    const usedProps = new Set();
    for (const chapter of REVIEW.chapters) {
      for (const overlay of chapter.overlays) {
        (overlay.kind === "hero" ? usedHeroes : usedProps).add(overlay.assetId);
      }
    }

    for (const assetId of usedHeroes) {
      const asset = HERO_ASSETS[assetId];
      this.load.image(asset.key, `../${asset.path}`);
    }

    const usedAtlasKeys = new Set(
      [...usedProps].map(assetId => PROP_RUNTIME_ASSETS[assetId].key),
    );
    for (const atlas of PROP_ATLASES) {
      if (!usedAtlasKeys.has(atlas.key)) continue;
      this.load.atlas(atlas.key, `../${atlas.path}`, `../${atlas.dataPath}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    this.input.keyboard.on("keydown-LEFT", () => this.changeChapter(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeChapter(1));
    this.input.keyboard.on("keydown-SPACE", () => this.toggleMode());
    this.input.keyboard.on("keydown-R", () => this.toggleMode());
    this.renderChapter();
  }

  changeChapter(delta) {
    this.chapterIndex = Phaser.Math.Wrap(
      this.chapterIndex + delta,
      0,
      REVIEW.chapters.length,
    );
    this.renderChapter();
  }

  toggleMode() {
    this.mode = this.mode === "current" ? "redesign" : "current";
    this.renderChapter();
  }

  clearRenderedObjects() {
    for (const object of this.renderedObjects) object.destroy();
    this.renderedObjects.length = 0;
  }

  renderChapter() {
    this.clearRenderedObjects();
    const chapter = REVIEW.chapters[this.chapterIndex];
    const base = this.add.image(REVIEW.width / 2, REVIEW.height / 2, chapter.baseKey)
      .setDisplaySize(REVIEW.width, REVIEW.height)
      .setDepth(0);
    this.renderedObjects.push(base);

    let overlayCount = 0;
    if (this.mode === "redesign") {
      for (const overlay of chapter.overlays) {
        const image = overlay.kind === "hero"
          ? this.addHero(overlay)
          : this.addProp(overlay);
        this.renderedObjects.push(image);
        overlayCount += 1;
      }
    }

    if (!clean) this.addReviewChrome(chapter);
    document.body.dataset.aboveGroundMockupReady = "true";
    document.body.dataset.chapter = chapter.id;
    document.body.dataset.mode = this.mode;
    document.body.dataset.assetPolicy = REVIEW.assetPolicy;
    document.body.dataset.overlayCount = `${overlayCount}`;
    globalThis.__ABOVE_GROUND_REDESIGN_REVIEW__ = Object.freeze({
      ready: true,
      reviewOnly: REVIEW.reviewOnly,
      productionChanged: REVIEW.productionChanged,
      version: REVIEW.version,
      chapterId: chapter.id,
      mode: this.mode,
      overlayCount,
      assetPolicy: REVIEW.assetPolicy,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
    });
  }

  addHero(overlay) {
    const asset = HERO_ASSETS[overlay.assetId];
    const displayHeight = asset.heightMeters * REVIEW.pixelsPerMeter * overlay.distanceScale;
    const displayWidth = asset.expectedSource.width
      * displayHeight / asset.expectedSource.height;
    const image = this.add.image(overlay.x, overlay.groundY, asset.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(overlay.alpha)
      .setFlipX(overlay.flipX)
      .setDepth(1 + overlay.distanceScale);
    if (overlay.tint !== null) image.setTint(overlay.tint);
    return image;
  }

  addProp(overlay) {
    const asset = PROP_ASSET_BY_ID[overlay.assetId];
    const runtime = PROP_RUNTIME_ASSETS[overlay.assetId];
    const displayHeight = asset.heightMeters * REVIEW.pixelsPerMeter * overlay.scale;
    const displayWidth = asset.expectedSource.width
      * displayHeight / asset.expectedSource.height;
    return this.add.image(overlay.x, overlay.groundY, runtime.key, runtime.frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(overlay.alpha)
      .setFlipX(overlay.flipX)
      .setDepth(3);
  }

  addReviewChrome(chapter) {
    const controls = REVIEW.controls;
    const panel = this.add.rectangle(
      controls.leftX,
      controls.topY,
      controls.width,
      controls.height,
      controls.panelColor,
      controls.panelAlpha,
    ).setOrigin(0).setDepth(20);
    const title = this.add.text(
      controls.leftX + 18,
      controls.topY + 13,
      `${chapter.label.toUpperCase()}  |  ${this.mode.toUpperCase()}`,
      {
        color: controls.accentColor,
        fontFamily: controls.fontFamily,
        fontSize: controls.titleSize,
      },
    ).setDepth(21);
    const body = this.add.text(
      controls.leftX + 18,
      controls.topY + 49,
      "LEFT / RIGHT: chapter     SPACE or R: current vs redesign\nExisting runtime assets only - 40 px per metre - no gameplay authority changed",
      {
        color: controls.textColor,
        fontFamily: controls.fontFamily,
        fontSize: controls.bodySize,
        lineSpacing: 6,
      },
    ).setDepth(21);
    this.renderedObjects.push(panel, title, body);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: REVIEW.width,
  height: REVIEW.height,
  parent: "mockup",
  backgroundColor: REVIEW.backgroundColor,
  render: { antialias: true, roundPixels: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [AboveGroundRedesignReviewScene],
});
