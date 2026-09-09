import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  HARDCORE_PANIC_BOUNDARY,
  resolveHardcorePanicBoundary,
} from "../../values/hardcorePanicBoundary.js";

const TAU = Math.PI * 2;

export class HardcorePanicBoundaryView {
  constructor(scene, hardcoreConfig, config = HARDCORE_PANIC_BOUNDARY) {
    this.scene = scene;
    this.hardcoreConfig = hardcoreConfig;
    this.config = config;
    this.root = null;
    this.line = null;
    this.markerRoot = null;
    this.markerFrame = null;
    this.icon = null;
    this.title = null;
    this.detail = null;
    this._lastTextSignature = "";
    this._lastLayoutSignature = "";
    this._state = { visible: false };
    this._create();
  }

  _create() {
    const edgeKey = this.hardcoreConfig.assets.panicEdgeFrame.key;
    const shellKey = ASSET_KEYS.ui.approvedHud.hardcoreStatusShell;
    if (
      !this.scene.textures.exists(edgeKey)
      || !this.scene.textures.exists(shellKey)
    ) {
      return;
    }
    const marker = this.config.marker;
    const warningKey = this.hardcoreConfig.assets.panicWarning.key;
    const fallbackKey = this.hardcoreConfig.assets.crest.key;
    const iconKey = this.scene.textures.exists(warningKey)
      ? warningKey
      : fallbackKey;
    this.root = this.scene.add.container(0, 0)
      .setDepth(this.config.renderDepth)
      .setVisible(false);
    this.line = this.scene.add.image(0, 0, edgeKey)
      .setOrigin(0.5, 0)
      .setCrop(
        0,
        0,
        this.config.line.sourceWidthPx,
        this.config.line.sourceCropHeightPx,
      );
    this.markerRoot = this.scene.add.container(0, marker.centerYPx);
    this.markerFrame = this.scene.add.image(0, 0, shellKey)
      .setDisplaySize(marker.widthPx, marker.heightPx);
    this.icon = this.scene.add.image(marker.iconX, 0, iconKey)
      .setDisplaySize(marker.iconSizePx, marker.iconSizePx);
    this.title = this.scene.add.text(marker.textX, marker.titleY, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${marker.titleFontPx}px`,
      fontStyle: "bold",
      color: "#fff0ec",
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0, 0.5);
    this.detail = this.scene.add.text(marker.textX, marker.detailY, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${marker.detailFontPx}px`,
      fontStyle: "bold",
      color: "#ff9a86",
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0, 0.5);
    this.markerRoot.add([
      this.markerFrame,
      this.icon,
      this.title,
      this.detail,
    ]);
    this.root.add([this.line, this.markerRoot]);
  }

  isReady() {
    return Boolean(this.root && this.line && this.markerRoot);
  }

  update(snapshot, timeMs = 0, gameplayActive = true) {
    if (!this.isReady()) return this.getDebugSnapshot();
    const hasSnapshotResistance = Number.isFinite(
      snapshot?.panicResistanceMeters,
    );
    const boundarySnapshot = hasSnapshotResistance
      ? snapshot
      : {
          ...snapshot,
          panicResistanceMeters:
            this.scene.playerLevelSystem?.getPanicResistanceMeters?.() || 0,
        };
    this._state = resolveHardcorePanicBoundary(
      boundarySnapshot,
      this.scene.config,
      {
        gameplayActive,
        basePanicStartDepth: this.hardcoreConfig.stress.panicStartDepthTiles,
      },
    );
    this.root.setVisible(this._state.visible);
    if (!this._state.visible) return this.getDebugSnapshot();
    this._layout();
    const seconds = (Number(timeMs) || 0) / 1000;
    const pulse = (Math.sin(seconds * TAU * this.config.line.pulseHz) + 1) / 2;
    const alpha = this.config.line.alphaMinimum
      + (this.config.line.alphaMaximum - this.config.line.alphaMinimum) * pulse;
    this.line.setAlpha(alpha);
    return this.getDebugSnapshot();
  }

  _layout() {
    const reference = this.config.referenceViewport;
    const camera = this.scene.cameras?.main;
    const zoom = Math.max(0.01, Number(camera?.zoom) || 1);
    const logicalWidth = this.scene.scale?.width || reference.width;
    const logicalHeight = this.scene.scale?.height || reference.height;
    const viewWidth = Number(camera?.worldView?.width) || logicalWidth / zoom;
    const centerX = Number.isFinite(camera?.worldView?.centerX)
      ? camera.worldView.centerX
      : (Number(camera?.scrollX) || 0) + viewWidth / 2;
    const viewportScale = Math.min(
      logicalWidth / reference.width,
      logicalHeight / reference.height,
    );
    const worldUnitScale = viewportScale / zoom;
    this.root.setPosition(centerX, this._state.worldY);
    const marker = this.config.marker;
    const markerX = -viewWidth / 2
      + (marker.marginXPx + marker.widthPx / 2) * worldUnitScale;
    this.markerRoot
      .setPosition(markerX, marker.centerYPx * worldUnitScale)
      .setScale(worldUnitScale);
    const layoutSignature = `${viewWidth}:${worldUnitScale}`;
    if (layoutSignature !== this._lastLayoutSignature) {
      this._lastLayoutSignature = layoutSignature;
      this.line.setDisplaySize(
        viewWidth,
        this.config.line.heightPx * worldUnitScale,
      );
    }
    const textSignature = `${this._state.title}:${this._state.detail}`;
    if (textSignature !== this._lastTextSignature) {
      this._lastTextSignature = textSignature;
      this.title.setText(this._state.title);
      this.detail.setText(this._state.detail);
    }
  }

  getDebugSnapshot() {
    return {
      panicLineReady: this.isReady(),
      panicLineVisible: this.root?.visible === true,
      panicLineDepth: this._state.panicStartDepth ?? null,
      panicLineWorldY: this._state.worldY ?? null,
      panicLineWidth: this.line?.displayWidth || 0,
      panicLineTitle: this.title?.text || "",
      panicLineDetail: this.detail?.text || "",
    };
  }

  destroy() {
    this.root?.destroy(true);
    this.root = null;
    this.line = null;
    this.markerRoot = null;
    this.markerFrame = null;
    this.icon = null;
    this.title = null;
    this.detail = null;
    this.scene = null;
  }
}
